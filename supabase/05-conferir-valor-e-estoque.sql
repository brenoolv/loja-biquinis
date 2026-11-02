-- =====================================================================
-- Ajuste de 02/11: alerta no pedido quando algo não bate no pagamento.
--   - valor pago menor que o preço real das peças (preço alterado no navegador)
--   - estoque não era suficiente na hora do pagamento (duas clientes
--     compraram a última peça quase ao mesmo tempo)
-- RODAR ANTES DE PUBLICAR O CÓDIGO NOVO (commit + Sincronizar).
-- SQL Editor > New query > colar tudo > Run.
-- =====================================================================


-- 1. Coluna do alerta (vazia = tudo certo) --------------------------------
alter table public.pedidos add column if not exists alerta text;


-- 2. Ninguém cria pedido já com alerta pelo site ---------------------------
drop policy if exists "criar pedido" on public.pedidos;

create policy "criar pedido" on public.pedidos
  for insert with check (
    status in ('aguardando_pagamento', 'combinar_whatsapp')
    and estoque_baixado = false
    and transacao is null
    and valor_pago is null
    and alerta is null
    and (cliente_id is null or cliente_id = auth.uid())
  );


-- 3. Marcar como pago agora recebe o alerta da função do Netlify e
-- confere se tinha estoque. A versão antiga (4 parâmetros) sai antes,
-- senão o banco fica com duas funções de mesmo nome.
drop function if exists public.marcar_pedido_pago(text, text, text, numeric);

create or replace function public.marcar_pedido_pago(
  p_numero text,
  p_transacao text default null,
  p_comprovante text default null,
  p_valor_pago numeric default null,
  p_alerta text default null
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_pedido public.pedidos;
  v_item jsonb;
  v_qtd integer;
  v_pedida integer;
  v_alertas text[] := array[]::text[];
begin
  if not (
    public.eh_admin()
    or coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    or current_setting('role', true) = 'service_role'
  ) then
    raise exception 'sem permissão';
  end if;

  -- "for update" trava a linha: dois avisos ao mesmo tempo não descontam em dobro
  select * into v_pedido from public.pedidos where numero = p_numero for update;
  if not found then
    raise exception 'pedido % não encontrado', p_numero;
  end if;

  -- O aviso pode chegar duas vezes (InfinitePay e tela de obrigada): não repete
  if p_alerta is not null and position(p_alerta in coalesce(v_pedido.alerta, '')) = 0 then
    v_alertas := array_append(v_alertas, p_alerta);
  end if;

  if not v_pedido.estoque_baixado then
    for v_item in select * from jsonb_array_elements(v_pedido.itens) loop
      v_pedida := (v_item ->> 'quantidade')::integer;

      -- trava a linha do estoque também, pra duas compras não lerem o mesmo número
      select quantidade into v_qtd
      from public.estoque
      where produto_id = (v_item ->> 'produto_id')::integer
        and tamanho = v_item ->> 'tamanho'
      for update;

      if v_qtd is null or v_qtd < v_pedida then
        v_alertas := array_append(
          v_alertas,
          format('Faltou estoque: %s (tam. %s), pedido %s, tinha %s',
                 v_item ->> 'nome', v_item ->> 'tamanho', v_pedida, coalesce(v_qtd, 0))
        );
      end if;

      update public.estoque
      set quantidade = greatest(quantidade - v_pedida, 0)
      where produto_id = (v_item ->> 'produto_id')::integer
        and tamanho = v_item ->> 'tamanho';
    end loop;
  end if;

  update public.pedidos
  set status = case when status in ('enviado', 'entregue') then status else 'pago' end,
      estoque_baixado = true,
      oculto_cliente = false,
      transacao = coalesce(p_transacao, transacao),
      comprovante = coalesce(p_comprovante, comprovante),
      valor_pago = coalesce(p_valor_pago, valor_pago),
      alerta = case
        when cardinality(v_alertas) = 0 then alerta
        else concat_ws(' | ', alerta, array_to_string(v_alertas, ' | '))
      end,
      atualizado_em = now()
  where id = v_pedido.id;
end;
$$;

revoke execute on function public.marcar_pedido_pago from public, anon;
grant execute on function public.marcar_pedido_pago to authenticated, service_role;

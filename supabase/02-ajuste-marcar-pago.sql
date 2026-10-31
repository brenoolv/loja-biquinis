-- Ajuste de 31/10: aceitar também a chave secret nova do Supabase (sb_secret_...)
-- na função que marca o pedido como pago. Rodar UMA vez no SQL Editor.

create or replace function public.marcar_pedido_pago(
  p_numero text,
  p_transacao text default null,
  p_comprovante text default null,
  p_valor_pago numeric default null
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_pedido public.pedidos;
  v_item jsonb;
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

  if not v_pedido.estoque_baixado then
    for v_item in select * from jsonb_array_elements(v_pedido.itens) loop
      update public.estoque
      set quantidade = greatest(quantidade - (v_item ->> 'quantidade')::integer, 0)
      where produto_id = (v_item ->> 'produto_id')::integer
        and tamanho = v_item ->> 'tamanho';
    end loop;
  end if;

  update public.pedidos
  set status = case when status in ('enviado', 'entregue') then status else 'pago' end,
      estoque_baixado = true,
      transacao = coalesce(p_transacao, transacao),
      comprovante = coalesce(p_comprovante, comprovante),
      valor_pago = coalesce(p_valor_pago, valor_pago),
      atualizado_em = now()
  where id = v_pedido.id;
end;
$$;

-- =====================================================================
-- Ajuste de 31/10: painel da dona + cliente excluir pedido não pago.
-- Rodar UMA vez no SQL Editor (Create a new snippet > colar > Run).
-- =====================================================================


-- 1. E-mail no perfil, pra dona saber quem é a cliente no painel ------------
alter table public.perfis add column if not exists email text not null default '';

update public.perfis p
set email = u.email
from auth.users u
where u.id = p.id and p.email = '';

create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.perfis (id, nome, telefone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.raw_user_meta_data ->> 'telefone', ''),
    coalesce(new.email, '')
  );
  return new;
end;
$$;


-- 2. Pedido escondido da lista da cliente (ela "excluiu") ------------------
-- O pedido não some do banco: a dona continua vendo como "Cancelado".
alter table public.pedidos add column if not exists oculto_cliente boolean not null default false;


-- 3. Cliente exclui um pedido dela que ainda não foi pago ------------------
create or replace function public.cancelar_meu_pedido(p_numero text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.pedidos
  set status = 'cancelado',
      oculto_cliente = true,
      atualizado_em = now()
  where numero = p_numero
    and cliente_id = auth.uid()
    and status in ('aguardando_pagamento', 'combinar_whatsapp');

  if not found then
    raise exception 'Esse pedido não pode ser excluído';
  end if;
end;
$$;

revoke execute on function public.cancelar_meu_pedido from public, anon;
grant execute on function public.cancelar_meu_pedido to authenticated;


-- 4. Se um pedido "excluído" acabar sendo pago (o aviso da InfinitePay
-- chegou depois), ele volta a aparecer pra cliente. ------------------------
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
      oculto_cliente = false,
      transacao = coalesce(p_transacao, transacao),
      comprovante = coalesce(p_comprovante, comprovante),
      valor_pago = coalesce(p_valor_pago, valor_pago),
      atualizado_em = now()
  where id = v_pedido.id;
end;
$$;


-- 5. Dona pode cadastrar estoque de produto novo (antes só podia alterar) --
create policy "admin cria estoque" on public.estoque
  for insert with check (public.eh_admin());


-- 6. Dona pode devolver ao estoque as peças de um pedido cancelado ---------
create or replace function public.devolver_estoque(p_numero text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_pedido public.pedidos;
  v_item jsonb;
begin
  if not public.eh_admin() then
    raise exception 'sem permissão';
  end if;

  select * into v_pedido from public.pedidos where numero = p_numero for update;
  if not found or not v_pedido.estoque_baixado then
    return; -- nada pra devolver
  end if;

  for v_item in select * from jsonb_array_elements(v_pedido.itens) loop
    update public.estoque
    set quantidade = quantidade + (v_item ->> 'quantidade')::integer
    where produto_id = (v_item ->> 'produto_id')::integer
      and tamanho = v_item ->> 'tamanho';
  end loop;

  update public.pedidos
  set estoque_baixado = false, atualizado_em = now()
  where id = v_pedido.id;
end;
$$;

revoke execute on function public.devolver_estoque from public, anon;
grant execute on function public.devolver_estoque to authenticated;

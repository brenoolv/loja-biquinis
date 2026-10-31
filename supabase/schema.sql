-- =====================================================================
-- Banco de dados da Oceamar (Supabase / Postgres)
-- Rodar UMA vez em: Supabase > SQL Editor > New query > colar tudo > Run
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. PERFIS: nome e telefone de cada cliente cadastrada.
-- O login (e-mail e senha) o próprio Supabase guarda em auth.users.
-- Aqui fica só o que a loja precisa a mais.
-- ---------------------------------------------------------------------
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  telefone text not null default '',
  criado_em timestamptz not null default now()
);

-- Quando alguém se cadastra, cria o perfil com o nome e o telefone
-- que vieram do formulário de cadastro.
create function public.criar_perfil()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.perfis (id, nome, telefone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.raw_user_meta_data ->> 'telefone', '')
  );
  return new;
end;
$$;

create trigger ao_cadastrar
  after insert on auth.users
  for each row execute function public.criar_perfil();


-- ---------------------------------------------------------------------
-- 2. ADMINS: quem pode ver todos os pedidos e mexer no estoque.
-- Depois de se cadastrar no site, a dona roda (trocando o e-mail):
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'seu-email@exemplo.com';
-- ---------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create function public.eh_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;


-- ---------------------------------------------------------------------
-- 3. ESTOQUE: quantidade de cada produto em cada tamanho.
-- produto_id é o mesmo "id" da lista de produtos no Colecao.jsx.
-- ---------------------------------------------------------------------
create table public.estoque (
  produto_id integer not null,
  tamanho text not null check (tamanho in ('P', 'M', 'G', 'GG')),
  quantidade integer not null default 0 check (quantidade >= 0),
  primary key (produto_id, tamanho)
);

-- QUANTIDADES DE EXEMPLO (5 de cada). Troque pelas reais depois,
-- pela página da dona ou em Table Editor > estoque.
insert into public.estoque (produto_id, tamanho, quantidade)
select p.id, t.tamanho, 5
from (values (1), (2), (3), (4), (999)) as p (id)
cross join (values ('P'), ('M'), ('G'), ('GG')) as t (tamanho);


-- ---------------------------------------------------------------------
-- 4. PEDIDOS: tudo que foi finalizado no site (logada ou não).
-- ---------------------------------------------------------------------
create table public.pedidos (
  id bigint generated always as identity primary key,
  numero text not null unique,                 -- o order_nsu da InfinitePay
  cliente_id uuid references auth.users (id) on delete set null, -- vazio se comprou sem conta
  itens jsonb not null,                        -- [{produto_id, nome, tamanho, quantidade, preco}]
  subtotal numeric(10, 2) not null,
  desconto numeric(10, 2) not null default 0,
  frete numeric(10, 2),                        -- vazio = a combinar
  total numeric(10, 2) not null,
  cupom text,
  recebimento text not null,                   -- texto de entrega ou retirada
  pagamento text not null,                     -- Pix, Cartão ou Dinheiro
  status text not null default 'aguardando_pagamento' check (status in (
    'aguardando_pagamento',  -- foi pra InfinitePay e ainda não confirmou
    'combinar_whatsapp',     -- finalizou pelo WhatsApp
    'pago',
    'enviado',
    'entregue',
    'cancelado'
  )),
  estoque_baixado boolean not null default false,
  transacao text,                              -- transaction_nsu da InfinitePay
  comprovante text,                            -- receipt_url da InfinitePay
  valor_pago numeric(10, 2),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index pedidos_cliente on public.pedidos (cliente_id, criado_em desc);


-- ---------------------------------------------------------------------
-- 5. MARCAR COMO PAGO: muda o status e desconta o estoque, tudo junto.
-- Se for chamada duas vezes pro mesmo pedido, só desconta uma vez.
-- Só a função do Netlify (chave secreta) ou uma admin pode chamar.
-- ---------------------------------------------------------------------
create function public.marcar_pedido_pago(
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

revoke execute on function public.marcar_pedido_pago from public, anon;
grant execute on function public.marcar_pedido_pago to authenticated, service_role;


-- ---------------------------------------------------------------------
-- 6. REGRAS DE ACESSO (RLS)
-- Sem isso, qualquer pessoa com a chave pública leria tudo.
-- Com RLS ligado, cada tabela só deixa fazer o que as regras abaixo dizem.
-- ---------------------------------------------------------------------
alter table public.perfis enable row level security;
alter table public.admins enable row level security;
alter table public.estoque enable row level security;
alter table public.pedidos enable row level security;

-- Perfis: cada cliente vê e edita só o próprio; a admin vê todos
create policy "ver o próprio perfil" on public.perfis
  for select using (id = auth.uid() or public.eh_admin());
create policy "editar o próprio perfil" on public.perfis
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Admins: ninguém lê nem mexe pelo site (só pelo painel do Supabase)

-- Estoque: todo mundo vê (pra mostrar "Esgotado"); só admin muda
create policy "todos veem o estoque" on public.estoque
  for select using (true);
create policy "admin muda o estoque" on public.estoque
  for update using (public.eh_admin()) with check (public.eh_admin());

-- Pedidos: qualquer pessoa cria um pedido novo, mas só como "aguardando"
-- e só no próprio nome (ou sem nome, se não estiver logada)
create policy "criar pedido" on public.pedidos
  for insert with check (
    status in ('aguardando_pagamento', 'combinar_whatsapp')
    and estoque_baixado = false
    and transacao is null
    and valor_pago is null
    and (cliente_id is null or cliente_id = auth.uid())
  );

-- Cliente vê os próprios pedidos; admin vê todos
create policy "ver pedidos" on public.pedidos
  for select using (cliente_id = auth.uid() or public.eh_admin());

-- Só admin muda status (enviado, entregue, cancelado)
create policy "admin muda pedido" on public.pedidos
  for update using (public.eh_admin()) with check (public.eh_admin());

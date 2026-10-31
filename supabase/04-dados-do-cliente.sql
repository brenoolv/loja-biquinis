-- Nome e WhatsApp de quem compra sem conta, pra aparecer no painel da dona.
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.

alter table public.pedidos
  add column if not exists nome_cliente text,
  add column if not exists telefone_cliente text;

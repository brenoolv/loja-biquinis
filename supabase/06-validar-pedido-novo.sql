-- =====================================================================
-- Ajuste de 02/11: o banco recusa pedido montado com dados impossíveis.
--
-- O pedido é criado pelo navegador da cliente, então quem souber usar o
-- F12 consegue mandar qualquer coisa. Antes deste ajuste dava pra criar:
--   - peça com quantidade negativa (-1), que abaixa o valor esperado e,
--     quando o pedido é pago, AUMENTA o estoque em vez de diminuir
--   - frete negativo, que também abaixa o valor esperado
--   - pedido já com um link de "comprovante", que aparece no painel
--     da Agatha mesmo sem pagamento nenhum
--
-- A função do Netlify também confere essas coisas e deixa alerta no pedido.
-- Aqui é a segunda trava: o pedido estranho nem chega a ser gravado.
--
-- RODAR NO SUPABASE: SQL Editor > New query > colar tudo > Run.
-- =====================================================================


-- 1. Frete nunca negativo (vazio continua valendo: "a combinar") ---------
alter table public.pedidos
  drop constraint if exists frete_nao_negativo;

alter table public.pedidos
  add constraint frete_nao_negativo check (frete is null or frete >= 0);


-- 2. Regra de criar pedido: tudo que já tinha + itens e comprovante -------
drop policy if exists "criar pedido" on public.pedidos;

create policy "criar pedido" on public.pedidos
  for insert with check (
    status in ('aguardando_pagamento', 'combinar_whatsapp')
    and estoque_baixado = false
    and transacao is null
    and valor_pago is null
    and alerta is null
    and comprovante is null
    and (cliente_id is null or cliente_id = auth.uid())
    -- itens precisa ser uma lista com pelo menos uma peça
    and jsonb_typeof(itens) = 'array'
    and jsonb_array_length(itens) > 0
    -- e toda peça com quantidade inteira de 1 pra cima
    -- (se vier "1.5" ou texto, a conversão falha e o pedido é recusado)
    and not exists (
      select 1
      from jsonb_array_elements(itens) as item
      where coalesce((item ->> 'quantidade')::integer, 0) < 1
    )
  );

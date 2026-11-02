# Oceamar

Loja virtual da Oceamar, marca de moda praia de Fortaleza. O site cobre a compra inteira: a cliente escolhe as peças, calcula o frete pelo CEP, paga online ou finaliza pelo WhatsApp, e a dona acompanha pedidos e estoque num painel próprio.

**Site:** https://oceamar.com.br

> O site está no ar com produtos de exemplo, em fase de cadastro das peças reais.

## Funcionalidades

**Para a cliente**

- Catálogo com tamanhos e aviso de peça esgotada, consultando o estoque no banco
- Carrinho guardado no aparelho, refeito a partir da lista oficial de produtos a cada visita (preço alterado à mão não passa)
- Frete calculado pela distância entre a loja e o CEP da cliente, com opção de retirada
- Pagamento online por Pix ou cartão pela InfinitePay, ou finalização pelo WhatsApp com a mensagem do pedido já montada
- Conta com cadastro, login, recuperação de senha e histórico de pedidos

**Para a dona da loja**

- Painel em `/admin`, liberado só para contas cadastradas como administradoras
- Lista de pedidos com status (aguardando, pago, enviado, entregue, cancelado) e comprovante de pagamento
- Controle de estoque por peça e tamanho
- Alerta no pedido quando o valor pago não bate com o preço real das peças ou quando faltou estoque

## Como funciona o pagamento

1. O pedido é gravado no banco antes de a cliente ir para o pagamento
2. O site gera o link de pagamento da InfinitePay
3. Quando o pagamento é aprovado, a InfinitePay chama uma função serverless na Netlify (`netlify/functions/pagamento-confirmado.mjs`)
4. A função confirma com a própria InfinitePay que o pagamento existe, recalcula o valor esperado a partir dos preços do servidor e marca o pedido como pago, descontando o estoque

Como o pedido é montado no navegador, nada que vem dele é tratado como confiável: preços, quantidades e frete são conferidos de novo no servidor, e as regras de acesso do banco (RLS) recusam pedidos com dados impossíveis.

## Tecnologias

- **Front-end:** React 19 e Vite
- **Banco e login:** Supabase (PostgreSQL, autenticação e Row Level Security)
- **Back-end:** Netlify Functions (Node.js), incluindo uma função agendada diária
- **Pagamento:** InfinitePay (link de checkout e webhook)
- **APIs de endereço:** ViaCEP, AwesomeAPI e OpenStreetMap (Nominatim)

## Estrutura

```
src/
  components/   telas e partes do site (Carrinho, Conta, Admin...)
  dados/        lista de produtos e tabela de frete
  utils/        frete, pagamento, cliente do Supabase e dados da loja
netlify/
  functions/    confirmação de pagamento e função agendada
supabase/
  schema.sql    tabelas, funções e regras de acesso
  0X-*.sql      ajustes feitos depois, em ordem
```

## Rodando localmente

```bash
npm install
npm run dev
```

O site abre em `http://localhost:5173`. As funções da Netlify precisam das variáveis `SUPABASE_URL` e `SUPABASE_SECRET_KEY` configuradas no painel da Netlify; a chave secreta nunca fica no código.

---

Desenvolvido por [Breno Oliveira](https://github.com/brenoolv).

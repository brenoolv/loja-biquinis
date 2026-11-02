import { createClient } from "@supabase/supabase-js";
// Mesma lista de produtos do site: é daqui que sai o preço "de verdade"
import { PRODUTOS } from "../../src/dados/produtos.js";

// =====================================================================
// Função que roda no servidor do Netlify (não no navegador da cliente).
// Endereço: https://oceamar.com.br/.netlify/functions/pagamento-confirmado
//
// Quem chama:
//   1. A InfinitePay, sozinha, quando um pagamento é aprovado (webhook)
//   2. A tela de "Obrigada pela compra", como garantia extra
//
// O que faz:
//   - Pergunta pra InfinitePay se o pagamento foi mesmo aprovado
//     (ninguém consegue marcar um pedido como pago só chamando esta função)
//   - Confere se o valor pago cobre o preço real das peças. O pedido é
//     montado no navegador da cliente, então alguém poderia mudar o preço
//     antes de pagar. Se o valor não bate, o pedido fica com um alerta
//     vermelho no painel (o dinheiro entrou, mas a Agatha confere antes de enviar)
//   - Marca o pedido como "pago" no Supabase e desconta o estoque
//
// Precisa de duas variáveis de ambiente no Netlify:
//   SUPABASE_URL          -> https://skoivgeijtgaxunqiyue.supabase.co
//   SUPABASE_SECRET_KEY   -> a chave secret (sb_secret_...) do Supabase
// =====================================================================

const INFINITE_TAG = "oceamar";

const reais = (valor) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Compara o pedido salvo no banco com o valor que a InfinitePay cobrou.
// Devolve o texto do alerta, ou null se está tudo certo.
function conferirValor(pedido, valorCobrado) {
  if (!pedido) return "Pedido não encontrado no banco na hora de conferir o valor.";
  if (valorCobrado == null) {
    return "Não deu pra conferir o valor. Confira o valor recebido no app da InfinitePay.";
  }

  let pecas = 0;
  for (const item of pedido.itens) {
    const produto = PRODUTOS.find((p) => p.id === Number(item.produto_id));
    if (!produto) return `Produto desconhecido no pedido (id ${item.produto_id}).`;
    pecas += produto.preco * Number(item.quantidade);
  }

  // Pagamento online nunca tem cupom (cupom é só pelo WhatsApp)
  const esperado = pecas + Number(pedido.frete ?? 0);

  // 1 centavo de folga por causa de arredondamento
  if (valorCobrado + 0.01 < esperado) {
    return `Valor pago ${reais(valorCobrado)} menor que o preço das peças + frete (${reais(esperado)}). Não envie antes de conferir.`;
  }
  if (pedido.cupom) {
    return `Pedido com cupom ${pedido.cupom} pago online. Confira se o desconto era válido.`;
  }
  return null;
}

function resposta(status, corpo) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default async (req) => {
  if (req.method !== "POST") {
    return resposta(405, { erro: "Use POST" });
  }

  let dados;
  try {
    dados = await req.json();
  } catch {
    return resposta(400, { erro: "Corpo inválido" });
  }

  // A InfinitePay manda "invoice_slug"; a tela de obrigada manda "slug"
  const numero = dados.order_nsu;
  const transacao = dados.transaction_nsu;
  const slug = dados.invoice_slug ?? dados.slug;

  if (!numero || !transacao || !slug) {
    return resposta(400, { erro: "Faltam order_nsu, transaction_nsu ou slug" });
  }

  // 1. Confere com a própria InfinitePay se esse pagamento existe e foi pago
  let pago = false;
  let valorPago = null;
  let valorCobrado = null; // valor do pedido na InfinitePay, sem juros de parcelamento
  try {
    const conferencia = await fetch(
      "https://api.checkout.infinitepay.io/payment_check",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: INFINITE_TAG,
          order_nsu: numero,
          transaction_nsu: transacao,
          slug,
        }),
      },
    );
    const status = await conferencia.json();
    console.log("payment_check", numero, JSON.stringify(status));

    pago = status.paid === true;
    if (status.paid_amount != null) valorPago = Number(status.paid_amount) / 100;
    if (status.amount != null) valorCobrado = Number(status.amount) / 100;
  } catch (erro) {
    console.error("Falha ao consultar a InfinitePay:", erro);
    // 500: a InfinitePay tenta mandar o aviso de novo mais tarde
    return resposta(500, { erro: "Não deu pra conferir o pagamento agora" });
  }

  if (!pago) {
    return resposta(200, { ok: true, pago: false });
  }

  // 2. Marca como pago e desconta o estoque (função marcar_pedido_pago do banco)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false } },
  );

  // Busca o pedido como ele foi salvo, pra conferir o valor
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("itens, frete, cupom")
    .eq("numero", numero)
    .maybeSingle();

  const alerta = conferirValor(pedido, valorCobrado ?? valorPago);
  if (alerta) console.warn("Alerta no pedido", numero, alerta);

  const { error } = await supabase.rpc("marcar_pedido_pago", {
    p_numero: numero,
    p_transacao: transacao,
    p_comprovante: dados.receipt_url ?? null,
    p_valor_pago: valorPago,
    p_alerta: alerta,
  });

  if (error) {
    // Ex.: pedido não existe no banco. Fica registrado no log do Netlify.
    console.error("Erro ao marcar pedido", numero, error);
    return resposta(200, { ok: false, erro: error.message });
  }

  return resposta(200, { ok: true, pago: true });
};

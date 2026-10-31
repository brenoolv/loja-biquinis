import { createClient } from "@supabase/supabase-js";

// =====================================================================
// Função que roda no servidor do Netlify (não no navegador da cliente).
// Endereço: https://oceamar.netlify.app/.netlify/functions/pagamento-confirmado
//
// Quem chama:
//   1. A InfinitePay, sozinha, quando um pagamento é aprovado (webhook)
//   2. A tela de "Obrigada pela compra", como garantia extra
//
// O que faz:
//   - Pergunta pra InfinitePay se o pagamento foi mesmo aprovado
//     (ninguém consegue marcar um pedido como pago só chamando esta função)
//   - Se foi, marca o pedido como "pago" no Supabase e desconta o estoque
//
// Precisa de duas variáveis de ambiente no Netlify:
//   SUPABASE_URL          -> https://skoivgeijtgaxunqiyue.supabase.co
//   SUPABASE_SECRET_KEY   -> a chave secret (sb_secret_...) do Supabase
// =====================================================================

const INFINITE_TAG = "oceamar";

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

  const { error } = await supabase.rpc("marcar_pedido_pago", {
    p_numero: numero,
    p_transacao: transacao,
    p_comprovante: dados.receipt_url ?? null,
    p_valor_pago: valorPago,
  });

  if (error) {
    // Ex.: pedido não existe no banco. Fica registrado no log do Netlify.
    console.error("Erro ao marcar pedido", numero, error);
    return resposta(200, { ok: false, erro: error.message });
  }

  return resposta(200, { ok: true, pago: true });
};

import { INFINITE_TAG, SITE_URL } from "./loja";

// Cria o link de pagamento da InfinitePay e devolve o endereço pra onde
// mandar a cliente. Usado pelo carrinho e pelo "Pagar agora" de Meus pedidos.
//
// itens: [{ nome, tamanho, quantidade, preco }]
// frete: número (0 = sem frete). descricaoFrete aparece no recibo.
// endereco: { cep, number, complement } ou null (retirada)
export async function criarLinkPagamento({
  numero,
  itens,
  subtotal,
  desconto = 0,
  frete = 0,
  descricaoFrete = "Frete",
  endereco = null,
}) {
  const pedido = {
    handle: INFINITE_TAG,
    redirect_url: `${window.location.origin}/?pagamento=concluido`,
    // A InfinitePay chama esta função do Netlify quando o pagamento é aprovado
    webhook_url: `${SITE_URL}/.netlify/functions/pagamento-confirmado`,
    order_nsu: numero,
    // O desconto é espalhado proporcionalmente no preço de cada peça
    items: itens.map((item) => ({
      quantity: item.quantidade,
      price: Math.round(item.preco * (1 - desconto / subtotal) * 100),
      description: `${item.nome} (tam. ${item.tamanho})`,
    })),
  };

  if (endereco) pedido.address = endereco;

  if (frete > 0) {
    pedido.items.push({
      quantity: 1,
      price: Math.round(frete * 100),
      description: descricaoFrete,
    });
  }

  const resposta = await fetch("https://api.checkout.infinitepay.io/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pedido),
  });

  const dados = await resposta.json();
  const link = dados.url || dados.link || dados.checkout_url;

  if (!resposta.ok || !link) {
    throw new Error("A InfinitePay não devolveu o link");
  }

  return link;
}

// Resumo que a tela de "Obrigada pela compra" mostra quando a cliente volta
export function guardarUltimoPedido({ numero, linhas, total, entrega }) {
  localStorage.setItem(
    "ultimoPedido",
    JSON.stringify({ numero, linhas, total, entrega }),
  );
}

// Pedidos que este aparelho já viu sendo pagos. Serve pra esconder o
// "Pagar agora" em Meus pedidos enquanto o status do banco não atualiza.
export function lerPedidosPagos() {
  try {
    return JSON.parse(localStorage.getItem("pedidosPagos")) ?? [];
  } catch {
    return [];
  }
}

export function marcarPedidoPagoNoAparelho(numero) {
  if (!numero) return;
  const pagos = lerPedidosPagos();
  if (!pagos.includes(numero)) {
    localStorage.setItem("pedidosPagos", JSON.stringify([...pagos, numero]));
  }
}

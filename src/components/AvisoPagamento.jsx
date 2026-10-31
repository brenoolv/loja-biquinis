import { useState, useEffect } from "react";
import { FiCheckCircle, FiClock } from "react-icons/fi";
import { formatarPreco } from "../utils/formatarPreco";
import { WHATSAPP, INFINITE_TAG } from "../utils/loja";
import { marcarPedidoPagoNoAparelho } from "../utils/pagamento";
import "./AvisoPagamento.css";

// Lê o que a InfinitePay manda no endereço quando a cliente volta.
// Ex.: oceamar.com.br/?pagamento=concluido&order_nsu=...&slug=...&receipt_url=...
// Devolve null se a cliente não está voltando de um pagamento.
export function lerRetornoPagamento() {
  const parametros = new URLSearchParams(window.location.search);
  if (parametros.get("pagamento") !== "concluido") return null;

  let pedido = null;
  try {
    pedido = JSON.parse(localStorage.getItem("ultimoPedido"));
  } catch {
    // sem resumo salvo, segue sem ele
  }

  return {
    orderNsu: parametros.get("order_nsu") || pedido?.numero || "",
    transactionNsu: parametros.get("transaction_nsu") ?? "",
    slug: parametros.get("slug") ?? "",
    comprovante: parametros.get("receipt_url") ?? "",
    pedido,
  };
}

// Avisa a função do Netlify, como garantia caso o aviso da InfinitePay atrase.
// A função confere o pagamento com a InfinitePay antes de marcar como pago.
function avisarServidor(retorno) {
  fetch("/.netlify/functions/pagamento-confirmado", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_nsu: retorno.orderNsu,
      transaction_nsu: retorno.transactionNsu,
      slug: retorno.slug,
      receipt_url: retorno.comprovante,
    }),
  }).catch(() => {
    // no npm run dev essa função não existe; tudo bem
  });
}

export default function AvisoPagamento({ retorno, onConfirmado, onFechar }) {
  // "verificando" -> "confirmado" ou "sem-confirmacao"
  const [situacao, setSituacao] = useState("verificando");

  // Pergunta pra InfinitePay se esse pagamento foi mesmo aprovado.
  // Roda uma vez só, quando o aviso aparece (por isso o [] no fim).
  useEffect(() => {
    async function verificar() {
      try {
        const resposta = await fetch(
          "https://api.checkout.infinitepay.io/payment_check",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              handle: INFINITE_TAG,
              order_nsu: retorno.orderNsu,
              transaction_nsu: retorno.transactionNsu,
              slug: retorno.slug,
            }),
          },
        );
        const dados = await resposta.json();
        const pago = dados.paid === true || (dados.success && dados.paid !== false);

        if (pago || retorno.comprovante) {
          setSituacao("confirmado");
          marcarPedidoPagoNoAparelho(retorno.orderNsu);
          avisarServidor(retorno);
          onConfirmado();
        } else {
          setSituacao("sem-confirmacao");
        }
      } catch {
        // Se a consulta falhar mas veio comprovante, o pagamento aconteceu
        if (retorno.comprovante) {
          setSituacao("confirmado");
          marcarPedidoPagoNoAparelho(retorno.orderNsu);
          avisarServidor(retorno);
          onConfirmado();
        } else {
          setSituacao("sem-confirmacao");
        }
      }
    }

    verificar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pedido = retorno.pedido;

  // Mensagem pronta pra cliente avisar a loja e mandar o comprovante
  const mensagem = [
    "Olá! Acabei de pagar meu pedido pelo site e quero acompanhar.",
    retorno.orderNsu ? `Pedido nº ${retorno.orderNsu}` : null,
    "",
    ...(pedido?.linhas ?? []),
    pedido ? `Total: ${formatarPreco(pedido.total)}` : null,
    pedido?.entrega ?? null,
    "",
    retorno.comprovante ? `Comprovante: ${retorno.comprovante}` : null,
  ]
    .filter((linha) => linha !== null)
    .join("\n");

  return (
    <div className="aviso-fundo" role="dialog" aria-modal="true">
      <div className="aviso">
        {situacao === "verificando" && (
          <>
            <FiClock className="aviso-icone aviso-icone--espera" />
            <h2>Confirmando seu pagamento...</h2>
            <p>Só um instante.</p>
          </>
        )}

        {situacao === "confirmado" && (
          <>
            <FiCheckCircle className="aviso-icone" />
            <h2>Obrigada pela compra!</h2>
            <p>
              Seu pagamento foi aprovado e seu pedido já está com a gente.
              Acompanhe seu pedido pelo WhatsApp.
            </p>
          </>
        )}

        {situacao === "sem-confirmacao" && (
          <>
            <FiClock className="aviso-icone aviso-icone--espera" />
            <h2>Recebemos seu retorno</h2>
            <p>
              Ainda não conseguimos confirmar o pagamento por aqui. Se ele foi
              concluído, é só mandar o comprovante pra gente no WhatsApp que
              conferimos rapidinho.
            </p>
          </>
        )}

        {situacao !== "verificando" && (
          <>
            {pedido && (
              <div className="aviso-resumo">
                {retorno.orderNsu && (
                  <p className="aviso-numero">Pedido nº {retorno.orderNsu}</p>
                )}
                <ul>
                  {pedido.linhas.map((linha) => (
                    <li key={linha}>{linha.replace(/^• /, "")}</li>
                  ))}
                </ul>
                <p className="aviso-total">
                  <span>Total</span>
                  <strong>{formatarPreco(pedido.total)}</strong>
                </p>
              </div>
            )}

            <div className="aviso-botoes">
              <a
                className="aviso-whatsapp"
                href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem)}`}
                target="_blank"
                rel="noreferrer"
              >
                {situacao === "confirmado"
                  ? "Acompanhar pelo WhatsApp"
                  : "Enviar comprovante no WhatsApp"}
              </a>

              {retorno.comprovante && (
                <a
                  className="aviso-secundario"
                  href={retorno.comprovante}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver comprovante
                </a>
              )}

              <button
                type="button"
                className="aviso-secundario"
                onClick={onFechar}
              >
                Voltar pra loja
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

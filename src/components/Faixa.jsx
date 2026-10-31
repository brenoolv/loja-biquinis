import { useState } from "react";
import "./Faixa.css";
import { CUPOM } from "../utils/loja";

export default function Faixa() {
  const [copiado, setCopiado] = useState(false);

  const frase = `1ª compra: ${CUPOM} · 10% off + frete grátis`;
  const frases = Array(8).fill(frase);

  async function copiarCupom() {
    try {
      await navigator.clipboard.writeText(CUPOM);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Se o navegador bloquear a cópia, a cliente ainda vê o cupom na faixa
    }
  }

  return (
    <button
      type="button"
      className="faixa"
      onClick={copiarCupom}
      aria-label={`${frase}. Toque para copiar o cupom.`}
    >
      {copiado ? (
        <span className="faixa-aviso">Cupom {CUPOM} copiado! É só colar no carrinho.</span>
      ) : (
        <>
          <div className="faixa-trilho" aria-hidden="true">
            {[...frases, ...frases].map((texto, i) => (
              <span key={i}>{texto}</span>
            ))}
          </div>
          <span className="faixa-parada" aria-hidden="true">
            {frase} · toque pra copiar
          </span>
        </>
      )}
    </button>
  );
}

import "./Faixa.css";
import { CUPOM } from "../utils/loja";

export default function Faixa() {
  const frase = `Primeira compra? Use o cupom ${CUPOM} e ganhe 10% off + frete grátis`;
  const frases = Array(8).fill(frase);

  return (
    <div className="faixa">
      <div className="faixa-trilho">
        {[...frases, ...frases].map((texto, i) => (
          <span key={i}>{texto}</span>
        ))}
      </div>
    </div>
  );
}

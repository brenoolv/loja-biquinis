import "./Faixa.css";

export default function Faixa() {
  const frase = "10% de desconto na primeira compra + Frete Grátis";
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

import { useState, useEffect } from "react";
import "./Carrossel.css";

const fotos = [
  { id: 1, src: "/fotos/floral-azul.jpeg", alt: "Biquíni Triângulo Floral" },
  {
    id: 2,
    src: "/fotos/meia-taca-marinho.jpeg",
    alt: "Biquíni Meia-Taça Marinho",
  },
  { id: 3, src: "/fotos/azul-royal.jpeg", alt: "Biquíni Asa Delta Azul Royal" },
];

export default function Carrossel() {
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado) return;

    const timer = setInterval(() => {
      setAtual((anterior) => (anterior + 1) % fotos.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [pausado]);

  function clicarCarta(i, posicao) {
    if (posicao === 0 && pausado) {
      document
        .getElementById(`produto-${fotos[i].id}`)
        .scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setAtual(i);
    setPausado(true);
  }

  return (
    <div className="carrossel">
      <div className="pilha" onMouseLeave={() => setPausado(false)}>
        {fotos.map((foto, i) => {
          const posicao = (i - atual + fotos.length) % fotos.length;
          const selecionada = posicao === 0 && pausado;

          return (
            <img
              key={foto.src}
              src={foto.src}
              alt={foto.alt}
              className={selecionada ? "carta selecionada" : "carta"}
              onClick={() => clicarCarta(i, posicao)}
              style={{
                "--posicao": posicao,
                zIndex: fotos.length - posicao,
              }}
            />
          );
        })}
      </div>

      <div className="carrossel-pontos">
        {fotos.map((foto, i) => (
          <button
            key={foto.src}
            className={i === atual ? "ponto ativo" : "ponto"}
            onClick={() => setAtual(i)}
            aria-label={`Ver foto ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

import "./Hero.css";
import Carrossel from "./Carrossel";

export default function Hero() {
  return (
    <section id="inicio" className="hero">
      <div className="hero-conteudo">
        <div className="hero-textos">
          <p className="hero-etiqueta">Coleção verão</p>
          <h1>
            Biquínis para curtir cada dia de sol.
            <img src="/animacoes/sol.webp" alt="" className="sol" />
          </h1>
          <p className="hero-texto">
            Peças com estilo e conforto, pensadas para você se sentir bem do
            primeiro mergulho ao pôr do sol.
          </p>
          <div className="hero-botoes">
            <a
              href="https://wa.me/558894649311?text=Olá, vim pelo site e gostaria de saber mais"
              className="botao botao-principal"
            >
              Comprar pelo WhatsApp
            </a>
            <a href="#colecao" className="botao botao-contorno">
              Ver coleção
            </a>
          </div>
        </div>

        <Carrossel />
      </div>
    </section>
  );
}

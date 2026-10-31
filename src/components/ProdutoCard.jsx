import { useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiShoppingBag, FiCheck } from "react-icons/fi";
import { formatarPreco } from "../utils/formatarPreco";
import { WHATSAPP } from "../utils/loja";

const tamanhos = ["P", "M", "G", "GG"];

export default function ProdutoCard({ produto, onAdicionar, onComprar }) {
  const [tamanho, setTamanho] = useState(null);
  const [quantidade, setQuantidade] = useState(1);
  const [adicionado, setAdicionado] = useState(false);

  const mensagem = `Olá! Quero saber mais sobre o ${produto.nome}.`;

  function diminuir() {
    if (quantidade > 1) {
      setQuantidade(quantidade - 1);
    }
  }

  function aumentar() {
    setQuantidade(quantidade + 1);
  }

  function adicionar() {
    onAdicionar(produto, tamanho, quantidade);
    setQuantidade(1);
    setAdicionado(true);
    setTimeout(() => setAdicionado(false), 1500);
  }

  function comprar() {
    onComprar(produto, tamanho, quantidade);
    setQuantidade(1);
  }

  return (
    <article id={`produto-${produto.id}`} className="cartao">
      <div className="cartao-foto">
        {produto.foto ? (
          <img src={produto.foto} alt={produto.nome} />
        ) : (
          <div className="foto-vazia" style={{ background: produto.cor }} />
        )}

        <a
          href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem)}`}
          target="_blank"
          rel="noreferrer"
          className="cartao-whatsapp"
          aria-label={`Perguntar sobre o ${produto.nome} no WhatsApp`}
        >
          <FaWhatsapp />
        </a>
      </div>

      <div className="cartao-info">
        <h3>{produto.nome}</h3>
        <p className="preco">{formatarPreco(produto.preco)}</p>

        <div className="cartao-opcoes">
          <div className="tamanhos">
            {tamanhos.map((t) => (
              <button
                key={t}
                type="button"
                className={tamanho === t ? "tamanho ativo" : "tamanho"}
                onClick={() => setTamanho(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="quantidade">
            <button type="button" onClick={diminuir} aria-label="Diminuir quantidade">
              -
            </button>
            <span>{quantidade}</span>
            <button type="button" onClick={aumentar} aria-label="Aumentar quantidade">
              +
            </button>
          </div>
        </div>

        <div className="cartao-acoes">
          <button
            type="button"
            className="botao-comprar"
            onClick={comprar}
            disabled={!tamanho}
          >
            {tamanho ? "Comprar agora" : "Escolha o tamanho"}
          </button>

          <button
            type="button"
            className={adicionado ? "botao-sacola adicionado" : "botao-sacola"}
            onClick={adicionar}
            disabled={!tamanho}
            aria-label="Adicionar ao carrinho"
            title="Adicionar ao carrinho"
          >
            {adicionado ? <FiCheck /> : <FiShoppingBag />}
          </button>
        </div>
      </div>
    </article>
  );
}

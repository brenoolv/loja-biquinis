import { useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiShoppingBag, FiCheck } from "react-icons/fi";
import { formatarPreco } from "../utils/formatarPreco";
import { WHATSAPP } from "../utils/loja";
import { TAMANHOS as tamanhos } from "../dados/produtos";

// estoque: { P: 3, M: 0, ... } vindo do banco, ou null enquanto carrega.
// Sem estoque carregado, nada fica bloqueado (a loja continua vendendo).
export default function ProdutoCard({ produto, estoque, onAdicionar, onComprar }) {
  const [tamanho, setTamanho] = useState(null);
  const [quantidade, setQuantidade] = useState(1);
  const [adicionado, setAdicionado] = useState(false);

  const mensagem = `Olá! Quero saber mais sobre o ${produto.nome}.`;

  // Quantas peças tem de um tamanho (Infinity = sem informação)
  function disponivel(t) {
    return estoque?.[t] ?? Infinity;
  }

  const esgotado = estoque !== null && tamanhos.every((t) => disponivel(t) <= 0);
  const maximo = tamanho ? disponivel(tamanho) : Infinity;

  function diminuir() {
    if (quantidade > 1) {
      setQuantidade(quantidade - 1);
    }
  }

  function aumentar() {
    if (quantidade < maximo) {
      setQuantidade(quantidade + 1);
    }
  }

  function escolherTamanho(t) {
    setTamanho(t);
    // se a quantidade escolhida passa do que tem, ajusta
    setQuantidade((atual) => Math.min(atual, disponivel(t)));
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
    <article
      id={`produto-${produto.id}`}
      className={esgotado ? "cartao esgotado" : "cartao"}
    >
      <div className="cartao-foto">
        {produto.foto ? (
          <img src={produto.foto} alt={produto.nome} />
        ) : (
          <div className="foto-vazia" style={{ background: produto.cor }} />
        )}

        {esgotado && <span className="selo-esgotado">Esgotado</span>}

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
            {tamanhos.map((t) => {
              const acabou = disponivel(t) <= 0;
              let classe = "tamanho";
              if (tamanho === t) classe += " ativo";
              if (acabou) classe += " acabou";

              return (
                <button
                  key={t}
                  type="button"
                  className={classe}
                  onClick={() => escolherTamanho(t)}
                  disabled={acabou}
                  title={acabou ? `Tamanho ${t} esgotado` : `Tamanho ${t}`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <div className="quantidade">
            <button type="button" onClick={diminuir} aria-label="Diminuir quantidade">
              -
            </button>
            <span>{quantidade}</span>
            <button
              type="button"
              onClick={aumentar}
              disabled={quantidade >= maximo}
              aria-label="Aumentar quantidade"
            >
              +
            </button>
          </div>
        </div>

        <div className="cartao-acoes">
          <button
            type="button"
            className="botao-comprar"
            onClick={comprar}
            disabled={!tamanho || esgotado}
          >
            {esgotado
              ? "Esgotado"
              : tamanho
                ? "Comprar agora"
                : "Escolha o tamanho"}
          </button>

          <button
            type="button"
            className={adicionado ? "botao-sacola adicionado" : "botao-sacola"}
            onClick={adicionar}
            disabled={!tamanho || esgotado}
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

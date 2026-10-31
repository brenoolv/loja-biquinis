import { useState } from "react";
import { FiMenu, FiX, FiUser } from "react-icons/fi";
import "./Header.css";

export default function Header({
  totalItens,
  onAbrirCarrinho,
  onAbrirConta,
  logada,
}) {
  // Só usado no celular: o menu fica escondido até tocar no botão
  const [menuAberto, setMenuAberto] = useState(false);

  // Ao tocar num link, o menu fecha e a página rola até a seção
  function fecharMenu() {
    setMenuAberto(false);
  }

  return (
    <header className="topo">
      <button
        type="button"
        className="botao-menu"
        onClick={() => setMenuAberto(!menuAberto)}
        aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
        aria-expanded={menuAberto}
      >
        {menuAberto ? <FiX /> : <FiMenu />}
      </button>

      <a href="#inicio" className="logo" onClick={fecharMenu}>
        <svg
          className="logo-onda"
          viewBox="0 0 48 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M2 9 Q7.5 2 13 9 T24 9 T35 9 T46 9" />
          <path d="M2 17 Q7.5 10 13 17 T24 17 T35 17 T46 17" />
        </svg>
        Oceamar
      </a>
      <nav className={menuAberto ? "menu aberto" : "menu"}>
        <a href="#colecao" onClick={fecharMenu}>Coleção</a>
        <a href="#sobre" onClick={fecharMenu}>Sobre nós</a>
        <a href="#contato" onClick={fecharMenu}>Contato</a>
      </nav>
      <button
        type="button"
        className={logada ? "botao-conta logada" : "botao-conta"}
        onClick={onAbrirConta}
        aria-label={logada ? "Minha conta" : "Entrar"}
        title={logada ? "Minha conta" : "Entrar"}
      >
        <FiUser />
      </button>

      <button
        type="button"
        className="botao-carrinho"
        onClick={onAbrirCarrinho}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 7h12l-1 13H7L6 7z" />
          <path d="M9 7a3 3 0 0 1 6 0" />
        </svg>
        {totalItens > 0 && (
          <span key={totalItens} className="carrinho-contador">
            {totalItens}
          </span>
        )}
        <span className="sr-only">itens no carrinho</span>
      </button>
    </header>
  );
}

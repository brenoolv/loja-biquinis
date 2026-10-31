import { useState } from "react";
import { FiShoppingBag } from "react-icons/fi";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { WHATSAPP, CUPOM } from "../utils/loja";
import "./Links.css";

const MENSAGEM = "Oi! Vim pelo Instagram e queria tirar uma dúvida.";

// Cada botão da página é um item desta lista.
// Pra criar um botão novo, é só adicionar mais um objeto aqui.
const LINKS = [
  { texto: "Loja online", href: "/#colecao", icone: <FiShoppingBag /> },
  {
    texto: "Fale com a gente",
    href: `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(MENSAGEM)}`,
    icone: <FaWhatsapp />,
    externo: true,
  },
  {
    texto: "Nosso Instagram",
    href: "https://instagram.com/use.oceamar",
    icone: <FaInstagram />,
    externo: true,
  },
];

export default function Links() {
  const [copiado, setCopiado] = useState(false);

  async function copiarCupom() {
    try {
      await navigator.clipboard.writeText(CUPOM);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Alguns navegadores bloqueiam a cópia; aí a cliente copia na mão
    }
  }

  return (
    <main className="links">
      <img className="links-logo" src="/favicon.svg" alt="" />

      <h1 className="links-nome">Oceamar</h1>
      <p className="links-sub">Moda praia em Fortaleza, CE</p>

      <p className="links-boas-vindas">
        Oiê, que bom ter você aqui! Primeira vez com a gente?
      </p>

      <button type="button" className="links-cupom" onClick={copiarCupom}>
        <span className="links-cupom-texto">
          Use o cupom no carrinho e ganhe 10% off + frete grátis
        </span>
        <span className="links-cupom-codigo">{CUPOM}</span>
        <span className="links-cupom-acao">
          {copiado ? "Copiado!" : "Toque pra copiar"}
        </span>
      </button>

      <nav className="links-lista">
        {LINKS.map((link) => (
          <a
            key={link.texto}
            className="links-botao"
            href={link.href}
            target={link.externo ? "_blank" : undefined}
            rel={link.externo ? "noopener noreferrer" : undefined}
          >
            <span className="links-icone">{link.icone}</span>
            {link.texto}
          </a>
        ))}
      </nav>

      <p className="links-rodape">@use.oceamar</p>
    </main>
  );
}

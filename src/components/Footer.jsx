import "./Footer.css";
import { WHATSAPP } from "../utils/loja";

export default function Footer() {
  const ano = new Date().getFullYear();

  return (
    <footer id="contato" className="rodape">
      <div className="rodape-conteudo">
        <div id="sobre" className="rodape-marca">
          <p className="rodape-logo">Oceamar</p>
          <h3>Sobre nós</h3>
          <div className="rodape-sobre">
            <p>
              A Oceamar nasceu de uma paixão pelos dias de verão, pelo mar e
              pelo sol, e por tudo aquilo que faz a vida ser mais leve.
            </p>
            <p>
              Mais do que uma marca de moda praia, nós queremos fazer parte dos
              seus dias de sol, dos pés na areia, dos mergulhos no mar e das
              memórias que ficam.
            </p>
            <p>
              Cada detalhe é pensado com carinho para trazer beleza, conforto e
              estilo, valorizando a autenticidade de cada mulher.
            </p>
            <p>
              Acreditamos que a beleza está na simplicidade e na liberdade de se
              sentir bem consigo mesma.
            </p>
            <p className="rodape-slogan">Sua essência encontra o mar.</p>
          </div>
        </div>
        <nav className="rodape-coluna">
          <h3>Navegue</h3>
          <a href="#inicio">Início</a>
          <a href="#colecao">Coleção</a>
          <a href="/privacidade">Política de Privacidade</a>
        </nav>

        <div className="rodape-coluna">
          <h3>Contato</h3>
          <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <a
            href="https://instagram.com/use.oceamar"
            target="_blank"
            rel="noreferrer"
          >
            Instagram
          </a>
        </div>
      </div>

      <div className="rodape-base">
        <p>© {ano} Oceamar. Todos os direitos reservados.</p>
        <p>Emoji animado: Noto Emoji, Google (CC BY 4.0)</p>
      </div>
    </footer>
  );
}

import "./Colecao.css";
import ProdutoCard from "./ProdutoCard";


const produtos = [
  {
    id: 1,
    nome: "Biquíni Triângulo Floral",
    preco: 50.00,
    foto: "/fotos/floral-azul.jpeg",
    cor: "var(--agua)",
  },
  {
    id: 2,
    nome: "Biquíni Meia-Taça Marinho",
    preco:  50.00,
    foto: "/fotos/meia-taca-marinho.jpeg",
    cor: "var(--agua)",
  },
  {
    id: 3,
    nome: "Biquíni Asa Delta Azul Royal",
    preco:  50.00,
    foto: "/fotos/azul-royal.jpeg",
    cor: "var(--agua)",
  },
  {
    id: 4,
    nome: "Biquíni Azul Bebê",
    preco:  55.00,
    foto: "/fotos/azul-bebe.jpeg",
    cor: "var(--agua)",
  },
];

// Produto de R$ 1,00 só pra testar o pagamento de verdade.
// Só aparece abrindo o site com ?teste no endereço (ex.: oceamar.netlify.app/?teste).
// A cliente comum nunca vê. Pode apagar depois dos testes.
const PRODUTO_TESTE = {
  id: 999,
  nome: "Produto de teste",
  preco: 1.0,
  foto: "/fotos/floral-azul.jpeg",
  cor: "var(--agua)",
};

const modoTeste = new URLSearchParams(window.location.search).has("teste");

export default function Colecao({ onAdicionar, onComprar }) {
  const lista = modoTeste ? [PRODUTO_TESTE, ...produtos] : produtos;

  return (
    <section id="colecao" className="colecao">
      <div className="colecao-conteudo">
        <h2>Coleção de estreia</h2>
        <div className="grade">
          {lista.map((p) => (
            <ProdutoCard
              key={p.id}
              produto={p}
              onAdicionar={onAdicionar}
              onComprar={onComprar}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
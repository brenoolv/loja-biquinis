import "./Colecao.css";
import { useState, useEffect } from "react";
import ProdutoCard from "./ProdutoCard";
import { supabase } from "../utils/supabase";


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

  // Estoque de todos os produtos, organizado assim: { 1: { P: 3, M: 0 }, 2: {...} }
  // null = ainda carregando (ou deu erro): aí nada fica bloqueado.
  const [estoque, setEstoque] = useState(null);

  useEffect(() => {
    async function buscarEstoque() {
      const { data, error } = await supabase
        .from("estoque")
        .select("produto_id, tamanho, quantidade");

      if (error) {
        console.error("Não carregou o estoque:", error);
        return;
      }

      const organizado = {};
      for (const linha of data) {
        organizado[linha.produto_id] ??= {};
        organizado[linha.produto_id][linha.tamanho] = linha.quantidade;
      }
      setEstoque(organizado);
    }

    buscarEstoque();
  }, []);

  return (
    <section id="colecao" className="colecao">
      <div className="colecao-conteudo">
        <h2>Coleção de estreia</h2>
        <div className="grade">
          {lista.map((p) => (
            <ProdutoCard
              key={p.id}
              produto={p}
              estoque={estoque ? (estoque[p.id] ?? {}) : null}
              onAdicionar={onAdicionar}
              onComprar={onComprar}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
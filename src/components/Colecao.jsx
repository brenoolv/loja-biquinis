import "./Colecao.css";
import { useState, useEffect } from "react";
import ProdutoCard from "./ProdutoCard";
import { supabase } from "../utils/supabase";
import { PRODUTOS, PRODUTO_TESTE } from "../dados/produtos";

const modoTeste = new URLSearchParams(window.location.search).has("teste");

export default function Colecao({ onAdicionar, onComprar }) {
  const lista = modoTeste ? [PRODUTO_TESTE, ...PRODUTOS] : PRODUTOS;

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
import Faixa from "./components/Faixa";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Colecao from "./components/Colecao";
import Footer from "./components/Footer";
import Carrinho from "./components/Carrinho";
import AvisoPagamento, { lerRetornoPagamento } from "./components/AvisoPagamento";
import Conta from "./components/Conta";
import { supabase } from "./utils/supabase";
import { useState, useEffect } from "react";

export default function App() {
  const [carrinho, setCarrinho] = useState(() => {
    try {
      const salvo = localStorage.getItem("carrinho");
      return salvo ? JSON.parse(salvo) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
  }, [carrinho]);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);

  // ---------- Conta da cliente ----------
  const [usuario, setUsuario] = useState(null); // null = não entrou
  const [contaAberta, setContaAberta] = useState(false);

  // Ao abrir o site, pergunta ao Supabase se já tem alguém logado
  // (a sessão fica guardada no navegador) e fica ouvindo quando a
  // cliente entra ou sai.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUsuario(data.session?.user ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      setUsuario(sessao?.user ?? null);
    });

    // Quando o App sai da tela, para de ouvir
    return () => data.subscription.unsubscribe();
  }, []);

  // Se a cliente está voltando da InfinitePay, guarda os dados do retorno
  const [retornoPagamento, setRetornoPagamento] = useState(lerRetornoPagamento);

  // Pagamento aprovado: esvazia o carrinho e apaga o resumo guardado
  function pagamentoConfirmado() {
    setCarrinho([]);
    localStorage.removeItem("ultimoPedido");
  }

  // Fecha o aviso e limpa o endereço, pra ele não voltar se recarregar a página
  function fecharAviso() {
    setRetornoPagamento(null);
    window.history.replaceState(null, "", window.location.pathname);
  }

  function adicionarAoCarrinho(produto, tamanho, quantidade) {
    setCarrinho((atual) => {
      const existente = atual.find(
        (item) => item.id === produto.id && item.tamanho === tamanho,
      );

      if (existente) {
        return atual.map((item) =>
          item === existente
            ? { ...item, quantidade: item.quantidade + quantidade }
            : item,
        );
      }

      return [
        ...atual,
        {
          id: produto.id,
          nome: produto.nome,
          preco: produto.preco,
          foto: produto.foto,
          tamanho,
          quantidade,
        },
      ];
    });
  }

  function removerDoCarrinho(id, tamanho) {
    setCarrinho((atual) =>
      atual.filter((item) => !(item.id === id && item.tamanho === tamanho)),
    );
  }

  function comprarAgora(produto, tamanho, quantidade) {
    adicionarAoCarrinho(produto, tamanho, quantidade);
    setCarrinhoAberto(true);
  }

  const totalItens = carrinho.reduce((soma, item) => soma + item.quantidade, 0);

  return (
    <>
      <div className="topo-fixo">
        <Faixa />
        <Header
          totalItens={totalItens}
          onAbrirCarrinho={() => setCarrinhoAberto(true)}
          onAbrirConta={() => setContaAberta(true)}
          logada={usuario !== null}
        />
      </div>
      <main>
        <Hero />
        <Colecao onAdicionar={adicionarAoCarrinho} onComprar={comprarAgora} />
      </main>
      <Footer />
      <Carrinho
        aberto={carrinhoAberto}
        itens={carrinho}
        onFechar={() => setCarrinhoAberto(false)}
        onRemover={removerDoCarrinho}
        usuario={usuario}
        onAbrirConta={() => setContaAberta(true)}
      />
      <Conta
        aberto={contaAberta}
        onFechar={() => setContaAberta(false)}
        usuario={usuario}
      />
      {retornoPagamento && (
        <AvisoPagamento
          retorno={retornoPagamento}
          onConfirmado={pagamentoConfirmado}
          onFechar={fecharAviso}
        />
      )}
    </>
  );
}

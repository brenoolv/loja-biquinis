import { useState, useEffect } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { supabase } from "../utils/supabase";
import { formatarPreco } from "../utils/formatarPreco";
import { PRODUTOS, PRODUTO_TESTE, TAMANHOS } from "../dados/produtos";
import { EntrarOuCadastrar } from "./Conta";
import "./Conta.css";
import "./Admin.css";

// =====================================================================
// Painel da dona: oceamar.netlify.app/admin
// Só abre pra contas que estão na tabela "admins" do Supabase.
// Quem protege os dados de verdade são as regras do banco (RLS):
// mesmo que alguém abra esta página, sem ser admin o banco não entrega nada.
// =====================================================================

const STATUS = {
  aguardando_pagamento: "Aguardando pagamento",
  combinar_whatsapp: "Combinar no WhatsApp",
  pago: "Pago",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const FILTROS = {
  abertos: {
    nome: "Em aberto",
    status: ["aguardando_pagamento", "combinar_whatsapp", "pago", "enviado"],
  },
  entregues: { nome: "Entregues", status: ["entregue"] },
  cancelados: { nome: "Cancelados", status: ["cancelado"] },
  todos: { nome: "Todos", status: Object.keys(STATUS) },
};

export default function Admin() {
  const [usuario, setUsuario] = useState(null);
  const [sessaoPronta, setSessaoPronta] = useState(false);
  // Resposta do banco: { id da conta, se é admin }. Fica null até o banco responder.
  const [conferencia, setConferencia] = useState(null);

  // Mesmo esquema do App: descobre quem está logado e fica ouvindo
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUsuario(data.session?.user ?? null);
      setSessaoPronta(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      setUsuario(sessao?.user ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  // Sempre que muda a conta, pergunta ao banco se ela é admin.
  // O estado só muda quando o banco responde (dentro do .then).
  useEffect(() => {
    if (!usuario) return;

    supabase.rpc("eh_admin").then(({ data, error }) => {
      setConferencia({ id: usuario.id, ehAdmin: !error && data === true });
    });
  }, [usuario]);

  // Calculados a cada render, a partir do estado
  const respostaDaConta = usuario && conferencia?.id === usuario.id;
  const ehAdmin = Boolean(respostaDaConta && conferencia.ehAdmin);
  const carregando = !sessaoPronta || (usuario && !respostaDaConta);

  if (carregando) {
    return <p className="admin-centro">Carregando...</p>;
  }

  if (!usuario) {
    return (
      <main className="admin-entrar">
        <h1>Painel da Oceamar</h1>
        <EntrarOuCadastrar soEntrar />
        <a href="/" className="admin-link">
          Voltar pra loja
        </a>
      </main>
    );
  }

  if (!ehAdmin) {
    return (
      <main className="admin-entrar">
        <h1>Painel da Oceamar</h1>
        <p>
          A conta <strong>{usuario.email}</strong> não tem acesso ao painel.
        </p>
        <button
          type="button"
          className="conta-botao"
          onClick={() => supabase.auth.signOut()}
        >
          Entrar com outra conta
        </button>
        <a href="/" className="admin-link">
          Voltar pra loja
        </a>
      </main>
    );
  }

  return <Painel usuario={usuario} />;
}

// ---------- Painel ----------

function Painel({ usuario }) {
  const [aba, setAba] = useState("pedidos");

  return (
    <div className="admin">
      <header className="admin-topo">
        <div>
          <h1>Painel da Oceamar</h1>
          <p>{usuario.email}</p>
        </div>
        <div className="admin-topo-acoes">
          <a href="/" className="admin-link">
            Ver loja
          </a>
          <button
            type="button"
            className="admin-sair"
            onClick={() => supabase.auth.signOut()}
          >
            Sair
          </button>
        </div>
      </header>

      <div className="conta-abas admin-abas" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={aba === "pedidos"}
          className={aba === "pedidos" ? "ativa" : ""}
          onClick={() => setAba("pedidos")}
        >
          Pedidos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === "estoque"}
          className={aba === "estoque" ? "ativa" : ""}
          onClick={() => setAba("estoque")}
        >
          Estoque
        </button>
      </div>

      {aba === "pedidos" ? <PainelPedidos /> : <PainelEstoque />}
    </div>
  );
}

// ---------- Pedidos ----------

// "(85) 99999-0000" -> "5585999990000", pra montar o link do WhatsApp
// "88999990000" -> "(88) 99999-0000"
function formatarTelefone(telefone) {
  const n = telefone.replace(/\D/g, "");
  if (n.length < 10) return telefone;
  return `(${n.slice(0, 2)}) ${n.slice(2, n.length - 4)}-${n.slice(-4)}`;
}

function linkWhatsApp(telefone) {
  let numeros = (telefone ?? "").replace(/\D/g, "");
  if (numeros.length === 10 || numeros.length === 11) numeros = `55${numeros}`;
  return numeros.length >= 12 ? `https://wa.me/${numeros}` : null;
}

// Deixa o telefone num formato só, pra comparar: "5585999990000" e
// "(85) 99999-0000" viram os dois "85999990000"
function telefoneLimpo(telefone) {
  let numeros = (telefone ?? "").replace(/\D/g, "");
  if (numeros.startsWith("55") && numeros.length >= 12)
    numeros = numeros.slice(2);
  return numeros.length >= 10 ? numeros : null;
}

// Procura um pedido mais antigo, com cupom, da mesma pessoa
// (mesma conta ou mesmo telefone). Pedidos cancelados não contam.
function cupomUsadoAntes(pedido, pedidos, clientes) {
  if (!pedido.cupom) return null;

  const telefoneDe = (p) =>
    telefoneLimpo(clientes[p.cliente_id]?.telefone || p.telefone_cliente);
  const telefone = telefoneDe(pedido);

  return (
    pedidos.find(
      (outro) =>
        outro.id !== pedido.id &&
        outro.cupom &&
        outro.status !== "cancelado" &&
        new Date(outro.criado_em) < new Date(pedido.criado_em) &&
        ((pedido.cliente_id && outro.cliente_id === pedido.cliente_id) ||
          (telefone && telefoneDe(outro) === telefone)),
    ) ?? null
  );
}

function PainelPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState({}); // { id: { nome, telefone, email } }
  const [filtro, setFiltro] = useState("abertos");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // Cada vez que "versao" muda, o efeito busca tudo de novo no banco.
  // Atualizar e os botões dos pedidos só aumentam esse número.
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true; // vira false se o painel fechar antes do banco responder

    Promise.all([
      supabase
        .from("pedidos")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(300),
      supabase.from("perfis").select("id, nome, telefone, email"),
    ]).then(([resPedidos, resPerfis]) => {
      if (!ativo) return;

      if (resPedidos.error) {
        console.error(resPedidos.error);
        setErro("Não foi possível carregar os pedidos.");
      } else {
        setErro("");
        setPedidos(resPedidos.data);
      }

      if (!resPerfis.error) {
        const mapa = {};
        for (const perfil of resPerfis.data) mapa[perfil.id] = perfil;
        setClientes(mapa);
      }

      setCarregando(false);
    });

    return () => {
      ativo = false;
    };
  }, [versao]);

  // Busca de novo sem mostrar o "Carregando..." (depois de mudar um pedido)
  function recarregar() {
    setVersao((v) => v + 1);
  }

  // Botão Atualizar: mostra o "Carregando..." e busca de novo
  function atualizar() {
    setCarregando(true);
    recarregar();
  }

  const visiveis = pedidos.filter((p) =>
    FILTROS[filtro].status.includes(p.status),
  );

  return (
    <section>
      <div className="admin-filtros">
        {Object.entries(FILTROS).map(([chave, f]) => {
          const quantos = pedidos.filter((p) =>
            f.status.includes(p.status),
          ).length;
          return (
            <button
              key={chave}
              type="button"
              className={filtro === chave ? "ativo" : ""}
              onClick={() => setFiltro(chave)}
            >
              {f.nome} ({quantos})
            </button>
          );
        })}
        <button type="button" className="admin-atualizar" onClick={atualizar}>
          Atualizar
        </button>
      </div>

      {carregando && <p className="admin-vazio">Carregando pedidos...</p>}
      {erro && <p className="conta-erro">{erro}</p>}
      {!carregando && !erro && visiveis.length === 0 && (
        <p className="admin-vazio">Nenhum pedido aqui.</p>
      )}

      <ul className="admin-pedidos">
        {visiveis.map((pedido) => (
          <CartaoPedido
            key={pedido.id}
            pedido={pedido}
            cliente={pedido.cliente_id ? clientes[pedido.cliente_id] : null}
            cupomRepetido={cupomUsadoAntes(pedido, pedidos, clientes)}
            onMudou={recarregar}
          />
        ))}
      </ul>
    </section>
  );
}

function CartaoPedido({ pedido, cliente, cupomRepetido, onMudou }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  const data = new Date(pedido.criado_em).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const frete = pedido.frete === null ? null : Number(pedido.frete);
  // Telefone do perfil; se não tiver conta, o que ela digitou no carrinho
  const whatsapp = linkWhatsApp(cliente?.telefone || pedido.telefone_cliente);

  // Roda uma ação no banco e recarrega a lista
  async function executar(acao) {
    setOcupado(true);
    setErro("");
    const { error } = await acao();
    setOcupado(false);
    if (error) {
      console.error(error);
      setErro("Não deu certo. Tente de novo.");
    } else {
      onMudou();
    }
  }

  function mudarStatus(status) {
    return executar(() =>
      supabase
        .from("pedidos")
        .update({ status, atualizado_em: new Date().toISOString() })
        .eq("id", pedido.id),
    );
  }

  function marcarPago() {
    if (!window.confirm(`Confirmar que o pedido nº ${pedido.numero} foi pago?`))
      return;
    // Mesma função que o pagamento automático usa: marca pago e desconta o estoque
    return executar(() =>
      supabase.rpc("marcar_pedido_pago", { p_numero: pedido.numero }),
    );
  }

  async function cancelar() {
    if (!window.confirm(`Cancelar o pedido nº ${pedido.numero}?`)) return;

    if (pedido.estoque_baixado) {
      const devolver = window.confirm(
        "As peças deste pedido já tinham saído do estoque. Devolver pro estoque?",
      );
      if (devolver) {
        const { error } = await supabase.rpc("devolver_estoque", {
          p_numero: pedido.numero,
        });
        if (error) {
          setErro("Não consegui devolver o estoque.");
          return;
        }
      }
    }

    mudarStatus("cancelado");
  }

  function devolverEstoque() {
    return executar(() =>
      supabase.rpc("devolver_estoque", { p_numero: pedido.numero }),
    );
  }

  return (
    <li className={`admin-pedido admin-pedido--${pedido.status}`}>
      <div className="admin-pedido-topo">
        <span>
          <strong>Nº {pedido.numero}</strong> · {data}
        </span>
        <span className={`conta-status conta-status--${pedido.status}`}>
          {STATUS[pedido.status] ?? pedido.status}
        </span>
      </div>

      {cupomRepetido && (
        <p className="admin-alerta">
          Esse cliente já usou o cupom {pedido.cupom} no pedido nº{" "}
          {cupomRepetido.numero}. O desconto vale só na primeira compra.
        </p>
      )}

      <div className="admin-cliente">
        {cliente ? (
          <>
            <strong>{cliente.nome || "Sem nome"}</strong>
            <span>{cliente.email}</span>
            {cliente.telefone && <span>{cliente.telefone}</span>}
          </>
        ) : pedido.nome_cliente || pedido.telefone_cliente ? (
          <>
            <strong>{pedido.nome_cliente || "Sem nome"}</strong>
            {pedido.telefone_cliente && (
              <span>{formatarTelefone(pedido.telefone_cliente)}</span>
            )}
            <span className="admin-sem-conta">Comprou sem conta</span>
          </>
        ) : (
          <span className="admin-sem-conta">Comprou sem conta</span>
        )}
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="admin-zap"
          >
            <FaWhatsapp /> Chamar
          </a>
        )}
      </div>

      <ul className="admin-itens">
        {pedido.itens.map((item) => (
          <li key={`${item.produto_id}-${item.tamanho}`}>
            <span>
              {item.quantidade}x {item.nome} (tam. {item.tamanho})
            </span>
            <span>{formatarPreco(item.preco * item.quantidade)}</span>
          </li>
        ))}
      </ul>

      <div className="admin-valores">
        {Number(pedido.desconto) > 0 && (
          <span>
            Desconto{pedido.cupom ? ` (${pedido.cupom})` : ""}: -
            {formatarPreco(Number(pedido.desconto))}
          </span>
        )}
        <span>
          Frete:{" "}
          {frete === null
            ? "a combinar"
            : frete === 0
              ? "grátis"
              : formatarPreco(frete)}
        </span>
        <strong>Total: {formatarPreco(Number(pedido.total))}</strong>
      </div>

      <p className="admin-info">{pedido.recebimento}</p>
      <p className="admin-info">
        Pagamento: {pedido.pagamento}
        {pedido.comprovante && (
          <>
            {" · "}
            <a href={pedido.comprovante} target="_blank" rel="noreferrer">
              ver comprovante
            </a>
          </>
        )}
      </p>

      {erro && <p className="conta-erro">{erro}</p>}

      <div className="admin-acoes">
        {["aguardando_pagamento", "combinar_whatsapp"].includes(
          pedido.status,
        ) && (
          <button
            type="button"
            className="principal"
            disabled={ocupado}
            onClick={marcarPago}
          >
            Marcar como pago
          </button>
        )}
        {pedido.status === "pago" && (
          <button
            type="button"
            className="principal"
            disabled={ocupado}
            onClick={() => mudarStatus("enviado")}
          >
            Marcar como enviado
          </button>
        )}
        {pedido.status === "enviado" && (
          <button
            type="button"
            className="principal"
            disabled={ocupado}
            onClick={() => mudarStatus("entregue")}
          >
            Marcar como entregue
          </button>
        )}
        {[
          "aguardando_pagamento",
          "combinar_whatsapp",
          "pago",
          "enviado",
        ].includes(pedido.status) && (
          <button
            type="button"
            className="perigo"
            disabled={ocupado}
            onClick={cancelar}
          >
            Cancelar
          </button>
        )}
        {pedido.status === "cancelado" && pedido.estoque_baixado && (
          <button type="button" disabled={ocupado} onClick={devolverEstoque}>
            Devolver peças ao estoque
          </button>
        )}
      </div>
    </li>
  );
}

// ---------- Estoque ----------

function PainelEstoque() {
  // { 1: { P: 3, M: 0, ... }, ... } — o que está nos campos
  const [valores, setValores] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(null); // id do produto salvando
  const [salvo, setSalvo] = useState(null); // id do produto que acabou de salvar
  const [erro, setErro] = useState("");

  const produtos = [...PRODUTOS, PRODUTO_TESTE];

  useEffect(() => {
    async function buscar() {
      const { data, error } = await supabase
        .from("estoque")
        .select("produto_id, tamanho, quantidade");

      if (error) {
        setErro("Não foi possível carregar o estoque.");
      } else {
        const organizado = {};
        for (const linha of data) {
          organizado[linha.produto_id] ??= {};
          organizado[linha.produto_id][linha.tamanho] = linha.quantidade;
        }
        setValores(organizado);
      }
      setCarregando(false);
    }

    buscar();
  }, []);

  function mudar(produtoId, tamanho, texto) {
    const numero = Math.max(0, parseInt(texto, 10) || 0);
    setValores((atual) => ({
      ...atual,
      [produtoId]: { ...atual[produtoId], [tamanho]: numero },
    }));
    setSalvo(null);
  }

  async function salvar(produtoId) {
    setSalvando(produtoId);
    setErro("");

    // upsert: atualiza se já existe, cria se não existe
    const linhas = TAMANHOS.map((tamanho) => ({
      produto_id: produtoId,
      tamanho,
      quantidade: valores[produtoId]?.[tamanho] ?? 0,
    }));

    const { error } = await supabase
      .from("estoque")
      .upsert(linhas, { onConflict: "produto_id,tamanho" });

    if (error) {
      console.error(error);
      setErro("Não deu pra salvar. Tente de novo.");
    } else {
      setSalvo(produtoId);
    }
    setSalvando(null);
  }

  if (carregando) return <p className="admin-vazio">Carregando estoque...</p>;

  return (
    <section>
      <p className="admin-dica">
        Mude as quantidades e toque em Salvar. As vendas aprovadas descontam
        sozinhas; as do WhatsApp descontam quando você toca em "Marcar como
        pago".
      </p>
      {erro && <p className="conta-erro">{erro}</p>}

      <ul className="admin-estoque">
        {produtos.map((produto) => (
          <li key={produto.id}>
            <div className="admin-estoque-nome">
              <strong>{produto.nome}</strong>
              <span>id {produto.id}</span>
            </div>

            <div className="admin-estoque-tamanhos">
              {TAMANHOS.map((tamanho) => (
                <label key={tamanho}>
                  {tamanho}
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={valores[produto.id]?.[tamanho] ?? 0}
                    onChange={(e) => mudar(produto.id, tamanho, e.target.value)}
                  />
                </label>
              ))}
            </div>

            <button
              type="button"
              className="principal"
              disabled={salvando === produto.id}
              onClick={() => salvar(produto.id)}
            >
              {salvando === produto.id
                ? "Salvando..."
                : salvo === produto.id
                  ? "Salvo!"
                  : "Salvar"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

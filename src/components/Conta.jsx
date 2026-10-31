import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";
import { FiChevronDown } from "react-icons/fi";
import { formatarPreco } from "../utils/formatarPreco";
import { WHATSAPP } from "../utils/loja";
import {
  criarLinkPagamento,
  guardarUltimoPedido,
  lerPedidosPagos,
} from "../utils/pagamento";
import "./Conta.css";

// Texto que a cliente vê pra cada status do banco
const STATUS = {
  aguardando_pagamento: "Aguardando pagamento",
  combinar_whatsapp: "Combinando no WhatsApp",
  pago: "Pago",
  enviado: "Saiu pra entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

// O Supabase responde os erros em inglês; aqui viram português
function traduzirErro(mensagem = "") {
  if (mensagem.includes("Invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (mensagem.includes("already registered"))
    return "Já existe uma conta com esse e-mail. Tente entrar.";
  if (mensagem.includes("Password should be at least"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (mensagem.includes("valid email") || mensagem.includes("invalid format"))
    return "Esse e-mail não parece válido.";
  if (mensagem.includes("rate limit"))
    return "Muitas tentativas seguidas. Espere um pouco e tente de novo.";
  return "Não deu certo. Tente de novo em instantes.";
}

export default function Conta({ aberto, onFechar, usuario }) {
  return (
    <>
      <div
        className={aberto ? "conta-fundo aberto" : "conta-fundo"}
        onClick={onFechar}
      />

      <aside className={aberto ? "conta aberto" : "conta"} inert={!aberto}>
        <div className="conta-topo">
          <h2>{usuario ? "Minha conta" : "Entrar"}</h2>
          <button
            type="button"
            className="conta-fechar"
            onClick={onFechar}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="conta-conteudo">
          {usuario ? (
            <AreaDaCliente usuario={usuario} aberto={aberto} onFechar={onFechar} />
          ) : (
            <EntrarOuCadastrar />
          )}
        </div>
      </aside>
    </>
  );
}

// ---------- Quem ainda não entrou ----------

function EntrarOuCadastrar() {
  const [modo, setModo] = useState("entrar"); // "entrar" ou "cadastrar"
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar(evento) {
    evento.preventDefault();
    setEnviando(true);
    setErro("");

    const { error } =
      modo === "entrar"
        ? await supabase.auth.signInWithPassword({ email, password: senha })
        : await supabase.auth.signUp({
            email,
            password: senha,
            // vai pro raw_user_meta_data, e o gatilho do banco cria o perfil
            options: { data: { nome: nome.trim(), telefone: telefone.trim() } },
          });

    // Se deu certo, o App fica sabendo sozinho (onAuthStateChange)
    // e esta tela troca pra "Minha conta".
    if (error) setErro(traduzirErro(error.message));
    setEnviando(false);
  }

  function trocarModo(novo) {
    setModo(novo);
    setErro("");
  }

  return (
    <div className="conta-secao">
      <div className="conta-abas" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={modo === "entrar"}
          className={modo === "entrar" ? "ativa" : ""}
          onClick={() => trocarModo("entrar")}
        >
          Entrar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={modo === "cadastrar"}
          className={modo === "cadastrar" ? "ativa" : ""}
          onClick={() => trocarModo("cadastrar")}
        >
          Criar conta
        </button>
      </div>

      <p className="conta-explica">
        {modo === "entrar"
          ? "Entre pra acompanhar seus pedidos."
          : "Com uma conta, seus pedidos ficam salvos em qualquer celular."}
      </p>

      <form className="conta-form" onSubmit={enviar}>
        {modo === "cadastrar" && (
          <>
            <label>
              Nome
              <input
                type="text"
                autoComplete="name"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </label>
            <label>
              WhatsApp
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(85) 90000-0000"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </label>
          </>
        )}

        <label>
          E-mail
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label>
          Senha
          <input
            type="password"
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            minLength={6}
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </label>

        {erro && <p className="conta-erro">{erro}</p>}

        <button type="submit" className="conta-botao" disabled={enviando}>
          {enviando
            ? "Aguarde..."
            : modo === "entrar"
              ? "Entrar"
              : "Criar conta"}
        </button>
      </form>
    </div>
  );
}

// ---------- Quem já entrou ----------

function AreaDaCliente({ usuario, aberto, onFechar }) {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [abertoId, setAbertoId] = useState(null); // pedido com detalhes à mostra

  const nome = usuario.user_metadata?.nome || usuario.email;

  // Busca os pedidos toda vez que a gaveta abre, pra mostrar o status mais novo.
  // O .eq("cliente_id", ...) é necessário: pra conta ADMIN, as regras do banco
  // liberam os pedidos de todo mundo, e "Meus pedidos" tem que mostrar só os dela.
  useEffect(() => {
    if (!aberto) return;

    async function buscar() {
      setCarregando(true);
      setPedidos([]); // não mostra os pedidos da conta anterior enquanto carrega
      const { data, error } = await supabase
        .from("pedidos")
        .select(
          "id, numero, itens, subtotal, desconto, frete, total, cupom, status, recebimento, pagamento, criado_em",
        )
        .eq("cliente_id", usuario.id)
        .order("criado_em", { ascending: false });

      if (error) {
        console.error(error);
        setErro("Não foi possível carregar seus pedidos agora.");
      } else {
        setErro("");
        setPedidos(data);
      }
      setCarregando(false);
    }

    buscar();
  }, [aberto, usuario.id]);

  return (
    <>
      <div className="conta-secao conta-ola">
        <p>
          Olá, <strong>{nome}</strong>
        </p>
        <button
          type="button"
          className="conta-sair"
          onClick={() => supabase.auth.signOut()}
        >
          Sair
        </button>
      </div>

      <div className="conta-secao">
        <h3 className="conta-titulo">Meus pedidos</h3>

        {carregando && <p className="conta-explica">Carregando...</p>}
        {erro && <p className="conta-erro">{erro}</p>}
        {!carregando && !erro && pedidos.length === 0 && (
          <p className="conta-explica">
            Você ainda não fez nenhum pedido com esta conta.
          </p>
        )}

        <ul className="conta-pedidos">
          {pedidos.map((pedido) => {
            const detalhes = abertoId === pedido.id;

            return (
              <li
                key={pedido.id}
                className={detalhes ? "conta-pedido aberto" : "conta-pedido"}
              >
                {/* O cartão inteiro é um botão: toca e abre os detalhes */}
                <button
                  type="button"
                  className="conta-pedido-resumo"
                  onClick={() => setAbertoId(detalhes ? null : pedido.id)}
                  aria-expanded={detalhes}
                >
                  <span className="conta-pedido-topo">
                    <span>
                      {new Date(pedido.criado_em).toLocaleDateString("pt-BR")}
                    </span>
                    <span
                      className={`conta-status conta-status--${pedido.status}`}
                    >
                      {STATUS[pedido.status] ?? pedido.status}
                    </span>
                  </span>

                  <span className="conta-pedido-itens">
                    {pedido.itens
                      .map((item) => `${item.quantidade}x ${item.nome}`)
                      .join(", ")}
                  </span>

                  <span className="conta-pedido-fim">
                    <span>{detalhes ? "Fechar" : "Ver detalhes"}</span>
                    <strong>
                      {formatarPreco(Number(pedido.total))}
                      <FiChevronDown className="conta-seta" />
                    </strong>
                  </span>
                </button>

                {detalhes && <DetalhesPedido pedido={pedido} onFechar={onFechar} />}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

// ---------- Detalhes de um pedido ----------

function DetalhesPedido({ pedido, onFechar }) {
  const [pagando, setPagando] = useState(false);
  const [erro, setErro] = useState("");

  const frete = pedido.frete === null ? null : Number(pedido.frete);
  const mensagem = `Olá! Quero falar sobre o meu pedido nº ${pedido.numero}.`;

  // Dá pra pagar pelo site quando: ainda não foi pago, o valor está fechado
  // (frete não é "a combinar"), não usou cupom (cupom é conferido no WhatsApp),
  // não é em dinheiro e este aparelho não viu esse pedido sendo pago.
  const podePagar =
    pedido.status === "aguardando_pagamento" &&
    frete !== null &&
    !pedido.cupom &&
    pedido.pagamento !== "Dinheiro" &&
    !lerPedidosPagos().includes(pedido.numero);

  async function pagar() {
    setPagando(true);
    setErro("");

    try {
      const link = await criarLinkPagamento({
        numero: pedido.numero, // o mesmo número: continua sendo o mesmo pedido
        itens: pedido.itens,
        subtotal: Number(pedido.subtotal),
        desconto: Number(pedido.desconto),
        frete: frete ?? 0,
      });

      guardarUltimoPedido({
        numero: pedido.numero,
        linhas: pedido.itens.map(
          (item) =>
            `• ${item.quantidade}x ${item.nome} (tam. ${item.tamanho}) - ${formatarPreco(item.preco * item.quantidade)}`,
        ),
        total: Number(pedido.total),
        entrega: pedido.recebimento,
      });

      window.location.href = link;
    } catch (e) {
      console.error(e);
      setErro("Não foi possível abrir o pagamento. Tente de novo em instantes.");
      setPagando(false);
    }
  }

  return (
    <div className="conta-detalhes">
      <p className="conta-detalhes-numero">Pedido nº {pedido.numero}</p>

      <ul className="conta-detalhes-itens">
        {pedido.itens.map((item) => (
          <li key={`${item.produto_id}-${item.tamanho}`}>
            <span>
              {item.quantidade}x {item.nome} (tam. {item.tamanho})
            </span>
            <span>{formatarPreco(item.preco * item.quantidade)}</span>
          </li>
        ))}
      </ul>

      <div className="conta-detalhes-contas">
        <p>
          <span>Subtotal</span>
          <span>{formatarPreco(Number(pedido.subtotal))}</span>
        </p>
        {Number(pedido.desconto) > 0 && (
          <p>
            <span>Desconto{pedido.cupom ? ` (${pedido.cupom})` : ""}</span>
            <span>-{formatarPreco(Number(pedido.desconto))}</span>
          </p>
        )}
        <p>
          <span>Frete</span>
          <span>
            {frete === null
              ? "A combinar"
              : frete === 0
                ? "Grátis"
                : formatarPreco(frete)}
          </span>
        </p>
        <p className="conta-detalhes-total">
          <span>Total</span>
          <strong>{formatarPreco(Number(pedido.total))}</strong>
        </p>
      </div>

      <p className="conta-detalhes-info">{pedido.recebimento}</p>
      <p className="conta-detalhes-info">Pagamento: {pedido.pagamento}</p>

      <div className="conta-detalhes-botoes">
        {podePagar && (
          <button
            type="button"
            className="conta-detalhes-pagar"
            onClick={pagar}
            disabled={pagando}
          >
            {pagando ? "Abrindo pagamento..." : `Pagar agora com ${pedido.pagamento}`}
          </button>
        )}
        {erro && <p className="conta-erro">{erro}</p>}

        <a
          className="conta-detalhes-whatsapp"
          href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem)}`}
          target="_blank"
          rel="noreferrer"
        >
          Falar sobre este pedido no WhatsApp
        </a>

        <button
          type="button"
          className="conta-detalhes-loja"
          onClick={onFechar}
        >
          Continuar comprando
        </button>
      </div>
    </div>
  );
}

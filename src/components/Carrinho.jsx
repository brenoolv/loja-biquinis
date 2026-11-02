import { useState, useEffect } from "react";
import { FiTrash2 } from "react-icons/fi";
import "./Carrinho.css";
import { formatarPreco } from "../utils/formatarPreco";
import {
  opcoesDeEntrega,
  OPCOES_RETIRADA,
  calcularDistancia,
} from "../utils/frete";
import { WHATSAPP, CUPOM, DESCONTO } from "../utils/loja";
import { criarLinkPagamento, guardarUltimoPedido } from "../utils/pagamento";
import OpcoesFrete from "./OpcoesFrete";
import { supabase } from "../utils/supabase";

// "88999990000" -> "(88) 99999-0000", enquanto a cliente digita
function formatarTelefone(numeros) {
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

// Lê o nome e o WhatsApp que a cliente já digitou numa compra anterior
function lerDadosSalvos() {
  try {
    return JSON.parse(localStorage.getItem("dadosCliente")) ?? {};
  } catch {
    return {};
  }
}

const formasPagamento = {
  pix: "Pix",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
};

export default function Carrinho({
  aberto,
  itens,
  onFechar,
  onRemover,
  usuario,
  onAbrirConta,
}) {
  const [recebimento, setRecebimento] = useState("entrega");
  const [pagamento, setPagamento] = useState("pix");
  const [pagando, setPagando] = useState(false);
  const [erroPagamento, setErroPagamento] = useState("");

  const [cep, setCep] = useState("");
  const [enderecoCep, setEnderecoCep] = useState(null);
  const [distancia, setDistancia] = useState(null); // km, ou null se não deu pra calcular
  const [calculando, setCalculando] = useState(false);
  const [erroCep, setErroCep] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [freteId, setFreteId] = useState(null);
  const [retiradaId, setRetiradaId] = useState("retirar");

  const [cupomDigitado, setCupomDigitado] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState(false);
  const [erroCupom, setErroCupom] = useState("");

  // Só pra quem compra sem conta. Começa com o que ficou salvo no aparelho.
  const [nomeCliente, setNomeCliente] = useState(() => lerDadosSalvos().nome ?? "");
  const [telefoneCliente, setTelefoneCliente] = useState(
    () => lerDadosSalvos().telefone ?? "",
  );

  // Toda vez que ela digita, guarda no aparelho pra próxima compra
  useEffect(() => {
    localStorage.setItem(
      "dadosCliente",
      JSON.stringify({ nome: nomeCliente, telefone: telefoneCliente }),
    );
  }, [nomeCliente, telefoneCliente]);

  useEffect(() => {
    function aoVoltar(evento) {
      if (evento.persisted) {
        setPagando(false);
      }
    }

    window.addEventListener("pageshow", aoVoltar);
    return () => window.removeEventListener("pageshow", aoVoltar);
  }, []);

  // ---------- Contas ----------
  // Tudo aqui é calculado a partir do estado, a cada render.
  // Não precisa de useState pra isso: se o estado muda, as contas mudam juntas.

  const subtotal = itens.reduce(
    (soma, item) => soma + item.preco * item.quantidade,
    0,
  );
  const desconto = cupomAplicado ? subtotal * DESCONTO : 0;

  const opcoesFrete =
    recebimento === "entrega" && enderecoCep
      ? opcoesDeEntrega(distancia)
      : [];

  const disponiveis = opcoesFrete.filter((opcao) => !opcao.indisponivel);

  // Se só sobra uma opção, ela já vem marcada
  const opcaoFrete =
    disponiveis.find((opcao) => opcao.id === freteId) ??
    (disponiveis.length === 1 ? disponiveis[0] : null);

  const opcaoRetirada = OPCOES_RETIRADA.find((opcao) => opcao.id === retiradaId);

  // 0 = sem frete (retirada) ou grátis | null = a combinar
  let frete = 0;
  if (recebimento === "entrega" && opcaoFrete) {
    if (opcaoFrete.valor === null) frete = null;
    else frete = cupomAplicado ? 0 : opcaoFrete.valor;
  }

  const total = subtotal - desconto + (frete ?? 0);
  const cepFormatado =
    cep.length > 5 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep;

  const enderecoCompleto = enderecoCep
    ? `${enderecoCep.logradouro}, ${numero}` +
      (complemento ? ` - ${complemento}` : "") +
      `, ${enderecoCep.bairro}, ${enderecoCep.localidade}-${enderecoCep.uf}, CEP ${cepFormatado}`
    : "";

  const podeFinalizar =
    recebimento === "retirada" ||
    (enderecoCep !== null && numero.trim() !== "" && opcaoFrete !== null);

  // Quem tem conta já tem nome e telefone no perfil.
  // Quem não tem precisa preencher: nome e WhatsApp com DDD (10 ou 11 números).
  const dadosOk =
    Boolean(usuario) ||
    (nomeCliente.trim().length >= 2 &&
      (telefoneCliente.length === 10 || telefoneCliente.length === 11));

  let motivoBloqueio = "";
  if (recebimento === "entrega") {
    if (!enderecoCep) motivoBloqueio = "Calcule o frete pelo seu CEP";
    else if (numero.trim() === "") motivoBloqueio = "Preencha o número da casa";
    else if (!opcaoFrete) motivoBloqueio = "Escolha uma opção de frete";
  }

  // ---------- Ações ----------

  // 1. busca o endereço no ViaCEP  2. mede a distância até a loja
  async function calcularFrete(evento) {
    evento.preventDefault(); // é um <form>: impede de recarregar a página

    if (cep.length !== 8) {
      setErroCep("O CEP tem 8 números.");
      return;
    }

    setCalculando(true);
    setErroCep("");
    setEnderecoCep(null);
    setFreteId(null);

    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = await resposta.json();

      if (dados.erro) {
        setErroCep("CEP não encontrado. Confere os números.");
        return;
      }

      const km = await calcularDistancia(cep, dados);
      setDistancia(km);
      setEnderecoCep(dados);
    } catch {
      setErroCep("Não foi possível buscar o CEP. Tenta de novo.");
    } finally {
      setCalculando(false);
    }
  }

  function mudarCep(evento) {
    const numeros = evento.target.value.replace(/\D/g, "").slice(0, 8);
    setCep(numeros);
    setEnderecoCep(null);
    setFreteId(null);
    setErroCep("");
  }

  function aplicarCupom(evento) {
    evento.preventDefault(); // impede o formulário de recarregar a página

    if (cupomDigitado.trim().toUpperCase() === CUPOM) {
      setCupomAplicado(true);
      setErroCupom("");
    } else {
      setErroCupom("Cupom inválido. Confere se digitou certinho.");
    }
  }

  function removerCupom() {
    setCupomAplicado(false);
    setCupomDigitado("");
  }

  async function pagarAgora() {
    setPagando(true);
    setErroPagamento("");

    try {
      const numeroPedido = String(Date.now());

      // 1. Registra o pedido no banco ANTES de ir pro pagamento.
      // Sem isso, o aviso da InfinitePay chegaria e não acharia o pedido.
      const salvou = await salvarPedido(numeroPedido, "aguardando_pagamento");
      if (!salvou) {
        setErroPagamento(
          "Não conseguimos registrar seu pedido agora. Finalize pelo WhatsApp que a gente te atende.",
        );
        setPagando(false);
        return;
      }

      // 2. Cria o link de pagamento
      const link = await criarLinkPagamento({
        numero: numeroPedido,
        itens,
        subtotal,
        desconto,
        frete: frete ?? 0,
        descricaoFrete: opcaoFrete ? `Frete (${opcaoFrete.nome})` : "Frete",
        endereco:
          recebimento === "entrega"
            ? { cep, number: numero, complement: complemento }
            : null,
      });

      // Guarda um resumo pra mostrar na tela de "Obrigada" quando ela voltar
      guardarUltimoPedido({
        numero: numeroPedido,
        linhas: linhasItens,
        total,
        entrega: textoRecebimento,
      });

      window.location.href = link;
    } catch (erro) {
      console.error(erro);
      setErroPagamento(
        "Não foi possível abrir o pagamento. Tente de novo ou finalize pelo WhatsApp.",
      );
      setPagando(false);
    }
  }

  function mudarTelefone(evento) {
    setTelefoneCliente(evento.target.value.replace(/\D/g, "").slice(0, 11));
  }

  // ---------- Mensagem do WhatsApp ----------

  const textoFrete =
    frete === null ? "a combinar" : frete === 0 ? "grátis" : formatarPreco(frete);

  const linhasItens = itens.map(
    (item) =>
      `• ${item.quantidade}x ${item.nome} (tam. ${item.tamanho}) - ${formatarPreco(item.preco * item.quantidade)}`,
  );

  function montarMensagem(numeroPedido) {
    return [
      // Em cima e em maiúsculo pra você ver na hora quem usou o cupom
      cupomAplicado ? `*PEDIDO COM CUPOM ${CUPOM}*` : null,
      "Olá! Quero fazer este pedido:",
      !usuario && nomeCliente.trim() ? `Nome: ${nomeCliente.trim()}` : null,
      numeroPedido ? `Pedido nº ${numeroPedido}` : null,
      "",
      ...linhasItens,
      "",
      `Subtotal: ${formatarPreco(subtotal)}`,
      cupomAplicado
        ? `Cupom ${CUPOM} (10%): -${formatarPreco(desconto)}`
        : null,
      opcaoFrete ? `Frete (${opcaoFrete.nome}): ${textoFrete}` : null,
      `Total: ${formatarPreco(total)}`,
      "",
      recebimento === "entrega"
        ? `Entrega em: ${enderecoCompleto}`
        : retiradaId === "uber-flash"
          ? "Retirada por Uber Flash (eu chamo o motorista)"
          : "Vou retirar o pedido",
      `Pagamento: ${formasPagamento[pagamento]}`,
    ]
      .filter((linha) => linha !== null)
      .join("\n");
  }

  const textoRecebimento =
    recebimento === "entrega"
      ? `Entrega em: ${enderecoCompleto}${opcaoFrete ? ` (${opcaoFrete.nome})` : ""}`
      : retiradaId === "uber-flash"
        ? "Retirada por Uber Flash"
        : "Retirada na loja";

  // ---------- Salvar no banco ----------
  // Grava o pedido na tabela "pedidos" do Supabase. Se a cliente estiver
  // logada, o pedido fica ligado à conta dela e aparece em "Meus pedidos".
  async function salvarPedido(numeroPedido, status) {
    const { error } = await supabase.from("pedidos").insert({
      numero: numeroPedido,
      cliente_id: usuario?.id ?? null,
      // Pra Agatha saber de quem é o pedido, mesmo sem conta
      nome_cliente: usuario ? usuario.user_metadata?.nome ?? null : nomeCliente.trim(),
      telefone_cliente: usuario
        ? usuario.user_metadata?.telefone ?? null
        : telefoneCliente,
      itens: itens.map((item) => ({
        produto_id: item.id,
        nome: item.nome,
        tamanho: item.tamanho,
        quantidade: item.quantidade,
        preco: item.preco,
      })),
      subtotal,
      desconto,
      frete,
      total,
      cupom: cupomAplicado ? CUPOM : null,
      recebimento: textoRecebimento,
      pagamento: formasPagamento[pagamento],
      status,
    });

    if (error) console.error("Não salvou o pedido no banco:", error);
    return !error; // true = salvou
  }

  // Abre o WhatsApp na hora (o navegador bloqueia se esperar o banco)
  // e grava o pedido logo depois.
  function finalizarPeloWhatsApp(evento) {
    evento.preventDefault();
    const numeroPedido = String(Date.now());
    const texto = encodeURIComponent(montarMensagem(numeroPedido));
    window.open(`https://wa.me/${WHATSAPP}?text=${texto}`, "_blank", "noreferrer");
    salvarPedido(numeroPedido, "combinar_whatsapp");
  }

  const mostrarPagarAgora =
    pagamento !== "dinheiro" && !cupomAplicado && frete !== null;

  // Quando o "Pagar agora" some, a cliente precisa saber por quê
  let semPagamentoOnline = "";
  if (cupomAplicado) {
    semPagamentoOnline =
      "Pedidos com cupom são finalizados pelo WhatsApp, onde confirmamos o desconto.";
  } else if (frete === null) {
    semPagamentoOnline =
      "Como o frete é a combinar, finalize pelo WhatsApp.";
  } else if (pagamento === "dinheiro") {
    semPagamentoOnline = "Pagamento em dinheiro é combinado pelo WhatsApp.";
  }

  // ---------- Tela ----------

  return (
    <>
      <div
        className={aberto ? "carrinho-fundo aberto" : "carrinho-fundo"}
        onClick={onFechar}
      />

      <aside
        className={aberto ? "carrinho aberto" : "carrinho"}
        inert={!aberto}
      >
        <div className="carrinho-topo">
          <h2>Seu carrinho</h2>
          <button
            type="button"
            className="carrinho-fechar"
            onClick={onFechar}
            aria-label="Fechar carrinho"
          >
            ×
          </button>
        </div>

        {itens.length === 0 ? (
          <p className="carrinho-vazio">Seu carrinho está vazio.</p>
        ) : (
          <>
            <div className="carrinho-conteudo">
              {/* ---- Itens ---- */}
              <section className="carrinho-secao">
                <ul className="carrinho-lista">
                  {itens.map((item) => (
                    <li
                      key={`${item.id}-${item.tamanho}`}
                      className="carrinho-item"
                    >
                      <img src={item.foto} alt={item.nome} />

                      <div className="carrinho-item-info">
                        <p className="carrinho-item-nome">{item.nome}</p>
                        <p className="carrinho-item-detalhe">
                          Tam. {item.tamanho} · {item.quantidade} un.
                        </p>
                        <p className="carrinho-item-preco">
                          {formatarPreco(item.preco * item.quantidade)}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="carrinho-remover"
                        onClick={() => onRemover(item.id, item.tamanho)}
                        aria-label={`Remover ${item.nome}`}
                      >
                        <FiTrash2 />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              {/* ---- Entrega ---- */}
              <section className="carrinho-secao">
                <h3 className="carrinho-secao-titulo">Como quer receber?</h3>

                <div className="carrinho-abas" role="radiogroup">
                  <label className={recebimento === "entrega" ? "ativa" : ""}>
                    <input
                      type="radio"
                      name="recebimento"
                      checked={recebimento === "entrega"}
                      onChange={() => setRecebimento("entrega")}
                    />
                    Entrega
                  </label>
                  <label className={recebimento === "retirada" ? "ativa" : ""}>
                    <input
                      type="radio"
                      name="recebimento"
                      checked={recebimento === "retirada"}
                      onChange={() => setRecebimento("retirada")}
                    />
                    Retirada
                  </label>
                </div>

                {recebimento === "entrega" ? (
                  <div className="carrinho-endereco">
                    <form className="carrinho-cep" onSubmit={calcularFrete}>
                      <label>
                        CEP
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          placeholder="00000-000"
                          value={cepFormatado}
                          onChange={mudarCep}
                        />
                      </label>
                      <button type="submit" disabled={calculando}>
                        {calculando ? "Calculando..." : "Calcular frete"}
                      </button>
                    </form>
                    {erroCep && <span className="carrinho-erro">{erroCep}</span>}

                    {enderecoCep && (
                      <>
                        <p className="carrinho-endereco-achado">
                          {enderecoCep.logradouro}, {enderecoCep.bairro},{" "}
                          {enderecoCep.localidade} - {enderecoCep.uf}
                        </p>

                        <div className="carrinho-endereco-linha">
                          <label>
                            Número
                            <input
                              type="text"
                              inputMode="numeric"
                              value={numero}
                              onChange={(e) => setNumero(e.target.value)}
                            />
                          </label>
                          <label>
                            Complemento
                            <input
                              type="text"
                              placeholder="Opcional"
                              value={complemento}
                              onChange={(e) => setComplemento(e.target.value)}
                            />
                          </label>
                        </div>

                        <OpcoesFrete
                          opcoes={opcoesFrete}
                          escolhida={opcaoFrete?.id ?? null}
                          aoEscolher={setFreteId}
                          freteGratis={cupomAplicado}
                        />
                      </>
                    )}
                  </div>
                ) : (
                  <OpcoesFrete
                    titulo="Como vai retirar?"
                    nome="retirada"
                    opcoes={OPCOES_RETIRADA}
                    escolhida={retiradaId}
                    aoEscolher={setRetiradaId}
                  />
                )}
              </section>

              {/* ---- Pagamento ---- */}
              <section className="carrinho-secao">
                <h3 className="carrinho-secao-titulo">Forma de pagamento</h3>

                <div className="carrinho-abas" role="radiogroup">
                  {Object.entries(formasPagamento).map(([chave, nome]) => (
                    <label
                      key={chave}
                      className={pagamento === chave ? "ativa" : ""}
                    >
                      <input
                        type="radio"
                        name="pagamento"
                        checked={pagamento === chave}
                        onChange={() => setPagamento(chave)}
                      />
                      {nome}
                    </label>
                  ))}
                </div>
              </section>

              {/* ---- Cupom ---- */}
              <section className="carrinho-secao">
                <h3 className="carrinho-secao-titulo">Cupom de desconto</h3>

                {cupomAplicado ? (
                  <div className="carrinho-cupom-aplicado">
                    <span>
                      <strong>{CUPOM}</strong> aplicado: 10% off + frete grátis
                    </span>
                    <button type="button" onClick={removerCupom}>
                      Remover
                    </button>
                  </div>
                ) : (
                  <form className="carrinho-cupom" onSubmit={aplicarCupom}>
                    <input
                      type="text"
                      placeholder="Digite o cupom"
                      autoCapitalize="characters"
                      value={cupomDigitado}
                      onChange={(e) => setCupomDigitado(e.target.value)}
                    />
                    <button type="submit">Aplicar</button>
                  </form>
                )}
                {erroCupom && <p className="carrinho-erro">{erroCupom}</p>}
              </section>

              {/* ---- Seus dados ---- */}
              <section className="carrinho-secao">
                {usuario ? (
                  <p className="carrinho-conta">
                    Comprando como{" "}
                    <strong>{usuario.user_metadata?.nome || usuario.email}</strong>.
                    Este pedido vai aparecer em Meus pedidos.
                  </p>
                ) : (
                  <>
                    <h3 className="carrinho-secao-titulo">Seus dados</h3>
                    <div className="carrinho-dados">
                      <label>
                        Nome
                        <input
                          type="text"
                          autoComplete="name"
                          placeholder="Seu nome"
                          value={nomeCliente}
                          onChange={(e) => setNomeCliente(e.target.value)}
                        />
                      </label>
                      <label>
                        WhatsApp
                        <input
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="(85) 99999-0000"
                          value={formatarTelefone(telefoneCliente)}
                          onChange={mudarTelefone}
                        />
                      </label>
                    </div>
                    <p className="carrinho-conta">
                      Já tem conta?{" "}
                      <button type="button" onClick={onAbrirConta}>
                        Entre aqui
                      </button>{" "}
                      e acompanhe o pedido em Meus pedidos.
                    </p>
                  </>
                )}
              </section>

              {/* ---- Resumo ---- */}
              <section className="carrinho-secao carrinho-resumo">
                <div className="carrinho-linha">
                  <span>Subtotal</span>
                  <span>{formatarPreco(subtotal)}</span>
                </div>

                {cupomAplicado && (
                  <div className="carrinho-linha carrinho-desconto">
                    <span>Desconto</span>
                    <span>-{formatarPreco(desconto)}</span>
                  </div>
                )}

                {opcaoFrete && (
                  <div className="carrinho-linha">
                    <span>Frete</span>
                    <span>
                      {frete === null
                        ? "A combinar"
                        : frete === 0
                          ? "Grátis"
                          : formatarPreco(frete)}
                    </span>
                  </div>
                )}
              </section>
            </div>

            {/* ---- Rodapé fixo: sempre visível no celular ---- */}
            <div className="carrinho-fim">
              <div className="carrinho-linha carrinho-total">
                <span>Total</span>
                <strong>{formatarPreco(total)}</strong>
              </div>

              {!podeFinalizar && (
                <p className="carrinho-falta">{motivoBloqueio}</p>
              )}

              {/* Só aparece quando dá pra pagar, pra não ocupar espaço no celular */}
              {/* Sem nome e WhatsApp, o pagamento online fica escondido */}
              {mostrarPagarAgora && podeFinalizar && !dadosOk && (
                <p className="carrinho-falta">
                  Preencha seu nome e WhatsApp pra pagar online
                </p>
              )}

              {mostrarPagarAgora && podeFinalizar && dadosOk && (
                <button
                  type="button"
                  className="carrinho-pagar"
                  onClick={pagarAgora}
                  disabled={pagando || !podeFinalizar}
                >
                  {pagando
                    ? "Abrindo pagamento..."
                    : `Pagar agora com ${formasPagamento[pagamento]}`}
                </button>
              )}

              {podeFinalizar && semPagamentoOnline && (
                <p className="carrinho-falta">{semPagamentoOnline}</p>
              )}

              {erroPagamento && (
                <p className="carrinho-erro">{erroPagamento}</p>
              )}

              {podeFinalizar ? (
                <a
                  href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(montarMensagem())}`}
                  target="_blank"
                  rel="noreferrer"
                  className="carrinho-finalizar"
                  onClick={finalizarPeloWhatsApp}
                >
                  Finalizar pelo WhatsApp
                </a>
              ) : (
                <button type="button" className="carrinho-finalizar" disabled>
                  Finalizar pelo WhatsApp
                </button>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

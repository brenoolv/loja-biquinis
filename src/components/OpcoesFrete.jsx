import { formatarPreco } from "../utils/formatarPreco";
import "./OpcoesFrete.css";

// Recebe a lista de opções pronta (o Carrinho monta) e avisa
// o Carrinho qual a cliente escolheu.
export default function OpcoesFrete({
  titulo = "Escolha a entrega",
  nome = "frete",
  opcoes,
  escolhida,
  aoEscolher,
  freteGratis,
}) {
  if (opcoes.length === 0) return null;

  return (
    <fieldset className="frete">
      <legend className="frete-titulo">{titulo}</legend>

      {opcoes.map((opcao) => {
        const marcada = escolhida === opcao.id;

        let classe = "frete-opcao";
        if (marcada) classe += " frete-opcao--marcada";
        if (opcao.indisponivel) classe += " frete-opcao--indisponivel";

        return (
          <label key={opcao.id} className={classe}>
            <input
              type="radio"
              name={nome}
              value={opcao.id}
              checked={marcada}
              disabled={opcao.indisponivel}
              onChange={() => aoEscolher(opcao.id)}
            />

            <span className="frete-info">
              <span className="frete-nome">{opcao.nome}</span>
              <span className="frete-detalhe">{opcao.detalhe}</span>
            </span>

            <span className="frete-preco">
              <PrecoFrete opcao={opcao} freteGratis={freteGratis} />
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

function PrecoFrete({ opcao, freteGratis }) {
  if (opcao.indisponivel) return "Indisponível";
  if (opcao.precoTexto) return opcao.precoTexto;
  if (opcao.valor === null) return "A combinar";
  if (opcao.valor === 0) return <strong>Grátis</strong>;

  if (freteGratis) {
    return (
      <>
        <s>{formatarPreco(opcao.valor)}</s>
        <strong>Grátis</strong>
      </>
    );
  }

  return formatarPreco(opcao.valor);
}

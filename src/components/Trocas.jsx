import { WHATSAPP, VENDEDORA, DOCUMENTO, CIDADE, EMAIL_LOJA } from "../utils/loja";
import "./Privacidade.css"; // mesmo visual da página de privacidade

// Página /trocas. Regras baseadas no Código de Defesa do Consumidor:
//   - art. 49: compra pela internet pode ser desfeita em 7 dias
//   - art. 26: defeito aparente em roupa (bem durável) pode ser reclamado em 90 dias
// A troca de tamanho NÃO é obrigação da lei: é uma regra da loja.
export default function Trocas() {
  const linkWhatsApp = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
    "Olá! Quero falar sobre troca ou devolução. Meu pedido é o nº ",
  )}`;

  return (
    <main className="privacidade">
      <a href="/" className="privacidade-voltar">
        ← Voltar pra loja
      </a>

      <h1>Trocas e devoluções</h1>
      <p className="privacidade-data">Atualizada em 2 de novembro de 2026</p>

      <p>
        Queremos que você fique feliz com o seu biquíni. Aqui estão as regras
        pra trocar ou devolver uma peça comprada no nosso site.
      </p>

      <h2>Desistiu da compra? Você tem 7 dias</h2>
      <p>
        Pela lei, toda compra feita pela internet pode ser desfeita em até{" "}
        <strong>7 dias corridos depois que você recebe o pedido</strong>, sem
        precisar explicar o motivo. Nesse caso, devolvemos{" "}
        <strong>todo o valor pago, inclusive o frete</strong>, e o custo de
        devolução é por nossa conta.
      </p>
      <p>
        Por se tratar de moda praia, a peça precisa voltar sem uso, sem
        lavagem, com a etiqueta e com o adesivo de proteção da calcinha.
      </p>

      <h2>Troca de tamanho ou modelo</h2>
      <p>
        Se o tamanho não serviu, você pode pedir a troca em até{" "}
        <strong>7 dias corridos depois de receber</strong>, com a peça nas
        mesmas condições acima. A troca depende de termos o tamanho ou modelo
        no estoque. Se não tiver, você escolhe outra peça ou recebe o valor de
        volta. Nas trocas por tamanho, o frete de ida e volta é por sua conta.
      </p>

      <h2>Peça com defeito</h2>
      <p>
        Se a peça chegou com defeito de fabricação, você tem até{" "}
        <strong>90 dias depois de receber</strong> pra nos avisar. Se o defeito
        só aparecer com o uso, os 90 dias contam a partir do dia em que você
        notou. Nesses casos, todo o frete é por nossa conta, e você escolhe
        entre trocar a peça ou receber o dinheiro de volta.
      </p>

      <h2>Como pedir</h2>
      <ol>
        <li>
          Chame a gente no{" "}
          <a href={linkWhatsApp} target="_blank" rel="noreferrer">
            WhatsApp
          </a>{" "}
          ou mande um e-mail pra {EMAIL_LOJA}, com o número do pedido.
        </li>
        <li>Se for defeito, mande uma foto da peça mostrando o problema.</li>
        <li>
          A gente combina com você a retirada ou o envio da peça. Em Fortaleza,
          a retirada pode ser feita pela própria loja.
        </li>
      </ol>

      <h2>Como o dinheiro volta</h2>
      <p>
        Depois que a peça chega e a gente confere, o valor volta pela mesma
        forma de pagamento. No Pix, devolvemos por Pix. No cartão, o estorno é
        feito pela InfinitePay e aparece na sua fatura de acordo com o prazo da
        operadora do cartão.
      </p>

      <h2>Quem vende</h2>
      <p>
        {VENDEDORA}, {DOCUMENTO}, {CIDADE}. Contato: {EMAIL_LOJA}.
      </p>
    </main>
  );
}

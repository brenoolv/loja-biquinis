import { WHATSAPP } from "../utils/loja";
import "./Privacidade.css";

// Página /privacidade. Texto base: revise e complete com os dados da loja
// (nome completo ou razão social e CPF/CNPJ) antes de considerar final.
export default function Privacidade() {
  return (
    <main className="privacidade">
      <a href="/" className="privacidade-voltar">
        ← Voltar pra loja
      </a>

      <h1>Política de Privacidade</h1>
      <p className="privacidade-data">Atualizada em 31 de outubro de 2026</p>

      <p>
        Esta política explica quais dados a Oceamar Moda Praia, de Fortaleza
        (CE), coleta quando você usa o nosso site, para que usamos e quais são
        os seus direitos, de acordo com a Lei Geral de Proteção de Dados (Lei
        nº 13.709/2018).
      </p>

      <h2>Quais dados coletamos</h2>
      <ul>
        <li>
          <strong>Conta (opcional):</strong> nome, WhatsApp, e-mail e senha. A
          senha fica guardada de forma criptografada e nem a loja consegue
          vê-la.
        </li>
        <li>
          <strong>Pedidos:</strong> peças, tamanhos, valores, forma de
          pagamento e, quando há entrega, CEP, endereço, número e complemento.
        </li>
        <li>
          <strong>No seu navegador:</strong> o carrinho e a sua sessão de login
          ficam salvos no próprio aparelho, pra você não perder o que escolheu.
        </li>
      </ul>
      <p>
        Não guardamos dados de cartão. O pagamento é feito na página da
        InfinitePay, e os dados do cartão vão direto pra ela.
      </p>

      <h2>Para que usamos</h2>
      <ul>
        <li>Separar, entregar ou combinar a retirada do seu pedido.</li>
        <li>Calcular o frete a partir do seu CEP.</li>
        <li>Mostrar seus pedidos em "Meus pedidos".</li>
        <li>Falar com você pelo WhatsApp sobre o seu pedido.</li>
      </ul>
      <p>Não vendemos nem alugamos os seus dados.</p>

      <h2>Com quem compartilhamos</h2>
      <p>Usamos alguns serviços pra o site funcionar:</p>
      <ul>
        <li>
          <strong>InfinitePay:</strong> processa os pagamentos por Pix e
          cartão.
        </li>
        <li>
          <strong>Supabase:</strong> guarda as contas e os pedidos.
        </li>
        <li>
          <strong>Netlify:</strong> hospeda o site.
        </li>
        <li>
          <strong>ViaCEP, AwesomeAPI e OpenStreetMap:</strong> recebem o CEP
          ou a rua pra encontrar o endereço e calcular a distância da entrega.
        </li>
        <li>
          <strong>WhatsApp:</strong> quando você escolhe falar com a gente ou
          finalizar por lá.
        </li>
      </ul>

      <h2>Por quanto tempo guardamos</h2>
      <p>
        Os dados da conta ficam guardados enquanto ela existir. Os pedidos
        ficam guardados pelo tempo necessário pra cumprir obrigações legais,
        como trocas, garantia e registros fiscais.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode, a qualquer momento, pedir pra confirmar se temos dados seus,
        ter acesso a eles, corrigir, pedir a exclusão da sua conta, saber com
        quem compartilhamos e revogar o seu consentimento. É só falar com a
        gente pelos contatos abaixo.
      </p>

      <h2>Contato</h2>
      <p>
        E-mail:{" "}
        <a href="mailto:oceamar.loja@gmail.com">oceamar.loja@gmail.com</a>
        <br />
        WhatsApp:{" "}
        <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer">
          fale com a gente
        </a>
      </p>
    </main>
  );
}

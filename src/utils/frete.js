import { CEP_LOJA } from "./loja";
// A tabela de faixas mora em dados/faixasFrete.js (a função de pagamento também usa)
import { FAIXAS } from "../dados/faixasFrete";

export const DISTANCIA_MAXIMA = FAIXAS[FAIXAS.length - 1].ate;

// Devolve o valor da faixa, ou null se passar da distância máxima
export function valorPorDistancia(km) {
  const faixa = FAIXAS.find((f) => km <= f.ate);
  return faixa ? faixa.valor : null;
}

// ---------- Opções que aparecem no carrinho ----------

// Entrega: só a entrega da loja, com o valor pela distância.
// distancia: número em km, ou null quando não deu pra calcular
export function opcoesDeEntrega(distancia) {
  const entregaLoja = {
    id: "loja",
    nome: "Entrega da loja",
    valor: null,
    detalhe: "",
    indisponivel: false,
  };

  if (distancia === null) {
    entregaLoja.detalhe =
      "Não conseguimos calcular a distância. Combinamos o valor pelo WhatsApp.";
  } else {
    const km = distancia.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    const valor = valorPorDistancia(distancia);

    if (valor === null) {
      entregaLoja.indisponivel = true;
      entregaLoja.detalhe = `Você está a ${km} km e entregamos até ${DISTANCIA_MAXIMA} km. Escolha Retirada e chame um Uber Flash.`;
    } else {
      entregaLoja.valor = valor;
      entregaLoja.detalhe = `Você está a ${km} km da loja.`;
    }
  }

  return [entregaLoja];
}

// Retirada: a cliente busca ou manda um Uber Flash buscar.
// precoTexto substitui o preço, porque aqui a loja não cobra nada.
export const OPCOES_RETIRADA = [
  {
    id: "retirar",
    nome: "Eu mesma retiro",
    detalhe: "Combinamos o local e o horário pelo WhatsApp.",
    valor: 0,
    precoTexto: "Grátis",
  },
  {
    id: "uber-flash",
    nome: "Uber Flash",
    detalhe:
      "Você chama o motorista pra buscar aqui. Combinamos o horário pelo WhatsApp.",
    valor: 0,
    precoTexto: "Por sua conta",
  },
];

// ---------- Distância ----------

// Fórmula de Haversine: distância em linha reta entre dois pontos do globo
export function distanciaKm(a, b) {
  const raioTerra = 6371;
  const rad = (graus) => (graus * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * raioTerra * Math.asin(Math.sqrt(h));
}

// Busca latitude e longitude de um CEP.
// Tenta a AwesomeAPI; se falhar, tenta o OpenStreetMap com o endereço.
// Devolve { lat, lng } ou null.
async function coordenadasDoCep(cep, endereco) {
  try {
    const resposta = await fetch(`https://cep.awesomeapi.com.br/json/${cep}`);
    if (resposta.ok) {
      const dados = await resposta.json();
      const lat = Number(dados.lat);
      const lng = Number(dados.lng);
      if (lat && lng) return { lat, lng };
    }
  } catch {
    // segue pro plano B
  }

  if (!endereco) return null;

  try {
    const busca = [endereco.logradouro, endereco.localidade, endereco.uf, "Brasil"]
      .filter(Boolean)
      .join(", ");
    const resposta = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(busca)}`,
    );
    const lista = await resposta.json();
    if (lista.length > 0) {
      return { lat: Number(lista[0].lat), lng: Number(lista[0].lon) };
    }
  } catch {
    // sem plano C
  }

  return null;
}

// Guarda a posição da loja depois da primeira busca,
// pra não buscar de novo a cada cálculo
let posicaoLoja = null;

// Distância em km da loja até o CEP da cliente, ou null se não deu
export async function calcularDistancia(cepCliente, enderecoCliente) {
  if (!CEP_LOJA) {
    console.warn("Preencha o CEP_LOJA em src/utils/loja.js");
    return null;
  }

  if (!posicaoLoja) {
    posicaoLoja = await coordenadasDoCep(CEP_LOJA);
  }

  const posicaoCliente = await coordenadasDoCep(cepCliente, enderecoCliente);

  if (!posicaoLoja || !posicaoCliente) return null;
  return distanciaKm(posicaoLoja, posicaoCliente);
}

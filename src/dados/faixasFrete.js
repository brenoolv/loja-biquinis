// Tabela de frete por distância.
// "ate" é em km (linha reta da loja até o CEP da cliente).
// A primeira faixa que couber é a que vale.
//
// Fica num arquivo sem nenhum import porque é usado em dois lugares:
// no site (utils/frete.js) e na função de pagamento do Netlify, que
// confere se o frete do pedido é um valor que a loja cobra de verdade.
export const FAIXAS = [
  { ate: 3, valor: 0 },
  { ate: 5, valor: 8 },
  { ate: 8, valor: 10 },
];

// Todos os valores de frete que o site pode cobrar
export const VALORES_FRETE = FAIXAS.map((faixa) => faixa.valor);

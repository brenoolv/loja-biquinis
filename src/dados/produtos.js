// Lista de peças da loja. Usada na coleção e no painel da dona.
// O "id" de cada peça precisa ser o mesmo da tabela "estoque" no Supabase.
// TAMANHOS é a mesma lista que o banco aceita (P, M, G, GG).

export const TAMANHOS = ["P", "M", "G", "GG"];

export const PRODUTOS = [
  {
    id: 1,
    nome: "Biquíni Triângulo Floral",
    preco: 50.00,
    foto: "/fotos/floral-azul.jpeg",
    cor: "var(--agua)",
  },
  {
    id: 2,
    nome: "Biquíni Meia-Taça Marinho",
    preco:  50.00,
    foto: "/fotos/meia-taca-marinho.jpeg",
    cor: "var(--agua)",
  },
  {
    id: 3,
    nome: "Biquíni Asa Delta Azul Royal",
    preco:  50.00,
    foto: "/fotos/azul-royal.jpeg",
    cor: "var(--agua)",
  },
  {
    id: 4,
    nome: "Biquíni Azul Bebê",
    preco:  55.00,
    foto: "/fotos/azul-bebe.jpeg",
    cor: "var(--agua)",
  },
];

// Produto de R$ 1,00 só pra testar o pagamento de verdade.
// Só aparece abrindo o site com ?teste no endereço (ex.: oceamar.netlify.app/?teste).
// A cliente comum nunca vê. Pode apagar depois dos testes.
export const PRODUTO_TESTE = {
  id: 999,
  nome: "Produto de teste",
  preco: 1.0,
  foto: "/fotos/floral-azul.jpeg",
  cor: "var(--agua)",
};

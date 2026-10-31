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

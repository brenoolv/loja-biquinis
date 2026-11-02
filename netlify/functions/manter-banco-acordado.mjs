import { createClient } from "@supabase/supabase-js";

// =====================================================================
// Função AGENDADA: a Netlify roda sozinha, uma vez por dia.
// Ninguém chama pelo navegador.
//
// Por quê: o Supabase grátis pausa o banco se ficar 7 dias com pouca
// atividade. Enquanto a loja tem poucas visitas, esta consulta diária
// ao estoque conta como atividade e mantém o banco acordado.
//
// Usa as mesmas variáveis de ambiente da função de pagamento
// (SUPABASE_URL e SUPABASE_SECRET_KEY), que já estão na Netlify.
// Pra ver se rodou: Netlify > Logs > Functions > manter-banco-acordado
// =====================================================================

export default async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false } },
  );

  // Uma leitura pequena: só a quantidade de linhas do estoque
  const { count, error } = await supabase
    .from("estoque")
    .select("produto_id", { count: "exact", head: true });

  if (error) {
    console.error("Banco não respondeu:", error.message);
  } else {
    console.log(`Banco acordado. Linhas no estoque: ${count}`);
  }
};

// Todo dia às 12:00 UTC, que são 9:00 em Fortaleza.
// A Netlify lê os horários sempre em UTC.
export const config = {
  schedule: "0 12 * * *",
};

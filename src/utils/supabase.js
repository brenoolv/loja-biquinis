import { createClient } from "@supabase/supabase-js";

// Endereço do projeto e chave PUBLICÁVEL do Supabase.
// Essas duas podem ficar no código: quem protege os dados são as
// regras de acesso (RLS) do supabase/schema.sql.
// A chave SECRETA nunca entra aqui.
const SUPABASE_URL = "https://skoivgeijtgaxunqiyue.supabase.co";
const SUPABASE_CHAVE = "sb_publishable_6J1hTM2vPoyKywVR0RhrHA_q8_5Dl0b";

// Um cliente só, usado no site inteiro (login, pedidos, estoque)
export const supabase = createClient(SUPABASE_URL, SUPABASE_CHAVE);

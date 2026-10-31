import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import type { Profile } from "@/types/database";

export type CurrentUser = { id: string; email?: string; profile: Profile };

// Devuelve el usuario autenticado y su perfil, o null si no hay sesión.
// Memoizado por request: layout, navbar y página comparten una sola consulta.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", claims.sub)
    .single();

  if (!profile) return null;
  return { id: claims.sub, email: claims.email, profile };
});

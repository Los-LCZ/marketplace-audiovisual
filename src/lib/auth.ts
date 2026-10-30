import { createClient } from "@/utils/supabase/server";
import type { Profile } from "@/types/database";

// Devuelve el usuario autenticado y su perfil, o null si no hay sesión.
export async function getCurrentUser(): Promise<{ id: string; email?: string; profile: Profile } | null> {
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
}

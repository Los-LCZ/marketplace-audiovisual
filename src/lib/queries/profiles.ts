import { createClient } from "@/utils/supabase/server";
import type { PublicProfile } from "@/types/database";

/** Perfil público de cualquier usuario (sin teléfono). null si no existe. */
export async function getPublicProfile(profileId: string): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();
  if (error) throw new Error(`Error al obtener el perfil: ${error.message}`);
  return data;
}

import { createClient } from "@/utils/supabase/server";
import type {
  ProfileRatingStats,
  ProfileReview,
  ProfileReviewRole,
  PublicProfile,
} from "@/types/database";

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

/**
 * Calificaciones de un perfil como anfitrión y como cliente: promedio, cantidad,
 * distribución 5..1 y etiquetas más repetidas. Solo cuenta reseñas reveladas.
 */
export async function getProfileRatingStats(profileId: string): Promise<ProfileRatingStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_profile_rating_stats", { p_profile_id: profileId });
  if (error) throw new Error(`Error al obtener calificaciones: ${error.message}`);
  return data;
}

export const PROFILE_REVIEWS_PAGE_SIZE = 20;

/**
 * Reseñas recibidas por un perfil, más recientes primero (page empieza en 1).
 * role "host": lo que escribieron sus clientes; "client": lo que escribieron los anfitriones.
 */
export async function getProfileReviews(
  profileId: string,
  role: ProfileReviewRole,
  page = 1,
): Promise<ProfileReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_profile_reviews", {
    p_profile_id: profileId,
    p_role: role,
    p_page: Math.max(1, page),
    p_page_size: PROFILE_REVIEWS_PAGE_SIZE,
  });
  if (error) throw new Error(`Error al obtener reseñas del perfil: ${error.message}`);
  return data ?? [];
}

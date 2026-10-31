"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { fail, type ActionState } from "@/lib/action-state";
import type { ReactionKind } from "@/types/database";

async function react(spaceId: string, kind: ReactionKind | null): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail("Debes iniciar sesión");
  if (!spaceId) return fail("Espacio inválido");

  const supabase = await createClient();
  const { error } = kind
    ? await supabase
        .from("space_reactions")
        .upsert(
          { user_id: user.id, space_id: spaceId, kind, created_at: new Date().toISOString() },
          { onConflict: "user_id,space_id" },
        )
    : await supabase.from("space_reactions").delete().eq("user_id", user.id).eq("space_id", spaceId);

  if (error) {
    if (error.code === "23503") return fail("Espacio no encontrado");
    return fail(error.message);
  }

  revalidatePath("/descubrir");
  revalidatePath("/perfil");
  return { ok: true };
}

/**
 * Me gusta. No recibe FormData: úsala con `useTransition` o con `.bind`.
 * Si ya había un descarte, lo reemplaza.
 */
export async function likeSpace(spaceId: string): Promise<ActionState> {
  return react(spaceId, "like");
}

/** Descarte (no vuelve a aparecer en el mazo). Usar con `useTransition` o `.bind`. */
export async function passSpace(spaceId: string): Promise<ActionState> {
  return react(spaceId, "pass");
}

/** Quita el me gusta o el descarte: el espacio vuelve al mazo. Usar con `useTransition` o `.bind`. */
export async function undoReaction(spaceId: string): Promise<ActionState> {
  return react(spaceId, null);
}

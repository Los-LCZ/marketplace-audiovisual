import { cookies } from "next/headers";
import { DEFAULT_WORLD, isWorld, WORLD_COOKIE, type World } from "./world";

// Mundo activo según la cookie (solo en el servidor).
export async function getWorld(): Promise<World> {
  const value = (await cookies()).get(WORLD_COOKIE)?.value;
  return isWorld(value) ? value : DEFAULT_WORLD;
}

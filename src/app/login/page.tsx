import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <LoginForm
        next={typeof next === "string" ? next : undefined}
        callbackError={error === "auth_callback"}
      />
    </main>
  );
}

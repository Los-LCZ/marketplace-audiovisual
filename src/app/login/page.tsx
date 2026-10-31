import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;

  return (
    <div className="flex items-center justify-center px-4 py-12">
      <LoginForm
        next={typeof next === "string" ? next : undefined}
        callbackError={error === "auth_callback"}
      />
    </div>
  );
}

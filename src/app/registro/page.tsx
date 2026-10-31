import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <SignupForm />
    </main>
  );
}

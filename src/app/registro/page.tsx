import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <div className="flex items-center justify-center px-4 py-12">
      <SignupForm />
    </div>
  );
}

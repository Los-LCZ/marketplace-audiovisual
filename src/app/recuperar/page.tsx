import type { Metadata } from "next";
import { RequestResetForm } from "./request-reset-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <div className="flex items-center justify-center px-4 py-12">
      <RequestResetForm />
    </div>
  );
}

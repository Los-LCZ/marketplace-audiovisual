"use client"; // Los error boundaries deben ser Client Components.

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <TriangleAlert className="size-10 text-warning" aria-hidden />
      <h1 className="display h3">Algo salió mal</h1>
      <p className="text-muted-foreground">No pudimos cargar esta sección. Intenta nuevamente.</p>
      <Button onClick={() => retry()}>Reintentar</Button>
    </div>
  );
}

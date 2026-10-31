import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <SearchX className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="display h3">No encontramos esta página</h1>
      <p className="text-muted-foreground">Puede que el espacio ya no esté publicado o que el enlace sea incorrecto.</p>
      <Link href="/" className={buttonClasses()}>
        Explorar espacios
      </Link>
    </div>
  );
}

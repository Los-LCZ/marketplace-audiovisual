"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./button";

// Botón de envío que se deshabilita mientras la Server Action del <form> padre está en curso.
export function SubmitButton({
  pendingText,
  children,
  ...props
}: ComponentProps<typeof Button> & { pendingText?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? (pendingText ?? children) : children}
    </Button>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteInternalNoteAction } from "@/actions/notes";

export function DeleteNoteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Borrar nota?")) return;
        const fd = new FormData();
        fd.set("id", id);
        start(async () => {
          await deleteInternalNoteAction(fd);
          router.refresh();
        });
      }}
      className="text-destructive underline"
    >
      Borrar
    </button>
  );
}

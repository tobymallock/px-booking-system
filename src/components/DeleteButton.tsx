"use client";

import { useTransition } from "react";

interface DeleteButtonProps {
  action: (formData: FormData) => Promise<void>;
  id: string;
  confirmMessage: string;
  className?: string;
}

export function DeleteButton({ action, id, confirmMessage, className }: DeleteButtonProps) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(confirmMessage)) return;
    const formData = new FormData();
    formData.set("id", id);
    startTransition(() => action(formData));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={className}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

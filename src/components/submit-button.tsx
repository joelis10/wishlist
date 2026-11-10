"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: ReactNode;
  pendingText?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
};

export function SubmitButton({
  children,
  pendingText = "Saving…",
  className = "btn btn-primary w-full",
  disabled,
  name,
  value,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      className={className}
      disabled={pending || disabled}
    >
      {pending ? pendingText : children}
    </button>
  );
}

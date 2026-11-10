"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { XIcon } from "./icons";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  dismissible?: boolean;
};

const sizes = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  dismissible = true,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      aria-labelledby={title ? titleId : undefined}
      className={`!m-auto w-[calc(100vw-2rem)] ${sizes[size]} rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/45`}
      onClose={onClose}
      onCancel={(event) => {
        if (!dismissible) event.preventDefault();
      }}
      onMouseDown={(event) => {
        if (dismissible && event.target === ref.current) onClose();
      }}
    >
      <div className="flex max-h-[85vh] flex-col">
        {title ? (
          <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
            <h2 id={titleId} className="pr-2 text-xl">
              {title}
            </h2>
            {dismissible ? (
              <button
                type="button"
                onClick={onClose}
                className="-mr-1 -mt-1 rounded-full p-2 text-muted transition hover:bg-raised hover:text-ink"
                aria-label="Close"
              >
                <XIcon className="size-4" />
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="min-h-0 overflow-y-auto px-5 py-3">{children}</div>
        {footer ? <div className="border-t border-line px-5 py-4">{footer}</div> : null}
      </div>
    </dialog>
  );
}

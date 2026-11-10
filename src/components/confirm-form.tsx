"use client";

import { useRef, useState, type ReactNode } from "react";
import { Modal } from "./modal";

type ConfirmFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string | number>;
  triggerLabel: ReactNode;
  triggerClassName?: string;
  title: string;
  description: string;
  confirmLabel?: string;
};

export function ConfirmForm({
  action,
  hidden,
  triggerLabel,
  triggerClassName = "btn btn-ghost btn-sm text-danger",
  title,
  description,
  confirmLabel = "Delete",
}: ConfirmFormProps) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>
      {open ? (
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                setOpen(false);
                formRef.current?.requestSubmit();
              }}
            >
              {confirmLabel}
            </button>
          </div>
        }
      >
        <p className="pb-2 text-sm leading-relaxed text-muted">{description}</p>
      </Modal>
      ) : null}
    </form>
  );
}

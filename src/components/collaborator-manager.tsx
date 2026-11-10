"use client";

import { useActionState, useEffect, useRef } from "react";
import { addCollaboratorAction, removeCollaboratorAction } from "@/app/actions/wishlists";
import type { Collaborator } from "@/lib/wishlists";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";
import { XIcon } from "./icons";

type Props = {
  wishlistId: number;
  ownerUsername: string;
  collaborators: Collaborator[];
};

export function CollaboratorManager({ wishlistId, ownerUsername, collaborators }: Props) {
  const [state, action] = useActionState(addCollaboratorAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-raised/50 px-3.5 py-2.5 text-sm">
        <span className="text-muted">Owner · </span>
        <span className="font-medium">{ownerUsername}</span>
      </div>

      {collaborators.length > 0 ? (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {collaborators.map((person) => (
            <li key={person.userId} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <div>
                <p className="text-sm font-medium">{person.username}</p>
                <p className="text-xs text-muted">Can edit items</p>
              </div>
              <form action={removeCollaboratorAction}>
                <input type="hidden" name="wishlistId" value={wishlistId} />
                <input type="hidden" name="userId" value={person.userId} />
                <button
                  type="submit"
                  className="rounded-full p-2 text-danger/80 transition hover:bg-danger/10 hover:text-danger"
                  aria-label={`Remove ${person.username}`}
                >
                  <XIcon className="size-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nobody else can edit this wishlist yet.</p>
      )}

      <form ref={formRef} action={action} className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="wishlistId" value={wishlistId} />
        <input
          name="username"
          required
          maxLength={32}
          className="input flex-1"
          placeholder="Username"
          aria-label="Username to add"
          autoCapitalize="none"
        />
        <SubmitButton className="btn btn-secondary" pendingText="Adding…">
          Add editor
        </SubmitButton>
      </form>
      <FormMessage state={state} />
    </div>
  );
}

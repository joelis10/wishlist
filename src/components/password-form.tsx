"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions/auth";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, {});

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="current-password" className="label">
          Current password
        </label>
        <input
          id="current-password"
          name="current"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="new-password" className="label">
            New password
          </label>
          <input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="input"
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="label">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="input"
          />
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-secondary" pendingText="Updating…">
        Update password
      </SubmitButton>
    </form>
  );
}

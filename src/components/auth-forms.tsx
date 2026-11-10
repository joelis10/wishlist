"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction } from "@/app/actions/auth";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, {});

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="username" className="label">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          required
          autoFocus
          className="input"
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
      <p className="text-center text-sm text-muted">
        <Link href={next === "/" ? "/register" : `/register?next=${encodeURIComponent(next)}`} className="text-ink underline decoration-line underline-offset-4 hover:decoration-accent">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(registerAction, {});

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="username" className="label">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          required
          autoFocus
          minLength={3}
          maxLength={32}
          pattern="[A-Za-z0-9_\-]+"
          className="input"
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="input"
        />
      </div>
      <div>
        <label htmlFor="confirm" className="label">
          Confirm password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="input"
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Creating…">Create account</SubmitButton>
      <p className="text-center text-sm text-muted">
        <Link href={next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`} className="text-ink underline decoration-line underline-offset-4 hover:decoration-accent">
          I already have an account
        </Link>
      </p>
    </form>
  );
}

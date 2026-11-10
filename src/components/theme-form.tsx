"use client";

import { useActionState, useState } from "react";
import { setThemeAction } from "@/app/actions/settings";
import { THEME_OPTIONS, type ThemePreference } from "@/lib/theme-shared";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

type TransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

function applyTheme(theme: ThemePreference) {
  const update = () => {
    if (theme === "system") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = theme;
    }
  };

  const doc = document as TransitionDocument;
  if (
    doc.startViewTransition &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    doc.startViewTransition(update);
  } else {
    update();
  }
}

export function ThemeForm({ current }: { current: ThemePreference }) {
  const [state, action] = useActionState(setThemeAction, {});
  const [theme, setTheme] = useState<ThemePreference>(current);

  return (
    <form action={action} className="space-y-3">
      <label htmlFor="preferred-theme" className="label">
        Theme
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          id="preferred-theme"
          name="theme"
          value={theme}
          onChange={(event) => {
            const next = event.target.value as ThemePreference;
            setTheme(next);
            applyTheme(next);
          }}
          className="input flex-1"
        >
          {THEME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <SubmitButton className="btn btn-secondary" pendingText="Saving…">
          Save
        </SubmitButton>
      </div>
      <FormMessage state={state} />
      <p className="text-xs text-muted">
        System follows the device. Signed-in users keep their choice across devices.
      </p>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { setThemeAction } from "@/app/actions/settings";
import { THEME_OPTIONS, type ThemePreference } from "@/lib/theme-shared";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

function applyTheme(theme: ThemePreference) {
  if (theme === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

export function ThemeForm({ current }: { current: ThemePreference }) {
  const [state, action] = useActionState(setThemeAction, {});
  const [theme, setTheme] = useState<ThemePreference>(current);

  useEffect(() => {
    if (state.ok) applyTheme(theme);
  }, [state, theme]);

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
          onChange={(event) => setTheme(event.target.value as ThemePreference)}
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

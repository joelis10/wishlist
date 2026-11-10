"use client";

import { useActionState, useState } from "react";
import { setPreferredCurrencyAction } from "@/app/actions/settings";
import { CURRENCIES } from "@/lib/money";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

export function CurrencyForm({ current }: { current: string }) {
  const [state, action] = useActionState(setPreferredCurrencyAction, {});
  const [currency, setCurrency] = useState(current);

  return (
    <form action={action} className="space-y-3">
      <label htmlFor="preferred-currency" className="label">
        Display currency
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          id="preferred-currency"
          name="currency"
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          className="input flex-1"
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <SubmitButton className="btn btn-secondary" pendingText="Saving…">
          Save
        </SubmitButton>
      </div>
      <FormMessage state={state} />
      <p className="text-xs text-muted">
        Prices in other currencies are shown as approximate conversions. Default is GBP.
      </p>
    </form>
  );
}

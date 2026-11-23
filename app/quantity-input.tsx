"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

export function QuantityInput({ value, onChange }: { value: number; onChange: (quantity: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  return <Input aria-label="Cantidad" type="number" min="1" value={draft}
    onChange={event => {
      const text = event.target.value;
      setDraft(text);
      const quantity = Number(text);
      // An empty input is an editing state, not a new quantity of one.
      if (text.trim() && Number.isFinite(quantity) && quantity >= 1) onChange(quantity);
    }}
    onBlur={() => setDraft(String(value))}
  />;
}

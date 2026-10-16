"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { Banner, Button } from "@/components/ui";

export function EntryForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ href: string }>("/api/auth", { kind: "entry", code });
      router.push(result.href);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "De ruimtecode klopt niet.");
      setBusy(false);
    }
  }

  return (
    <form className="paper stack" onSubmit={submit}>
      <label className="field">
        <span>Ruimtecode</span>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Code van de instructeur"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          inputMode="text"
        />
      </label>
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <Button type="submit" disabled={busy || code.trim().length < 3}>Ga verder</Button>
      <p className="small">De code staat groot op het scherm van de instructeur. Een code op een bordje opent die ruimte, nadat jullie team is aangemeld.</p>
    </form>
  );
}

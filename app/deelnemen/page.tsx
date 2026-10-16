"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { api } from "@/lib/client/api";
import { Shield } from "@/components/Shield";
import { Banner, Button } from "@/components/ui";

function JoinForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = params.get("next");
  const target = next && next.startsWith("/spel") ? next : "/spel/missie";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth", { kind: "team", joinCode: code });
      router.push(target);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Aanmelden lukte niet.");
      setBusy(false);
    }
  }

  return (
    <main className="app">
      <Link href="/" className="brand-row">
        <Shield size={42} />
        <span>Terug</span>
      </Link>
      <p className="kicker">Team</p>
      <h1 className="display">Jullie code</h1>
      <p className="lead">De code staat op de uitnodiging van de organisatie. Daarmee kom je bij het juiste team, niet in het beheer.</p>
      <form className="paper stack" onSubmit={submit}>
        <label className="field">
          <span>Teamcode</span>
          <input value={code} onChange={(input) => setCode(input.target.value)} autoCapitalize="characters" autoFocus />
        </label>
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <Button type="submit" disabled={busy || code.trim().length < 4}>Open het dossier</Button>
      </form>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<main className="app">Laden…</main>}>
      <JoinForm />
    </Suspense>
  );
}

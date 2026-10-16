"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MISSION } from "@/lib/copy";
import { api } from "@/lib/client/api";
import { Shield } from "@/components/Shield";
import { Banner, Button } from "@/components/ui";

interface LobbyState {
  eventId: string;
  name: string;
  status: "lobby" | "active" | "paused" | "finished";
  teamName: string | null;
  briefingSeen: boolean;
}

export default function LobbyPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const [state, setState] = useState<LobbyState | null>(null);
  const [missing, setMissing] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await api<LobbyState>(`/api/lobby/${token}`);
      setState(next);
      setMissing(false);
    } catch {
      setMissing(true);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
    const poll = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(poll);
  }, [refresh]);

  useEffect(() => {
    if (state?.status === "active" && state.briefingSeen) router.replace("/spel");
    if (state?.status === "finished" && state.teamName) router.replace("/spel/uitslag");
  }, [router, state]);

  async function register(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth", { kind: "register", lobbyToken: token, teamName });
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Aanmelden lukte niet.");
    } finally {
      setBusy(false);
    }
  }

  async function begin() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/team", { action: "briefing" });
      router.push("/spel");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "De briefing kon niet worden geopend.");
      setBusy(false);
    }
  }

  if (missing) {
    return (
      <main className="app">
        <Shield />
        <h1 className="display">Lobby niet gevonden</h1>
        <p className="lead">Deze iPad is niet gekoppeld aan een bestaand evenement. Vraag de instructeur om de juiste lobbylink te openen. Er wordt geen willekeurig evenement gekozen.</p>
      </main>
    );
  }

  if (!state) return <main className="app">Laden…</main>;

  return (
    <main className="app dossier">
      <div className="brand-row">
        <Shield />
        <div>
          <p className="kicker">Sparta Rotterdam</p>
          <strong>Het Geheim van 1888</strong>
        </div>
      </div>

      {!state.teamName ? (
        <form className="paper stack" onSubmit={register}>
          <h1 className="display">Welkom onderzoekers</h1>
          <p className="serif">Vul jullie teamnaam in en maak je klaar om de geheimzinnige verdwijning bij Sparta Rotterdam op te lossen.</p>
          <p className="serif">Zodra de instructeur het onderzoek start, ontvangen jullie de eerste briefing.</p>
          <label className="field">
            <span>Teamnaam</span>
            <input value={teamName} onChange={(input) => setTeamName(input.target.value)} autoFocus maxLength={40} />
          </label>
          {error ? <Banner tone="danger">{error}</Banner> : null}
          <Button type="submit" full disabled={busy || teamName.trim().length < 2}>Team aanmelden</Button>
        </form>
      ) : null}

      {state.teamName && state.status === "lobby" ? (
        <article className="paper stack">
          <span className="stamp">Aangemeld</span>
          <h1 className="display">{state.teamName}</h1>
          <p className="serif">Jullie team is aangemeld!</p>
          <p className="serif">Wacht op de instructeur. Zodra het onderzoek begint, verschijnt hier jullie eerste missie.</p>
        </article>
      ) : null}

      {state.teamName && state.status === "paused" && !state.briefingSeen ? (
        <Banner>Het onderzoek is gepauzeerd. Jullie blijven aangemeld als {state.teamName}.</Banner>
      ) : null}

      {state.teamName && (state.status === "active" || state.status === "paused") && !state.briefingSeen && state.status !== "paused" ? (
        <article className="paper stack dossier-sheet">
          <span className="stamp">Geheim dossier</span>
          <p className="kicker">{MISSION.kicker}</p>
          <h1 className="display">{MISSION.title}</h1>
          <p className="serif" style={{ fontSize: "1.15rem" }}>{MISSION.lead}</p>
          {MISSION.body.map((paragraph) => (
            <p key={paragraph} className="serif">{paragraph}</p>
          ))}
          <p className="small">{MISSION.facts}</p>
          {error ? <Banner tone="danger">{error}</Banner> : null}
          <Button full disabled={busy} onClick={() => void begin()}>Start mijn onderzoek</Button>
        </article>
      ) : null}
    </main>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { formatRemaining, warningLevel } from "@/lib/game/logic";
import type { TeamSnapshot, WarningLevel } from "@/lib/types";
import { Shield } from "@/components/Shield";
import { Loading, Modal } from "@/components/ui";

const TeamContext = createContext<{ state: TeamSnapshot | null; refresh: () => Promise<void> }>({
  state: null,
  refresh: async () => undefined,
});

export function useTeam() {
  return useContext(TeamContext);
}

const LINKS = [
  ["/spel", "Home"],
  ["/spel/kaart", "Kaart"],
  ["/spel/scan", "Scan"],
  ["/spel/aanwijzingen", "Hints"],
  ["/spel/klassement", "Stand"],
];

export function TeamShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<TeamSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [popup, setPopup] = useState<WarningLevel | null>(null);

  const refresh = useCallback(async () => {
    const next = await api<TeamSnapshot>("/api/team");
    setState(next);
    setLeft(next.event.remainingMs);
  }, []);

  useEffect(() => {
    let active = true;
    refresh().catch((caught) => {
      if (!active) return;
      setError(caught instanceof Error ? caught.message : "Je team kon niet worden geladen.");
      router.replace("/deelnemen");
    });
    const poll = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 8000);
    return () => {
      active = false;
      window.clearInterval(poll);
    };
  }, [refresh, router]);

  useEffect(() => {
    if (!state || state.event.status !== "active") return;
    const started = Date.now();
    const base = state.event.remainingMs;
    const id = window.setInterval(() => setLeft(Math.max(0, base - (Date.now() - started))), 250);
    return () => window.clearInterval(id);
  }, [state]);

  const level = warningLevel(state?.event.status === "active" ? left : state?.event.remainingMs ?? left);
  useEffect(() => {
    if (!state || state.event.status !== "active") return;
    if (level === "none" || level === "done") return;
    const key = `sparta-warn-${state.event.id}-${level}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setPopup(level);
  }, [level, state]);

  useEffect(() => {
    if (!state) return;
    if (state.event.status === "lobby" || (state.event.status === "active" && !state.team.briefingSeen)) {
      router.replace(`/onderzoek/${state.event.lobbyToken}`);
    }
  }, [router, state]);

  const value = useMemo(() => ({ state, refresh }), [state, refresh]);
  if (!state) return <main className="app">{error ? <p>{error}</p> : <Loading label="Dossier openen…" />}</main>;

  const timerClass = level === "none" ? "" : level === "15" ? "m15" : level === "5" ? "m5" : level === "1" ? "m1" : "done";
  const shown = state.event.status === "paused" || state.event.status === "finished" || state.event.status === "lobby" ? state.event.remainingMs : left;

  return (
    <TeamContext.Provider value={value}>
      <main className="app">
        <header className="topbar">
          <Link href="/spel" className="brand-row" style={{ margin: 0 }}>
            <Shield size={42} />
            <strong>{state.team.name}</strong>
          </Link>
          <div className={`timer ${timerClass}`}>
            <small>{state.event.status === "paused" ? "PAUZE" : state.event.status === "lobby" ? "WACHT" : state.event.status === "finished" ? "KLAAR" : "TIJD"}</small>
            {formatRemaining(shown)}
          </div>
        </header>
        {state.event.status === "paused" ? <div className="banner" style={{ marginBottom: 12 }}>Het spel is gepauzeerd door de organisatie.</div> : null}
        {state.event.status === "lobby" ? <div className="banner" style={{ marginBottom: 12 }}>De instructeur heeft het onderzoek nog niet gestart.</div> : null}
        {state.event.status === "finished" ? <div className="banner" style={{ marginBottom: 12 }}>Dit evenement is afgelopen.</div> : null}
        {state.event.status === "active" && level === "15" ? <div className="banner" style={{ marginBottom: 12 }}>Nog minder dan 15 minuten.</div> : null}
        {state.event.status === "active" && level === "5" ? <div className="banner danger" style={{ marginBottom: 12 }}>Nog minder dan 5 minuten.</div> : null}
        {state.event.status === "active" && level === "1" ? <div className="banner danger" style={{ marginBottom: 12 }}>Laatste minuut. Rond af waar je bent.</div> : null}
        {state.event.status === "active" && level === "done" ? <div className="banner danger" style={{ marginBottom: 12 }}>De speeltijd is voorbij. Nieuwe ruimtes leveren geen punten meer op.</div> : null}
        {children}
      </main>
      <nav className="nav">
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className={pathname === href ? "active" : ""}>
            {label}
          </Link>
        ))}
      </nav>
      {popup ? (
        <Modal title={popup === "1" ? "Nog 1 minuut" : popup === "5" ? "Nog 5 minuten" : "Nog 15 minuten"} onClose={() => setPopup(null)}>
          <p>De klok is dezelfde voor elk team en loopt door als je deze pagina ververst.</p>
        </Modal>
      ) : null}
    </TeamContext.Provider>
  );
}

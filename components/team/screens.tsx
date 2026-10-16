"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MISSION, RULES, SUSPECTS } from "@/lib/copy";
import { scanTarget } from "@/lib/game/logic";
import { useTeam } from "@/components/team/TeamShell";
import { Banner, Button } from "@/components/ui";
import { useRouter } from "next/navigation";

export function Dashboard() {
  const { state } = useTeam();
  if (!state) return null;
  const { team, event } = state;
  return (
    <div className="stack">
      <div>
        <p className="kicker">Teamdashboard</p>
        <h1 className="display">{team.name}</h1>
      </div>
      <section className="stats">
        <article className="stat"><b>{team.score}</b><span>punten</span></article>
        <article className="stat"><b>{team.rank}</b><span>van {team.teamCount}</span></article>
        <article className="stat"><b>{team.completedCount}/{team.stationCount}</b><span>stations</span></article>
        <article className="stat"><b>{team.clues.length}</b><span>aanwijzingen</span></article>
      </section>
      <article className="paper dark stack">
        <p className="small">Hints over: {team.hintsLeft}. Een hint kost {team.hintCost} punten.</p>
        <Link className="btn primary full" href={event.finaleOpen ? "/spel/finale" : "/spel/kaart"}>
          {event.finaleOpen ? "Naar de finale" : "Speel verder"}
        </Link>
      </article>
      <div className="stack">
        {event.stations.map((station) => {
          const done = team.completions.find((item) => item.stationId === station.id);
          return (
            <article key={station.id} className="paper spread">
              <div>
                <b>{station.locationLabel}</b>
                <p className="small" style={{ margin: 0 }}>{station.gameTitle}</p>
              </div>
              <span className="stamp">{done ? `${done.points} pt` : "Open"}</span>
            </article>
          );
        })}
        {event.stations.length === 0 ? <Banner>De organisatie heeft nog geen stations opengesteld.</Banner> : null}
      </div>
      {team.ledger.length ? (
        <article className="paper stack">
          <h2 className="display">Punten</h2>
          {team.ledger.map((line, index) => (
            <div key={`${line.label}-${index}`} className="spread">
              <span>{line.label}</span>
              <b>{line.points > 0 ? `+${line.points}` : line.points}</b>
            </div>
          ))}
        </article>
      ) : null}
      <div className="row">
        <Link className="btn ghost" href="/spel/missie">Missie</Link>
        <Link className="btn ghost" href="/spel/regels">Spelregels</Link>
        <Link className="btn ghost" href="/spel/uitslag">Uitslag</Link>
      </div>
    </div>
  );
}

export function Mission() {
  return (
    <article className="paper stack">
      <span className="stamp">Vertrouwelijk</span>
      <p className="kicker">{MISSION.kicker}</p>
      <h1 className="display">{MISSION.title}</h1>
      <p className="serif" style={{ fontSize: "1.2rem" }}>{MISSION.lead}</p>
      {MISSION.body.map((paragraph) => (
        <p key={paragraph} className="serif">{paragraph}</p>
      ))}
      <p className="small">{MISSION.facts}</p>
      <Link className="btn dark" href="/spel/regels">Lees de spelregels</Link>
    </article>
  );
}

export function Rules() {
  return (
    <div className="stack">
      <h1 className="display">Spelregels</h1>
      <ol className="paper stack">
        {RULES.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ol>
      <Link className="btn primary" href="/spel/kaart">Bekijk de kaart</Link>
    </div>
  );
}

export function StationMap() {
  const { state } = useTeam();
  if (!state) return null;
  return (
    <div className="stack">
      <div>
        <p className="kicker">Het Kasteel</p>
        <h1 className="display">Kies je route</h1>
        <p className="muted">Alleen open ruimtes staan op de kaart. De code krijg je ter plekke via de QR.</p>
      </div>
      <div className="map">
        {state.event.stations.map((station) => {
          const done = state.team.completions.some((item) => item.stationId === station.id);
          return (
            <Link key={station.id} href="/spel/scan" className={`zone ${done ? "done" : ""}`}>
              <span>
                <b>{station.locationLabel}</b>
                <small>{station.name} · {station.gameTitle}</small>
              </span>
              <strong>{done ? "Klaar" : "Scan"}</strong>
            </Link>
          );
        })}
      </div>
      {state.event.stations.length === 0 ? <Banner>Er is nu geen station beschikbaar. Vraag de organisatie welke ruimte open is.</Banner> : null}
    </div>
  );
}

export function ClueBook() {
  const { state } = useTeam();
  if (!state) return null;
  return (
    <div className="stack">
      <h1 className="display">Aanwijzingen</h1>
      {state.event.stations.map((station) => {
        const clue = state.team.clues.find((item) => item.stationId === station.id);
        return clue ? (
          <article key={station.id} className="clue">
            <p className="kicker">{station.locationLabel}</p>
            <h2 className="serif">{clue.title}</h2>
            <p className="serif">{clue.text}</p>
          </article>
        ) : (
          <article key={station.id} className="clue sealed">
            <span className="stamp">Verzegeld</span>
            <p>{station.locationLabel} is nog niet geopend.</p>
          </article>
        );
      })}
      <Link className="btn primary" href="/spel/finale">Naar de finale</Link>
    </div>
  );
}

export function Board() {
  const { state } = useTeam();
  if (!state) return null;
  return (
    <div className="stack">
      <h1 className="display">Klassement</h1>
      <p className="small muted">De stand ververst automatisch, ongeveer elke 8 seconden.</p>
      {state.leaderboard.map((row) => (
        <article key={row.teamId} className={`paper rank ${row.teamId === state.team.id ? "ticket" : ""}`}>
          <div className="pos">{row.position}</div>
          <div>
            <b>{row.name}</b>
            <p className="small" style={{ margin: 0 }}>{row.completedCount} stations · finale {row.finaleStatus}</p>
          </div>
          <strong>{row.score}</strong>
        </article>
      ))}
    </div>
  );
}

export function FinaleScreen() {
  const { state, refresh } = useTeam();
  const [suspectId, setSuspectId] = useState("");
  const [explanation, setExplanation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!state) return null;

  async function submit(action: "finale" | "hint") {
    setBusy(true);
    setMessage(null);
    try {
      const data = await apiFinale(
        action === "hint" ? { action: "hint", code: "finale" } : { action: "finale", suspectId, explanation },
      );
      setMessage(data.outcome.feedback || data.outcome.hint || "Verstuurd.");
      setOk(Boolean(data.outcome.correct));
      await refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "De afronding reageerde niet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <p className="kicker">Afronding</p>
      <h1 className="display">Wijs de verdachte aan</h1>
      <p className="small">De personages hieronder zijn verzonnen voor dit spel.</p>
      {!state.event.finaleOpen ? <Banner>De afronding is nog dicht. De instructeur opent haar met de start, of later opnieuw.</Banner> : null}
      <article className="paper stack">
        <p className="serif">{state.event.finalePrompt}</p>
        {state.team.clues.length === 0 ? <p>Jullie hebben nog geen aanwijzingen verzameld.</p> : null}
        {state.team.clues.map((clue) => (
          <div key={clue.stationId}>
            <b>{clue.title}</b>
            <p className="serif" style={{ margin: 0 }}>{clue.text}</p>
          </div>
        ))}
      </article>
      {message ? <Banner tone={ok || state.team.finaleSolved ? "ok" : "warn"}>{message}</Banner> : null}
      {state.team.finaleSolved || state.team.secretVisible ? (
        <article className="paper stack">
          <span className="stamp">Geheim</span>
          <p className="serif" style={{ whiteSpace: "pre-wrap" }}>{state.event.secretText}</p>
          <Link className="btn dark" href="/spel/uitslag">Bekijk de uitslag</Link>
        </article>
      ) : state.event.finaleOpen && state.event.status !== "paused" && state.event.status !== "lobby" ? (
        <>
          <div className="stack">
            {SUSPECTS.map((suspect) => (
              <button key={suspect.id} type="button" className={`paper stack suspect ${suspectId === suspect.id ? "on" : ""}`} onClick={() => setSuspectId(suspect.id)}>
                <b>{suspect.name}</b>
                <span className="small">{suspect.role}</span>
                <span className="serif">{suspect.statement}</span>
              </button>
            ))}
          </div>
          <label className="field">
            <span>Waarom deze persoon?</span>
            <textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} rows={4} />
          </label>
          <Button full disabled={busy || !suspectId || explanation.trim().length < 20} onClick={() => void submit("finale")}>Dien de verklaring in</Button>
          {state.event.finaleHintAvailable ? (
            <Button full kind="warn" disabled={busy || (state.team.hintsLeft <= 0 && !state.team.hintsUsedKeys.includes("finale"))} onClick={() => void submit("hint")}>
              {state.team.hintsUsedKeys.includes("finale") ? "Toon aanwijzing" : `Extra aanwijzing (−${state.team.hintCost})`}
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

async function apiFinale(body: Record<string, unknown>) {
  const { api } = await import("@/lib/client/api");
  return api<{ outcome: { feedback?: string; hint?: string; correct?: boolean } }>("/api/team", body);
}

export function ResultScreen() {
  const { state } = useTeam();
  if (!state) return null;
  return (
    <div className="stack">
      <p className="kicker">Einduitslag</p>
      <h1 className="display">{state.team.finaleSolved ? "Code gekraakt" : "Jullie stand"}</h1>
      <article className="paper stack">
        <h2 className="display">{state.team.score} punten</h2>
        <p>Plek {state.team.rank} van {state.team.teamCount}.</p>
        {state.team.ledger.map((line, index) => (
          <div key={`${line.label}-${index}`} className="spread">
            <span>{line.label}</span>
            <b>{line.points > 0 ? `+${line.points}` : line.points}</b>
          </div>
        ))}
      </article>
      {state.team.secretVisible && state.event.secretText ? (
        <article className="paper stack">
          <span className="stamp">Het geheim</span>
          <p className="serif" style={{ whiteSpace: "pre-wrap" }}>{state.event.secretText}</p>
        </article>
      ) : (
        <Banner>Het geheim verschijnt als jullie de finale kraken of wanneer de organisatie de uitslag toont.</Banner>
      )}
    </div>
  );
}

export function Scanner() {
  const router = useRouter();
  const [manual, setManual] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const openedRef = useRef(false);

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => undefined);
    };
  }, []);

  function openCode(value: string) {
    if (openedRef.current) return true;
    const href = scanTarget(value);
    if (!href) {
      setCameraError("Die code herken ik niet. Gebruik de code op het bord, bijvoorbeeld MUSEUM.");
      return false;
    }
    openedRef.current = true;
    scannerRef.current?.stop().catch(() => undefined);
    router.push(href);
    return true;
  }

  async function start() {
    setStarted(true);
    setCameraError(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      const cameras = await Html5Qrcode.getCameras().catch(() => []);
      const back = cameras.find((camera) => /back|rear|environment|achter/i.test(camera.label)) ?? cameras[cameras.length - 1];
      await scanner.start(
        back?.id ?? { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (width, height) => {
            const edge = Math.max(50, Math.floor(Math.min(width, height) * 0.72));
            return { width: edge, height: edge };
          },
        },
        (text) => {
          openCode(text);
        },
        () => undefined,
      );
    } catch {
      setCameraError("De camera is niet beschikbaar of de toestemming is geweigerd. Vul de code van het bord hieronder in.");
    }
  }

  return (
    <div className="stack">
      <h1 className="display">Scan de ruimte</h1>
      <p className="muted">Richt de camera op de QR-code, of typ de code van het bord. Bijvoorbeeld MUSEUM of PERS.</p>
      <div id="qr-reader" style={{ borderRadius: 18, overflow: "hidden", background: "#111" }} />
      {!started ? <Button full onClick={() => void start()}>Open de camera</Button> : null}
      {cameraError ? <Banner>{cameraError}</Banner> : null}
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          openCode(manual);
        }}
      >
        <label className="field">
          <span>Ruimtecode</span>
          <input value={manual} onChange={(event) => setManual(event.target.value.toUpperCase())} autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="MUSEUM" />
        </label>
        <Button type="submit" full kind="dark">Open de ruimte</Button>
      </form>
    </div>
  );
}

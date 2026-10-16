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
        <article className="stat"><b>{event.locations.filter((item) => item.available).reduce((sum, item) => sum + item.solvedCount, 0)}/{event.locations.filter((item) => item.available).reduce((sum, item) => sum + item.questionCount, 0)}</b><span>vragen</span></article>
        <article className="stat"><b>{event.evidenceCollected}/{event.evidenceTotal}</b><span>bewijzen</span></article>
      </section>
      <article className="paper dark stack">
        <p className="small">Hints over: {team.hintsLeft}. Een hint kost {team.hintCost} punten.</p>
        <Link className="btn primary full" href={event.finaleOpen ? "/spel/finale" : "/spel/kaart"}>
          {event.finaleOpen ? "Naar de finale" : "Speel verder"}
        </Link>
        {!event.finaleOpen ? <p className="small">De finale opent bij 7 van de 7 bewijsstukken, of in de laatste 20 minuten.</p> : null}
      </article>
      <div className="stack">
        {event.locations.filter((location) => location.available).map((location) => {
          const done = location.id === "veld" ? location.questionCount > 0 && location.solvedCount === location.questionCount : location.complete;
          const href = location.id === "veld" ? "/spel/veld" : location.visited ? `/spel/locatie/${location.id}` : "/spel/scan";
          const found = event.evidence.filter((item) => item.found && location.evidenceIds.includes(item.id)).length;
          return (
            <Link key={location.id} href={href} className="paper spread">
              <div>
                <b>{location.name}</b>
                <p className="small" style={{ margin: 0 }}>
                  {location.id === "veld"
                    ? `${location.solvedCount} van ${location.questionCount} vragen`
                    : location.visited
                      ? `${location.closedCount} van ${location.questionCount} vragen · ${found} van ${location.evidenceIds.length} bewijs`
                      : "Nog niet gescand"}
                </p>
              </div>
              <span className="stamp">{done ? "Klaar" : location.visited || location.id === "veld" ? "Open" : "Scan"}</span>
            </Link>
          );
        })}
        {event.locations.filter((location) => location.available && location.id !== "veld").length === 0 ? (
          <Banner tone="warn">Er is vandaag geen kamer open. Vraag de instructeur om minstens één ruimte te openen.</Banner>
        ) : null}
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
        <p className="muted">Open een kamer met de QR-code ter plekke. Het Veld heeft geen QR-code. Minder open kamers betekent meer bewijsstukken per kamer.</p>
      </div>
      {state.event.locations.filter((location) => location.available && location.id !== "veld").length === 0 ? (
        <Banner tone="warn">Er is vandaag geen kamer open. Het spel kan pas starten als de instructeur minstens één ruimte openzet.</Banner>
      ) : null}
      <div className="map">
        {state.event.locations.filter((location) => location.available).map((location) => {
          const done = location.id === "veld" ? location.questionCount > 0 && location.solvedCount === location.questionCount : location.complete;
          const href = location.id === "veld" ? "/spel/veld" : location.visited ? `/spel/locatie/${location.id}` : "/spel/scan";
          const found = state.event.evidence.filter((item) => item.found && location.evidenceIds.includes(item.id)).length;
          return (
            <Link key={location.id} href={href} className={`zone ${done ? "done" : ""}`}>
              <span>
                <b>{location.name}</b>
                <small>
                  {location.id === "veld"
                    ? `${location.solvedCount}/${location.questionCount} vragen`
                    : `${found}/${location.evidenceIds.length} bewijs`}
                </small>
              </span>
              <strong>{location.id === "veld" ? (done ? "Klaar" : "Open") : location.visited ? (done ? "Klaar" : "Verder") : "Scan"}</strong>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function ClueBook() {
  const { state } = useTeam();
  if (!state) return null;
  return (
    <div className="stack">
      <h1 className="display">Zaakmap</h1>
      <p>{state.event.evidenceCollected} van de {state.event.evidenceTotal} bewijsstukken.</p>
      {state.event.evidence.map((item) => item.found ? (
        <article key={item.id} className="clue">
          <p className="kicker">Bewijsstuk {item.order}</p>
          <h2 className="serif">{item.title}</h2>
          <p className="serif">{item.text}</p>
        </article>
      ) : (
        <article key={item.id} className="clue sealed">
          <span className="stamp">Ontbreekt</span>
          <p>Bewijsstuk {item.order} is nog niet gevonden.</p>
        </article>
      ))}
      <h2 className="display">Verdachten</h2>
      <p className="small">De personages zijn verzonnen. Vergelijk hun motief met de bewijsstukken. De zaakmap zegt niet wie het heeft gedaan.</p>
      {SUSPECTS.map((suspect) => (
        <article key={suspect.id} className="paper stack">
          <b>{suspect.name}</b>
          <span className="small">{suspect.role}</span>
          <p className="serif" style={{ margin: 0 }}>{suspect.statement}</p>
        </article>
      ))}
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
            <p className="small" style={{ margin: 0 }}>{row.completedCount} vragen · finale {row.finaleStatus}</p>
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
      {!state.event.finaleOpen ? <Banner>De finale is nog dicht. Die opent als alle zeven bewijsstukken binnen zijn, of in de laatste 20 minuten.</Banner> : null}
      <article className="paper stack">
        <p className="serif">{state.event.finalePrompt}</p>
        {state.event.evidence.filter((item) => item.found).length === 0 ? <p>Jullie hebben nog geen bewijsstukken. Die komen in de zaakmap als een kamer is afgerond.</p> : null}
        {state.event.evidence.filter((item) => item.found).map((item) => (
          <div key={item.id}>
            <b>{item.title}</b>
            <p className="serif" style={{ margin: 0 }}>{item.text}</p>
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

  function safeStop() {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      const result = scanner.stop();
      if (result && typeof result.catch === "function") result.catch(() => undefined);
    } catch {
      // De camera was nog niet gestart. Dat mag de pagina niet laten crashen.
    }
  }

  useEffect(() => {
    return () => {
      safeStop();
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
    safeStop();
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
          try {
            openCode(text);
          } catch {
            setCameraError("De code is gelezen, maar de pagina kon hem niet openen. Typ de code hieronder.");
          }
        },
        () => undefined,
      );
    } catch {
      safeStop();
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
          try {
            openCode(manual);
          } catch {
            setCameraError("Die code kon niet worden geopend. Probeer het nog eens.");
          }
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

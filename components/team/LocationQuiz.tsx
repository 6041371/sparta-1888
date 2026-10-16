"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import type { PublicQuizQuestion } from "@/lib/types";
import { useTeam } from "@/components/team/TeamShell";
import { Banner, Button } from "@/components/ui";

export function LocationQuiz({ locationId }: { locationId: string }) {
  const { state, refresh } = useTeam();
  const [phase, setPhase] = useState<"intro" | "ask" | "result" | "game" | "proof" | null>(null);
  const [index, setIndex] = useState(0);
  const [pick, setPick] = useState("");
  const [text, setText] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!state) return null;
  const location = state.event.locations.find((item) => item.id === locationId);
  if (!location || !location.available) {
    return (
      <div className="stack">
        <h1 className="display">Deze ruimte</h1>
        <Banner tone="warn">Deze ruimte is vandaag niet beschikbaar.</Banner>
        <Link className="btn dark" href="/spel/kaart">Terug naar de kaart</Link>
      </div>
    );
  }
  if (!location.visited) {
    return (
      <div className="stack">
        <h1 className="display">{location.name}</h1>
        <Banner>Scan eerst de QR-code van deze ruimte.</Banner>
        <Link className="btn primary" href="/spel/scan">Naar de scanner</Link>
      </div>
    );
  }

    const questions = state.event.questions.filter((question) => question.locationId === locationId);
  const firstOpen = Math.max(0, questions.findIndex((question) => !question.closed));
  const started = questions.some((question) => question.closed);
  const view = phase ?? (questions.every((question) => question.closed) ? (location.minigameTitle && !location.minigameDone ? "game" : "proof") : started ? "ask" : "intro");
  const cursor = phase === null ? firstOpen : index;
  const question = questions[cursor];
  const found = state.event.evidence.filter((item) => location.evidenceIds.includes(item.id) && item.found);

  async function check(current: PublicQuizQuestion, response: string) {
    setBusy(true);
    try {
      const result = await api<{ outcome: { correct: boolean; feedback: string } }>("/api/team", {
        action: "quiz",
        questionId: current.id,
        response,
      });
      setNote({ ok: result.outcome.correct, text: result.outcome.feedback });
      setPhase("result");
      await refresh();
    } catch (caught) {
      setNote({ ok: false, text: caught instanceof Error ? caught.message : "Het antwoord kon niet worden gecontroleerd." });
      setPhase("result");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    const following = questions[cursor + 1];
    setNote(null);
    setPick("");
    setText("");
    if (following && !following.closed) {
      setIndex(cursor + 1);
      setPhase("ask");
      return;
    }
    if (location?.minigameTitle && !location.minigameDone) setPhase("game");
    else setPhase("proof");
  }

  return (
    <div className="stack">
      <p className="kicker">{location.name} · {location.closedCount} van {location.questionCount} vragen · {found.length} van {location.evidenceIds.length} bewijzen</p>
      {view === "intro" ? (
        <article className="paper stack">
          <h1 className="display">{location.name}</h1>
          <p className="serif">{location.intro}</p>
          <p>In deze kamer liggen {location.evidenceIds.length} {location.evidenceIds.length === 1 ? "bewijsstuk" : "bewijsstukken"}. Die komen vrij als de vragen af zijn{location.minigameTitle ? " en het spel daarna is gespeeld" : ""}.</p>
          <Button full onClick={() => { setIndex(firstOpen); setPhase("ask"); }}>Begin met vraag 1</Button>
        </article>
      ) : null}
      {view === "ask" && question ? (
        <article className="paper stack">
          <p className="kicker">Vraag {cursor + 1} van {questions.length}</p>
          <h1 className="serif" style={{ margin: 0 }}>{question.prompt}</h1>
          {question.kind === "choice" ? (
            <div className="stack">
              {question.options.map((option) => (
                <button key={option.id} type="button" className={`paper suspect ${pick === option.id ? "on" : ""}`} onClick={() => setPick(option.id)}>
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <textarea rows={question.minLines >= 4 ? 6 : 3} value={text} placeholder={question.kind === "creative" ? "Schrijf hier jullie tekst" : "Jullie antwoord"} onChange={(input) => setText(input.target.value)} />
          )}
          <Button full disabled={busy || (question.kind === "choice" ? !pick : !text.trim())} onClick={() => void check(question, question.kind === "choice" ? pick : text)}>
            {busy ? "Controleren…" : "Controleer antwoord"}
          </Button>
        </article>
      ) : null}
      {view === "result" ? (
        <article className="paper stack">
          <span className="stamp">{note?.ok ? "Goed" : "Nog niet"}</span>
          <h1 className="display">{note?.ok ? "Dat klopt" : "Helaas"}</h1>
          {note ? <Banner tone={note.ok ? "ok" : "warn"}>{note.text}</Banner> : null}
          <Button full onClick={next}>{cursor + 1 < questions.length && questions[cursor + 1] && !questions[cursor + 1].closed ? "Volgende vraag" : location.minigameTitle && !location.minigameDone ? "Naar het spel" : "Bekijk het bewijs"}</Button>
        </article>
      ) : null}
      {view === "game" && location.minigameTitle ? (
        <article className="paper stack">
          <p className="kicker">Kort spel</p>
          <h1 className="display">{location.minigameTitle}</h1>
          <p className="serif">{location.minigameSummary}</p>
          <p>Dit is geen extra kamer. Het hoort bij {location.name}. Jullie spelen het één keer.</p>
          {location.minigameDone ? <Banner tone="ok">Dit spel is al gespeeld.</Banner> : null}
          {location.minigameCode && !location.minigameDone ? <Link className="btn primary full" href={`/spel/station/${location.minigameCode}`}>Starten</Link> : null}
          {location.minigameDone ? <Button full onClick={() => setPhase("proof")}>Bekijk het bewijs</Button> : null}
        </article>
      ) : null}
      {view === "proof" ? (
        <article className="paper stack">
          <p className="kicker">Zaakmap</p>
          <h1 className="display">{location.complete ? "Kamer afgerond" : "Bijna"}</h1>
          {location.complete ? <p>Deze kamer leverde {found.length} van de {location.evidenceIds.length} toegewezen bewijsstukken.</p> : <p>Rond eerst alle vragen af{location.minigameTitle ? " en het korte spel" : ""}. Dan komen de bewijsstukken in de zaakmap.</p>}
          {found.map((item) => (
            <div key={item.id} className="clue">
              <p className="kicker">Bewijsstuk {item.order}</p>
              <h2 className="serif">{item.title}</h2>
              <p className="serif">{item.text}</p>
            </div>
          ))}
          <Link className="btn dark" href="/spel/aanwijzingen">Open de zaakmap</Link>
          <Link className="btn ghost" href="/spel/kaart">Terug naar de kaart</Link>
        </article>
      ) : null}
    </div>
  );
}

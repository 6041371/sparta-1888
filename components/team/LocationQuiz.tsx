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
  const games = location.minigames ?? [];
  const gameLeft = games.some((game) => !game.done);
  const firstOpen = Math.max(0, questions.findIndex((question) => !question.closed));
  const started = questions.some((question) => question.closed);
  const view = phase ?? (questions.every((question) => question.closed) ? (gameLeft ? "game" : "proof") : started ? "ask" : "intro");
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
    if (location && (location.minigames ?? []).some((game) => !game.done)) setPhase("game");
    else setPhase("proof");
  }

  return (
    <div className="stack">
      <p className="kicker">{location.name} · {location.closedCount} van {location.questionCount} vragen · {found.length} van {location.evidenceIds.length} bewijzen</p>
      {view === "intro" ? (
        <article className="paper stack">
          <h1 className="display">{location.name}</h1>
          <p className="serif">{location.intro}</p>
          <p>In deze kamer liggen {location.evidenceIds.length} {location.evidenceIds.length === 1 ? "bewijsstuk" : "bewijsstukken"}. Die komen vrij als de vragen af zijn{games.length ? ` en ${games.length === 1 ? "het spel daarna is" : "de spellen daarna zijn"} gespeeld` : ""}.</p>
          <Button full onClick={() => { setIndex(firstOpen); setPhase("ask"); }}>Begin met vraag 1</Button>
        </article>
      ) : null}
      {view === "ask" && question ? (
        <article className="paper stack">
          <p className="kicker">Vraag {cursor + 1} van {questions.length}</p>
          <p className="question-prompt">{question.prompt}</p>
          {question.kind === "choice" ? (
            <div className="stack">
              {question.options.map((option) => (
                <button key={option.id} type="button" className={`paper suspect ${pick === option.id ? "on" : ""}`} onClick={() => setPick(option.id)}>
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <>
              <textarea rows={question.minLines >= 4 ? 6 : 3} value={text} placeholder={question.kind === "creative" ? "Elke regel met Enter" : "Jullie antwoord"} onChange={(input) => setText(input.target.value)} />
              {question.kind === "creative" && question.minLines > 0 ? (
                <p className="small" style={{ margin: 0 }}>{text.split(/\n/).map((line) => line.trim()).filter(Boolean).length} van minimaal {question.minLines} regels.</p>
              ) : null}
            </>
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
          <Button full onClick={next}>{cursor + 1 < questions.length && questions[cursor + 1] && !questions[cursor + 1].closed ? "Volgende vraag" : gameLeft ? "Naar het spel" : "Bekijk het bewijs"}</Button>
        </article>
      ) : null}
      {view === "game" && games.length > 0 ? (
        <article className="paper stack">
          <p className="kicker">Kort spel</p>
          <h1 className="display">{games.length === 1 ? games[0].title : `${games.length} spellen`}</h1>
          <p>In welke kamer je ook begint: Spot de verdachte is het eerste spel. Daarna het spel van deze kamer. Crack the Code is altijd het vierde spel, in welke kamer je dan ook staat. De hints staan bij dat spel.</p>
          {games.map((game) => (
            <div key={game.title} className="stack">
              <h2 className="serif">{game.title}</h2>
              <p>{game.summary}</p>
              {game.done ? <Banner tone="ok">Dit spel is al gespeeld.</Banner> : null}
              {!game.done && game.locked ? <Banner>{game.locked}</Banner> : null}
              {!game.done && !game.locked && game.code ? <Link className="btn primary full" href={`/spel/station/${game.code}`}>Starten</Link> : null}
            </div>
          ))}
          <Button full onClick={() => setPhase("proof")}>Bekijk het bewijs</Button>
        </article>
      ) : null}
      {view === "proof" ? (
        <article className="paper stack">
          <p className="kicker">Zaakmap</p>
          <h1 className="display">{location.complete ? "Kamer afgerond" : "Bijna"}</h1>
          {location.complete ? <p>Deze kamer leverde {found.length} van de {location.evidenceIds.length} toegewezen bewijsstukken.</p> : <p>Rond eerst alle vragen af{games.some((game) => game.title !== "Crack the Code") ? " en de korte spellen" : ""}. Dan komen de bewijsstukken in de zaakmap.</p>}
          {found.map((item) => (
            <div key={item.id} className="clue">
              <p className="kicker">Bewijsstuk {item.order}</p>
              <h2 className="serif">{item.title}</h2>
              {item.image ? <img className="evidence-shot" src={item.image} alt={item.title} /> : null}
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

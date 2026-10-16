"use client";

import { useState } from "react";
import { api } from "@/lib/client/api";
import type { PublicFieldPlayer, PublicQuizQuestion } from "@/lib/types";
import { useTeam } from "@/components/team/TeamShell";
import { Banner, Button } from "@/components/ui";

export function FieldBoard() {
  const { state, refresh } = useTeam();
  const [player, setPlayer] = useState<PublicFieldPlayer | null>(null);
  const [pick, setPick] = useState("");
  const [text, setText] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!state) return null;
  const location = state.event.locations.find((item) => item.id === "veld");

  async function seen() {
    setBusy(true);
    try {
      await api("/api/team", { action: "field-seen" });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!state.team.fieldSeen) {
    return (
      <div className="stack">
        <p className="kicker">Het Veld</p>
        <h1 className="display">Beste Sparta-elftal ooit</h1>
        <article className="paper stack">
          <p className="serif">Volgens de statistieken is dit het sterkste elftal dat je uit Sparta-spelers kunt zetten. De namen staan op hun plek. Spelers verschijnen op jullie veld zodra een kamer is afgerond. Bij minder open kamers komen er meer spelers tegelijk vrij.</p>
          <img src="/veld-elftal.jpg" alt="Opstelling met het beste Sparta-elftal, inclusief reserves" style={{ width: "100%", borderRadius: 16 }} />
          <Button full disabled={busy} onClick={() => void seen()}>Naar het veld</Button>
        </article>
      </div>
    );
  }

  const question: PublicQuizQuestion | undefined = player
    ? state.event.questions.find((item) => item.id === player.questionId)
    : undefined;

  async function check() {
    if (!question) return;
    setBusy(true);
    try {
      const result = await api<{ outcome: { correct: boolean; feedback: string } }>("/api/team", {
        action: "quiz",
        questionId: question.id,
        response: question.kind === "choice" ? pick : text,
      });
      setNote({ ok: result.outcome.correct, text: result.outcome.feedback });
      await refresh();
    } catch (caught) {
      setNote({ ok: false, text: caught instanceof Error ? caught.message : "Het antwoord kon niet worden gecontroleerd." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div>
        <p className="kicker">Het Veld</p>
        <h1 className="display">Beste Sparta-elftal ooit</h1>
        <p>{location ? `${state.event.fieldPlayers.filter((item) => item.unlocked).length} van ${state.event.fieldPlayers.length} spelers vrij` : ""}</p>
      </div>
      <div className="pitch">
        <img src="/veld-leeg.png" alt="" />
        {state.event.fieldPlayers.filter((item) => item.unlocked).map((item) => (
          <button key={item.questionId} type="button" className={`pitch-player ${item.keeper ? "keeper" : ""} ${item.solved ? "done" : ""}`} style={{ top: item.top, left: item.left }} onClick={() => { setPlayer(item); setPick(""); setText(""); setNote(null); }}>
            {item.name}
          </button>
        ))}
      </div>
      <p className="small">Tik een speler aan voor zijn vraag. Wie nog niet vrij is, staat niet op het veld.</p>
      {player && question ? (
        <article className="paper stack">
          <p className="kicker">{player.name}</p>
          <h2 className="serif" style={{ margin: 0 }}>{question.prompt}</h2>
          {question.closed ? <Banner tone={question.solved ? "ok" : "warn"}>Deze vraag is al gecontroleerd.</Banner> : question.kind === "choice" ? (
            <div className="stack">
              {question.options.map((option) => (
                <button key={option.id} type="button" className={`paper suspect ${pick === option.id ? "on" : ""}`} onClick={() => setPick(option.id)}>{option.label}</button>
              ))}
            </div>
          ) : (
            <textarea rows={3} value={text} onChange={(input) => setText(input.target.value)} placeholder="Jullie antwoord" />
          )}
          {note ? <Banner tone={note.ok ? "ok" : "warn"}>{note.text}</Banner> : null}
          {question.closed ? null : <Button full disabled={busy || (question.kind === "choice" ? !pick : !text.trim())} onClick={() => void check()}>{busy ? "Controleren…" : "Controleer antwoord"}</Button>}
          <Button kind="dark" full onClick={() => setPlayer(null)}>Sluit</Button>
        </article>
      ) : null}
    </div>
  );
}

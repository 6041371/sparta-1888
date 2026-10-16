"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import type { PublicQuizQuestion, TeamSnapshot } from "@/lib/types";
import { useTeam } from "@/components/team/TeamShell";
import { Banner, Button } from "@/components/ui";

export function LocationQuiz({ locationId }: { locationId: string }) {
  const { state, refresh } = useTeam();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

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
        <Banner>Scan eerst de QR-code van deze ruimte. De vragen openen alleen na die scan.</Banner>
        <Link className="btn primary" href="/spel/scan">Naar de scanner</Link>
      </div>
    );
  }

  const questions = state.event.questions.filter((question) => question.locationId === locationId);

  async function send(question: PublicQuizQuestion, response: string) {
    setBusy(question.id);
    try {
      const result = await api<{ outcome: { correct: boolean; feedback: string; points: number; already: boolean }; state: TeamSnapshot }>(
        "/api/team",
        { action: "quiz", questionId: question.id, response },
      );
      setNotes((current) => ({ ...current, [question.id]: { ok: result.outcome.correct, text: result.outcome.feedback } }));
      await refresh();
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "Het antwoord kon niet worden opgeslagen.";
      setNotes((current) => ({ ...current, [question.id]: { ok: false, text } }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      <div>
        <p className="kicker">{location.solvedCount} van {location.questionCount} vragen</p>
        <h1 className="display">{location.name}</h1>
        <p className="serif">{location.intro}</p>
      </div>
      {questions.map((question, index) => {
        const note = notes[question.id];
        return (
          <article key={question.id} className="paper stack">
            <p className="kicker">Vraag {index + 1}</p>
            <h2 className="serif" style={{ margin: 0 }}>{question.prompt}</h2>
            {question.solved ? <span className="stamp">Beantwoord</span> : null}
            {question.kind === "choice" ? (
              <div className="stack">
                {question.options.map((option) => (
                  <Button
                    key={option.id}
                    kind="dark"
                    full
                    disabled={busy === question.id || question.solved}
                    onClick={() => void send(question, option.id)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            ) : (
              <form
                className="stack"
                onSubmit={(submit) => {
                  submit.preventDefault();
                  void send(question, drafts[question.id] ?? "");
                }}
              >
                <textarea
                  rows={question.minLines >= 4 ? 6 : 3}
                  value={drafts[question.id] ?? ""}
                  disabled={question.solved || busy === question.id}
                  placeholder={question.kind === "creative" ? "Schrijf hier jullie tekst" : question.inputLabel}
                  onChange={(input) => setDrafts((current) => ({ ...current, [question.id]: input.target.value }))}
                />
                {question.solved ? null : (
                  <Button disabled={busy === question.id} type="submit">
                    {busy === question.id ? "Controleren…" : "Antwoord bewaren"}
                  </Button>
                )}
              </form>
            )}
            {note ? <Banner tone={note.ok ? "ok" : "warn"}>{note.text}</Banner> : null}
          </article>
        );
      })}
      <Link className="btn dark" href="/spel/kaart">Terug naar de kaart</Link>
    </div>
  );
}

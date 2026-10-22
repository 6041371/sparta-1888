"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import type { PublicFieldPlayer, PublicQuizQuestion } from "@/lib/types";
import { useTeam } from "@/components/team/TeamShell";
import { Banner, Button, Modal } from "@/components/ui";

function useRetryLeft(retryAt: number | null, serverNow: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!retryAt) return;
    const skew = Date.now() - serverNow;
    const id = window.setInterval(() => {
      setTick((value) => value + 1);
      if (retryAt - (Date.now() - skew) <= 0) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [retryAt, serverNow]);
  if (!retryAt) return 0;
  const skew = Date.now() - serverNow;
  void tick;
  return Math.max(0, retryAt - (Date.now() - skew));
}

const RETRY_MS = 5 * 60 * 1000;

function clock(ms: number) {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function RetryClock({ retryAt, serverNow, label }: { retryAt: number | null; serverNow: number; label: string }) {
  const left = useRetryLeft(retryAt, serverNow);
  if (!retryAt || left <= 0) return null;
  const width = Math.max(0, Math.min(100, (left / RETRY_MS) * 100));
  return (
    <article className="field-timer" role="timer" aria-live="off">
      <small>{label}</small>
      <b>{clock(left)}</b>
      <span className="field-timer-bar" aria-hidden="true"><i style={{ width: `${width}%` }} /></span>
    </article>
  );
}

function PitchClock({ retryAt, serverNow }: { retryAt: number | null; serverNow: number }) {
  const left = useRetryLeft(retryAt, serverNow);
  if (!retryAt || left <= 0) return null;
  return <em className="pitch-clock">{clock(left)}</em>;
}

export function FieldBoard() {
  const { state, refresh } = useTeam();
  const [player, setPlayer] = useState<PublicFieldPlayer | null>(null);
  const [pick, setPick] = useState("");
  const [text, setText] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const question: PublicQuizQuestion | undefined = state && player
    ? state.event.questions.find((item) => item.id === player.questionId)
    : undefined;
  const retryAt = Math.max(question?.retryAt ?? 0, lockUntil ?? 0) || null;
  const retryLeft = useRetryLeft(retryAt, state?.serverNow ?? 0);

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
          <p className="serif">Volgens de statistieken is dit het sterkste elftal dat je uit Sparta-spelers kunt zetten. De shirts komen op hun plek zodra een kamer is afgerond. Bij minder open kamers komen er meer spelers tegelijk vrij.</p>
          <img src="/opstelling.jpg" alt="Opstelling met het beste Sparta-elftal, inclusief reserves" style={{ width: "100%", borderRadius: 16 }} />
          <Button full disabled={busy} onClick={() => void seen()}>Naar het veld</Button>
        </article>
      </div>
    );
  }

  async function check() {
    if (!question || retryLeft > 0) return;
    setBusy(true);
    try {
      const result = await api<{ outcome: { correct: boolean; feedback: string; retryAt?: number | null } }>("/api/team", {
        action: "quiz",
        questionId: question.id,
        response: question.kind === "choice" ? pick : text,
      });
      setLockUntil(result.outcome.correct ? null : result.outcome.retryAt ?? null);
      setNote({ ok: result.outcome.correct, text: result.outcome.correct ? "Goed." : "Dat klopt nog niet." });
      setPick("");
      setText("");
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
        {state.event.fieldPlayers.filter((item) => item.unlocked).map((item) => {
          const card = state.event.questions.find((question) => question.id === item.questionId);
          return (
            <button key={item.questionId} type="button" className={`pitch-player ${item.solved ? "done" : ""}`} style={{ top: item.top, left: item.left }} onClick={() => { setPlayer(item); setPick(""); setText(""); setNote(null); setLockUntil(null); }}>
              <img src={item.image} alt="" />
              <span>{item.name}</span>
              <PitchClock retryAt={card?.retryAt ?? null} serverNow={state.serverNow} />
            </button>
          );
        })}
      </div>
      <div className="field-timers">
        {state.event.fieldPlayers.filter((item) => item.unlocked).map((item) => {
          const card = state.event.questions.find((question) => question.id === item.questionId);
          if (!card?.retryAt) return null;
          return <RetryClock key={item.questionId} retryAt={card.retryAt} serverNow={state.serverNow} label={`${item.name} · opnieuw over`} />;
        })}
      </div>
      <p className="small">Tik een speler aan voor zijn vraag. Een fout antwoord kan na vijf minuten opnieuw, tot het goed is. Wie nog niet vrij is, staat niet op het veld.</p>
      {player && question ? (
        <Modal title={player.name} onClose={() => setPlayer(null)}>
          <p className="question-prompt">{question.prompt}</p>
          {question.solved ? <Banner tone="ok">Goed.</Banner> : retryLeft > 0 ? (
            <RetryClock retryAt={retryAt} serverNow={state.serverNow} label="Opnieuw proberen over" />
          ) : (
            <>
              {question.kind === "choice" ? (
                <div className="stack">
                  {question.options.map((option) => (
                    <button key={option.id} type="button" className={`paper suspect ${pick === option.id ? "on" : ""}`} onClick={() => setPick(option.id)}>{option.label}</button>
                  ))}
                </div>
              ) : (
                <textarea rows={3} value={text} onChange={(input) => setText(input.target.value)} placeholder="Jullie antwoord" />
              )}
              {note && !note.ok ? <Banner tone="warn">{note.text}</Banner> : null}
              <Button full disabled={busy || (question.kind === "choice" ? !pick : !text.trim())} onClick={() => void check()}>{busy ? "Controleren…" : "Controleer antwoord"}</Button>
            </>
          )}
        </Modal>
      ) : null}
    </div>
  );
}

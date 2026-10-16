"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import type { PublicPuzzle, PublicStation, TeamSnapshot } from "@/lib/types";
import type { ReactionRound } from "@/lib/types";
import { CrackTheCode } from "@/components/games/CrackTheCode";
import { MemoryVault } from "@/components/games/MemoryVault";
import { ReactionArena } from "@/components/games/ReactionArena";
import { useTeam } from "@/components/team/TeamShell";
import { Banner, Button, Loading } from "@/components/ui";

interface Entered {
  playable: boolean;
  blockReason: string | null;
  photoPrompt: string | null;
  hintUsed: boolean;
  locationLabel: string;
  completion: { points: number; breakdown: string; photoStatus: "pending" | "reviewed" | null; clueTitle: string; clueText: string } | null;
  station: PublicStation;
}

interface Outcome {
  alreadyCompleted?: boolean;
  awarded?: number;
  points?: number;
  breakdown?: string;
  clue?: { title: string; text: string } | null;
  score?: number;
  correct?: boolean;
  feedback?: string;
  pending?: boolean;
  hint?: string;
}

export function GameScreen({ code }: { code: string }) {
  const { refresh } = useTeam();
  const [entered, setEntered] = useState<Entered | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [practice, setPractice] = useState(false);

  async function load() {
    const data = await api<{ outcome: Entered; state: TeamSnapshot }>("/api/team", { action: "enter", code });
    setEntered(data.outcome);
    await refresh();
  }

  useEffect(() => {
    let active = true;
    api<{ outcome: Entered; state: TeamSnapshot }>("/api/team", { action: "enter", code })
      .then(async (data) => {
        if (!active) return;
        setEntered(data.outcome);
        await refresh();
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Het station kon niet worden geopend.");
      });
    return () => {
      active = false;
    };
  }, [code, refresh]);

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ outcome: Outcome; state: TeamSnapshot }>("/api/team", body);
      if (data.outcome.hint) setHint(data.outcome.hint);
      setFeedback(data.outcome.feedback ? { text: data.outcome.feedback, ok: data.outcome.correct !== false } : null);
      setOutcome(body.action === "hint" || data.outcome.correct === false ? null : data.outcome);
      await refresh();
      if (body.action !== "hint") setPractice(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Het antwoord kon niet worden opgeslagen.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !entered) {
    return (
      <div className="stack">
        <Banner tone="danger">{error}</Banner>
        <Link className="btn ghost" href="/spel/kaart">
          Terug naar de kaart
        </Link>
      </div>
    );
  }
  if (!entered) return <Loading label="Station openen…" />;

  const done = entered.completion && !practice;
  return (
    <div className="stack">
      <div>
        <p className="kicker">{entered.locationLabel}</p>
        <h1 className="display">{entered.station.name}</h1>
        <p className="muted">{entered.station.gameTitle} · maximaal {entered.station.pointsMax} punten</p>
      </div>
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {hint ? <Banner tone="paper">{hint}</Banner> : null}
      {feedback ? <Banner tone={feedback.ok ? "ok" : "warn"}>{feedback.text}</Banner> : null}
      {done ? (
        <article className="paper stack">
          <span className="stamp">{entered.completion?.photoStatus === "pending" ? "Ingestuurd" : "Voltooid"}</span>
          <h2 className="display">{entered.completion?.points} punten</h2>
          <p>{entered.completion?.breakdown}</p>
          {entered.completion?.photoStatus === "pending" ? (
            <p>De organisatie beoordeelt de foto nog. De aanwijzing is al van jullie.</p>
          ) : null}
          <div className="clue">
            <p className="kicker">Aanwijzing</p>
            <h3 className="serif">{entered.completion?.clueTitle}</h3>
            <p className="serif">{entered.completion?.clueText}</p>
          </div>
          <p className="small">Opnieuw spelen levert geen extra punten op.</p>
          {entered.station.game !== "photo" && entered.station.game !== "code" ? (
            <Button kind="dark" onClick={() => setPractice(true)}>
              Oefen nog een keer
            </Button>
          ) : null}
          <Link className="btn primary" href="/spel">
            Naar het dashboard
          </Link>
        </article>
      ) : null}
      {!done && entered.blockReason && !practice ? <Banner>{entered.blockReason}</Banner> : null}
      {!done && !outcome && (entered.playable || practice) && entered.station.game === "reaction" ? (
        <ReactionArena busy={busy} onFinish={(rounds: ReactionRound[]) => (practice ? setPractice(false) : send({ action: "reaction", code, rounds }))} />
      ) : null}
      {!done && !outcome && (entered.playable || practice) && entered.station.game === "memory" ? (
        <MemoryVault
          busy={busy}
          onFinish={(result) => (practice ? setPractice(false) : send({ action: "memory", code, ...result }))}
        />
      ) : null}
      {!done && !outcome && entered.playable && entered.station.game === "code" && entered.station.puzzle ? (
        <CodeBlock
          puzzle={entered.station.puzzle}
          busy={busy}
          hintUsed={entered.hintUsed || Boolean(hint)}
          onAnswer={(answer) => send({ action: "code", code, answer })}
          onHint={() => send({ action: "hint", code })}
        />
      ) : null}
      {!done && entered.station.game === "photo" ? (
        <Banner>Deze foto-opdracht hoort niet meer bij het spel. Scan de QR-code van de ruimte voor de vragen.</Banner>
      ) : null}
      {outcome && !done ? (
        <article className="paper stack">
          <h2 className="display">{outcome.alreadyCompleted ? "Geen extra punten" : `+${outcome.awarded ?? 0} punten`}</h2>
          {outcome.breakdown ? <p>{outcome.breakdown}</p> : null}
          {outcome.pending ? <p>De foto staat klaar voor de organisatie. Jullie aanwijzing is open.</p> : null}
          {outcome.clue ? (
            <div className="clue">
              <p className="kicker">Aanwijzing</p>
              <h3 className="serif">{outcome.clue.title}</h3>
              <p className="serif">{outcome.clue.text}</p>
            </div>
          ) : null}
          <Button onClick={() => void load()}>Toon het resultaat</Button>
        </article>
      ) : null}
    </div>
  );
}

function CodeBlock({
  puzzle,
  busy,
  hintUsed,
  onAnswer,
  onHint,
}: {
  puzzle: PublicPuzzle;
  busy: boolean;
  hintUsed: boolean;
  onAnswer: (answer: string) => void;
  onHint: () => void;
}) {
  const { state } = useTeam();
  return (
    <CrackTheCode
      puzzle={puzzle}
      busy={busy}
      hintUsed={hintUsed}
      hintCost={state?.team.hintCost ?? 15}
      hintsLeft={state?.team.hintsLeft ?? 0}
      onAnswer={onAnswer}
      onHint={onHint}
    />
  );
}

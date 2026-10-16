"use client";

import { useState } from "react";
import type { PublicPuzzle } from "@/lib/types";
import { Button } from "@/components/ui";

export function CrackTheCode({
  puzzle,
  busy,
  hintUsed,
  hintCost,
  hintsLeft,
  onAnswer,
  onHint,
}: {
  puzzle: PublicPuzzle;
  busy: boolean;
  hintUsed: boolean;
  hintCost: number;
  hintsLeft: number;
  onAnswer: (answer: string) => Promise<void> | void;
  onHint: () => Promise<void> | void;
}) {
  const [answer, setAnswer] = useState("");
  const [confirmHint, setConfirmHint] = useState(false);

  return (
    <div className="stack">
      <article className="paper stack">
        <p className="kicker">Crack the Code</p>
        <h2 className="display">{puzzle.title}</h2>
        <p className="serif" style={{ whiteSpace: "pre-wrap", fontSize: "1.2rem", lineHeight: 1.45 }}>
          {puzzle.prompt}
        </p>
      </article>
      <label className="field">
        <span>{puzzle.inputLabel}</span>
        <input value={answer} onChange={(event) => setAnswer(event.target.value)} autoComplete="off" />
      </label>
      <Button full disabled={busy || !answer.trim()} onClick={() => onAnswer(answer)}>
        Controleer antwoord
      </Button>
      {confirmHint ? (
        <div className="paper stack">
          <p>
            {hintUsed
              ? "Jullie hebben deze hint al. Opnieuw tonen kost niets."
              : `Deze hint kost ${hintCost} punten. Daarna hebben jullie nog ${Math.max(0, hintsLeft - 1)} hints over.`}
          </p>
          <Button full kind="dark" disabled={busy || (!hintUsed && hintsLeft <= 0)} onClick={() => onHint()}>
            {hintUsed ? "Toon de hint" : "Ja, gebruik de hint"}
          </Button>
          <Button full kind="ghost" onClick={() => setConfirmHint(false)}>
            Annuleren
          </Button>
        </div>
      ) : (
        <Button full kind="warn" disabled={busy || (!hintUsed && hintsLeft <= 0)} onClick={() => setConfirmHint(true)}>
          {hintUsed ? "Hint bekijken" : `Hint vragen (−${hintCost})`}
        </Button>
      )}
    </div>
  );
}

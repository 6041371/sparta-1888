"use client";

import { DOSSIER_PAGES } from "@/lib/content/minigames";
import type { PublicPuzzle } from "@/lib/types";
import { CrackTheCode } from "@/components/games/CrackTheCode";

interface Gate {
  requiredIds: string[];
  foundIds: string[];
  unlocked: boolean;
  solved: boolean;
}

export function DossierCode({
  puzzle,
  gate,
  busy,
  hintUsed,
  hintCost,
  hintsLeft,
  onAnswer,
  onHint,
}: {
  puzzle: PublicPuzzle;
  gate: Gate;
  busy: boolean;
  hintUsed: boolean;
  hintCost: number;
  hintsLeft: number;
  onAnswer: (answer: string) => void;
  onHint: () => void;
}) {
  if (!gate.unlocked) {
    return (
      <article className="paper stack">
        <p className="kicker">Vierde spel</p>
        <h2 className="display">Nog niet aan de beurt</h2>
        <p>Crack the Code is het vierde spel, in welke kamer je ook bent. Speel eerst drie andere spellen. Dan staan de hints hier klaar.</p>
      </article>
    );
  }

  return (
    <div className="stack">
      {DOSSIER_PAGES.map((page) => (
        <article key={page.title} className="paper stack">
          <p className="kicker">{page.title}</p>
          <p className="serif">{page.text}</p>
        </article>
      ))}
      <CrackTheCode puzzle={puzzle} busy={busy} hintUsed={hintUsed} hintCost={hintCost} hintsLeft={hintsLeft} onAnswer={onAnswer} onHint={onHint} />
    </div>
  );
}

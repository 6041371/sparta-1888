"use client";

import { DOSSIER_PAGES } from "@/lib/content/minigames";
import type { PublicEvidence, PublicPuzzle } from "@/lib/types";
import { CrackTheCode } from "@/components/games/CrackTheCode";

interface Gate {
  requiredIds: string[];
  foundIds: string[];
  unlocked: boolean;
  solved: boolean;
}

export function DossierCode({
  puzzle,
  evidence,
  gate,
  busy,
  hintUsed,
  hintCost,
  hintsLeft,
  onAnswer,
  onHint,
}: {
  puzzle: PublicPuzzle;
  evidence: PublicEvidence[];
  gate: Gate;
  busy: boolean;
  hintUsed: boolean;
  hintCost: number;
  hintsLeft: number;
  onAnswer: (answer: string) => void;
  onHint: () => void;
}) {
  const cards = gate.requiredIds.map((id) => evidence.find((item) => item.id === id)).filter((item): item is PublicEvidence => Boolean(item));
  if (!gate.unlocked) {
    return (
      <article className="paper stack">
        <p className="kicker">Vergrendeld</p>
        <h2 className="display">Nog niet alle sporen</h2>
        <p>{gate.foundIds.length} van {gate.requiredIds.length || 4} aanwijzingen binnen. De code kan nog niet worden gecontroleerd.</p>
        {cards.map((item) => (
          <p key={item.id} className="small">
            {gate.foundIds.includes(item.id) ? `Binnen: ${item.title}` : `Ontbreekt: ${item.title}. Die komt vrij als jullie meer kamers afronden.`}
          </p>
        ))}
      </article>
    );
  }

  const pages = gate.requiredIds.length === 0
    ? DOSSIER_PAGES
    : [{ title: "Historisch document", text: "Sparta Rotterdam is opgericht in 1888." }, ...cards.map((item) => ({ title: item.title, text: item.text }))];

  return (
    <div className="stack">
      {pages.map((page) => (
        <article key={page.title} className="paper stack">
          <p className="kicker">{page.title}</p>
          <p className="serif">{page.text}</p>
        </article>
      ))}
      <CrackTheCode puzzle={puzzle} busy={busy} hintUsed={hintUsed} hintCost={hintCost} hintsLeft={hintsLeft} onAnswer={onAnswer} onHint={onHint} />
    </div>
  );
}

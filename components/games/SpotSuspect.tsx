"use client";

import { useMemo, useState } from "react";
import { SPOT_CLUE } from "@/lib/content/minigames";
import { SUSPECTS } from "@/lib/copy";
import { Button } from "@/components/ui";

function shuffled<T>(items: readonly T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

export function SpotSuspect({
  busy,
  onFinish,
}: {
  busy: boolean;
  onFinish: (suspectId: string) => Promise<void> | void;
}) {
  const [started, setStarted] = useState(false);
  const [picked, setPicked] = useState("");
  const [sent, setSent] = useState(false);
  const cards = useMemo(() => shuffled(SUSPECTS), []);

  if (!started) {
    return (
      <div className="stack">
        <article className="paper stack">
          <p className="kicker">Spot de verdachte</p>
          <h2 className="display">Eén signalement</h2>
          <p>Een getuige zag iemand op de avond van de verdwijning. Kies welke van de vijf verdachten bij dat signalement past.</p>
        </article>
        <Button full disabled={busy} onClick={() => setStarted(true)}>Toon het signalement</Button>
      </div>
    );
  }

  return (
    <div className="stack">
      <article className="paper stack">
        <p className="kicker">Getuige</p>
        <p className="serif">{SPOT_CLUE}</p>
      </article>
      {cards.map((suspect) => (
        <button key={suspect.id} type="button" className={`paper stack suspect ${picked === suspect.id ? "on" : ""}`} disabled={sent} onClick={() => setPicked(suspect.id)}>
          <b>{suspect.name}</b>
          <span className="small">{suspect.role}</span>
        </button>
      ))}
      <Button
        full
        disabled={busy || sent || !picked}
        onClick={() => {
          setSent(true);
          void onFinish(picked);
        }}
      >
        Dit is de persoon
      </Button>
    </div>
  );
}

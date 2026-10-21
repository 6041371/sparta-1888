"use client";

import { useEffect, useRef, useState } from "react";
import { MEMORY_PAIRS } from "@/lib/game/logic";
import { Button } from "@/components/ui";

const PAIRS: { pair: string; faces: [string, string] }[] = [
  { pair: "tas", faces: ["Grote sporttas", "Donkere jas"] },
  { pair: "bus", faces: ["Kenteken …B7", "Donkere bestelbus"] },
  { pair: "bank", faces: ["€450", "Reservering"] },
  { pair: "brons", faces: ["18 kg", "Bronzen object"] },
  { pair: "jaar", faces: ["1888", "Oprichtingsjaar"] },
  { pair: "chat", faces: ["Overdracht", "Veilige plek"] },
];

interface Card {
  id: string;
  pair: string;
  label: string;
}

function deal(): Card[] {
  const cards = PAIRS.flatMap((item) => [
    { id: `${item.pair}-a`, pair: item.pair, label: item.faces[0] },
    { id: `${item.pair}-b`, pair: item.pair, label: item.faces[1] },
  ]);
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[swap]] = [cards[swap], cards[index]];
  }
  return cards;
}

export function MemoryVault({
  busy,
  onFinish,
}: {
  busy: boolean;
  onFinish: (result: { matches: number; attempts: number; elapsedMs: number }) => Promise<void> | void;
}) {
  const [started, setStarted] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const lock = useRef(false);
  const openRef = useRef<string[]>([]);
  const matchedRef = useRef<string[]>([]);
  const startedAt = useRef(0);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => setElapsed(Date.now() - startedAt.current), 250);
    return () => window.clearInterval(id);
  }, [started]);

  function turn(card: Card) {
    if (!started || lock.current || matchedRef.current.includes(card.pair) || openRef.current.includes(card.id)) return;
    if (openRef.current.length >= 2) return;
    const next = [...openRef.current, card.id];
    openRef.current = next;
    setOpen(next);
    if (next.length < 2) return;
    const [firstId, secondId] = next;
    const first = cards.find((item) => item.id === firstId);
    const second = cards.find((item) => item.id === secondId);
    if (!first || !second) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    lock.current = true;
    window.setTimeout(() => {
      if (first.pair === second.pair) {
        matchedRef.current = [...matchedRef.current, first.pair];
        setMatched(matchedRef.current);
        if (matchedRef.current.length === MEMORY_PAIRS) {
          void finishRef.current({
            matches: MEMORY_PAIRS,
            attempts: nextAttempts,
            elapsedMs: Date.now() - startedAt.current,
          });
        }
      }
      openRef.current = [];
      setOpen([]);
      lock.current = false;
    }, 700);
  }

  if (!started) {
    return (
      <div className="stack">
        <div className="paper stack">
          <p className="kicker">Geheugenspel</p>
          <h2 className="display">Zes sporen</h2>
          <p>Draai twee kaarten om. Een paar dat bij hetzelfde spoor hoort, blijft liggen. Een misser draait terug.</p>
        </div>
        <Button
          full
          disabled={busy}
          onClick={() => {
            setCards(deal());
            startedAt.current = Date.now();
            setStarted(true);
          }}
        >
          Open de kluis
        </Button>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="spread">
        <strong>{attempts} pogingen</strong>
        <strong>{Math.floor(elapsed / 1000)} sec</strong>
      </div>
      <div className="memory">
        {cards.map((card) => {
          const shown = open.includes(card.id) || matched.includes(card.pair);
          return (
            <button
              key={card.id}
              type="button"
              className={`mem ${shown ? "open" : ""} ${matched.includes(card.pair) ? "matched" : ""}`}
              onClick={() => turn(card)}
              aria-label={shown ? card.label : "Dichte kaart"}
            >
              {shown ? <span>{card.label}</span> : <span className="display">?</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

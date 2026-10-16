"use client";

import { useEffect, useRef, useState } from "react";
import { MEMORY_PAIRS } from "@/lib/game/logic";
import { GameSymbol, type SymbolName } from "@/components/games/symbols";
import { Button } from "@/components/ui";

const PAIRS: { pair: SymbolName; label: string }[] = [
  { pair: "shield", label: "Schild" },
  { pair: "ball", label: "Bal" },
  { pair: "whistle", label: "Fluit" },
  { pair: "flag", label: "Vlag" },
  { pair: "boot", label: "Schoen" },
  { pair: "castle", label: "Kasteel" },
];

interface Card {
  id: string;
  pair: SymbolName;
  label: string;
}

function deal(): Card[] {
  const cards = PAIRS.flatMap((item) => [
    { id: `${item.pair}-a`, ...item },
    { id: `${item.pair}-b`, ...item },
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
  const [matched, setMatched] = useState<SymbolName[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const lock = useRef(false);
  const openRef = useRef<string[]>([]);
  const matchedRef = useRef<SymbolName[]>([]);
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
          <p className="kicker">Memory Vault</p>
          <h2 className="display">Onthoud de paren</h2>
          <p>Draai twee kaarten om. Een paar blijft liggen. Een misser draait terug. Minder pogingen en minder tijd leveren meer punten op.</p>
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
              {shown ? <GameSymbol name={card.pair} /> : <span className="display">?</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

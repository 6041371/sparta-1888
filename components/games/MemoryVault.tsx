"use client";

import { useEffect, useRef, useState } from "react";
import { CLUB_PORTRAITS } from "@/lib/content/portraits";
import { MEMORY_PAIRS } from "@/lib/game/logic";
import { Button } from "@/components/ui";

interface Card {
  id: string;
  pair: string;
  name: string;
  image: string;
}

function deal(): Card[] {
  const cards = CLUB_PORTRAITS.flatMap((player) => [
    { id: `${player.id}-a`, pair: player.id, name: player.name, image: player.image },
    { id: `${player.id}-b`, pair: player.id, name: player.name, image: player.image },
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
    }, 900);
  }

  if (!started) {
    return (
      <div className="stack">
        <div className="paper stack">
          <p className="kicker">Geheugenspel</p>
          <h2 className="display">Zes Spartanen</h2>
          <p>Draai twee kaarten om. Hetzelfde gezicht blijft liggen. De naam staat erbij, zodat je de spelers leert kennen.</p>
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
          Start het geheugen
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
              aria-label={shown ? card.name : "Dichte kaart"}
            >
              {shown ? (
                <span className="mem-face">
                  <img src={card.image} alt="" />
                  <small>{card.name}</small>
                </span>
              ) : (
                <span className="display">?</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

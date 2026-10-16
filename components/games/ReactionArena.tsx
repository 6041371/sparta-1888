"use client";

import { useEffect, useRef, useState } from "react";
import { REACTION_ROUNDS } from "@/lib/game/logic";
import type { ReactionRound } from "@/lib/types";
import { GameSymbol, type SymbolName } from "@/components/games/symbols";
import { Button } from "@/components/ui";

const DISTRACTORS: SymbolName[] = ["ball", "whistle", "flag", "boot"];

function script() {
  const targets = Array.from({ length: REACTION_ROUNDS }, (_, index) => index < 6);
  for (let index = targets.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [targets[index], targets[swap]] = [targets[swap], targets[index]];
  }
  return targets.map((target) => ({
    target,
    symbol: target ? ("shield" as const) : DISTRACTORS[Math.floor(Math.random() * DISTRACTORS.length)],
  }));
}

export function ReactionArena({
  busy,
  onFinish,
}: {
  busy: boolean;
  onFinish: (rounds: ReactionRound[]) => Promise<void> | void;
}) {
  const [phase, setPhase] = useState<"intro" | "countdown" | "play" | "saving">("intro");
  const [count, setCount] = useState(3);
  const [symbol, setSymbol] = useState<SymbolName | null>(null);
  const [round, setRound] = useState(0);
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);
  const tapAt = useRef<number | null>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    if (phase !== "countdown") return;
    let left = 3;
    setCount(3);
    const id = window.setInterval(() => {
      left -= 1;
      if (left <= 0) {
        window.clearInterval(id);
        setPhase("play");
      } else setCount(left);
    }, 700);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "play") return;
    let cancelled = false;
    let release: (() => void) | null = null;
    const plan = script();
    const results: ReactionRound[] = [];

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = window.setTimeout(resolve, ms);
        release = () => {
          window.clearTimeout(id);
          resolve();
        };
      });

    void (async () => {
      for (let index = 0; index < plan.length; index += 1) {
        if (cancelled) return;
        tapAt.current = null;
        setRound(index + 1);
        setSymbol(plan[index].symbol);
        setFlash(null);
        const started = performance.now();
        await wait(1000);
        if (cancelled) return;
        const tappedAt = tapAt.current;
        const tapped = tappedAt !== null;
        results.push({
          target: plan[index].target,
          tapped,
          reactionMs: tapped ? Math.round(tappedAt - started) : null,
        });
        const correct = plan[index].target ? tapped : !tapped;
        setFlash(correct ? "good" : "bad");
        setSymbol(null);
        await wait(360);
      }
      if (cancelled) return;
      setPhase("saving");
      await finishRef.current(results);
    })();

    return () => {
      cancelled = true;
      release?.();
    };
  }, [phase]);

  function tap() {
    if (phase !== "play" || symbol === null || tapAt.current !== null) return;
    tapAt.current = performance.now();
    navigator.vibrate?.(12);
  }

  if (phase === "intro") {
    return (
      <div className="stack">
        <div className="paper stack">
          <p className="kicker">Reaction Arena</p>
          <h2 className="display">Alleen het schild</h2>
          <p>
            Er verschijnen twaalf symbolen. Tik op de knop alleen wanneer je het Sparta-schild ziet. De bal, de fluit, de
            vlag en de schoen laat je met rust.
          </p>
          <p className="small muted">Snel én zuiver telt. Een tik op een afleider kost een goede ronde.</p>
        </div>
        <Button full disabled={busy} onClick={() => setPhase("countdown")}>
          Start de arena
        </Button>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className={`arena ${flash === "good" ? "flash-good" : ""} ${flash === "bad" ? "flash-bad" : ""}`}>
        {phase === "countdown" ? <h2 className="display">{count}</h2> : null}
        {symbol ? (
          <div className="symbol">
            <GameSymbol name={symbol} />
          </div>
        ) : phase === "play" ? (
          <p className="muted">Let op…</p>
        ) : (
          <p>Score wordt opgeslagen…</p>
        )}
      </div>
      <p className="small muted">Ronde {Math.min(round || 1, REACTION_ROUNDS)} van {REACTION_ROUNDS}</p>
      <Button full kind="paper" onClick={tap} disabled={phase !== "play"}>
        Tik
      </Button>
    </div>
  );
}

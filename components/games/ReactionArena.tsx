"use client";

import { useEffect, useRef, useState } from "react";
import { REACTION_ROUNDS } from "@/lib/game/logic";
import type { ReactionRound } from "@/lib/types";
import { Button } from "@/components/ui";

export function ReactionArena({
  busy,
  onFinish,
}: {
  busy: boolean;
  onFinish: (rounds: ReactionRound[]) => Promise<void> | void;
}) {
  const [phase, setPhase] = useState<"intro" | "play" | "saving">("intro");
  const [round, setRound] = useState(0);
  const [signal, setSignal] = useState(false);
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);
  const [average, setAverage] = useState<number | null>(null);
  const tapAt = useRef<number | null>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    if (phase !== "play") return;
    let cancelled = false;
    let release: (() => void) | null = null;
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
      for (let index = 0; index < REACTION_ROUNDS; index += 1) {
        if (cancelled) return;
        setRound(index + 1);
        setSignal(false);
        setFlash(null);
        tapAt.current = null;
        await wait(700 + Math.floor(Math.random() * 1400));
        if (cancelled) return;
        if (tapAt.current !== null) {
          results.push({ target: true, tapped: true, reactionMs: 1 });
          setFlash("bad");
          await wait(420);
          continue;
        }
        const shown = performance.now();
        tapAt.current = null;
        setSignal(true);
        await new Promise<void>((resolve) => {
          const id = window.setInterval(() => {
            if (cancelled || tapAt.current !== null || performance.now() - shown >= 1400) {
              window.clearInterval(id);
              resolve();
            }
          }, 40);
          release = () => {
            window.clearInterval(id);
            resolve();
          };
        });
        if (cancelled) return;
        const tappedAt = tapAt.current;
        if (tappedAt === null) {
          results.push({ target: true, tapped: false, reactionMs: null });
          setFlash("bad");
        } else {
          const ms = Math.max(0, Math.round(tappedAt - shown));
          results.push({ target: true, tapped: true, reactionMs: ms });
          setFlash(ms >= 80 ? "good" : "bad");
        }
        setSignal(false);
        await wait(280);
      }
      if (cancelled) return;
      const times = results.filter((item) => item.tapped && item.reactionMs !== null && (item.reactionMs ?? 0) >= 80).map((item) => item.reactionMs ?? 0);
      setAverage(times.length ? Math.round(times.reduce((sum, ms) => sum + ms, 0) / times.length) : null);
      setPhase("saving");
      await finishRef.current(results);
    })();

    return () => {
      cancelled = true;
      release?.();
    };
  }, [phase]);

  function tap() {
    if (phase !== "play" || tapAt.current !== null) return;
    tapAt.current = performance.now();
    navigator.vibrate?.(12);
  }

  if (phase === "intro") {
    return (
      <div className="stack">
        <article className="paper stack">
          <p className="kicker">Reactietest</p>
          <h2 className="display">Wacht op het signaal</h2>
          <p>Er komen {REACTION_ROUNDS} rondes. Tik pas als het scherm NU toont. Een tik te vroeg telt niet mee.</p>
        </article>
        <Button full disabled={busy} onClick={() => setPhase("play")}>Start de test</Button>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className={`arena ${flash === "good" ? "flash-good" : ""} ${flash === "bad" ? "flash-bad" : ""} ${signal ? "signal" : ""}`}>
        {phase === "saving" ? (
          <div className="stack" style={{ textAlign: "center" }}>
            <h2 className="display">Klaar</h2>
            <p>{average === null ? "Geen geldige reactie." : `Gemiddeld ${average} ms.`}</p>
          </div>
        ) : (
          <h2 className="display">{signal ? "NU" : "Wacht"}</h2>
        )}
      </div>
      <p className="small">Ronde {Math.min(round || 1, REACTION_ROUNDS)} van {REACTION_ROUNDS}</p>
      <Button full kind="paper" onClick={tap} disabled={phase !== "play"}>Tik</Button>
    </div>
  );
}

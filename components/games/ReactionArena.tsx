"use client";

import { useEffect, useRef, useState } from "react";
import { BOK_PORTRAIT_ID, CLUB_PORTRAITS, type ClubPortrait } from "@/lib/content/portraits";
import { REACTION_ROUNDS } from "@/lib/game/logic";
import type { ReactionRound } from "@/lib/types";
import { Button } from "@/components/ui";

function deal(): ClubPortrait[] {
  const bok = CLUB_PORTRAITS.find((player) => player.id === BOK_PORTRAIT_ID);
  const others = CLUB_PORTRAITS.filter((player) => player.id !== BOK_PORTRAIT_ID);
  if (!bok) return [];
  const deck = [
    bok,
    bok,
    bok,
    bok,
    bok,
    ...others,
    others[Math.floor(Math.random() * others.length)],
    others[Math.floor(Math.random() * others.length)],
  ];
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swap]] = [deck[swap], deck[index]];
  }
  return deck;
}

export function ReactionArena({
  busy,
  onFinish,
}: {
  busy: boolean;
  onFinish: (rounds: ReactionRound[]) => Promise<void> | void;
}) {
  const [phase, setPhase] = useState<"intro" | "play" | "saving">("intro");
  const [round, setRound] = useState(0);
  const [player, setPlayer] = useState<ClubPortrait | null>(null);
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [average, setAverage] = useState<number | null>(null);
  const tapAt = useRef<number | null>(null);
  const deckRef = useRef<ClubPortrait[]>([]);
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
      const deck = deckRef.current;
      for (let index = 0; index < REACTION_ROUNDS; index += 1) {
        if (cancelled) return;
        const face = deck[index];
        const isBok = face?.id === BOK_PORTRAIT_ID;
        setRound(index + 1);
        setPlayer(null);
        setFlash(null);
        tapAt.current = null;
        await wait(420 + Math.floor(Math.random() * 520));
        if (cancelled) return;
        if (tapAt.current !== null) {
          results.push({ target: true, tapped: true, reactionMs: 1 });
          setFlash("bad");
          setNote("Te vroeg.");
          await wait(420);
          continue;
        }
        const shown = performance.now();
        tapAt.current = null;
        setPlayer(face ?? null);
        const limit = isBok ? 1200 : 720;
        await new Promise<void>((resolve) => {
          const id = window.setInterval(() => {
            if (cancelled || tapAt.current !== null || performance.now() - shown >= limit) {
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
        if (isBok) {
          if (tappedAt === null) {
            results.push({ target: true, tapped: false, reactionMs: null });
            setFlash("bad");
            setNote("Dat was Bok de Korver.");
          } else {
            const ms = Math.max(0, Math.round(tappedAt - shown));
            results.push({ target: true, tapped: true, reactionMs: ms });
            setFlash(ms >= 80 ? "good" : "bad");
            setNote(ms >= 80 ? "Bok de Korver." : "Te laat of te vroeg.");
          }
        } else if (tappedAt === null) {
          results.push({ target: false, tapped: false, reactionMs: null });
          setFlash("good");
          setNote(face ? `${face.name} blijft liggen.` : "Goed laten gaan.");
        } else {
          const ms = Math.max(0, Math.round(tappedAt - shown));
          results.push({ target: false, tapped: true, reactionMs: ms });
          setFlash("bad");
          setNote(face ? `Niet tikken. Dat is ${face.name}.` : "Niet tikken.");
        }
        await wait(480);
      }
      if (cancelled) return;
      const times = results
        .filter((item) => item.target && item.tapped && item.reactionMs !== null && (item.reactionMs ?? 0) >= 80)
        .map((item) => item.reactionMs ?? 0);
      setAverage(times.length ? Math.round(times.reduce((sum, ms) => sum + ms, 0) / times.length) : null);
      setPlayer(null);
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
          <h2 className="display">Alleen Bok de Korver</h2>
          <p>Er komen {REACTION_ROUNDS} Spartanen voorbij, met hun naam. Tik alleen als het Bok de Korver is. Bij een ander gezicht blijf je stil.</p>
        </article>
        <Button
          full
          disabled={busy}
          onClick={() => {
            deckRef.current = deal();
            setPhase("play");
          }}
        >
          Start de test
        </Button>
      </div>
    );
  }

  return (
    <div className="stack">
      <div
        className={`arena ${flash === "good" ? "flash-good" : ""} ${flash === "bad" ? "flash-bad" : ""}`}
        onClick={tap}
      >
        {phase === "saving" ? (
          <div className="stack" style={{ textAlign: "center" }}>
            <h2 className="display">Klaar</h2>
            <p>{average === null ? "Geen tijdige tik op Bok de Korver." : `Gemiddeld ${average} ms op Bok.`}</p>
          </div>
        ) : player ? (
          <div className="portrait">
            <img src={player.image} alt="" />
            <strong>{player.name}</strong>
          </div>
        ) : (
          <h2 className="display">Let op</h2>
        )}
      </div>
      <p className="small">Ronde {Math.min(round || 1, REACTION_ROUNDS)} van {REACTION_ROUNDS}. Tik alleen bij Bok de Korver.</p>
      {note ? <p className="paper">{note}</p> : null}
      <Button full kind="paper" onClick={tap} disabled={phase !== "play"}>Dit is Bok</Button>
    </div>
  );
}

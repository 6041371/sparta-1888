"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Zone } from "@/lib/content/minigames";

const ZONES: Zone[] = ["links", "midden", "rechts"];
const LABELS: Record<Zone, string> = { links: "Links", midden: "Midden", rechts: "Rechts" };

const SAVE_LINES = [
  "De keeper heeft de bal tegengehouden. Die handschoen was overal.",
  "Gered. De bal klapt tegen de borst en blijft in Het Kasteel.",
  "Tegengehouden. De keeper lag precies op jullie hoek.",
  "Nee. De penalty blijft in de handschoenen.",
  "De keeper las de hoek. Redding, en het publiek gilt.",
];

const GOAL_LINES = [
  "Doelpunt. De keeper dook de verkeerde kant op.",
  "Er in. Het net bolt op achter hem.",
  "Raak. De bal zeilt langs de handschoen.",
  "Goal. De keeper keek de andere hoek in.",
  "Binnen. Die penalty ligt in het net.",
];

interface Shot {
  aim: Zone;
  keeper: Zone;
  goal: boolean;
  line: string;
  x: number;
  y: number;
}

export function PenaltyShootout({
  busy,
  onFinish,
}: {
  busy: boolean;
  onFinish: (result: { shots: Zone[]; keepers: Zone[] }) => Promise<void> | void;
}) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [flying, setFlying] = useState(false);
  const [sent, setSent] = useState(false);
  const lockRef = useRef(false);
  const timerRef = useRef(0);
  const sceneRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLImageElement>(null);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const goals = shots.filter((shot) => shot.goal).length;
  const last = shots[shots.length - 1];
  const showDive = flying && last;
  const number = Math.min(shots.length + (flying || sent ? 0 : 1), 5);

  useEffect(() => {
    const ball = ballRef.current;
    if (!ball || !showDive || !last) return;
    const flight = ball.animate(
      [
        { left: "44.5%", top: "67%" },
        { left: `${last.x}%`, top: `${last.y}%` },
      ],
      { duration: 550, easing: "ease-in", fill: "forwards" },
    );
    return () => flight.cancel();
  }, [showDive, last]);

  function shoot(aim: Zone, event: MouseEvent<HTMLButtonElement>) {
    if (lockRef.current || sent || busy || shots.length >= 5) return;
    lockRef.current = true;
    const scene = sceneRef.current?.getBoundingClientRect();
    const button = event.currentTarget.getBoundingClientRect();
    const pointer = event.detail === 0
      ? { x: button.left + button.width / 2, y: button.top + button.height / 2 }
      : { x: event.clientX, y: event.clientY };
    const rawX = scene && scene.width > 0 ? ((pointer.x - scene.left) / scene.width) * 100 - 5.5 : 44.5;
    const rawY = scene && scene.height > 0 ? ((pointer.y - scene.top) / scene.height) * 100 - 7.3 : 30;
    const x = Math.min(84, Math.max(4, rawX));
    const y = Math.min(52, Math.max(4, rawY));
    const keeper = ZONES[Math.floor(Math.random() * ZONES.length)];
    const goal = aim !== keeper;
    const line = goal ? GOAL_LINES[shots.length] : SAVE_LINES[shots.length];
    const next = [...shots, { aim, keeper, goal, line, x, y }];
    setShots(next);
    setFlying(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (next.length === 5) {
        setSent(true);
        void onFinish({ shots: next.map((shot) => shot.aim), keepers: next.map((shot) => shot.keeper) });
        return;
      }
      setFlying(false);
      lockRef.current = false;
    }, 2400);
  }

  return (
    <div className="stack">
      <div className="spread">
        <strong>Strafschop {number} van 5</strong>
        <strong>{goals} {goals === 1 ? "doelpunt" : "doelpunten"}</strong>
      </div>
      <div className="penalty-pips" aria-label="Vijf strafschoppen">
        {Array.from({ length: 5 }, (_, index) => {
          const shot = shots[index];
          const current = !shot && index === shots.length && !sent;
          const state = shot ? (shot.goal ? "doelpunt" : "gered") : current ? "nu aan de beurt" : "nog niet genomen";
          return (
            <span key={index} className={shot ? (shot.goal ? "is-goal" : "is-save") : current ? "is-now" : ""} aria-label={`Strafschop ${index + 1}, ${state}`}>
              {index + 1}
            </span>
          );
        })}
      </div>
      <div className={`penalty-scene${showDive ? " dive" : ""}`} ref={sceneRef}>
        <img className="penalty-bg" src={showDive ? `/penalty/3d/${last.keeper}.jpg` : "/penalty/3d/staan.jpg"} alt="Doel met de keeper" />
        {showDive ? (
          <>
            <img ref={ballRef} className="penalty-ball" src="/penalty/3d/bal.png" alt="" />
            <p className={`penalty-stamp ${last.goal ? "is-goal" : "is-save"}`}>{last.goal ? "Goal" : "Gered"}</p>
          </>
        ) : null}
        <div className="penalty-zones">
          {ZONES.map((zone) => (
            <button key={zone} type="button" aria-label={`Schiet ${LABELS[zone].toLowerCase()}`} disabled={flying || sent || busy} onClick={(event) => shoot(zone, event)}>
              {LABELS[zone]}
            </button>
          ))}
        </div>
      </div>
      <p className={`penalty-line${showDive ? (last.goal ? " is-goal" : " is-save") : ""}`} aria-live="polite">
        {showDive ? last.line : "Tik in het doel. De bal gaat naar die plek."}
      </p>
    </div>
  );
}

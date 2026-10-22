"use client";

import { useEffect, useRef, useState } from "react";
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

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const goals = shots.filter((shot) => shot.goal).length;
  const last = shots[shots.length - 1];
  const showDive = flying && last;
  const number = Math.min(shots.length + (flying || sent ? 0 : 1), 5);

  function shoot(aim: Zone) {
    if (lockRef.current || sent || busy || shots.length >= 5) return;
    lockRef.current = true;
    const keeper = ZONES[Math.floor(Math.random() * ZONES.length)];
    const goal = aim !== keeper;
    const line = goal ? GOAL_LINES[shots.length] : SAVE_LINES[shots.length];
    const next = [...shots, { aim, keeper, goal, line }];
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
      <div className="penalty-pips" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => {
          const shot = shots[index];
          return <i key={index} className={shot ? (shot.goal ? "is-goal" : "is-save") : ""} />;
        })}
      </div>
      <div className={`penalty-scene${showDive ? " dive" : ""}`}>
        <img className="penalty-bg" src={showDive ? "/penalty/leeg.jpg" : "/penalty/start.jpg"} alt="" />
        {showDive ? (
          <>
            <img className={`penalty-keeper ${last.keeper}`} src={`/penalty/keeper-${last.keeper}.png`} alt="" />
            <img className={`penalty-ball ${last.aim} ${last.goal ? "is-goal" : "is-save"}`} src="/penalty/bal.png" alt="" />
          </>
        ) : null}
        {showDive ? <p className={`penalty-caption ${last.goal ? "is-goal" : "is-save"}`} aria-live="polite">{last.line}</p> : null}
        <div className="penalty-zones">
          {ZONES.map((zone) => (
            <button key={zone} type="button" disabled={flying || sent || busy} onClick={() => shoot(zone)}>
              {LABELS[zone]}
            </button>
          ))}
        </div>
      </div>
      {showDive ? null : <p className="small">Tik links, midden of rechts in het doel.</p>}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import type { Zone } from "@/lib/content/minigames";
import { Button } from "@/components/ui";

const ZONES: Zone[] = ["links", "midden", "rechts"];

interface Shot {
  aim: Zone;
  keeper: Zone;
  goal: boolean;
}

export function PenaltyShootout({
  busy,
  onFinish,
}: {
  busy: boolean;
  onFinish: (result: { shots: Zone[]; keepers: Zone[] }) => Promise<void> | void;
}) {
  const [started, setStarted] = useState(false);
  const [shots, setShots] = useState<Shot[]>([]);
  const [locked, setLocked] = useState(false);
  const [sent, setSent] = useState(false);
  const lockRef = useRef(false);

  const goals = shots.filter((shot) => shot.goal).length;

  function shoot(aim: Zone) {
    if (!started || lockRef.current || sent || shots.length >= 5) return;
    lockRef.current = true;
    const keeper = ZONES[Math.floor(Math.random() * ZONES.length)];
    const next = [...shots, { aim, keeper, goal: aim !== keeper }];
    setShots(next);
    setLocked(true);
    if (next.length === 5) {
      setSent(true);
      void onFinish({ shots: next.map((shot) => shot.aim), keepers: next.map((shot) => shot.keeper) });
      return;
    }
    window.setTimeout(() => {
      lockRef.current = false;
      setLocked(false);
    }, 650);
  }

  if (!started) {
    return (
      <div className="stack">
        <article className="paper stack">
          <p className="kicker">Penaltyreeks</p>
          <h2 className="display">Vijf strafschoppen</h2>
          <p>Kies links, midden of rechts. De keeper duikt ook naar één kant. Zelfde kant is een redding. Een andere kant is een doelpunt.</p>
        </article>
        <Button full disabled={busy} onClick={() => setStarted(true)}>Start de reeks</Button>
      </div>
    );
  }

  const last = shots[shots.length - 1];
  return (
    <div className="stack">
      <div className="spread">
        <strong>Strafschop {Math.min(shots.length + (sent ? 0 : 1), 5)} van 5</strong>
        <strong>{goals} doelpunten</strong>
      </div>
      <div className="goal">
        {ZONES.map((zone) => (
          <button key={zone} type="button" className="goal-zone" disabled={locked || sent || busy} onClick={() => shoot(zone)}>
            {zone}
          </button>
        ))}
      </div>
      {last ? <p className="paper">{last.goal ? `Doelpunt. De keeper dook ${last.keeper}.` : `Redding. De keeper dook ook ${last.keeper}.`}</p> : <p className="small">Tik een kant van het doel aan.</p>}
    </div>
  );
}

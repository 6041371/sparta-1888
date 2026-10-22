"use client";

import { useState } from "react";
import { SPOT_BOARD, SPOT_CAMS, SPOT_CLUE } from "@/lib/content/minigames";
import { Button } from "@/components/ui";

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

  if (!started) {
    return (
      <div className="stack">
        <article className="paper stack">
          <p className="kicker">Spot de verdachte</p>
          <h2 className="display">Vijf camera's</h2>
          <p>Op vijf camera's loopt iemand voorbij. Onder elk beeld staat het signalement. Kies wie er het meest verdacht uitziet.</p>
        </article>
        <Button full disabled={busy} onClick={() => setStarted(true)}>Toon de beelden</Button>
      </div>
    );
  }

  return (
    <div className="stack">
      <article className="paper stack">
        <p className="kicker">Beveiliging</p>
        <h2 className="display">{SPOT_CLUE}</h2>
        <img className="spot-board" src={SPOT_BOARD} alt="Vijf camerabeelden met de signalementen eronder" />
      </article>
      {SPOT_CAMS.map((cam) => (
        <button key={cam.id} type="button" className={`paper suspect ${picked === cam.id ? "on" : ""}`} disabled={sent} onClick={() => setPicked(cam.id)}>
          <b>{cam.label}</b>
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

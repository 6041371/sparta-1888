"use client";

import { useState } from "react";
import { VAR_ROUNDS } from "@/lib/content/minigames";
import { Button } from "@/components/ui";

export function VarCheck({
  busy,
  onFinish,
}: {
  busy: boolean;
  onFinish: (answers: string[]) => Promise<void> | void;
}) {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const round = VAR_ROUNDS[index];

  function choose(id: string) {
    if (picked || sent) return;
    setPicked(id);
  }

  function next() {
    if (!picked || !round) return;
    const nextAnswers = [...answers, picked];
    setAnswers(nextAnswers);
    setPicked(null);
    if (index + 1 >= VAR_ROUNDS.length) {
      setSent(true);
      void onFinish(nextAnswers);
      return;
    }
    setIndex(index + 1);
  }

  if (!started) {
    return (
      <div className="stack">
        <article className="paper stack">
          <p className="kicker">VAR-check</p>
          <h2 className="display">Eén beslissing</h2>
          <p>Bekijk het beeld en kies wat de scheidsrechter moet fluiten. Er is één kloppend antwoord.</p>
        </article>
        <Button full disabled={busy} onClick={() => setStarted(true)}>Open de beelden</Button>
      </div>
    );
  }

  if (!round || sent) return <p>De beslissingen worden opgeslagen…</p>;
  const right = picked === round.answer;

  return (
    <div className="stack">
      <p className="small">Beeld {index + 1} van {VAR_ROUNDS.length}</p>
      {round.video ? (
        <video className="var-video" src={round.video} controls playsInline />
      ) : (
        <div className={`var-scene ${round.scene}`} aria-hidden="true">
          <span className="var-ball" />
          <span className="var-player attack" />
          <span className="var-player defense" />
        </div>
      )}
      <p className="question-prompt">{round.prompt}</p>
      <div className="stack">
        {round.options.map((option) => (
          <button key={option.id} type="button" className={`paper suspect ${picked === option.id ? "on" : ""}`} disabled={Boolean(picked)} onClick={() => choose(option.id)}>
            {option.label}
          </button>
        ))}
      </div>
      {picked ? <p className="paper">{right ? "Klopt. " : "Niet deze. "}{round.explanation}</p> : null}
      {picked ? <Button full disabled={busy} onClick={next}>{index + 1 === VAR_ROUNDS.length ? "Toon het resultaat" : "Volgend beeld"}</Button> : null}
    </div>
  );
}

import { normCode } from "@/lib/game/logic";
import type { PublicPuzzle } from "@/lib/types";

export interface Puzzle {
  id: string;
  title: string;
  prompt: string;
  inputLabel: string;
  answer: string;
  hint: string;
}

export const PUZZLES: Puzzle[] = [
  {
    id: "verdubbeling",
    title: "Het scorebord",
    prompt: "Dit scorebord verdubbelt niet. Elk getal is de som van de twee getallen ervoor.\n\n2 — 5 — 7 — 12 — 19 — ?",
    inputLabel: "Jullie getal",
    answer: "31",
    hint: "Tel de twee vorige getallen bij elkaar op. 12 en 19 geven het laatste vak.",
  },
  {
    id: "kasteel",
    title: "Verschoven letters",
    prompt: "Elke letter is één plaats doorgeschoven in het alfabet. Welk woord stond er eerst?\n\nE P F M Q V O U",
    inputLabel: "Het woord",
    answer: "DOELPUNT",
    hint: "Schuif elke letter één plaats terug. De E vooraan wordt een D.",
  },
  {
    id: "dambord",
    title: "Doelpunt of kaart",
    prompt: "Doelpunten en gele kaarten staan om en om. Eerst een doelpunt, dan een kaart.\n\n8 — 3 — 11 — 6 — 14 — 9 — 17 — ?",
    inputLabel: "Het laatste getal",
    answer: "12",
    hint: "De doelpunten zijn 8, 11, 14 en 17. De kaarten zijn 3, 6 en 9. Beide reeksen stijgen met 3.",
  },
  {
    id: "optelsom",
    title: "De vierde treffer",
    prompt:
      "Drie doelpunten vielen in minuut 12, 27 en 44. Het vierde viel even ver na het derde als het tweede na het eerste. In welke minuut viel het vierde doelpunt?",
    inputLabel: "De minuut",
    answer: "59",
    hint: "Tussen minuut 12 en 27 zitten 15 minuten. Tel die sprong op bij minuut 44.",
  },
];

export function getPuzzle(id: string | null): Puzzle {
  const puzzle = PUZZLES.find((item) => item.id === id) ?? PUZZLES[0];
  return puzzle;
}

export function publicPuzzle(id: string | null): PublicPuzzle {
  const puzzle = getPuzzle(id);
  return {
    id: puzzle.id,
    title: puzzle.title,
    prompt: puzzle.prompt,
    inputLabel: puzzle.inputLabel,
  };
}

export function codeFeedback(answer: string, expected: string): string {
  const given = normCode(answer);
  const target = normCode(expected);
  if (!given) return "Vul een antwoord in.";
  if (given === target) return "Goed opgelost.";
  if (/^\d+$/.test(target) && !/^\d+$/.test(given)) return "Dit antwoord bestaat uit cijfers.";
  if (/^[A-Z]+$/.test(target) && !/^[A-Z]+$/.test(given)) return "Dit antwoord is een woord, zonder cijfers.";
  return "Dat klopt nog niet. Bespreek het patroon nog een keer met je team.";
}

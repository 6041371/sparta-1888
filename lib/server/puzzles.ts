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
    title: "De verdubbeling",
    prompt: "Welk getal maakt deze reeks af?\n\n4 — 8 — 16 — 32 — ?",
    inputLabel: "Jullie getal",
    answer: "64",
    hint: "Elk getal is precies het dubbele van het getal ervoor.",
  },
  {
    id: "kasteel",
    title: "Letters van het Kasteel",
    prompt:
      "De thuishaven van Sparta staat bekend als Het Kasteel. Hoeveel letters heeft het woord KASTEEL?",
    inputLabel: "Aantal letters",
    answer: "7",
    hint: "Tel de letters van K tot en met L. Het woord ‘Het’ en de spatie tellen niet mee.",
  },
  {
    id: "dambord",
    title: "Rood en wit",
    prompt: "Het patroon wisselt als een dambord. Welke letter hoort op het vraagteken?\n\nR  W  R  W\nW  R  W  ?",
    inputLabel: "R of W",
    answer: "R",
    hint: "Na wit komt rood. Kijk naar het vak links en het vak erboven.",
  },
  {
    id: "optelsom",
    title: "De drieluik",
    prompt:
      "Een aanval levert 2 doelpunten op, de volgende aanval het dubbele daarvan, en de laatste aanval nog 1. Hoeveel doelpunten is dat samen?",
    inputLabel: "Aantal doelpunten",
    answer: "7",
    hint: "Reken eerst 2, daarna het dubbele van 2, en tel er 1 bij op.",
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
  if (/^[RW]$/.test(target) && !/^[RW]$/.test(given)) return "Vul één letter in: R of W.";
  return "Dat klopt nog niet. Bespreek het patroon nog een keer met je team.";
}

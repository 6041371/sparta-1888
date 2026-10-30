import { EVIDENCE_ITEMS } from "@/lib/content/evidence";
import { GameError } from "@/lib/game/errors";
import type { ScoreResult } from "@/lib/game/logic";

export const DOSSIER_CODE = "7088";
export const DOSSIER_PUZZLE_ID = "dossier";

const PREFERRED_HINTS = ["polaroid_1", "security_camera", "bank_transaction", "transport_document"];

export function requiredEvidenceIds(assignments: Record<string, string[]>, codeRoomId: string | null): string[] {
  const external = Object.entries(assignments)
    .filter(([roomId]) => roomId !== codeRoomId)
    .reduce((sum, [, ids]) => sum + ids.length, 0);
  const obtainable = new Set(EVIDENCE_ITEMS.slice(0, external).map((item) => item.id));
  const required = PREFERRED_HINTS.filter((id) => obtainable.has(id));
  for (const item of EVIDENCE_ITEMS) {
    if (required.length >= 4) break;
    if (obtainable.has(item.id) && !required.includes(item.id)) required.push(item.id);
  }
  return required;
}

export function dossierUnlocked(requiredIds: string[], collectedIds: string[]): boolean {
  const have = new Set(collectedIds);
  return requiredIds.every((id) => have.has(id));
}

export function codeIsFourth(completedGames: string[]): boolean {
  return completedGames.filter((game) => game !== "code").length >= 3;
}

export const DOSSIER_TEXT =
  "Het dossier koppelt de reservering, het transport van een bronzen sportobject en een handelaar in historische sportmemorabilia. Leg dit naast de rest van de zaakmap. Dit is nog geen eindconclusie.";

export const DOSSIER_PAGES = [
  { title: "Historisch document", text: "Sparta Rotterdam is opgericht in 1888." },
  { title: "Beveiligingsfoto", text: "Op het beeld is een deel van een kenteken te zien: B7." },
  { title: "Bankafschrift", text: "Een betaling van €450 heeft als omschrijving Historisch Sparta-object – reservering." },
  { title: "Transportdocument", text: "Het document gaat over vervoer van een bronzen sportobject." },
];

export type Zone = "links" | "midden" | "rechts";
const ZONES: Zone[] = ["links", "midden", "rechts"];

export function scorePenalty(shots: Zone[], keepers: Zone[], pointsMax: number): ScoreResult & { goals: number; saves: number } {
  if (shots.length !== 5 || keepers.length !== 5) throw new GameError("Een reeks heeft exact vijf penalty's.");
  let goals = 0;
  for (let index = 0; index < 5; index += 1) {
    if (!ZONES.includes(shots[index]) || !ZONES.includes(keepers[index])) throw new GameError("Kies links, midden of rechts.");
    if (shots[index] !== keepers[index]) goals += 1;
  }
  const saves = 5 - goals;
  return {
    goals,
    saves,
    points: Math.round((pointsMax * goals) / 5),
    breakdown: `${goals} van 5 penalty's raak, ${saves} reddingen.`,
  };
}

export interface VarRound {
  id: string;
  prompt: string;
  scene: "buitenspel" | "schwalbe" | "tackle";
  video?: string | null;
  options: { id: string; label: string }[];
  answer: string;
  explanation: string;
}

export const VAR_ROUNDS: VarRound[] = [
  {
    id: "var-2",
    prompt: "De scheidsrechter geeft Sparta een penalty na een duel in het strafschopgebied. Wat is volgens jou de juiste beslissing?",
    scene: "tackle",
    video: "/var/sparta-rkc.mp4",
    options: [
      { id: "a", label: "De penalty is terecht: de verdediger maakt een overtreding." },
      { id: "b", label: "De penalty is onterecht: er is geen overtreding gemaakt." },
      { id: "c", label: "De scheidsrechter moet eerst zelf de beelden bekijken via de VAR." },
    ],
    answer: "b",
    explanation: "Geen penalty. In het duel is geen overtreding gemaakt, dus de penalty is onterecht.",
  },
];

export function scoreVar(answers: string[], pointsMax: number): ScoreResult & { correct: number } {
  if (!Array.isArray(answers) || answers.length !== VAR_ROUNDS.length) throw new GameError("De VAR-rondes zijn niet compleet.");
  let correct = 0;
  answers.forEach((answer, index) => {
    if (answer === VAR_ROUNDS[index].answer) correct += 1;
  });
  return {
    correct,
    points: Math.round((pointsMax * correct) / VAR_ROUNDS.length),
    breakdown: `${correct} van ${VAR_ROUNDS.length} ${VAR_ROUNDS.length === 1 ? "beslissing" : "beslissingen"} goed.`,
  };
}

export const SPOT_CLUE = "Welke persoon ziet er het meest verdacht uit?";

export const SPOT_BOARD = "/spot/signalement.jpg";

export const SPOT_CAMS = [
  { id: "cam-1", label: "CAM 1" },
  { id: "cam-2", label: "CAM 2" },
  { id: "cam-3", label: "CAM 3" },
  { id: "cam-4", label: "CAM 4" },
  { id: "cam-5", label: "CAM 5" },
] as const;

export const SPOT_SUSPECT = "cam-5";

export const SPOT_RIGHT =
  "CAM 5. Die persoon heeft een veel te grote sporttas, een auto en een antiek beeld bij zich. Dat past niet bij een gewone bezoeker.";

export const SPOT_WRONG =
  "Kijk nog eens naar de camera's en de signalementen eronder. Eén persoon neemt veel meer mee dan de anderen.";

export function scoreSpot(suspectId: string, pointsMax: number): ScoreResult & { correct: boolean; feedback: string } {
  const correct = suspectId === SPOT_SUSPECT;
  return {
    correct,
    feedback: correct ? SPOT_RIGHT : SPOT_WRONG,
    points: correct ? pointsMax : Math.round(pointsMax * 0.15),
    breakdown: correct ? "Het signalement klopt." : "Het signalement wijst naar iemand anders.",
  };
}

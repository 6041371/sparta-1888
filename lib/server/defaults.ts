import { FINALE_HINT, FINALE_PROMPT, SECRET_DEFAULT } from "@/lib/copy";
import type { Room, ScoringConfig, Station } from "@/lib/types";

export const ROOM_CODES: Record<string, string> = {
  bestuurskamer: "BESTUUR",
  perskamer: "PERS",
  tribune: "TRIBUNE",
  museum: "MUSEUM",
  deelderzaal: "DEELDER",
  kleedkamer: "KLEED",
};

export function roomIdForEntryCode(code: string): string | null {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  for (const [id, entry] of Object.entries(ROOM_CODES)) {
    if (entry === normalized || id.replace(/[^a-z0-9]/gi, "").toUpperCase() === normalized) return id;
  }
  return null;
}

export const DEFAULT_SCORING: ScoringConfig = {
  reactionMax: 100,
  memoryMax: 100,
  codePoints: 100,
  photoMax: 100,
  finalePoints: 150,
  hintCost: 15,
  maxHints: 4,
  memoryAttemptPenalty: 5,
  memoryTimePenalty: 2,
  wrongFinalePenalty: 0,
};

export const ROOM_TEMPLATES: Room[] = [
  { id: "bestuurskamer", name: "Bestuurskamer", available: true },
  { id: "perskamer", name: "Perskamer", available: true },
  { id: "tribune", name: "Tribune / veld", available: true },
  { id: "museum", name: "Museum", available: true },
  { id: "deelderzaal", name: "Jules Deelderzaal", available: true },
  { id: "kleedkamer", name: "Kleedkamer", available: true },
];

type StationTemplate = Omit<Station, "code">;

export const STATION_TEMPLATES: StationTemplate[] = [
  {
    id: "st-bestuur",
    name: "Schildwacht",
    roomId: "bestuurskamer",
    alternativeLocation: "",
    game: "reaction",
    puzzleId: null,
    clueTitle: "Vóór negen uur",
    clueText: "Het dossier was al weg vóór negen uur. Een verklaring die pas om negen uur begint, mist het moment.",
    enabled: true,
    pointsMax: 100,
    photoPrompt: null,
  },
  {
    id: "st-pers",
    name: "Dambord",
    roomId: "perskamer",
    alternativeLocation: "",
    game: "code",
    puzzleId: "dambord",
    clueTitle: "Geen dader gezien",
    clueText: "De pers zag alleen het lege vak. Niemand heeft daar een persoon met de map zien weglopen.",
    enabled: true,
    pointsMax: 100,
    photoPrompt: null,
  },
  {
    id: "st-tribune",
    name: "Het jaar",
    roomId: "tribune",
    alternativeLocation: "",
    game: "memory",
    puzzleId: null,
    clueTitle: "08:40",
    clueText: "Op het rondleidingsschema staat 08:40, vertrek vanuit het museum.",
    enabled: true,
    pointsMax: 100,
    photoPrompt: null,
  },
  {
    id: "st-museum",
    name: "De reeks",
    roomId: "museum",
    alternativeLocation: "",
    game: "code",
    puzzleId: "verdubbeling",
    clueTitle: "Rood lint",
    clueText: "Iemand haalde een map met een rood lint weg, zonder archiefstempel. Dat is een kopie voor een rondleiding.",
    enabled: true,
    pointsMax: 100,
    photoPrompt: null,
  },
  {
    id: "st-deelder",
    name: "De volgorde",
    roomId: "deelderzaal",
    alternativeLocation: "",
    game: "reaction",
    puzzleId: null,
    clueTitle: "Eerst de rondleiding",
    clueText: "Eerst de rondleiding om 08:40, daarna pas het lege vak. De map is niet door een supporter meegenomen.",
    enabled: true,
    pointsMax: 70,
    photoPrompt: null,
  },
  {
    id: "st-kleed",
    name: "Selectie",
    roomId: "kleedkamer",
    alternativeLocation: "",
    game: "photo",
    puzzleId: null,
    clueTitle: "Het verhaal",
    clueText: "In de kleedkamer ligt een rode map tussen de trainingshesjes. Het is een kopie, geen origineel archiefstuk.",
    enabled: true,
    pointsMax: 100,
    photoPrompt: null,
  },
];

export const DEFAULT_ANSWER = "NOOR";

export const DEFAULT_FINALE = {
  answer: DEFAULT_ANSWER,
  prompt: FINALE_PROMPT,
  hint: FINALE_HINT,
  secret: SECRET_DEFAULT,
};

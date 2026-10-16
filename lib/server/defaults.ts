import { FINALE_HINT, FINALE_PROMPT, SECRET_DEFAULT } from "@/lib/copy";
import type { Room, ScoringConfig, Station } from "@/lib/types";

export const ROOM_CODES: Record<string, string> = {
  bestuurskamer: "BESTUUR",
  perskamer: "PERS",
  tribune: "TRIBUNE",
  museum: "MUSEUM",
  deelderzaal: "DEELDER",
  kleedkamer: "KLEED",
  kasteel: "KASTEEL",
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
  { id: "tribune", name: "Tribune", available: true },
  { id: "museum", name: "Sparta Museum", available: true },
  { id: "kasteel", name: "Het Kasteel", available: true },
  { id: "deelderzaal", name: "Jules Deelder", available: true },
  { id: "kleedkamer", name: "Kleedkamer", available: true },
];

type StationTemplate = Omit<Station, "code">;

export const STATION_TEMPLATES: StationTemplate[] = [
  {
    id: "st-bestuur",
    name: "Schildtest",
    roomId: "bestuurskamer",
    alternativeLocation: "",
    game: "reaction",
    puzzleId: null,
    clueTitle: "",
    clueText: "",
    enabled: true,
    pointsMax: 100,
    photoPrompt: null,
  },
  {
    id: "st-pers",
    name: "Codepuzzel",
    roomId: "perskamer",
    alternativeLocation: "",
    game: "code",
    puzzleId: "dambord",
    clueTitle: "",
    clueText: "",
    enabled: true,
    pointsMax: 100,
    photoPrompt: null,
  },
  {
    id: "st-tribune",
    name: "Geheugenspel",
    roomId: "tribune",
    alternativeLocation: "",
    game: "memory",
    puzzleId: null,
    clueTitle: "",
    clueText: "",
    enabled: true,
    pointsMax: 100,
    photoPrompt: null,
  },
  {
    id: "st-museum",
    name: "Codepuzzel",
    roomId: "museum",
    alternativeLocation: "",
    game: "code",
    puzzleId: "verdubbeling",
    clueTitle: "",
    clueText: "",
    enabled: true,
    pointsMax: 100,
    photoPrompt: null,
  },
  {
    id: "st-deelder",
    name: "Schildtest",
    roomId: "deelderzaal",
    alternativeLocation: "",
    game: "reaction",
    puzzleId: null,
    clueTitle: "",
    clueText: "",
    enabled: true,
    pointsMax: 70,
    photoPrompt: null,
  },
];

export const DEFAULT_ANSWER = "BOSMAN";

export const DEFAULT_FINALE = {
  answer: DEFAULT_ANSWER,
  prompt: FINALE_PROMPT,
  hint: FINALE_HINT,
  secret: SECRET_DEFAULT,
};

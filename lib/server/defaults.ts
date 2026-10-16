import { FINALE_HINT, FINALE_PROMPT, SECRET_DEFAULT } from "@/lib/copy";
import type { Room, ScoringConfig, Station } from "@/lib/types";

export const DEFAULT_ANSWER = "ROOD1888";

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
    clueTitle: "De kleur",
    clueText: "Het eerste deel van de eindcode is ROOD, in hoofdletters.",
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
    clueTitle: "Aaneen",
    clueText: "Schrijf de delen van de eindcode direct achter elkaar, zonder spatie of streepje.",
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
    clueTitle: "Het jaar",
    clueText: "Het tweede deel van de eindcode is 1888.",
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
    clueTitle: "De lengte",
    clueText: "De eindcode heeft acht tekens: eerst vier letters, daarna vier cijfers.",
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
    clueTitle: "De volgorde",
    clueText: "Eerst de kleur, daarna het jaartal.",
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
    clueText:
      "Het geheim is een spelverhaal over samenwerken, inzicht, initiatief en doorzettingsvermogen. Het is geen echt historisch document.",
    enabled: true,
    pointsMax: 100,
    photoPrompt: null,
  },
];

export const DEFAULT_FINALE = {
  answer: DEFAULT_ANSWER,
  prompt: FINALE_PROMPT,
  hint: FINALE_HINT,
  secret: SECRET_DEFAULT,
};

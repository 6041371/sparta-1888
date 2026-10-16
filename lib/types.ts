export type EventStatus = "draft" | "live" | "paused" | "ended";
export type GameType = "reaction" | "memory" | "code" | "photo";
export type TieBreaker = "finale_then_time" | "time_then_finale";
export type WarningLevel = "none" | "15" | "5" | "1" | "done";

export interface ScoringConfig {
  reactionMax: number;
  memoryMax: number;
  codePoints: number;
  photoMax: number;
  finalePoints: number;
  hintCost: number;
  maxHints: number;
  memoryAttemptPenalty: number;
  memoryTimePenalty: number;
  wrongFinalePenalty: number;
}

export interface Room {
  id: string;
  name: string;
  available: boolean;
}

export interface Station {
  id: string;
  code: string;
  name: string;
  roomId: string;
  alternativeLocation: string;
  game: GameType;
  puzzleId: string | null;
  clueTitle: string;
  clueText: string;
  enabled: boolean;
  pointsMax: number;
  photoPrompt: string | null;
}

export interface Clue {
  stationId: string;
  title: string;
  text: string;
  earnedAt: number;
}

export interface HintUse {
  key: string;
  cost: number;
  at: number;
}

export interface Adjustment {
  points: number;
  reason: string;
  at: number;
}

export interface PhotoReview {
  dataUrl: string;
  prompt: string;
  status: "pending" | "reviewed";
  creativity: number;
  teamwork: number;
  execution: number;
}

export interface Completion {
  stationId: string;
  game: GameType;
  points: number;
  completedAt: number;
  breakdown: string;
  clueTitle: string;
  clueText: string;
  photo: PhotoReview | null;
}

export interface Team {
  id: string;
  name: string;
  joinCode: string;
  score: number;
  completions: Completion[];
  clues: Clue[];
  hintsUsed: HintUse[];
  adjustments: Adjustment[];
  finaleSolved: boolean;
  finalePoints: number;
  finaleAttempts: number;
  finaleSolvedAt: number | null;
  lastScoreAt: number | null;
  photoPrompts: Record<string, string>;
  createdAt: number;
}

export interface GameEvent {
  id: string;
  name: string;
  status: EventStatus;
  durationMinutes: number;
  startedAt: number | null;
  pausedAt: number | null;
  pausedTotalMs: number;
  endedAt: number | null;
  finaleOpen: boolean;
  finaleAnswer: string;
  finalePrompt: string;
  finaleHint: string;
  secretText: string;
  resultsPublished: boolean;
  tiebreaker: TieBreaker;
  scoring: ScoringConfig;
  rooms: Room[];
  stations: Station[];
  teams: Team[];
  accessHash: string;
  accessSalt: string;
  createdAt: number;
}

export interface Session {
  token: string;
  role: "organizer" | "team";
  eventId: string;
  teamId: string | null;
  expiresAt: number;
}

export interface ReactionRound {
  target: boolean;
  tapped: boolean;
  reactionMs: number | null;
}

export interface PublicPuzzle {
  id: string;
  title: string;
  prompt: string;
  inputLabel: string;
}

export interface PublicStation {
  id: string;
  code: string;
  name: string;
  roomId: string;
  roomName: string;
  locationLabel: string;
  game: GameType;
  gameTitle: string;
  pointsMax: number;
  puzzle: PublicPuzzle | null;
  available: boolean;
}

export interface PublicCompletion {
  stationId: string;
  stationName: string;
  game: GameType;
  points: number;
  completedAt: number;
  breakdown: string;
  photoStatus: "pending" | "reviewed" | null;
}

export interface LedgerLine {
  label: string;
  points: number;
  at: number | null;
}

export interface TeamView {
  id: string;
  name: string;
  joinCode: string;
  score: number;
  rank: number;
  teamCount: number;
  completedCount: number;
  stationCount: number;
  clues: { stationId: string; title: string; text: string }[];
  completions: PublicCompletion[];
  ledger: LedgerLine[];
  finaleSolved: boolean;
  finalePoints: number;
  finaleAttempts: number;
  hintsUsedKeys: string[];
  hintsLeft: number;
  hintCost: number;
  secretVisible: boolean;
}

export interface PublicEvent {
  id: string;
  name: string;
  status: EventStatus;
  durationMinutes: number;
  remainingMs: number;
  elapsedMs: number;
  serverNow: number;
  finaleOpen: boolean;
  finalePrompt: string;
  finaleHintAvailable: boolean;
  resultsPublished: boolean;
  secretText: string | null;
  tiebreaker: TieBreaker;
  stations: PublicStation[];
  rooms: { id: string; name: string; available: boolean }[];
}

export interface RankRow {
  position: number;
  teamId: string;
  name: string;
  score: number;
  completedCount: number;
  finaleSolved: boolean;
  finalePoints: number;
  finaleStatus: "opgelost" | "bezig" | "wachten";
  lastScoreAt: number | null;
}

export interface TeamSnapshot {
  role: "team";
  serverNow: number;
  event: PublicEvent;
  team: TeamView;
  leaderboard: RankRow[];
}

export interface OrganizerTeam {
  id: string;
  name: string;
  joinCode: string;
  score: number;
  completedCount: number;
  clueCount: number;
  finaleSolved: boolean;
  finaleAttempts: number;
  finalePoints: number;
  lastScoreAt: number | null;
  hintsUsed: number;
  stuck: boolean;
  pendingPhotos: {
    stationId: string;
    stationName: string;
    prompt: string;
    dataUrl?: string;
    creativity: number;
    teamwork: number;
    execution: number;
    status: "pending" | "reviewed";
    points: number;
  }[];
  ledger: LedgerLine[];
}

export interface OrganizerStation extends Station {
  roomName: string;
  visible: boolean;
  locationLabel: string;
  puzzleAnswer: string | null;
  puzzleHint: string | null;
  puzzleTitle: string | null;
}

export interface OrganizerEvent {
  id: string;
  name: string;
  status: EventStatus;
  durationMinutes: number;
  remainingMs: number;
  elapsedMs: number;
  serverNow: number;
  startedAt: number | null;
  finaleOpen: boolean;
  finaleAnswer: string;
  finalePrompt: string;
  finaleHint: string;
  secretText: string;
  resultsPublished: boolean;
  tiebreaker: TieBreaker;
  scoring: ScoringConfig;
  rooms: Room[];
  stations: OrganizerStation[];
  teams: OrganizerTeam[];
}

export interface OrganizerSnapshot {
  role: "organizer";
  serverNow: number;
  event: OrganizerEvent;
  leaderboard: RankRow[];
}

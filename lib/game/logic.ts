import type {
  Completion,
  EventStatus,
  GameEvent,
  RankRow,
  ReactionRound,
  Room,
  ScoringConfig,
  Station,
  Team,
  TieBreaker,
  WarningLevel,
} from "@/lib/types";
import { GameError } from "@/lib/game/errors";

export const REACTION_ROUNDS = 12;
export const MEMORY_PAIRS = 6;

export function normCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function rawScore(team: Pick<Team, "completions" | "finalePoints" | "adjustments" | "hintsUsed">): number {
  const earned = team.completions.reduce((sum, item) => sum + item.points, 0);
  const hints = team.hintsUsed.reduce((sum, item) => sum + item.cost, 0);
  const adjustments = team.adjustments.reduce((sum, item) => sum + item.points, 0);
  return earned + team.finalePoints + adjustments - hints;
}

export function displayScore(team: Pick<Team, "completions" | "finalePoints" | "adjustments" | "hintsUsed">): number {
  return Math.max(0, rawScore(team));
}

export function withScore<T extends Team>(team: T, earnedAt: number | null = null): T {
  const score = displayScore(team);
  return {
    ...team,
    score,
    lastScoreAt: earnedAt ?? team.lastScoreAt,
  };
}

type ClockInput = Pick<
  GameEvent,
  "status" | "durationMinutes" | "startedAt" | "pausedAt" | "pausedTotalMs" | "endedAt"
>;

export function projectClock(event: ClockInput, now: number): { remainingMs: number; elapsedMs: number } {
  const total = event.durationMinutes * 60_000;
  if (event.startedAt == null || event.status === "draft") {
    return { remainingMs: total, elapsedMs: 0 };
  }

  let effectiveNow = now;
  if (event.status === "paused" && event.pausedAt != null) effectiveNow = event.pausedAt;
  if (event.status === "ended" && event.endedAt != null) effectiveNow = event.endedAt;

  const elapsedMs = Math.max(0, effectiveNow - event.startedAt - event.pausedTotalMs);
  return { remainingMs: Math.max(0, total - elapsedMs), elapsedMs };
}

export function warningLevel(remainingMs: number): WarningLevel {
  if (remainingMs <= 0) return "done";
  if (remainingMs <= 60_000) return "1";
  if (remainingMs <= 5 * 60_000) return "5";
  if (remainingMs <= 15 * 60_000) return "15";
  return "none";
}

export function formatRemaining(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function stationVisible(station: Station, rooms: Room[]): boolean {
  if (!station.enabled) return false;
  const room = rooms.find((item) => item.id === station.roomId);
  if (!room) return false;
  if (room.available) return true;
  return station.alternativeLocation.trim().length > 0;
}

export function locationLabel(station: Station, rooms: Room[]): string {
  const room = rooms.find((item) => item.id === station.roomId);
  if (room?.available) return room.name;
  if (station.alternativeLocation.trim()) return station.alternativeLocation.trim();
  return room?.name ?? "Onbekende ruimte";
}

export function visibleStations(stations: Station[], rooms: Room[]): Station[] {
  return stations.filter((station) => stationVisible(station, rooms));
}

export interface ScoreResult {
  points: number;
  breakdown: string;
}

export function scoreReaction(rounds: ReactionRound[], pointsMax: number): ScoreResult {
  if (!Array.isArray(rounds) || rounds.length !== REACTION_ROUNDS) {
    throw new GameError("De rondegegevens kloppen niet.");
  }

  let correct = 0;
  let speedSum = 0;
  let speedCount = 0;

  for (const round of rounds) {
    if (!round || typeof round.target !== "boolean" || typeof round.tapped !== "boolean") {
      throw new GameError("De rondegegevens kloppen niet.");
    }
    const ms = round.reactionMs;
    const tapValid = round.tapped && typeof ms === "number" && Number.isFinite(ms) && ms >= 80 && ms <= 1600;
    const ok = round.target ? tapValid : !round.tapped;
    if (ok) {
      correct += 1;
      if (round.target && typeof ms === "number") {
        speedSum += ms;
        speedCount += 1;
      }
    }
  }

  const accuracy = correct / REACTION_ROUNDS;
  const average = speedCount ? Math.round(speedSum / speedCount) : null;
  const speed = average === null ? 0 : clamp((1200 - average) / (1200 - 280), 0, 1);
  const points = Math.round(pointsMax * (0.7 * accuracy + 0.3 * accuracy * speed));
  const speedText = average === null ? "geen geraakte schilden" : `gemiddeld ${average} ms`;
  return {
    points,
    breakdown: `${correct} van ${REACTION_ROUNDS} goed, ${speedText}.`,
  };
}

export function scoreMemory(
  input: { matches: number; attempts: number; elapsedMs: number },
  pointsMax: number,
  penalties: Pick<ScoringConfig, "memoryAttemptPenalty" | "memoryTimePenalty">,
): ScoreResult {
  if (input.matches !== MEMORY_PAIRS) {
    throw new GameError("De memory is nog niet compleet.");
  }
  if (!Number.isInteger(input.attempts) || input.attempts < MEMORY_PAIRS || input.attempts > 200) {
    throw new GameError("Het aantal pogingen klopt niet.");
  }
  if (!Number.isFinite(input.elapsedMs) || input.elapsedMs < 1500 || input.elapsedMs > 30 * 60 * 1000) {
    throw new GameError("De gespeelde tijd klopt niet.");
  }

  const extraAttempts = input.attempts - MEMORY_PAIRS;
  const timeSteps = Math.floor(input.elapsedMs / 15_000);
  const floor = Math.round(pointsMax * 0.15);
  const points = clamp(
    Math.round(pointsMax - extraAttempts * penalties.memoryAttemptPenalty - timeSteps * penalties.memoryTimePenalty),
    floor,
    pointsMax,
  );
  const seconds = Math.round(input.elapsedMs / 1000);
  return {
    points,
    breakdown: `${MEMORY_PAIRS} paren, ${input.attempts} pogingen, ${seconds} seconden.`,
  };
}

export function applyCompletion(team: Team, completion: Completion, now: number): { team: Team; alreadyCompleted: boolean } {
  if (team.completions.some((item) => item.stationId === completion.stationId)) {
    return { team, alreadyCompleted: true };
  }

  const clues = completion.clueTitle
    ? [
        ...team.clues,
        {
          stationId: completion.stationId,
          title: completion.clueTitle,
          text: completion.clueText,
          earnedAt: now,
        },
      ]
    : team.clues;

  const next = withScore(
    {
      ...team,
      completions: [...team.completions, completion],
      clues,
    },
    completion.points > 0 ? now : null,
  );
  return { team: next, alreadyCompleted: false };
}

export function applyHint(
  team: Team,
  input: { key: string; cost: number; maxHints: number; now: number },
): { team: Team; already: boolean } {
  if (team.hintsUsed.some((item) => item.key === input.key)) {
    return { team, already: true };
  }
  if (team.hintsUsed.length >= input.maxHints) {
    throw new GameError("Jullie hebben geen hints meer over.");
  }
  const next = withScore({
    ...team,
    hintsUsed: [...team.hintsUsed, { key: input.key, cost: input.cost, at: input.now }],
  });
  return { team: next, already: false };
}

export function finaleFeedback(answer: string, expected: string): string {
  const given = normCode(answer);
  const target = normCode(expected);
  if (!given) return "Vul de eindcode in.";
  if (given === target) return "De code klopt.";
  if (given.length === target.length) {
    return "De lengte klopt, maar de code nog niet. Controleer de volgorde van jullie aanwijzingen.";
  }
  if (Math.abs(given.length - target.length) === 1) {
    return "Jullie zitten één teken naast de juiste lengte.";
  }
  return "Dit is niet de eindcode. Leg de aanwijzingen naast elkaar.";
}

export function applyFinale(
  team: Team,
  event: { status: EventStatus; finaleOpen: boolean; finaleAnswer: string },
  answer: string,
  config: Pick<ScoringConfig, "finalePoints" | "wrongFinalePenalty">,
  now: number,
): { team: Team; correct: boolean; already: boolean; feedback: string } {
  if (event.status === "draft") throw new GameError("Het evenement is nog niet gestart.", 403);
  if (event.status === "paused") throw new GameError("Het spel is gepauzeerd door de organisatie.", 403);
  if (!event.finaleOpen) throw new GameError("De finale is nog niet geopend.", 403);
  if (team.finaleSolved) {
    return { team, correct: true, already: true, feedback: "Jullie hebben de eindcode al gekraakt." };
  }

  const attempt = normCode(answer);
  if (!attempt) throw new GameError("Vul de eindcode in.");
  const correct = attempt === normCode(event.finaleAnswer);
  if (!correct) {
    const adjustments =
      config.wrongFinalePenalty > 0
        ? [...team.adjustments, { points: -config.wrongFinalePenalty, reason: "Foute eindcode", at: now }]
        : team.adjustments;
    return {
      team: withScore({ ...team, finaleAttempts: team.finaleAttempts + 1, adjustments }),
      correct: false,
      already: false,
      feedback: finaleFeedback(answer, event.finaleAnswer),
    };
  }

  const next = withScore(
    {
      ...team,
      finaleSolved: true,
      finalePoints: config.finalePoints,
      finaleAttempts: team.finaleAttempts + 1,
      finaleSolvedAt: now,
    },
    now,
  );
  return { team: next, correct: true, already: false, feedback: "De code klopt." };
}

function sameRank(a: Team, b: Team, tiebreaker: TieBreaker): boolean {
  if (a.score !== b.score) return false;
  if (tiebreaker === "finale_then_time") {
    return a.finalePoints === b.finalePoints && a.lastScoreAt === b.lastScoreAt;
  }
  return a.lastScoreAt === b.lastScoreAt && a.finalePoints === b.finalePoints;
}

export function rankTeams(teams: Team[], tiebreaker: TieBreaker, finaleOpen: boolean): RankRow[] {
  const sorted = [...teams].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (tiebreaker === "finale_then_time") {
      if (b.finalePoints !== a.finalePoints) return b.finalePoints - a.finalePoints;
    } else if ((a.lastScoreAt ?? Number.MAX_SAFE_INTEGER) !== (b.lastScoreAt ?? Number.MAX_SAFE_INTEGER)) {
      return (a.lastScoreAt ?? Number.MAX_SAFE_INTEGER) - (b.lastScoreAt ?? Number.MAX_SAFE_INTEGER);
    }
    if (tiebreaker === "finale_then_time") {
      const time = (a.lastScoreAt ?? Number.MAX_SAFE_INTEGER) - (b.lastScoreAt ?? Number.MAX_SAFE_INTEGER);
      if (time !== 0) return time;
    } else if (b.finalePoints !== a.finalePoints) {
      return b.finalePoints - a.finalePoints;
    }
    const name = a.name.localeCompare(b.name, "nl");
    if (name !== 0) return name;
    return a.id.localeCompare(b.id);
  });

  let position = 1;
  return sorted.map((team, index) => {
    if (index > 0 && !sameRank(sorted[index - 1], team, tiebreaker)) position = index + 1;
    return {
      position,
      teamId: team.id,
      name: team.name,
      score: team.score,
      completedCount: team.completions.length,
      finaleSolved: team.finaleSolved,
      finalePoints: team.finalePoints,
      finaleStatus: team.finaleSolved ? "opgelost" : finaleOpen ? "bezig" : "wachten",
      lastScoreAt: team.lastScoreAt,
    };
  });
}

export function playBlockReason(event: ClockInput, now: number): string | null {
  if (event.status === "draft") return "Het evenement is nog niet gestart.";
  if (event.status === "paused") return "Het spel is gepauzeerd door de organisatie.";
  if (event.status === "ended") return "Dit evenement is afgelopen.";
  if (projectClock(event, now).remainingMs <= 0) {
    return "De speeltijd zit erop. Nieuwe stations leveren geen punten meer op.";
  }
  return null;
}

export function parseStationCode(value: string): string | null {
  const text = value.trim();
  const fromUrl = text.match(/station\/([A-Za-z0-9]{4,10})/i);
  if (fromUrl) return fromUrl[1].toUpperCase();
  if (/^[A-Za-z0-9]{4,10}$/.test(text)) return text.toUpperCase();
  return null;
}

export function suggestedPhotoPoints(creativity: number, teamwork: number, execution: number, pointsMax: number): number {
  return clamp(Math.round(((creativity + teamwork + execution) / 30) * pointsMax), 0, pointsMax);
}

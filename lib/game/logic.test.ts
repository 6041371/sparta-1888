import { describe, expect, it } from "vitest";
import {
  applyCompletion,
  applyFinale,
  applyHint,
  formatRemaining,
  parseStationCode,
  scanTarget,
  projectClock,
  rankTeams,
  scoreMemory,
  scoreReaction,
  stationVisible,
  warningLevel,
} from "@/lib/game/logic";
import type { Completion, Room, Station, Team } from "@/lib/types";
import { DEFAULT_SCORING } from "@/lib/server/defaults";

function team(partial: Partial<Team> = {}): Team {
  return {
    id: "team-a",
    name: "A",
    joinCode: "AAAAAA",
    score: 0,
    completions: [],
    clues: [],
    hintsUsed: [],
    adjustments: [],
    finaleSolved: false,
    finalePoints: 0,
    finaleAttempts: 0,
    finaleSolvedAt: null,
    finaleSuspect: null,
    finaleExplanation: "",
    lastScoreAt: null,
    photoPrompts: {},
    briefingSeen: false,
    createdAt: 0,
    ...partial,
  };
}

function completion(points = 40): Completion {
  return {
    stationId: "st-1",
    game: "reaction",
    points,
    completedAt: 10,
    breakdown: "test",
    clueTitle: "Kleur",
    clueText: "ROOD",
    photo: null,
  };
}

describe("scores en dubbele afronding", () => {
  it("rekent reactiepunten op nauwkeurigheid en snelheid", () => {
    const perfect = scoreReaction(
      Array.from({ length: 12 }, (_, index) => ({
        target: index % 2 === 0,
        tapped: index % 2 === 0,
        reactionMs: index % 2 === 0 ? 280 : null,
      })),
      100,
    );
    expect(perfect.points).toBe(100);

    const slow = scoreReaction(
      Array.from({ length: 12 }, (_, index) => ({
        target: index % 2 === 0,
        tapped: index % 2 === 0,
        reactionMs: index % 2 === 0 ? 1200 : null,
      })),
      100,
    );
    expect(slow.points).toBe(70);
  });

  it("weigert een onvolledige reactieronde", () => {
    expect(() => scoreReaction([{ target: true, tapped: true, reactionMs: 200 }], 100)).toThrow(/rondegegevens/i);
  });

  it("geeft memory minder punten bij extra pogingen en tijd, met een bodem", () => {
    const clean = scoreMemory({ matches: 6, attempts: 6, elapsedMs: 10_000 }, 100, DEFAULT_SCORING);
    expect(clean.points).toBe(100);
    const messy = scoreMemory({ matches: 6, attempts: 20, elapsedMs: 120_000 }, 100, DEFAULT_SCORING);
    expect(messy.points).toBeGreaterThanOrEqual(15);
    expect(messy.points).toBeLessThan(clean.points);
  });

  it("kent een station maar één keer punten en één aanwijzing toe", () => {
    const first = applyCompletion(team(), completion(80), 50);
    expect(first.alreadyCompleted).toBe(false);
    expect(first.team.score).toBe(80);
    expect(first.team.clues).toHaveLength(1);
    const second = applyCompletion(first.team, completion(80), 80);
    expect(second.alreadyCompleted).toBe(true);
    expect(second.team.score).toBe(80);
    expect(second.team.completions).toHaveLength(1);
    expect(second.team.clues).toHaveLength(1);
  });

  it("brengt hintkosten één keer in mindering en stopt bij het maximum", () => {
    const rich = applyCompletion(team(), completion(40), 10).team;
    const first = applyHint(rich, { key: "st-1", cost: 15, maxHints: 2, now: 20 });
    expect(first.already).toBe(false);
    expect(first.team.score).toBe(25);
    const again = applyHint(first.team, { key: "st-1", cost: 15, maxHints: 2, now: 30 });
    expect(again.already).toBe(true);
    expect(again.team.score).toBe(25);
    const other = applyHint(again.team, { key: "st-2", cost: 15, maxHints: 2, now: 40 });
    expect(other.team.score).toBe(10);
    expect(() => applyHint(other.team, { key: "st-3", cost: 15, maxHints: 2, now: 50 })).toThrow(/geen hints/i);
  });

  it("laat de score niet onder nul zakken", () => {
    const hinted = applyHint(team(), { key: "finale", cost: 15, maxHints: 2, now: 5 });
    expect(hinted.team.score).toBe(0);
  });
});

describe("timer, finale en ranglijst", () => {
  it("laat de pauze de resterende tijd stilzetten", () => {
    const durationMinutes = 90;
    const running = projectClock(
      { status: "active", durationMinutes, startedAt: 0, pausedAt: null, pausedTotalMs: 0, endedAt: null },
      10_000,
    );
    expect(running.remainingMs).toBe(90 * 60_000 - 10_000);

    const paused = projectClock(
      { status: "paused", durationMinutes, startedAt: 0, pausedAt: 10_000, pausedTotalMs: 0, endedAt: null },
      999_999,
    );
    expect(paused.remainingMs).toBe(running.remainingMs);

    const resumed = projectClock(
      { status: "active", durationMinutes, startedAt: 0, pausedAt: null, pausedTotalMs: 40_000, endedAt: null },
      60_000,
    );
    expect(resumed.elapsedMs).toBe(20_000);
  });

  it("markeert 15, 5 en 1 minuut en het einde", () => {
    expect(warningLevel(16 * 60_000)).toBe("none");
    expect(warningLevel(15 * 60_000)).toBe("15");
    expect(warningLevel(5 * 60_000)).toBe("5");
    expect(warningLevel(60_000)).toBe("1");
    expect(warningLevel(0)).toBe("done");
    expect(formatRemaining(90_000)).toBe("01:30");
  });

  it("houdt de finale dicht tot de organisatie haar opent en keert punten één keer uit", () => {
    const closed = { status: "active" as const, finaleOpen: false, finaleAnswer: "ROOD1888" };
    expect(() => applyFinale(team(), closed, "ROOD1888", DEFAULT_SCORING, 10)).toThrow(/nog niet geopend/i);

    const open = { ...closed, finaleOpen: true };
    const wrong = applyFinale(team(), open, "BLAUW", DEFAULT_SCORING, 10);
    expect(wrong.correct).toBe(false);
    expect(wrong.team.finalePoints).toBe(0);
    expect(wrong.feedback).toMatch(/niet de eindcode|lengte/i);

    const right = applyFinale(wrong.team, open, "rood 1888", DEFAULT_SCORING, 20);
    expect(right.correct).toBe(true);
    expect(right.team.score).toBe(150);
    const repeat = applyFinale(right.team, open, "ROOD1888", DEFAULT_SCORING, 30);
    expect(repeat.already).toBe(true);
    expect(repeat.team.score).toBe(150);
  });

  it("sorteert op score en gebruikt de gekozen tiebreak", () => {
    const early = team({ id: "a", name: "Vroeg", score: 100, finalePoints: 0, lastScoreAt: 10 });
    const finale = team({ id: "b", name: "Finale", score: 100, finalePoints: 150, lastScoreAt: 50, finaleSolved: true });
    const low = team({ id: "c", name: "Laag", score: 40, lastScoreAt: 5 });

    const byFinale = rankTeams([early, low, finale], "finale_then_time", true);
    expect(byFinale.map((row) => row.teamId)).toEqual(["b", "a", "c"]);

    const byTime = rankTeams([early, finale, low], "time_then_finale", true);
    expect(byTime.map((row) => row.teamId)).toEqual(["a", "b", "c"]);
    expect(byTime[0].position).toBe(1);
    expect(byTime[2].finaleStatus).toBe("bezig");
  });

  it("leest een stationcode uit een QR-link of een handmatige code", () => {
    expect(parseStationCode("https://spel.test/spel/station/ab12cd")).toBe("AB12CD");
    expect(parseStationCode("k9p2lm")).toBe("K9P2LM");
    expect(parseStationCode("dit is geen code")).toBeNull();
  });

  it("opent een ruimtecode of ruimtelink, ook vanuit de scanner", () => {
    expect(scanTarget("https://sparta-1888.vercel.app/ruimte/museum")).toBe("/ruimte/museum");
    expect(scanTarget("MUSEUM")).toBe("/ruimte/museum");
    expect(scanTarget("bestuur")).toBe("/ruimte/bestuurskamer");
    expect(scanTarget("https://spel.test/spel/station/ab12cd")).toBe("/spel/station/AB12CD");
    expect(scanTarget("k9p2lm")).toBe("/spel/station/K9P2LM");
    expect(scanTarget("dit is geen code")).toBeNull();
  });

  it("verbergt een dichte ruimte zonder alternatief", () => {
    const rooms: Room[] = [{ id: "museum", name: "Museum", available: false }];
    const hidden: Station = {
      id: "st",
      code: "ABCDEF",
      name: "Museumspel",
      roomId: "museum",
      alternativeLocation: "",
      game: "memory",
      puzzleId: null,
      clueTitle: "Jaar",
      clueText: "1888",
      enabled: true,
      pointsMax: 100,
      photoPrompt: null,
    };
    expect(stationVisible(hidden, rooms)).toBe(false);
    expect(stationVisible({ ...hidden, alternativeLocation: "Gang bij de skybox" }, rooms)).toBe(true);
  });
});

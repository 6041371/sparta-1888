import { EVIDENCE_ITEMS, evidenceProgress, finaleUnlocked } from "@/lib/content/evidence";
import { assignPlayers, FIELD_PLAYERS } from "@/lib/content/field";
import { QUIZ_LOCATIONS, getQuestion, publicQuestion, questionsFor } from "@/lib/content/quiz";
import { GAME_SUMMARIES, GAME_TITLES } from "@/lib/copy";
import { displayScore, locationLabel, projectClock, rankTeams, stationVisible, visibleStations } from "@/lib/game/logic";
import type {
  GameEvent,
  LedgerLine,
  OrganizerSnapshot,
  OrganizerStation,
  PublicStation,
  Team,
  TeamSnapshot,
} from "@/lib/types";
import { getPuzzle, publicPuzzle } from "@/lib/server/puzzles";

function ledger(team: Team, event: GameEvent): LedgerLine[] {
  const lines: LedgerLine[] = [];
  for (const completion of team.completions) {
    const station = event.stations.find((item) => item.id === completion.stationId);
    lines.push({
      label: station?.name ?? "Station",
      points: completion.points,
      at: completion.completedAt,
    });
  }
  for (const hint of team.hintsUsed) {
    const station = event.stations.find((item) => item.id === hint.key);
    lines.push({
      label: hint.key === "finale" ? "Hint voor de finale" : `Hint bij ${station?.name ?? "een puzzel"}`,
      points: -hint.cost,
      at: hint.at,
    });
  }
  if (team.finalePoints) {
    lines.push({ label: "Finale", points: team.finalePoints, at: team.finaleSolvedAt });
  }
  for (const adjustment of team.adjustments) {
    lines.push({ label: adjustment.reason, points: adjustment.points, at: adjustment.at });
  }
  for (const answer of team.answers ?? []) {
    if (answer.points <= 0) continue;
    const question = getQuestion(answer.questionId);
    lines.push({ label: question?.prompt.slice(0, 72) ?? "Vraag", points: answer.points, at: answer.at });
  }
  const raw =
    team.completions.reduce((sum, item) => sum + item.points, 0) +
    (team.answers ?? []).reduce((sum, item) => sum + item.points, 0) +
    team.finalePoints +
    team.adjustments.reduce((sum, item) => sum + item.points, 0) -
    team.hintsUsed.reduce((sum, item) => sum + item.cost, 0);
  if (raw < 0) lines.push({ label: "De score kan niet onder nul zakken", points: -raw, at: null });
  return lines;
}

function publicStation(event: GameEvent, station: GameEvent["stations"][number], includeCode: boolean): PublicStation {
  return {
    id: station.id,
    code: includeCode ? station.code : "",
    name: station.name,
    roomId: station.roomId,
    roomName: event.rooms.find((room) => room.id === station.roomId)?.name ?? "Ruimte",
    locationLabel: locationLabel(station, event.rooms),
    game: station.game,
    gameTitle: GAME_TITLES[station.game],
    pointsMax: station.pointsMax,
    puzzle: station.game === "code" ? publicPuzzle(station.puzzleId) : null,
    available: stationVisible(station, event.rooms),
  };
}

export function toTeamSnapshot(event: GameEvent, team: Team, now: number): TeamSnapshot {
  const clock = projectClock(event, now);
  const board = rankTeams(event.teams, event.tiebreaker, event.finaleOpen);
  const mine = board.find((row) => row.teamId === team.id);
  const openStations = visibleStations(event.stations, event.rooms).filter((station) => station.game !== "photo");
  const secretVisible = team.finaleSolved || event.resultsPublished;
  const current = event.teams.find((item) => item.id === team.id) ?? team;
  current.score = displayScore(current);
  const answers = current.answers ?? [];
  const visited = current.visitedRooms ?? [];
  const solvedIds = new Set(answers.filter((item) => item.points > 0).map((item) => item.questionId));
  const closedIds = new Set(answers.map((item) => item.questionId));
  const assignments = event.evidenceAssignments ?? {};
  const roomIds = event.rooms.filter((room) => room.available).map((room) => room.id);
  const playerRooms = assignPlayers(roomIds);
  const locations = QUIZ_LOCATIONS.map((location) => {
    const questions = questionsFor(location.id);
    const room = event.rooms.find((item) => item.id === location.id);
    const field = location.id === "veld";
    const station = event.stations.find((item) => item.roomId === location.id && item.enabled && item.game !== "photo");
    const minigameDone = !station || current.completions.some((item) => item.stationId === station.id);
    const closedCount = questions.filter((question) => closedIds.has(question.id)).length;
    const complete = !field && Boolean(room?.available) && questions.length > 0 && closedCount === questions.length && minigameDone;
    return {
      id: location.id,
      name: room?.name ?? location.name,
      intro: location.intro,
      available: field || Boolean(room?.available),
      visited: field || visited.includes(location.id),
      questionCount: questions.length,
      solvedCount: questions.filter((question) => solvedIds.has(question.id)).length,
      closedCount,
      complete,
      minigameTitle: station ? GAME_TITLES[station.game] : null,
      minigameSummary: station ? GAME_SUMMARIES[station.game] : null,
      minigameDone,
      minigameCode: station && (field || visited.includes(location.id)) ? station.code : null,
      evidenceIds: assignments[location.id] ?? [],
    };
  });
  const unlockedPlayers = new Set(
    Object.entries(playerRooms)
      .filter(([roomId]) => locations.find((item) => item.id === roomId)?.complete)
      .flatMap(([, players]) => players),
  );
  const questions = QUIZ_LOCATIONS.flatMap((location) => {
    const card = locations.find((item) => item.id === location.id);
    if (!card?.available || !card.visited) return [];
    return questionsFor(location.id)
      .filter((question) => location.id !== "veld" || unlockedPlayers.has(question.id))
      .map((question) => publicQuestion(question, solvedIds.has(question.id), closedIds.has(question.id)));
  });
  const found = new Set(current.collectedEvidenceIds ?? []);
  const progress = evidenceProgress(current.collectedEvidenceIds ?? []);
  const clockOpen = finaleUnlocked(current.collectedEvidenceIds ?? [], clock.remainingMs, event.status);

  return {
    role: "team",
    serverNow: now,
    leaderboard: board,
    team: {
      id: current.id,
      name: current.name,
      joinCode: current.joinCode,
      score: current.score,
      rank: mine?.position ?? board.length,
      teamCount: event.teams.length,
      completedCount: current.completions.length + solvedIds.size,
      stationCount: openStations.length,
      clues: current.clues.map((clue) => ({ stationId: clue.stationId, title: clue.title, text: clue.text })),
      completions: current.completions.map((completion) => ({
        stationId: completion.stationId,
        stationName: event.stations.find((item) => item.id === completion.stationId)?.name ?? "Station",
        game: completion.game,
        points: completion.points,
        completedAt: completion.completedAt,
        breakdown: completion.breakdown,
        photoStatus: completion.photo?.status ?? null,
      })),
      ledger: ledger(current, event),
      finaleSolved: current.finaleSolved,
      finalePoints: current.finalePoints,
      finaleAttempts: current.finaleAttempts,
      hintsUsedKeys: current.hintsUsed.map((hint) => hint.key),
      hintsLeft: Math.max(0, event.scoring.maxHints - current.hintsUsed.length),
      briefingSeen: current.briefingSeen,
      fieldSeen: Boolean(current.fieldSeen),
      hintCost: event.scoring.hintCost,
      secretVisible,
    },
    event: {
      id: event.id,
      name: event.name,
      status: event.status,
      durationMinutes: event.durationMinutes,
      remainingMs: clock.remainingMs,
      elapsedMs: clock.elapsedMs,
      serverNow: now,
      finaleOpen: event.finaleOpen || clockOpen,
      finalePrompt: event.finalePrompt,
      finaleHintAvailable: event.finaleHint.trim().length > 0,
      resultsPublished: event.resultsPublished,
      secretText: secretVisible ? event.secretText : null,
      tiebreaker: event.tiebreaker,
      lobbyToken: event.lobbyToken,
      stations: openStations.map((station) => publicStation(event, station, false)),
      rooms: event.rooms.map((room) => ({ id: room.id, name: room.name, available: room.available })),
      locations,
      questions,
      evidence: EVIDENCE_ITEMS.map((item) => ({
        ...item,
        found: found.has(item.id),
        text: found.has(item.id) ? item.text : "",
        image: found.has(item.id) ? item.image : "",
      })),
      evidenceCollected: progress.collected,
      evidenceTotal: progress.total,
      fieldPlayers: FIELD_PLAYERS.map((player) => ({
        ...player,
        unlocked: unlockedPlayers.has(player.questionId),
        solved: solvedIds.has(player.questionId),
      })),
    },
  };
}

export function toOrganizerSnapshot(event: GameEvent, now: number, includePhotos: boolean): OrganizerSnapshot {
  const clock = projectClock(event, now);
  const stuckAfter = 15 * 60 * 1000;
  const stations: OrganizerStation[] = event.stations.map((station) => {
    const puzzle = station.game === "code" ? getPuzzle(station.puzzleId) : null;
    return {
      ...station,
      roomName: event.rooms.find((room) => room.id === station.roomId)?.name ?? "Ruimte",
      visible: stationVisible(station, event.rooms),
      locationLabel: locationLabel(station, event.rooms),
      puzzleAnswer: puzzle?.answer ?? null,
      puzzleHint: puzzle?.hint ?? null,
      puzzleTitle: puzzle?.title ?? null,
      puzzlePrompt: puzzle?.prompt ?? null,
      puzzleInputLabel: puzzle?.inputLabel ?? null,
    };
  });

  return {
    role: "organizer",
    serverNow: now,
    leaderboard: rankTeams(event.teams, event.tiebreaker, event.finaleOpen),
    event: {
      id: event.id,
      name: event.name,
      status: event.status,
      durationMinutes: event.durationMinutes,
      remainingMs: clock.remainingMs,
      elapsedMs: clock.elapsedMs,
      serverNow: now,
      startedAt: event.startedAt,
      finaleOpen: event.finaleOpen,
      finaleAnswer: event.finaleAnswer,
      finalePrompt: event.finalePrompt,
      finaleHint: event.finaleHint,
      secretText: event.secretText,
      resultsPublished: event.resultsPublished,
      tiebreaker: event.tiebreaker,
      lobbyToken: event.lobbyToken,
      padCode: event.padCode,
      scoring: event.scoring,
      rooms: event.rooms,
      stations,
      teams: event.teams.map((team) => ({
        id: team.id,
        name: team.name,
        joinCode: team.joinCode,
        score: displayScore(team),
        completedCount: team.completions.length + (team.answers ?? []).filter((item) => item.points > 0).length,
        writings: (team.answers ?? [])
          .filter((item) => getQuestion(item.questionId)?.kind === "creative")
          .map((item) => ({ prompt: getQuestion(item.questionId)?.prompt ?? "Tekst", response: item.response })),
        clueCount: team.clues.length,
        finaleSolved: team.finaleSolved,
        finaleAttempts: team.finaleAttempts,
        finalePoints: team.finalePoints,
        lastScoreAt: team.lastScoreAt,
        hintsUsed: team.hintsUsed.length,
        stuck: event.status === "active" && clock.elapsedMs > stuckAfter && team.completions.length === 0,
        pendingPhotos: team.completions
          .filter((completion) => completion.photo)
          .map((completion) => ({
            stationId: completion.stationId,
            stationName: event.stations.find((item) => item.id === completion.stationId)?.name ?? "Station",
            prompt: completion.photo?.prompt ?? "",
            dataUrl: includePhotos ? completion.photo?.dataUrl : undefined,
            creativity: completion.photo?.creativity ?? 0,
            teamwork: completion.photo?.teamwork ?? 0,
            execution: completion.photo?.execution ?? 0,
            status: completion.photo?.status ?? "pending",
            points: completion.points,
          })),
        ledger: ledger(team, event),
      })),
    },
  };
}

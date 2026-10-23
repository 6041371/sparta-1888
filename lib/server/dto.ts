import { EVIDENCE_ITEMS, evidenceProgress, finaleUnlocked } from "@/lib/content/evidence";
import { DOSSIER_PUZZLE_ID, codeIsFourth, requiredEvidenceIds } from "@/lib/content/minigames";
import { assignPlayers, FIELD_PLAYERS } from "@/lib/content/field";
import { FIELD_RETRY_MS, QUIZ_LOCATIONS, getQuestion, publicQuestion, questionsFor } from "@/lib/content/quiz";
import { GAME_SUMMARIES, GAME_TITLES } from "@/lib/copy";
import { displayScore, locationLabel, projectClock, rankTeams, stationVisible, visibleStations } from "@/lib/game/logic";
import { stationHomeRoom } from "@/lib/server/defaults";
import type {
  GameEvent,
  GameType,
  LedgerLine,
  OrganizerSnapshot,
  OrganizerStation,
  PublicStation,
  Team,
  TeamSnapshot,
} from "@/lib/types";
import { getPuzzle, publicPuzzle } from "@/lib/server/puzzles";

const FINALE_LEAK = new Set(["Finale", "Onjuiste verdachte", "Foute eindcode"]);

function gameOrder(game: GameType) {
  if (game === "spot") return 0;
  if (game === "code") return 2;
  return 1;
}

function lockReason(game: GameType, spotDone: boolean, codeOpen: boolean) {
  if (game === "code" && !codeOpen) return "Crack the Code is het vierde spel.";
  if (game !== "spot" && game !== "code" && !spotDone) return "Speel eerst Spot de verdachte.";
  return null;
}

function finaleLeak(team: Team) {
  return (team.finalePoints ?? 0) + (team.adjustments ?? []).reduce((sum, item) => sum + (FINALE_LEAK.has(item.reason) ? item.points : 0), 0);
}

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

function grantedEvidenceIds(granted: string[] | undefined, slots: string[]): string[] {
  if (granted) return granted;
  return slots.map((_, index) => `pending-${index}`);
}

export function toTeamSnapshot(event: GameEvent, team: Team, now: number): TeamSnapshot {
  const clock = projectClock(event, now);
  const board = rankTeams(event.teams, event.tiebreaker, event.finaleOpen);
  const mine = board.find((row) => row.teamId === team.id);
  const openStations = visibleStations(event.stations, event.rooms);
  const secretVisible = event.resultsPublished;
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
    const hosted = event.stations
      .filter((item) => item.roomId === location.id && item.enabled)
      .sort((a, b) => gameOrder(a.game) - gameOrder(b.game) || a.name.localeCompare(b.name));
    const blocking = hosted.filter((item) => item.game !== "code");
    const spotStation = event.stations.find((item) => item.enabled && item.game === "spot" && stationVisible(item, event.rooms)) ?? null;
    const codeStation = event.stations.find((item) => item.enabled && item.game === "code" && stationVisible(item, event.rooms)) ?? null;
    const spotDone = !spotStation || current.completions.some((completion) => completion.stationId === spotStation.id);
    const codeTurn = codeIsFourth(current.completions.map((item) => item.game));
    const here = field || visited.includes(location.id);
    const card = (item: GameEvent["stations"][number]) => ({
      title: GAME_TITLES[item.game],
      summary: GAME_SUMMARIES[item.game],
      done: current.completions.some((completion) => completion.stationId === item.id),
      code: here ? item.code : null,
      locked: lockReason(item.game, spotDone, codeTurn),
    });
    const minigames = hosted.filter((item) => item.game !== "code").map(card);
    if (!field && here && spotStation && !spotDone && !hosted.some((item) => item.id === spotStation.id)) minigames.unshift(card(spotStation));
    if (!field && here && codeStation && codeTurn) {
      const codeCard = card(codeStation);
      if (codeCard.done) minigames.push(codeCard);
      else {
        const spotAt = minigames.findIndex((item) => item.title === GAME_TITLES.spot && !item.done);
        minigames.splice(spotAt >= 0 ? spotAt + 1 : 0, 0, codeCard);
      }
    }
    const pending = minigames.find((item) => !item.done) ?? minigames[0] ?? null;
    const minigameDone = blocking.every((item) => current.completions.some((completion) => completion.stationId === item.id));
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
      minigameTitle: pending?.title ?? null,
      minigameSummary: pending?.summary ?? null,
      minigameDone,
      minigameCode: pending?.code ?? null,
      minigames,
      evidenceIds: grantedEvidenceIds(current.evidenceGrants?.[location.id], assignments[location.id] ?? []),
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
      .map((question) => {
        const solved = solvedIds.has(question.id);
        const previous = answers.find((item) => item.questionId === question.id);
        const field = location.id === "veld";
        return {
          ...publicQuestion(question, solved, field ? solved : closedIds.has(question.id)),
          retryAt: field && previous && !solved ? previous.at + FIELD_RETRY_MS : null,
        };
      });
  });
  const found = new Set(current.collectedEvidenceIds ?? []);
  const progress = evidenceProgress(current.collectedEvidenceIds ?? []);
  const clockOpen = finaleUnlocked(current.collectedEvidenceIds ?? [], clock.remainingMs, event.status);

  return {
    role: "team",
    serverNow: now,
    leaderboard: [],
    team: {
      id: current.id,
      name: current.name,
      joinCode: current.joinCode,
      score: event.resultsPublished ? current.score : current.score - finaleLeak(current),
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
      ledger: event.resultsPublished ? ledger(current, event) : ledger(current, event).filter((line) => !FINALE_LEAK.has(line.label)),
      finaleSolved: event.resultsPublished ? current.finaleSolved : false,
      finaleSubmitted: Boolean(current.finaleSuspect) || current.finaleAttempts > 0 || current.finaleSolved,
      finalePoints: event.resultsPublished ? current.finalePoints : 0,
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
      codeGate: codeGateFor(event, current, found),
    },
  };
}

function codeGateFor(event: GameEvent, team: Team, found: Set<string>) {
  const station = event.stations.find((item) => item.puzzleId === DOSSIER_PUZZLE_ID && item.enabled) ?? null;
  const requiredIds = requiredEvidenceIds(event.evidenceAssignments ?? {}, station ? stationHomeRoom(station.id, station.roomId) : null);
  const unlocked = codeIsFourth(team.completions.map((item) => item.game));
  return {
    requiredIds,
    foundIds: requiredIds.filter((id) => found.has(id)),
    unlocked,
    solved: Boolean(station && team.completions.some((item) => item.stationId === station.id)),
    entryCode: unlocked && station && stationVisible(station, event.rooms) ? station.code : null,
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

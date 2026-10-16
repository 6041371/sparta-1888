import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { BlobNotFoundError, BlobPreconditionFailedError, get, head, put } from "@vercel/blob";
import { PHOTO_PROMPTS } from "@/lib/copy";
import { GameError } from "@/lib/game/errors";
import {
  applyCompletion,
  applyFinale,
  applyHint,
  displayScore,
  locationLabel,
  normCode,
  playBlockReason,
  projectClock,
  rankTeams,
  scoreMemory,
  scoreReaction,
  stationVisible,
  suggestedPhotoPoints,
  visibleStations,
  withScore,
} from "@/lib/game/logic";
import type {
  Completion,
  GameEvent,
  ReactionRound,
  Room,
  ScoringConfig,
  Session,
  Station,
  Team,
  TieBreaker,
} from "@/lib/types";
import { DEFAULT_FINALE, DEFAULT_SCORING, ROOM_TEMPLATES, STATION_TEMPLATES } from "@/lib/server/defaults";
import { codeFeedback, getPuzzle, PUZZLES } from "@/lib/server/puzzles";

interface Database {
  version: 1;
  events: Record<string, GameEvent>;
  sessions: Record<string, Session>;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SESSION_MS = 16 * 60 * 60 * 1000;

export interface CreateEventInput {
  name: string;
  accessCode: string;
  durationMinutes?: number;
  teamCount?: number;
  teamNames?: string[];
  now?: number;
}

function emptyDb(): Database {
  return { version: 1, events: {}, sessions: {} };
}

function makeToken(bytes = 24): string {
  return randomBytes(bytes).toString("hex");
}

function makeCode(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function hashAccess(code: string, salt = randomBytes(16).toString("hex")) {
  return { hash: scryptSync(code, salt, 32).toString("hex"), salt };
}

function verifyAccess(code: string, hash: string, salt: string): boolean {
  const next = scryptSync(code, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export function cleanText(value: unknown, max: number, label = "Dit veld"): string {
  if (typeof value !== "string") throw new GameError(`${label} is ongeldig.`);
  const text = value.replace(/[\u0000-\u001F]/g, "").trim();
  if (!text) throw new GameError(`${label} is verplicht.`);
  if (text.length > max) throw new GameError(`${label} is te lang.`);
  return text;
}

function cleanOptional(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F]/g, "").trim().slice(0, max);
}

function asInt(value: unknown, min: number, max: number, label: string): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new GameError(`${label} moet tussen ${min} en ${max} liggen.`);
  }
  return number;
}

function promptFor(team: Team, station: Station): string {
  if (station.photoPrompt) return station.photoPrompt;
  if (team.photoPrompts[station.id]) return team.photoPrompts[station.id];
  const index = Math.abs(hashString(team.id + station.id)) % PHOTO_PROMPTS.length;
  return PHOTO_PROMPTS[index];
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return hash;
}

function blankTeam(name: string, joinCode: string, now: number): Team {
  return {
    id: `team_${makeCode(6).toLowerCase()}`,
    name,
    joinCode,
    score: 0,
    completions: [],
    clues: [],
    hintsUsed: [],
    adjustments: [],
    finaleSolved: false,
    finalePoints: 0,
    finaleAttempts: 0,
    finaleSolvedAt: null,
    lastScoreAt: null,
    photoPrompts: {},
    createdAt: now,
  };
}

const BLOB_PATH = "sparta/store.json";

interface LoadedDatabase {
  db: Database;
  etag: string | null;
}

export function createStore(filePath?: string) {
  const resolvedPath = filePath ?? path.join(process.cwd(), "data", "store.json");
  const useBlob = !filePath && process.env.VERCEL === "1" && Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  let chain: Promise<unknown> = Promise.resolve();

  function lock<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(fn, fn);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function parseDb(raw: string): Database {
    const parsed = JSON.parse(raw) as Database;
    if (!parsed.events || !parsed.sessions) return emptyDb();
    return parsed;
  }

  async function read(): Promise<LoadedDatabase> {
    if (useBlob) {
      let etag: string | null = null;
      try {
        const meta = await head(BLOB_PATH);
        etag = meta.etag.replace(/^W\//, "").replaceAll('"', "") || null;
      } catch (error) {
        if (!(error instanceof BlobNotFoundError)) throw error;
      }
      const result = await get(BLOB_PATH, { access: "private", useCache: false });
      if (!result || result.statusCode !== 200 || !result.stream) return { db: emptyDb(), etag: null };
      const raw = await new Response(result.stream).text();
      return { db: parseDb(raw), etag };
    }
    try {
      const raw = await readFile(resolvedPath, "utf8");
      return { db: parseDb(raw), etag: null };
    } catch {
      return { db: emptyDb(), etag: null };
    }
  }

  async function write(db: Database, etag: string | null): Promise<void> {
    if (useBlob) {
      await put(BLOB_PATH, JSON.stringify(db), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 0,
        contentType: "application/json",
        ...(etag ? { ifMatch: etag } : {}),
      });
      return;
    }
    await mkdir(path.dirname(resolvedPath), { recursive: true });
    const tmp = `${resolvedPath}.tmp`;
    await writeFile(tmp, JSON.stringify(db), "utf8");
    await writeFile(resolvedPath, JSON.stringify(db), "utf8");
    await writeFile(tmp, "", "utf8").catch(() => undefined);
  }

  async function commit<T>(fn: (db: Database) => Promise<T> | T): Promise<T> {
    return lock(async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const loaded = await read();
        const result = await fn(loaded.db);
        try {
          await write(loaded.db, attempt === 4 ? null : loaded.etag);
          return result;
        } catch (error) {
          if (error instanceof BlobPreconditionFailedError && attempt < 4) continue;
          throw error;
        }
      }
      throw new GameError("De server was even bezig. Probeer het nog eens.");
    });
  }

  function freshCode(existing: Set<string>, length = 6): string {
    for (let i = 0; i < 20; i += 1) {
      const code = makeCode(length);
      if (!existing.has(code)) {
        existing.add(code);
        return code;
      }
    }
    throw new GameError("Er kon geen unieke code worden gemaakt.");
  }

  function requireRole(db: Database, token: string | null, role: Session["role"], now: number) {
    if (!token) throw new GameError("Je bent niet aangemeld.", 401);
    const session = db.sessions[token];
    if (!session || session.expiresAt <= now) throw new GameError("Je sessie is verlopen. Meld je opnieuw aan.", 401);
    if (session.role !== role) throw new GameError("Je hebt geen toegang tot dit onderdeel.", 403);
    const event = db.events[session.eventId];
    if (!event) throw new GameError("Dit evenement bestaat niet meer.", 404);
    const team = session.teamId ? event.teams.find((item) => item.id === session.teamId) ?? null : null;
    if (role === "team" && !team) throw new GameError("Dit team bestaat niet meer.", 404);
    return { session, event, team };
  }

  function issue(db: Database, role: Session["role"], eventId: string, teamId: string | null, now: number) {
    const token = makeToken();
    db.sessions[token] = { token, role, eventId, teamId, expiresAt: now + SESSION_MS };
    return token;
  }

  return {
    async createEvent(input: CreateEventInput) {
      return commit(async (db) => {
        const now = input.now ?? Date.now();
        const name = cleanText(input.name, 80, "De evenementnaam");
        if (typeof input.accessCode !== "string" || input.accessCode.trim().length < 6) {
          throw new GameError("Kies een toegangscode van minstens 6 tekens.");
        }
        const durationMinutes = asInt(input.durationMinutes ?? 90, 10, 180, "De speelduur");
        const names = Array.isArray(input.teamNames) ? input.teamNames : [];
        const teamCount = asInt(input.teamCount ?? (names.length || 4), 1, 24, "Het aantal teams");
        const usedJoins = new Set<string>();
        for (const event of Object.values(db.events)) {
          for (const team of event.teams) usedJoins.add(team.joinCode);
        }
        const usedStations = new Set<string>();
        const access = hashAccess(input.accessCode.trim());
        const labels = Array.from({ length: teamCount }, (_, index) => cleanOptional(names[index] ?? "", 40) || `Team ${index + 1}`);
        const seen = new Set<string>();
        for (const label of labels) {
          const key = label.toLowerCase();
          if (seen.has(key)) throw new GameError("Teamnamen moeten van elkaar verschillen.");
          seen.add(key);
        }
        const event: GameEvent = {
          id: `evt_${makeCode(4).toLowerCase()}`,
          name,
          status: "draft",
          durationMinutes,
          startedAt: null,
          pausedAt: null,
          pausedTotalMs: 0,
          endedAt: null,
          finaleOpen: false,
          finaleAnswer: DEFAULT_FINALE.answer,
          finalePrompt: DEFAULT_FINALE.prompt,
          finaleHint: DEFAULT_FINALE.hint,
          secretText: DEFAULT_FINALE.secret,
          resultsPublished: false,
          tiebreaker: "finale_then_time",
          scoring: { ...DEFAULT_SCORING },
          rooms: ROOM_TEMPLATES.map((room) => ({ ...room })),
          stations: STATION_TEMPLATES.map((station) => ({ ...station, code: freshCode(usedStations) })),
          teams: labels.map((label) => blankTeam(label, freshCode(usedJoins), now)),
          accessHash: access.hash,
          accessSalt: access.salt,
          createdAt: now,
        };
        db.events[event.id] = event;
        const token = issue(db, "organizer", event.id, null, now);
        return { event, token };
      });
    },

    async loginOrganizer(eventId: string, accessCode: string, now = Date.now()) {
      return commit(async (db) => {
        const event = db.events[eventId];
        if (!event || typeof accessCode !== "string" || !verifyAccess(accessCode.trim(), event.accessHash, event.accessSalt)) {
          throw new GameError("Evenement of toegangscode klopt niet.", 401);
        }
        const token = issue(db, "organizer", event.id, null, now);
        return { event, token };
      });
    },

    async loginTeam(joinCode: string, now = Date.now()) {
      return commit(async (db) => {
        const code = cleanText(joinCode, 12, "De teamcode").toUpperCase();
        for (const event of Object.values(db.events)) {
          const team = event.teams.find((item) => item.joinCode === code);
          if (!team) continue;
          const token = issue(db, "team", event.id, team.id, now);
          return { event, team, token };
        }
        throw new GameError("Deze teamcode hoort bij geen enkel team.", 401);
      });
    },

    async logout(token: string | null) {
      return commit(async (db) => {
        if (!token) return;
        delete db.sessions[token];
      });
    },

    async organizerContext(token: string | null, now = Date.now()) {
      return lock(async () => {
        const { db } = await read();
        return requireRole(db, token, "organizer", now);
      });
    },

    async teamContext(token: string | null, now = Date.now()) {
      return lock(async () => {
        const { db } = await read();
        const found = requireRole(db, token, "team", now);
        return { event: found.event, team: found.team as Team, session: found.session };
      });
    },

    async mutateOrganizer<T>(
      token: string | null,
      fn: (event: GameEvent, now: number, sessions: Record<string, Session>) => T | Promise<T>,
      now = Date.now(),
    ) {
      return commit(async (db) => {
        const { event } = requireRole(db, token, "organizer", now);
        return fn(event, now, db.sessions);
      });
    },

    async mutateTeam<T>(
      token: string | null,
      fn: (event: GameEvent, team: Team, now: number) => T | Promise<T>,
      now = Date.now(),
    ) {
      return commit(async (db) => {
        const found = requireRole(db, token, "team", now);
        const team = eventTeam(found.event, found.session.teamId as string);
        return fn(found.event, team, now);
      });
    },
  };
}

function eventTeam(event: GameEvent, teamId: string): Team {
  const team = event.teams.find((item) => item.id === teamId);
  if (!team) throw new GameError("Dit team bestaat niet meer.", 404);
  return team;
}

export const store = createStore();

export function updateSettings(event: GameEvent, patch: Record<string, unknown>) {
  if (patch.name !== undefined) event.name = cleanText(patch.name, 80, "De evenementnaam");
  if (patch.durationMinutes !== undefined) {
    event.durationMinutes = asInt(patch.durationMinutes, 10, 180, "De speelduur");
  }
  if (patch.tiebreaker !== undefined) {
    if (patch.tiebreaker !== "finale_then_time" && patch.tiebreaker !== "time_then_finale") {
      throw new GameError("Kies een geldige tiebreak.");
    }
    event.tiebreaker = patch.tiebreaker as TieBreaker;
  }
  if (patch.finaleAnswer !== undefined) {
    const answer = normCode(cleanText(patch.finaleAnswer, 40, "De eindcode"));
    if (answer.length < 3) throw new GameError("De eindcode moet minstens 3 tekens hebben.");
    event.finaleAnswer = answer;
  }
  if (patch.finalePrompt !== undefined) event.finalePrompt = cleanText(patch.finalePrompt, 400, "De finale-uitleg");
  if (patch.finaleHint !== undefined) event.finaleHint = cleanOptional(patch.finaleHint, 400);
  if (patch.secretText !== undefined) event.secretText = cleanText(patch.secretText, 1200, "Het geheim");
  if (patch.scoring && typeof patch.scoring === "object") {
    const scoring = patch.scoring as Partial<ScoringConfig>;
    const next = { ...event.scoring };
    const fields: (keyof ScoringConfig)[] = [
      "reactionMax",
      "memoryMax",
      "codePoints",
      "photoMax",
      "finalePoints",
      "hintCost",
      "maxHints",
      "memoryAttemptPenalty",
      "memoryTimePenalty",
      "wrongFinalePenalty",
    ];
    for (const field of fields) {
      if (scoring[field] !== undefined) next[field] = asInt(scoring[field], 0, 1000, "Een score-instelling");
    }
    if (next.hintCost < 0) throw new GameError("Hintkosten kunnen niet negatief zijn.");
    event.scoring = next;
  }
}

export function updateRooms(event: GameEvent, rooms: unknown) {
  if (!Array.isArray(rooms)) throw new GameError("De ruimtes zijn ongeldig.");
  for (const item of rooms) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: string; available?: boolean };
    const room = event.rooms.find((candidate) => candidate.id === row.id);
    if (!room || typeof row.available !== "boolean") continue;
    room.available = row.available;
  }
}

export function saveStation(event: GameEvent, input: Record<string, unknown>) {
  const id = cleanText(input.id, 40, "Het station");
  const station = event.stations.find((item) => item.id === id);
  if (!station) throw new GameError("Dit station bestaat niet.", 404);
  applyStationFields(event, station, input);
}

export function addStation(event: GameEvent, input: Record<string, unknown>) {
  if (event.stations.length >= 20) throw new GameError("Er passen maximaal 20 stations in dit evenement.");
  const station: Station = {
    id: `st_${makeCode(4).toLowerCase()}`,
    code: uniqueStationCode(event),
    name: "Nieuw station",
    roomId: event.rooms[0]?.id ?? "bestuurskamer",
    alternativeLocation: "",
    game: "reaction",
    puzzleId: null,
    clueTitle: "Nieuwe aanwijzing",
    clueText: "Pas deze aanwijzing aan voordat het spel start.",
    enabled: true,
    pointsMax: event.scoring.reactionMax,
    photoPrompt: null,
  };
  applyStationFields(event, station, input);
  event.stations.push(station);
  return station;
}

export function deleteStation(event: GameEvent, stationId: string, confirm: unknown) {
  if (confirm !== "VERWIJDER") throw new GameError("Typ VERWIJDER om het station te verwijderen.");
  const station = event.stations.find((item) => item.id === stationId);
  if (!station) throw new GameError("Dit station bestaat niet.", 404);
  event.stations = event.stations.filter((item) => item.id !== stationId);
  for (const team of event.teams) {
    team.completions = team.completions.filter((item) => item.stationId !== stationId);
    team.clues = team.clues.filter((item) => item.stationId !== stationId);
    team.hintsUsed = team.hintsUsed.filter((item) => item.key !== stationId);
    delete team.photoPrompts[stationId];
    const scored = withScore(team);
    team.score = scored.score;
  }
}

export function addTeam(event: GameEvent, name: unknown, now: number) {
  if (event.teams.length >= 24) throw new GameError("Er passen maximaal 24 teams in dit evenement.");
  const label = cleanText(name, 40, "De teamnaam");
  ensureUniqueName(event, label);
  const used = new Set(event.teams.map((team) => team.joinCode));
  for (let i = 0; i < 20; i += 1) {
    const code = makeCode(6);
    if (used.has(code)) continue;
    const team = blankTeam(label, code, now);
    event.teams.push(team);
    return team;
  }
  throw new GameError("Er kon geen teamcode worden gemaakt.");
}

export function renameTeam(event: GameEvent, teamId: string, name: unknown) {
  const team = eventTeam(event, teamId);
  const label = cleanText(name, 40, "De teamnaam");
  ensureUniqueName(event, label, team.id);
  team.name = label;
}

export function deleteTeam(event: GameEvent, teamId: string, confirm: unknown, dbSessions?: Record<string, Session>) {
  const team = eventTeam(event, teamId);
  if (confirm !== team.name) throw new GameError("Typ de teamnaam om het team te verwijderen.");
  if (event.teams.length <= 1 && event.status !== "draft") {
    throw new GameError("Laat minstens één team over zolang het spel loopt.");
  }
  event.teams = event.teams.filter((item) => item.id !== teamId);
  if (dbSessions) {
    for (const [token, session] of Object.entries(dbSessions)) {
      if (session.teamId === teamId) delete dbSessions[token];
    }
  }
}

export function adjustScore(event: GameEvent, teamId: string, points: unknown, reason: unknown, now: number) {
  const team = eventTeam(event, teamId);
  const delta = asInt(points, -500, 500, "De correctie");
  const label = cleanText(reason, 120, "De reden");
  team.adjustments.push({ points: delta, reason: label, at: now });
  const next = withScore(team, delta > 0 ? now : null);
  team.score = next.score;
  team.lastScoreAt = next.lastScoreAt;
}

export function clearCompletion(event: GameEvent, teamId: string, stationId: string, confirm: unknown) {
  if (confirm !== "OPNIEUW") throw new GameError("Typ OPNIEUW om de score van dit station vrij te geven.");
  const team = eventTeam(event, teamId);
  if (!team.completions.some((item) => item.stationId === stationId)) {
    throw new GameError("Dit station is voor dit team nog niet voltooid.");
  }
  team.completions = team.completions.filter((item) => item.stationId !== stationId);
  team.clues = team.clues.filter((item) => item.stationId !== stationId);
  const next = withScore(team);
  team.score = next.score;
}

export function setStatus(event: GameEvent, action: string, confirm: unknown, now: number) {
  if (action === "start") {
    if (event.status === "live") throw new GameError("Het evenement is al gestart.");
    if (event.status === "ended") throw new GameError("Zet het evenement eerst terug naar een nieuwe sessie.");
    if (event.teams.length < 1) throw new GameError("Voeg minstens één team toe.");
    if (visibleStations(event.stations, event.rooms).length < 1) {
      throw new GameError("Zet minstens één ruimte of alternatief station open.");
    }
    event.status = "live";
    event.startedAt = now;
    event.pausedAt = null;
    event.pausedTotalMs = 0;
    event.endedAt = null;
    event.resultsPublished = false;
    return;
  }
  if (action === "pause") {
    if (event.status !== "live") throw new GameError("Alleen een lopend spel kan worden gepauzeerd.");
    event.status = "paused";
    event.pausedAt = now;
    return;
  }
  if (action === "resume") {
    if (event.status !== "paused" || event.pausedAt == null) throw new GameError("Het spel staat niet op pauze.");
    event.pausedTotalMs += now - event.pausedAt;
    event.pausedAt = null;
    event.status = "live";
    return;
  }
  if (action === "end") {
    if (event.status === "draft") throw new GameError("Het evenement is nog niet gestart.");
    if (event.status === "paused" && event.pausedAt) {
      event.pausedTotalMs += now - event.pausedAt;
      event.pausedAt = null;
    }
    event.status = "ended";
    event.endedAt = now;
    event.resultsPublished = true;
    return;
  }
  if (action === "open-finale") {
    if (event.status === "draft") throw new GameError("Start het evenement voordat je de finale opent.");
    event.finaleOpen = true;
    return;
  }
  if (action === "close-finale") {
    event.finaleOpen = false;
    return;
  }
  if (action === "reset") {
    if (confirm !== "RESET") throw new GameError("Typ RESET om de speelsessie leeg te maken.");
    event.status = "draft";
    event.startedAt = null;
    event.pausedAt = null;
    event.pausedTotalMs = 0;
    event.endedAt = null;
    event.finaleOpen = false;
    event.resultsPublished = false;
    for (const team of event.teams) {
      team.completions = [];
      team.clues = [];
      team.hintsUsed = [];
      team.adjustments = [];
      team.finaleSolved = false;
      team.finalePoints = 0;
      team.finaleAttempts = 0;
      team.finaleSolvedAt = null;
      team.lastScoreAt = null;
      team.photoPrompts = {};
      team.score = 0;
    }
    return;
  }
  throw new GameError("Onbekende actie.");
}

export function enterStation(event: GameEvent, team: Team, code: string, now: number) {
  const station = findLoose(event, code);
  if (station.game === "photo") {
    team.photoPrompts[station.id] = promptFor(team, station);
  }
  const completion = team.completions.find((item) => item.stationId === station.id) ?? null;
  return {
    station,
    locationLabel: locationLabel(station, event.rooms),
    completion,
    playable: playBlockReason(event, now) === null && !completion,
    blockReason: completion ? "Dit station is al voltooid. Jullie kunnen oefenen, maar er zijn geen extra punten." : playBlockReason(event, now),
    photoPrompt: station.game === "photo" ? team.photoPrompts[station.id] : null,
    hintUsed: team.hintsUsed.some((item) => item.key === station.id),
    clock: projectClock(event, now),
  };
}

export function submitReaction(event: GameEvent, team: Team, code: string, rounds: ReactionRound[], now: number) {
  const block = playBlockReason(event, now);
  if (block) throw new GameError(block, 403);
  const station = findLoose(event, code);
  assertGame(station, "reaction");
  const existing = team.completions.find((item) => item.stationId === station.id);
  if (existing) {
    return {
      alreadyCompleted: true,
      points: existing.points,
      awarded: 0,
      breakdown: existing.breakdown,
      clue: { title: station.clueTitle, text: station.clueText },
      score: team.score,
    };
  }
  const scored = scoreReaction(rounds, station.pointsMax);
  return award(event, team, station, scored.points, scored.breakdown, now, null);
}

export function submitMemory(
  event: GameEvent,
  team: Team,
  code: string,
  input: { matches: number; attempts: number; elapsedMs: number },
  now: number,
) {
  const block = playBlockReason(event, now);
  if (block) throw new GameError(block, 403);
  const station = findLoose(event, code);
  assertGame(station, "memory");
  const existing = team.completions.find((item) => item.stationId === station.id);
  if (existing) {
    return {
      alreadyCompleted: true,
      points: existing.points,
      awarded: 0,
      breakdown: existing.breakdown,
      clue: { title: station.clueTitle, text: station.clueText },
      score: team.score,
    };
  }
  const scored = scoreMemory(input, station.pointsMax, event.scoring);
  return award(event, team, station, scored.points, scored.breakdown, now, null);
}

export function submitCode(event: GameEvent, team: Team, code: string, answer: unknown, now: number) {
  const block = playBlockReason(event, now);
  if (block) throw new GameError(block, 403);
  const station = findLoose(event, code);
  assertGame(station, "code");
  const existing = team.completions.find((item) => item.stationId === station.id);
  if (existing) {
    return {
      correct: true,
      alreadyCompleted: true,
      points: existing.points,
      awarded: 0,
      breakdown: existing.breakdown,
      clue: { title: station.clueTitle, text: station.clueText },
      score: team.score,
      feedback: "Deze puzzel is al opgelost.",
    };
  }
  const puzzle = getPuzzle(station.puzzleId);
  const given = typeof answer === "string" ? answer : "";
  if (normCode(given) !== normCode(puzzle.answer)) {
    return {
      correct: false,
      alreadyCompleted: false,
      points: 0,
      awarded: 0,
      breakdown: "",
      clue: null,
      score: team.score,
      feedback: codeFeedback(given, puzzle.answer),
    };
  }
  const result = award(event, team, station, station.pointsMax, "Puzzel opgelost.", now, null);
  return { ...result, correct: true, feedback: "Goed opgelost." };
}

export function takeHint(event: GameEvent, team: Team, code: string, now: number) {
  const key = code === "finale" ? "finale" : findLoose(event, code).id;
  let hint = "";
  if (code === "finale") {
    if (!event.finaleHint.trim()) throw new GameError("Er is geen finalehint ingesteld.");
    hint = event.finaleHint;
  } else {
    const station = event.stations.find((item) => item.id === key);
    if (!station || station.game !== "code") throw new GameError("Voor deze opdracht is geen hint beschikbaar.");
    hint = getPuzzle(station.puzzleId).hint;
  }
  const applied = applyHint(team, {
    key,
    cost: event.scoring.hintCost,
    maxHints: event.scoring.maxHints,
    now,
  });
  event.teams = event.teams.map((item) => (item.id === team.id ? applied.team : item));
  return {
    hint,
    already: applied.already,
    costCharged: applied.already ? 0 : event.scoring.hintCost,
    score: applied.team.score,
    hintsLeft: Math.max(0, event.scoring.maxHints - applied.team.hintsUsed.length),
  };
}

export function submitPhoto(event: GameEvent, team: Team, code: string, dataUrl: unknown, now: number) {
  const block = playBlockReason(event, now);
  if (block) throw new GameError(block, 403);
  const station = findLoose(event, code);
  assertGame(station, "photo");
  if (typeof dataUrl !== "string" || !/^data:image\/(jpeg|png);base64,/.test(dataUrl)) {
    throw new GameError("Kies een JPEG- of PNG-foto.");
  }
  if (dataUrl.length > 900_000) throw new GameError("De foto is te groot. Maak hem opnieuw, iets dichter bij het team.");
  const existing = team.completions.find((item) => item.stationId === station.id);
  if (existing) {
    return {
      alreadyCompleted: true,
      pending: existing.photo?.status === "pending",
      points: existing.points,
      awarded: 0,
      score: team.score,
      clue: { title: station.clueTitle, text: station.clueText },
    };
  }
  const prompt = promptFor(team, station);
  team.photoPrompts[station.id] = prompt;
  const result = award(event, team, station, 0, "Foto ingestuurd. Punten volgen na beoordeling.", now, {
    dataUrl,
    prompt,
    status: "pending",
    creativity: 0,
    teamwork: 0,
    execution: 0,
  });
  return { ...result, pending: true };
}

export function reviewPhoto(
  event: GameEvent,
  input: {
    teamId: string;
    stationId: string;
    creativity: number;
    teamwork: number;
    execution: number;
    points: number;
  },
  now: number,
) {
  const team = eventTeam(event, input.teamId);
  const station = event.stations.find((item) => item.id === input.stationId);
  if (!station) throw new GameError("Dit station bestaat niet.", 404);
  const completion = team.completions.find((item) => item.stationId === station.id);
  if (!completion?.photo) throw new GameError("Er staat nog geen foto klaar voor dit team.");
  const creativity = asInt(input.creativity, 0, 10, "Creativiteit");
  const teamwork = asInt(input.teamwork, 0, 10, "Samenwerking");
  const execution = asInt(input.execution, 0, 10, "Uitvoering");
  const points = asInt(input.points, 0, station.pointsMax, "De fotopunten");
  completion.photo = { ...completion.photo, status: "reviewed", creativity, teamwork, execution };
  completion.points = points;
  completion.breakdown = `Creativiteit ${creativity}, samenwerking ${teamwork}, uitvoering ${execution}.`;
  const next = withScore(team, now);
  team.score = next.score;
  team.lastScoreAt = next.lastScoreAt;
  return { points, score: team.score, suggestion: suggestedPhotoPoints(creativity, teamwork, execution, station.pointsMax) };
}

export function retakePhoto(event: GameEvent, teamId: string, stationId: string) {
  const team = eventTeam(event, teamId);
  if (!team.completions.some((item) => item.stationId === stationId && item.photo)) {
    throw new GameError("Er is geen foto om terug te sturen.");
  }
  team.completions = team.completions.filter((item) => item.stationId !== stationId);
  team.clues = team.clues.filter((item) => item.stationId !== stationId);
  const next = withScore(team);
  team.score = next.score;
}

export function submitFinale(event: GameEvent, team: Team, answer: unknown, now: number) {
  const result = applyFinale(team, event, typeof answer === "string" ? answer : "", event.scoring, now);
  event.teams = event.teams.map((item) => (item.id === team.id ? result.team : item));
  const secret = result.correct && (result.team.finaleSolved || event.resultsPublished) ? event.secretText : null;
  return {
    correct: result.correct,
    already: result.already,
    feedback: result.feedback,
    score: result.team.score,
    finalePoints: result.already ? 0 : result.correct ? event.scoring.finalePoints : 0,
    secret,
  };
}

function ensureUniqueName(event: GameEvent, name: string, ignoreId?: string) {
  const exists = event.teams.some((team) => team.id !== ignoreId && team.name.toLowerCase() === name.toLowerCase());
  if (exists) throw new GameError("Er is al een team met deze naam.");
}

function uniqueStationCode(event: GameEvent): string {
  const used = new Set(event.stations.map((station) => station.code));
  for (let i = 0; i < 20; i += 1) {
    const code = makeCode(6);
    if (!used.has(code)) return code;
  }
  throw new GameError("Er kon geen stationcode worden gemaakt.");
}

function applyStationFields(event: GameEvent, station: Station, input: Record<string, unknown>) {
  if (input.name !== undefined) station.name = cleanText(input.name, 60, "De stationsnaam");
  if (input.roomId !== undefined) {
    const roomId = cleanText(input.roomId, 40, "De ruimte");
    if (!event.rooms.some((room) => room.id === roomId)) throw new GameError("Kies een bestaande ruimte.");
    station.roomId = roomId;
  }
  if (input.alternativeLocation !== undefined) station.alternativeLocation = cleanOptional(input.alternativeLocation, 80);
  if (input.game !== undefined) {
    if (input.game !== "reaction" && input.game !== "memory" && input.game !== "code" && input.game !== "photo") {
      throw new GameError("Kies een geldige minigame.");
    }
    station.game = input.game;
  }
  if (input.puzzleId !== undefined) {
    const puzzleId = cleanOptional(input.puzzleId, 40);
    if (puzzleId && !PUZZLES.some((puzzle) => puzzle.id === puzzleId)) throw new GameError("Deze puzzel bestaat niet.");
    station.puzzleId = puzzleId || null;
  }
  if (station.game === "code" && !station.puzzleId) station.puzzleId = PUZZLES[0].id;
  if (station.game !== "code") station.puzzleId = null;
  if (input.clueTitle !== undefined) station.clueTitle = cleanText(input.clueTitle, 60, "De titel van de aanwijzing");
  if (input.clueText !== undefined) station.clueText = cleanText(input.clueText, 500, "De aanwijzing");
  if (input.enabled !== undefined) station.enabled = Boolean(input.enabled);
  if (input.pointsMax !== undefined) station.pointsMax = asInt(input.pointsMax, 0, 1000, "Het puntenmaximum");
  if (input.photoPrompt !== undefined) {
    const prompt = cleanOptional(input.photoPrompt, 300);
    station.photoPrompt = prompt || null;
  }
}

function findLoose(event: GameEvent, code: string): Station {
  const station = event.stations.find((item) => item.code.toUpperCase() === String(code).trim().toUpperCase());
  if (!station) throw new GameError("Deze stationcode hoort niet bij jullie evenement.", 404);
  if (!stationVisible(station, event.rooms)) {
    throw new GameError("Dit station is niet beschikbaar. Kies een open ruimte op de kaart.", 403);
  }
  return station;
}

function assertGame(station: Station, game: Station["game"]) {
  if (station.game !== game) throw new GameError("Dit station hoort bij een andere opdracht.", 400);
}

function award(
  event: GameEvent,
  team: Team,
  station: Station,
  points: number,
  breakdown: string,
  now: number,
  photo: Completion["photo"],
) {
  const completion: Completion = {
    stationId: station.id,
    game: station.game,
    points,
    completedAt: now,
    breakdown,
    clueTitle: station.clueTitle,
    clueText: station.clueText,
    photo,
  };
  const result = applyCompletion(team, completion, now);
  event.teams = event.teams.map((item) => (item.id === team.id ? result.team : item));
  const stored = result.team.completions.find((item) => item.stationId === station.id);
  return {
    alreadyCompleted: result.alreadyCompleted,
    points: stored?.points ?? points,
    awarded: result.alreadyCompleted ? 0 : points,
    breakdown: stored?.breakdown ?? breakdown,
    clue: { title: station.clueTitle, text: station.clueText },
    score: result.team.score,
  };
}

export function leaderboardOf(event: GameEvent) {
  return rankTeams(event.teams, event.tiebreaker, event.finaleOpen);
}

export function clockOf(event: GameEvent, now: number) {
  return projectClock(event, now);
}

export function visibleRoomStations(event: GameEvent) {
  return visibleStations(event.stations, event.rooms);
}

export function displayOf(team: Team) {
  return displayScore(team);
}

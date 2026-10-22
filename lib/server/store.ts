import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { BlobNotFoundError, BlobPreconditionFailedError, get, head, put } from "@vercel/blob";
import { PHOTO_PROMPTS } from "@/lib/copy";
import { GameError } from "@/lib/game/errors";
import {
  applyAccusation,
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
import { EVIDENCE_ITEMS, distributeEvidence, finaleUnlocked, grantByCompletion } from "@/lib/content/evidence";
import { DOSSIER_PUZZLE_ID, DOSSIER_TEXT, dossierUnlocked, requiredEvidenceIds, scorePenalty, scoreSpot, scoreVar } from "@/lib/content/minigames";
import type { Zone } from "@/lib/content/minigames";
import { assignPlayers } from "@/lib/content/field";
import { FIELD_RETRY_MS, getQuestion, gradeQuiz, officialAnswer, questionsFor, type QuizQuestion } from "@/lib/content/quiz";
import { DEFAULT_FINALE, DEFAULT_SCORING, ROOM_CODES, ROOM_TEMPLATES, STATION_TEMPLATES, roomIdForEntryCode } from "@/lib/server/defaults";
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
  roomIds?: string[];
  now?: number;
}

function emptyDb(): Database {
  return { version: 1, events: {}, sessions: {} };
}

function reviveEvent(event: GameEvent) {
  const status = String(event.status);
  event.status =
    status === "draft" || status === "lobby"
      ? "lobby"
      : status === "live" || status === "active"
        ? "active"
        : status === "ended" || status === "finished"
          ? "finished"
          : status === "paused"
            ? "paused"
            : "lobby";
  if (!event.lobbyToken) event.lobbyToken = `lobby_${event.id.replace(/^evt_/, "")}${event.accessSalt.slice(0, 8)}`;
  if (!event.padCode) event.padCode = eventPadCode(event);
  for (const template of ROOM_TEMPLATES) {
    const existing = event.rooms.find((room) => room.id === template.id);
    if (!existing) event.rooms.push({ ...template, available: false });
    else existing.name = template.name;
  }
  for (const template of STATION_TEMPLATES) {
    if (event.stations.some((station) => station.id === template.id)) continue;
    event.stations.push({ ...template, code: uniqueStationCode(event) });
  }
  for (const station of event.stations) {
    const template = STATION_TEMPLATES.find((item) => item.id === station.id);
    if (!template) continue;
    station.name = template.name;
    station.game = template.game;
    station.puzzleId = template.puzzleId;
    station.photoPrompt = template.photoPrompt;
    station.clueTitle = "";
    station.clueText = "";
  }
  for (const team of event.teams) {
    team.briefingSeen = Boolean(team.briefingSeen);
    team.finaleExplanation = team.finaleExplanation ?? "";
    team.finaleSuspect = team.finaleSuspect ?? null;
    team.answers = Array.isArray(team.answers) ? team.answers : [];
    team.visitedRooms = Array.isArray(team.visitedRooms) ? team.visitedRooms : [];
    team.collectedEvidenceIds = Array.isArray(team.collectedEvidenceIds) ? team.collectedEvidenceIds : [];
    team.evidenceGrants = team.evidenceGrants && typeof team.evidenceGrants === "object" && !Array.isArray(team.evidenceGrants) ? team.evidenceGrants : {};
    team.fieldSeen = Boolean(team.fieldSeen);
    team.photoPrompts = team.photoPrompts ?? {};
    const seen = new Set<string>();
    team.clues = (team.clues ?? []).filter((clue) => {
      if (seen.has(clue.stationId)) return false;
      seen.add(clue.stationId);
      return true;
    });
  }
  ensureAssignments(event);
  for (const team of event.teams) grantReadyEvidence(event, team);
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

const RESERVED_CODES = new Set(Object.values(ROOM_CODES));

function eventPadCode(event: Pick<GameEvent, "padCode" | "id" | "accessSalt">): string {
  const existing = String(event.padCode ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (existing.length >= 4 && !RESERVED_CODES.has(existing)) return existing;
  let code = "";
  for (const char of `${event.id}${event.accessSalt}`.toUpperCase()) {
    if (ALPHABET.includes(char)) code += char;
    if (code.length === 6) break;
  }
  while (code.length < 6) code += "2";
  if (RESERVED_CODES.has(code)) code = `${code.slice(0, 5)}3`;
  return code;
}

function freshPad(used: Set<string>): string {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const code = makeCode(6);
    if (!used.has(code) && !RESERVED_CODES.has(code)) return code;
  }
  throw new GameError("Er kon geen ruimtecode worden gemaakt.");
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

function availableRoomIds(event: GameEvent): string[] {
  return event.rooms.filter((room) => room.available).map((room) => room.id).sort((a, b) => a.localeCompare(b));
}

function ensureAssignments(event: GameEvent) {
  const key = availableRoomIds(event).join(",");
  if (event.assignmentVersion === 2 && event.assignmentKey === key && event.evidenceAssignments) return;
  event.evidenceAssignments = distributeEvidence(EVIDENCE_ITEMS, availableRoomIds(event));
  event.assignmentKey = key;
  event.assignmentVersion = 2;
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
    finaleSuspect: null,
    finaleExplanation: "",
    lastScoreAt: null,
    photoPrompts: {},
    briefingSeen: false,
    answers: [],
    visitedRooms: [],
    collectedEvidenceIds: [],
    evidenceGrants: {},
    fieldSeen: false,
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
    for (const event of Object.values(parsed.events)) reviveEvent(event);
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
        const requested = input.teamCount == null ? names.length : Number(input.teamCount);
        const teamCount = requested === 0 ? 0 : asInt(requested, 1, 24, "Het aantal teams");
        const usedJoins = new Set<string>();
        const usedPads = new Set<string>();
        for (const event of Object.values(db.events)) {
          for (const team of event.teams) usedJoins.add(team.joinCode);
          usedPads.add(eventPadCode(event));
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
          status: "lobby",
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
          rooms: ROOM_TEMPLATES.map((room) => ({
            ...room,
            available: Array.isArray(input.roomIds) ? input.roomIds.map(String).includes(room.id) : room.available,
          })),
          stations: STATION_TEMPLATES.map((station) => ({ ...station, code: freshCode(usedStations) })),
          teams: labels.map((label) => blankTeam(label, freshCode(usedJoins), now)),
          accessHash: access.hash,
          accessSalt: access.salt,
          lobbyToken: `lobby_${makeCode(12).toLowerCase()}`,
          padCode: freshPad(usedPads),
          evidenceAssignments: {},
          assignmentKey: "",
          assignmentVersion: 1,
          createdAt: now,
        };
        db.events[event.id] = event;
        ensureAssignments(event);
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

    async registerTeam(lobbyToken: string, teamName: string, existingToken: string | null, now = Date.now()) {
      return commit(async (db) => {
        const event = Object.values(db.events).find((item) => item.lobbyToken === lobbyToken);
        if (!event) throw new GameError("Deze lobby bestaat niet. Vraag de instructeur om de juiste link.", 404);
        if (event.status === "finished") throw new GameError("Dit evenement is afgelopen.", 403);
        const name = cleanText(teamName, 40, "De teamnaam");
        const session = existingToken ? db.sessions[existingToken] : undefined;
        if (session && session.eventId === event.id && session.teamId && session.expiresAt > now) {
          const own = event.teams.find((team) => team.id === session.teamId);
          if (own && own.name.toLowerCase() === name.toLowerCase()) {
            session.expiresAt = now + SESSION_MS;
            return { event, team: own, token: existingToken as string };
          }
        }
        if (event.teams.some((team) => team.name.toLowerCase() === name.toLowerCase())) {
          throw new GameError("Deze teamnaam is al aangemeld.", 409);
        }
        const usedJoins = new Set<string>();
        for (const item of Object.values(db.events)) {
          for (const team of item.teams) usedJoins.add(team.joinCode);
        }
        const team = blankTeam(name, freshCode(usedJoins), now);
        event.teams.push(team);
        const token = issue(db, "team", event.id, team.id, now);
        return { event, team, token };
      });
    },

    async lobbyState(lobbyToken: string, teamToken: string | null, now = Date.now()) {
      return lock(async () => {
        const { db } = await read();
        const event = Object.values(db.events).find((item) => item.lobbyToken === lobbyToken);
        if (!event) throw new GameError("Deze lobby bestaat niet. Vraag de instructeur om de juiste link.", 404);
        const session = teamToken ? db.sessions[teamToken] : undefined;
        const linked = session && session.eventId === event.id && session.expiresAt > now
          ? event.teams.find((team) => team.id === session.teamId) ?? null
          : null;
        return {
          eventId: event.id,
          name: event.name,
          status: event.status,
          teamName: linked?.name ?? null,
          briefingSeen: linked?.briefingSeen ?? false,
        };
      });
    },

    async resolveEntry(code: string, teamToken: string | null, now = Date.now()) {
      return lock(async () => {
        const { db } = await read();
        const raw = code.trim();
        const fromUrl = raw.match(/onderzoek\/([^/?#\s]+)/i)?.[1] ?? "";
        const normalized = (fromUrl || raw).toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (normalized.length < 3) throw new GameError("Vul de ruimtecode in.");
        const event = Object.values(db.events).find((item) => {
          const pad = eventPadCode(item);
          const lobby = item.lobbyToken.toUpperCase().replace(/[^A-Z0-9]/g, "");
          return pad === normalized || lobby === normalized;
        });
        if (event) return { href: `/onderzoek/${event.lobbyToken}` };
        const roomId = roomIdForEntryCode(normalized);
        if (!roomId) throw new GameError("Deze ruimtecode klopt niet. Vraag de instructeur om de code op het dashboard.", 404);
        const session = teamToken ? db.sessions[teamToken] : undefined;
        const linked = session && session.expiresAt > now ? db.events[session.eventId] : undefined;
        if (!linked) {
          throw new GameError("Dit is een bordje in Het Kasteel. Vul eerst de ruimtecode van de instructeur in.", 401);
        }
        const room = linked.rooms.find((item) => item.id === roomId);
        if (!room?.available) throw new GameError("Deze ruimte is vandaag niet beschikbaar.", 403);
        return { href: `/ruimte/${roomId}` };
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
  if (event.teams.length <= 1 && event.status !== "lobby") {
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
    if (event.status === "active") return;
    if (event.status === "finished") throw new GameError("Zet het evenement eerst terug naar een nieuwe sessie.");
    if (event.teams.length < 1) throw new GameError("Er is nog geen team aangemeld.");
    if (!event.rooms.some((room) => room.available)) {
      throw new GameError("Zet minstens één ruimte open.");
    }
    event.status = "active";
    event.startedAt = now;
    event.pausedAt = null;
    event.pausedTotalMs = 0;
    event.endedAt = null;
    event.resultsPublished = false;
    event.finaleOpen = false;
    ensureAssignments(event);
    return;
  }
  if (action === "pause") {
    if (event.status !== "active") throw new GameError("Alleen een lopend spel kan worden gepauzeerd.");
    event.status = "paused";
    event.pausedAt = now;
    return;
  }
  if (action === "resume") {
    if (event.status !== "paused" || event.pausedAt == null) throw new GameError("Het spel staat niet op pauze.");
    event.pausedTotalMs += now - event.pausedAt;
    event.pausedAt = null;
    event.status = "active";
    return;
  }
  if (action === "end") {
    if (event.status === "lobby") throw new GameError("Het evenement is nog niet gestart.");
    if (event.status === "paused" && event.pausedAt) {
      event.pausedTotalMs += now - event.pausedAt;
      event.pausedAt = null;
    }
    event.status = "finished";
    event.endedAt = now;
    event.resultsPublished = true;
    return;
  }
  if (action === "open-finale") {
    if (event.status === "lobby") throw new GameError("Start het evenement voordat je de finale opent.");
    event.finaleOpen = true;
    return;
  }
  if (action === "close-finale") {
    event.finaleOpen = false;
    return;
  }
  if (action === "reset") {
    if (confirm !== "RESET") throw new GameError("Typ RESET om de speelsessie leeg te maken.");
    event.status = "lobby";
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
      team.finaleSuspect = null;
      team.finaleExplanation = "";
      team.briefingSeen = false;
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
    blockReason: completion ? "Dit station is al voltooid. Jullie kunnen oefenen." : playBlockReason(event, now),
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
  if (puzzle.id === DOSSIER_PUZZLE_ID) {
    ensureAssignments(event);
    const required = requiredEvidenceIds(event.evidenceAssignments ?? {}, station.roomId);
    if (!dossierUnlocked(required, team.collectedEvidenceIds ?? [])) {
      throw new GameError("Dit dossier is nog vergrendeld. Verzamel eerst de ontbrekende aanwijzingen.");
    }
  }
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
  const result = award(event, team, station, station.pointsMax, puzzle.id === DOSSIER_PUZZLE_ID ? DOSSIER_TEXT : "Puzzel opgelost.", now, null);
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
    if (station.puzzleId === DOSSIER_PUZZLE_ID) {
      ensureAssignments(event);
      const required = requiredEvidenceIds(event.evidenceAssignments ?? {}, station.roomId);
      if (!dossierUnlocked(required, team.collectedEvidenceIds ?? [])) {
        throw new GameError("De hint opent pas als de ontbrekende aanwijzingen binnen zijn.");
      }
    }
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
  const existing = team.completions.find((item) => item.stationId === station.id);
  if (existing) {
    return {
      alreadyCompleted: true,
      points: existing.points,
      awarded: 0,
      breakdown: existing.breakdown,
      clue: { title: station.clueTitle, text: station.clueText },
      score: team.score,
      pending: existing.photo?.status === "pending",
    };
  }
  if (typeof dataUrl !== "string" || !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(dataUrl)) {
    throw new GameError("Kies een foto. Alleen een afbeelding kan worden ingestuurd.");
  }
  if (dataUrl.length > 1_800_000) throw new GameError("De foto is te groot. Maak hem kleiner of kies een andere.");
  const prompt = promptFor(team, station);
  const points = Math.round(station.pointsMax * 0.4);
  const result = award(event, team, station, points, "Foto ingestuurd.", now, {
    dataUrl,
    prompt,
    status: "pending",
    creativity: 0,
    teamwork: 0,
    execution: 0,
  });
  return { ...result, pending: true };
}

export function submitPenalty(event: GameEvent, team: Team, code: string, shots: Zone[], keepers: Zone[], now: number) {
  const block = playBlockReason(event, now);
  if (block) throw new GameError(block, 403);
  const station = findLoose(event, code);
  assertGame(station, "penalty");
  const existing = team.completions.find((item) => item.stationId === station.id);
  if (existing) {
    return { alreadyCompleted: true, points: existing.points, awarded: 0, breakdown: existing.breakdown, clue: null, score: team.score };
  }
  const scored = scorePenalty(shots, keepers, station.pointsMax);
  return award(event, team, station, scored.points, scored.breakdown, now, null);
}

export function submitVar(event: GameEvent, team: Team, code: string, answers: string[], now: number) {
  const block = playBlockReason(event, now);
  if (block) throw new GameError(block, 403);
  const station = findLoose(event, code);
  assertGame(station, "var");
  const existing = team.completions.find((item) => item.stationId === station.id);
  if (existing) {
    return { alreadyCompleted: true, points: existing.points, awarded: 0, breakdown: existing.breakdown, clue: null, score: team.score };
  }
  const scored = scoreVar(answers, station.pointsMax);
  return award(event, team, station, scored.points, scored.breakdown, now, null);
}

export function submitSpot(event: GameEvent, team: Team, code: string, suspectId: string, now: number) {
  const block = playBlockReason(event, now);
  if (block) throw new GameError(block, 403);
  const station = findLoose(event, code);
  assertGame(station, "spot");
  const existing = team.completions.find((item) => item.stationId === station.id);
  if (existing) {
    return {
      alreadyCompleted: true,
      correct: existing.points >= station.pointsMax,
      finished: true,
      points: existing.points,
      awarded: 0,
      breakdown: existing.breakdown,
      feedback: existing.breakdown,
      clue: null,
      score: team.score,
    };
  }
  const scored = scoreSpot(suspectId, station.pointsMax);
  const result = award(event, team, station, scored.points, scored.feedback, now, null);
  return { ...result, correct: scored.correct, finished: true, feedback: scored.feedback };
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

export function markBriefing(team: Team) {
  team.briefingSeen = true;
}

export function enterRoom(event: GameEvent, team: Team, roomId: string, now: number) {
  const room = event.rooms.find((item) => item.id === roomId);
  if (!room) throw new GameError("Deze QR-code hoort niet bij een ruimte in Het Kasteel.", 404);
  if (!room.available) throw new GameError("Deze ruimte is vandaag niet beschikbaar.", 403);
  if (questionsFor(room.id).length > 0) {
    if (!team.visitedRooms.includes(room.id)) team.visitedRooms.push(room.id);
    return { href: `/spel/locatie/${room.id}` };
  }
  const station = event.stations.find((item) => item.roomId === room.id && item.enabled);
  if (!station) throw new GameError("Voor deze ruimte staat vandaag geen opdracht open.", 403);
  return enterStation(event, team, station.code, now);
}

function roomStation(event: GameEvent, roomId: string) {
  return event.stations.find((station) => station.roomId === roomId && station.enabled) ?? null;
}

function roomReady(event: GameEvent, team: Team, roomId: string) {
  const questions = questionsFor(roomId);
  if (questions.length === 0) return false;
  const closed = questions.every((question) => team.answers.some((answer) => answer.questionId === question.id));
  const station = roomStation(event, roomId);
  const played = !station || team.completions.some((item) => item.stationId === station.id);
  return closed && played;
}

function syncEvidence(event: GameEvent, team: Team) {
  ensureAssignments(event);
  grantReadyEvidence(event, team);
}

function roomCompletedAt(event: GameEvent, team: Team, roomId: string) {
  const answerAt = questionsFor(roomId).reduce((max, question) => {
    const answer = team.answers.find((item) => item.questionId === question.id);
    return Math.max(max, answer?.at ?? 0);
  }, 0);
  const station = roomStation(event, roomId);
  const completion = station ? team.completions.find((item) => item.stationId === station.id) : undefined;
  return Math.max(answerAt, completion?.completedAt ?? 0);
}

function grantReadyEvidence(event: GameEvent, team: Team) {
  team.collectedEvidenceIds = team.collectedEvidenceIds ?? [];
  team.evidenceGrants = team.evidenceGrants ?? {};
  const assignments = event.evidenceAssignments ?? {};
  const readyRoomIds = Object.keys(assignments).filter((roomId) => roomReady(event, team, roomId));
  const completedAt = Object.fromEntries(readyRoomIds.map((roomId) => [roomId, roomCompletedAt(event, team, roomId)]));
  const next = grantByCompletion({
    assignments,
    readyRoomIds,
    completedAt,
    collectedEvidenceIds: team.collectedEvidenceIds,
    grants: team.evidenceGrants,
  });
  team.collectedEvidenceIds = next.collectedEvidenceIds;
  team.evidenceGrants = next.grants;
}

function playerUnlocked(event: GameEvent, team: Team, questionId: string) {
  ensureAssignments(event);
  const rooms = availableRoomIds(event);
  const assigned = assignPlayers(rooms);
  return Object.entries(assigned).some(([roomId, players]) => players.includes(questionId) && roomReady(event, team, roomId));
}

export function markField(team: Team) {
  team.fieldSeen = true;
}

function submitFieldQuiz(event: GameEvent, team: Team, question: QuizQuestion, text: string, now: number) {
  const existing = team.answers.find((item) => item.questionId === question.id);
  if (existing && existing.points > 0) {
    return { correct: true, points: 0, already: true, feedback: "Deze vraag is al goed.", solution: "", retryAt: null };
  }
  if (existing && now < existing.at + FIELD_RETRY_MS) {
    return {
      correct: false,
      points: 0,
      already: true,
      feedback: "De tijd is nog niet om.",
      solution: "",
      retryAt: existing.at + FIELD_RETRY_MS,
    };
  }
  const block = playBlockReason(event, now);
  if (block) throw new GameError(block, 403);
  const graded = gradeQuiz(question, text);
  const response = text.slice(0, 2000);
  if (!graded.correct) {
    if (existing) {
      existing.correct = false;
      existing.points = 0;
      existing.at = now;
      existing.response = response;
    } else {
      team.answers.push({ questionId: question.id, correct: false, points: 0, at: now, response });
    }
    return {
      correct: false,
      points: 0,
      already: false,
      feedback: "Dat klopt niet. Over vijf minuten mogen jullie het opnieuw proberen.",
      solution: "",
      retryAt: now + FIELD_RETRY_MS,
    };
  }
  const points = event.scoring.codePoints;
  if (existing) {
    existing.correct = true;
    existing.points = points;
    existing.at = now;
    existing.response = response;
  } else {
    team.answers.push({ questionId: question.id, correct: true, points, at: now, response });
  }
  syncEvidence(event, team);
  const next = withScore(team, now);
  team.score = next.score;
  team.lastScoreAt = next.lastScoreAt;
  return { correct: true, points, already: false, feedback: "Goed.", solution: "", retryAt: null };
}

export function submitQuiz(event: GameEvent, team: Team, questionId: string, response: unknown, now: number) {
  const question = getQuestion(questionId);
  if (!question) throw new GameError("Deze vraag hoort niet bij het spel.", 404);
  if (typeof response !== "string") throw new GameError("Dit antwoord is ongeldig.");
  const text = response.replace(/[\u0000-\u001F]/g, "").trim();
  if (text.length > 2000) throw new GameError("Dit antwoord is te lang.");
  if (question.locationId === "veld") {
    if (!playerUnlocked(event, team, question.id)) throw new GameError("Deze speler komt vrij als de bijbehorende kamer is afgerond.", 403);
  } else {
    const room = event.rooms.find((item) => item.id === question.locationId);
    if (!room?.available) throw new GameError("Deze ruimte is vandaag niet beschikbaar.", 403);
    if (!team.visitedRooms.includes(question.locationId)) throw new GameError("Scan eerst de QR-code van deze ruimte.", 403);
  }
  if (question.locationId === "veld") return submitFieldQuiz(event, team, question, text, now);
  const existing = team.answers.find((item) => item.questionId === question.id);
  if (existing) {
    return {
      correct: existing.points > 0,
      points: 0,
      already: true,
      feedback: existing.points > 0 ? "Deze vraag is al beloond." : "Deze vraag is al gecontroleerd.",
      solution: officialAnswer(question),
      retryAt: null,
    };
  }
  const block = playBlockReason(event, now);
  if (block) throw new GameError(block, 403);
  const graded = gradeQuiz(question, text);
  const solution = officialAnswer(question);
  if (!graded.correct) {
    if (question.kind === "creative") return { correct: false, points: 0, already: false, feedback: graded.feedback, solution: "", retryAt: null };
    team.answers.push({ questionId: question.id, correct: false, points: 0, at: now, response: text.slice(0, 2000) });
    syncEvidence(event, team);
    return { correct: false, points: 0, already: false, feedback: `Dat klopt niet. Het goede antwoord is: ${solution}.`, solution, retryAt: null };
  }
  const points = event.scoring.codePoints;
  team.answers.push({
    questionId: question.id,
    correct: question.kind !== "creative",
    points,
    at: now,
    response: text.slice(0, 2000),
  });
  syncEvidence(event, team);
  const next = withScore(team, now);
  team.score = next.score;
  team.lastScoreAt = next.lastScoreAt;
  const feedback = question.kind === "creative" ? graded.feedback : `Goed. ${solution}`;
  return { correct: true, points, already: false, feedback, solution, retryAt: null };
}

export function submitFinale(
  event: GameEvent,
  team: Team,
  answer: unknown,
  now: number,
  accusation?: { suspectId?: unknown; explanation?: unknown },
) {
  if (accusation && typeof accusation.suspectId === "string") {
    const clock = projectClock(event, now);
    const open = event.finaleOpen || finaleUnlocked(team.collectedEvidenceIds ?? [], clock.remainingMs, event.status);
    if (!open) throw new GameError("De finale opent als alle zeven bewijsstukken binnen zijn, of in de laatste 20 minuten.", 403);
    const result = applyAccusation(
      team,
      { ...event, finaleOpen: true },
      accusation.suspectId,
      typeof accusation.explanation === "string" ? accusation.explanation : "",
      event.scoring,
      now,
    );
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
    if (input.game !== "reaction" && input.game !== "memory" && input.game !== "code" && input.game !== "photo" && input.game !== "penalty" && input.game !== "var" && input.game !== "spot") {
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
  syncEvidence(event, result.team);
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

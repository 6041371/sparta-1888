import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { EVIDENCE_ITEMS } from "@/lib/content/evidence";
import { FIELD_RETRY_MS, questionsFor } from "@/lib/content/quiz";
import { toTeamSnapshot } from "@/lib/server/dto";
import { DEFAULT_ANSWER } from "@/lib/server/defaults";
import { PUZZLES } from "@/lib/server/puzzles";
import { createStore, enterRoom, setStatus, submitCode, submitFinale, submitPenalty, submitPhoto, submitQuiz, submitReaction, submitSpot, submitVar, takeHint } from "@/lib/server/store";
import type { ReactionRound } from "@/lib/types";

function rounds(correct: boolean): ReactionRound[] {
  return Array.from({ length: 12 }, (_, index) => {
    const target = index % 2 === 0;
    const tapped = correct ? target : !target;
    return { target, tapped, reactionMs: tapped ? 300 : null };
  });
}

describe("opslag van een spelevenement", () => {
  it("start een evenement, sluit een ruimte en voorkomt een dubbele score", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sparta-"));
    const store = createStore(path.join(dir, "store.json"));
    const t0 = Date.now();
    const created = await store.createEvent({
      name: "Testspel",
      accessCode: "kasteel-1888",
      teamNames: ["Rood", "Wit"],
      teamCount: 2,
      now: t0,
    });
    const org = created.token;
    const reaction = created.event.stations.find((station) => station.id === "st-bestuur");
    const spot = created.event.stations.find((station) => station.game === "spot");
    expect(reaction && spot).toBeTruthy();
    expect(created.event.finaleAnswer).toBe(DEFAULT_ANSWER);

    await store.mutateOrganizer(org, (event) => {
      event.rooms.find((room) => room.id === "museum")!.available = false;
    });
    const parked = await store.organizerContext(org, t0 + 900);
    expect(parked.event.stations.filter((station) => station.roomId === "museum")).toHaveLength(0);
    expect(new Set(parked.event.stations.map((station) => station.game)).size).toBe(7);
    const teamLogin = await store.loginTeam(created.event.teams[0].joinCode, t0 + 1_000);
    await expect(
      store.mutateTeam(teamLogin.token, (event, team) => submitReaction(event, team, reaction!.code, rounds(true), t0 + 1_100), t0 + 1_100),
    ).rejects.toThrow(/niet gestart|niet beschikbaar/i);

    await store.mutateOrganizer(org, (event, now) => setStatus(event, "start", undefined, now), t0 + 2_000);
    await store.mutateTeam(teamLogin.token, (event, team, now) => submitSpot(event, team, spot!.code, "cam-5", now), t0 + 2_100);

    const [first, second] = await Promise.all([
      store.mutateTeam(teamLogin.token, (event, team, now) => submitReaction(event, team, reaction!.code, rounds(true), now)),
      store.mutateTeam(teamLogin.token, (event, team, now) => submitReaction(event, team, reaction!.code, rounds(true), now)),
    ]);
    const awarded = [first, second].map((result) => result.awarded).sort((a, b) => a - b);
    expect(awarded).toEqual([0, first.awarded + second.awarded]);
    expect(first.awarded + second.awarded).toBeGreaterThan(0);

    const after = await store.teamContext(teamLogin.token, t0 + 3_000);
    expect(after.team.completions).toHaveLength(2);
    expect(after.team.clues).toHaveLength(0);
    expect(after.team.collectedEvidenceIds).toEqual([]);
    const snapshot = toTeamSnapshot(after.event, after.team, t0 + 3_000);
    const packed = JSON.stringify(snapshot);
    expect(packed).not.toContain(DEFAULT_ANSWER);
    for (const puzzle of PUZZLES) expect(packed).not.toContain(`"answer":"${puzzle.answer}"`);
    expect(snapshot.event.stations.every((station) => station.code === "")).toBe(true);
    expect(snapshot.event.remainingMs).toBe(90 * 60_000 - 1_000);
  });

  it("houdt crack the code dicht tot het vierde spel en opent het dan in de kamer waar je staat", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sparta-code-"));
    const store = createStore(path.join(dir, "store.json"));
    const t0 = Date.now();
    const created = await store.createEvent({
      name: "Code",
      accessCode: "geheim-123",
      teamCount: 2,
      now: t0,
    });
    await store.mutateOrganizer(created.token, (event, now) => setStatus(event, "start", undefined, now), t0);
    const login = await store.loginTeam(created.event.teams[0].joinCode, t0 + 10);
    const other = await store.loginTeam(created.event.teams[1].joinCode, t0 + 11);
    const station = created.event.stations.find((item) => item.puzzleId === "dossier");
    const spot = created.event.stations.find((item) => item.game === "spot");
    expect(station).toBeTruthy();
    expect(spot).toBeTruthy();
    const required = ["polaroid_1", "security_camera", "bank_transaction", "transport_document"];

    await store.mutateTeam(login.token, (event, team) => {
      team.collectedEvidenceIds = required;
      team.visitedRooms = ["deelderzaal"];
      return team.collectedEvidenceIds;
    }, t0 + 12);
    const lockedState = await store.teamContext(login.token, t0 + 13);
    const locked = toTeamSnapshot(lockedState.event, lockedState.team, t0 + 13);
    expect(locked.event.codeGate.requiredIds).toEqual(required);
    expect(locked.event.codeGate.foundIds).toEqual(required);
    expect(locked.event.codeGate.unlocked).toBe(false);
    expect(locked.event.codeGate.solved).toBe(false);
    expect(locked.event.locations.find((item) => item.id === "deelderzaal")?.minigames.some((item) => item.title === "Crack the Code")).toBe(false);
    await expect(
      store.mutateTeam(login.token, (event, team, now) => submitCode(event, team, station!.code, "7088", now), t0 + 14),
    ).rejects.toThrow(/vergrendeld/i);

    await store.mutateTeam(login.token, (event, team) => {
      team.completions.push(
        { stationId: spot!.id, game: "spot", points: 0, completedAt: 1, breakdown: "", clueTitle: "", clueText: "", photo: null },
        { stationId: "reaction", game: "reaction", points: 0, completedAt: 2, breakdown: "", clueTitle: "", clueText: "", photo: null },
        { stationId: "memory", game: "memory", points: 0, completedAt: 3, breakdown: "", clueTitle: "", clueText: "", photo: null },
      );
      return team.completions.length;
    }, t0 + 15);
    const openState = await store.teamContext(login.token, t0 + 16);
    const openSnap = toTeamSnapshot(openState.event, openState.team, t0 + 16);
    expect(openSnap.event.codeGate.unlocked).toBe(true);
    expect(openSnap.event.codeGate.entryCode).toBe(station!.code);
    const deelder = openSnap.event.locations.find((item) => item.id === "deelderzaal");
    expect(deelder?.minigames[0]?.title).toBe("Crack the Code");
    expect(deelder?.minigames[0]?.locked).toBeNull();

    const wrong = await store.mutateTeam(login.token, (event, team, now) => submitCode(event, team, station!.code, "1111", now), t0 + 17);
    expect(wrong.correct).toBe(false);
    expect(wrong.awarded).toBe(0);

    const hinted = await store.mutateTeam(login.token, (event, team, now) => takeHint(event, team, station!.code, now), t0 + 18);
    const hintedAgain = await store.mutateTeam(login.token, (event, team, now) => takeHint(event, team, station!.code, now), t0 + 19);
    expect(hinted.costCharged).toBe(15);
    expect(hintedAgain.costCharged).toBe(0);
    expect(hinted.hint).toMatch(/kenteken/i);

    const right = await store.mutateTeam(login.token, (event, team, now) => submitCode(event, team, station!.code, "7088", now), t0 + 20);
    expect(right.correct).toBe(true);
    expect(right.awarded).toBe(100);
    expect(right.breakdown).toMatch(/handelaar/i);
    const state = await store.teamContext(login.token, t0 + 21);
    expect(state.team.score).toBe(85);
    expect(state.event.finaleOpen).toBe(false);
    const solved = toTeamSnapshot(state.event, state.team, t0 + 21);
    expect(solved.event.codeGate.solved).toBe(true);
    expect(JSON.stringify(solved)).not.toContain('"answer":"7088"');

    await expect(
      store.mutateTeam(other.token, (event, team, now) => submitCode(event, team, station!.code, "7088", now), t0 + 22),
    ).rejects.toThrow(/vergrendeld/i);
    const outsider = await store.teamContext(other.token, t0 + 23);
    expect(toTeamSnapshot(outsider.event, outsider.team, t0 + 23).event.codeGate.foundIds).toEqual([]);
    expect(outsider.event.finaleOpen).toBe(false);
  });

  it("koppelt teams via een lobbylink, start één keer en houdt QR-ruimtes vast", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sparta-lobby-"));
    const store = createStore(path.join(dir, "store.json"));
    const now = Date.now();
    const first = await store.createEvent({
      name: "Ochtend",
      accessCode: "kasteel-1",
      teamCount: 0,
      roomIds: ["museum", "perskamer"],
      now,
    });
    const second = await store.createEvent({
      name: "Middag",
      accessCode: "kasteel-2",
      teamCount: 0,
      roomIds: ["kleedkamer"],
      now: now + 1,
    });
    expect(first.event.lobbyToken).not.toBe(second.event.lobbyToken);
    expect(first.event.rooms.find((room) => room.id === "bestuurskamer")?.available).toBe(false);
    expect(new Set(first.event.stations.map((station) => station.roomId))).toEqual(new Set(["perskamer", "museum"]));
    expect(first.event.stations.find((station) => station.game === "spot")?.roomId).toBe("perskamer");
    expect(second.event.stations.every((station) => station.roomId === "kleedkamer")).toBe(true);
    expect(second.event.stations).toHaveLength(7);

    const joined = await store.registerTeam(first.event.lobbyToken, "De Rode Leeuwen", null, now + 2);
    const again = await store.registerTeam(first.event.lobbyToken, "De Rode Leeuwen", joined.token, now + 3);
    expect(again.team.id).toBe(joined.team.id);
    await expect(store.registerTeam(first.event.lobbyToken, "De Rode Leeuwen", null, now + 4)).rejects.toThrow(/al aangemeld/i);
    await expect(store.registerTeam(second.event.lobbyToken, "De Rode Leeuwen", null, now + 5)).resolves.toBeTruthy();

    const started = await store.mutateOrganizer(first.token, (event, at) => {
      setStatus(event, "start", undefined, at);
      return event.startedAt;
    }, now + 6);
    const startedAgain = await store.mutateOrganizer(first.token, (event, at) => {
      setStatus(event, "start", undefined, at);
      return event.startedAt;
    }, now + 9_000);
    expect(startedAgain).toBe(started);

    await expect(
      store.mutateTeam(joined.token, (event, team, at) => enterRoom(event, team, "bestuurskamer", at), now + 10),
    ).rejects.toThrow(/niet beschikbaar/i);

    await store.mutateTeam(joined.token, (event, team) => {
      team.briefingSeen = true;
    }, now + 11);
    await expect(
      store.mutateTeam(
        joined.token,
        (event, team, at) => submitFinale(event, team, "", at, { suspectId: "hendrik", explanation: "Hij wilde het beeld voor zijn collectie." }),
        now + 12,
      ),
    ).rejects.toThrow(/zeven bewijsstukken/i);
    await store.mutateTeam(joined.token, (event, team) => {
      team.collectedEvidenceIds = [
        "polaroid_1",
        "security_camera",
        "bank_transaction",
        "secret_chat",
        "polaroid_2",
        "transport_document",
        "sale_ad",
      ];
    }, now + 12.5);
    const closed = await store.mutateTeam(
      joined.token,
      (event, team, at) => submitFinale(event, team, "", at, { suspectId: "hendrik", explanation: "Hij wilde het beeld voor zijn collectie." }),
      now + 13,
    );
    expect(closed.feedback).toBe("Ingeleverd. Of het klopt, horen jullie bij de instructeur.");
    expect(closed.secret).toBeNull();
    expect(closed.feedback.toLowerCase()).not.toContain("hendrik");
    const retry = await store.mutateTeam(
      joined.token,
      (event, team, at) => submitFinale(event, team, "", at, { suspectId: "bosman", explanation: "De initialen R.B. en de naam op het document wijzen naar hem." }),
      now + 14,
    );
    expect(retry.already).toBe(true);
    const saved = await store.teamContext(joined.token, now + 15);
    expect(saved.team.finaleSuspect).toBe("hendrik");
    expect(saved.team.finaleSolved).toBe(false);
    const hidden = toTeamSnapshot(saved.event, saved.team, now + 15);
    expect(hidden.team.finaleSubmitted).toBe(true);
    expect(hidden.team.finaleSolved).toBe(false);
    expect(hidden.team.secretVisible).toBe(false);
    expect(hidden.event.secretText).toBeNull();
    expect(second.event.status).toBe("lobby");

    const opened = await store.resolveEntry(first.event.padCode, null, now + 14);
    expect(opened.href).toBe(`/onderzoek/${first.event.lobbyToken}`);
    const other = await store.resolveEntry(second.event.padCode, null, now + 15);
    expect(other.href).toBe(`/onderzoek/${second.event.lobbyToken}`);
    expect(other.href).not.toBe(opened.href);
    await expect(store.resolveEntry("MUSEUM", null, now + 16)).rejects.toThrow(/instructeur/i);
    const museum = await store.resolveEntry("MUSEUM", joined.token, now + 17);
    expect(museum.href).toBe("/ruimte/museum");
    await expect(store.resolveEntry("KLEED", joined.token, now + 18)).rejects.toThrow(/niet beschikbaar/i);
  });

  it("bewaart een vraag één keer en houdt teams uit elkaar", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sparta-quiz-"));
    const store = createStore(path.join(dir, "store.json"));
    const now = Date.now();
    const created = await store.createEvent({
      name: "Vragen",
      accessCode: "vragen-1888",
      teamNames: ["Rood", "Wit"],
      teamCount: 2,
      roomIds: ["bestuurskamer"],
      now,
    });
    await store.mutateOrganizer(created.token, (event, at) => setStatus(event, "start", undefined, at), now + 1);
    const first = await store.loginTeam(created.event.teams[0].joinCode, now + 2);
    const second = await store.loginTeam(created.event.teams[1].joinCode, now + 3);
    await expect(
      store.mutateTeam(first.token, (event, team, at) => submitQuiz(event, team, "bk-1", "c", at), now + 4),
    ).rejects.toThrow(/scan/i);
    const opened = await store.mutateTeam(first.token, (event, team, at) => enterRoom(event, team, "bestuurskamer", at), now + 5);
    expect(opened).toEqual({ href: "/spel/locatie/bestuurskamer" });
    await expect(
      store.mutateTeam(first.token, (event, team, at) => enterRoom(event, team, "museum", at), now + 6),
    ).rejects.toThrow(/niet beschikbaar/i);
    const wrong = await store.mutateTeam(first.token, (event, team, at) => submitQuiz(event, team, "bk-1", "a", at), now + 7);
    expect(wrong.correct).toBe(false);
    expect(wrong.points).toBe(0);
    expect(wrong.feedback).toContain("Bok de Korver");
    const retry = await store.mutateTeam(first.token, (event, team, at) => submitQuiz(event, team, "bk-1", "c", at), now + 8);
    expect(retry.points).toBe(0);
    const good = await store.mutateTeam(first.token, (event, team, at) => submitQuiz(event, team, "bk-11", "d", at), now + 9);
    const again = await store.mutateTeam(first.token, (event, team, at) => submitQuiz(event, team, "bk-11", "d", at), now + 10);
    expect(good.points).toBe(100);
    expect(again.points).toBe(0);
    const red = await store.teamContext(first.token, now + 11);
    const white = await store.teamContext(second.token, now + 12);
    expect(red.team.score).toBe(100);
    expect(red.team.collectedEvidenceIds).toEqual([]);
    expect(white.team.score).toBe(0);
    expect(white.team.answers).toHaveLength(0);
    const snapshot = toTeamSnapshot(red.event, red.team, now + 13);
    expect(snapshot.event.questions.find((question) => question.id === "bk-11")?.solved).toBe(true);
    expect(snapshot.event.questions.find((question) => question.id === "bk-1")?.closed).toBe(true);
    expect(JSON.stringify(snapshot.event.questions)).not.toContain('"answer"');
    expect(snapshot.event.locations.find((location) => location.id === "kasteel")?.available).toBe(false);
    expect(snapshot.event.evidenceTotal).toBe(7);
    expect(snapshot.event.finaleOpen).toBe(false);
    expect(created.event.stations.find((station) => station.game === "photo")?.enabled).toBe(true);
  });

  it("verbergt het antwoord op het veld en opent de vraag na vijf minuten opnieuw", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sparta-veld-"));
    const store = createStore(path.join(dir, "store.json"));
    const now = Date.now();
    const created = await store.createEvent({
      name: "Veld",
      accessCode: "veld-1888",
      teamCount: 1,
      roomIds: ["bestuurskamer"],
      now,
    });
    await store.mutateOrganizer(created.token, (event, at) => setStatus(event, "start", undefined, at), now + 1);
    const login = await store.loginTeam(created.event.teams[0].joinCode, now + 2);
    await store.mutateTeam(login.token, (event, team) => {
      for (const question of questionsFor("bestuurskamer")) {
        team.answers.push({ questionId: question.id, correct: true, points: 0, at: now, response: "x" });
      }
      for (const station of event.stations.filter((item) => item.roomId === "bestuurskamer" && item.enabled && item.game !== "code")) {
        team.completions.push({
          stationId: station.id,
          game: station.game,
          points: 10,
          completedAt: now,
          breakdown: "test",
          clueTitle: "",
          clueText: "",
          photo: null,
        });
      }
    }, now + 3);
    const wrong = await store.mutateTeam(login.token, (event, team, at) => submitQuiz(event, team, "vd-bogarde", "a", at), now + 4);
    expect(wrong.correct).toBe(false);
    expect(wrong.solution).toBe("");
    expect(wrong.feedback.toLowerCase()).not.toContain("barcelona");
    expect(wrong.retryAt).toBe(now + 4 + FIELD_RETRY_MS);
    const early = await store.mutateTeam(login.token, (event, team, at) => submitQuiz(event, team, "vd-bogarde", "b", at), now + 5);
    expect(early.points).toBe(0);
    expect(early.solution).toBe("");
    expect(early.feedback.toLowerCase()).not.toContain("barcelona");
    const waiting = await store.teamContext(login.token, now + 6);
    const card = toTeamSnapshot(waiting.event, waiting.team, now + 6).event.questions.find((question) => question.id === "vd-bogarde");
    expect(card?.solved).toBe(false);
    expect(card?.closed).toBe(false);
    expect(card?.retryAt).toBe(now + 4 + FIELD_RETRY_MS);
    expect(JSON.stringify(card)).not.toContain('"answer"');
    const open = await store.mutateTeam(login.token, (event, team, at) => submitQuiz(event, team, "vd-vangaal", "speler", at), now + 7);
    expect(open.solution).toBe("");
    expect(open.feedback.toLowerCase()).not.toContain("trainer");
    const again = await store.mutateTeam(
      login.token,
      (event, team, at) => submitQuiz(event, team, "vd-bogarde", "b", at),
      now + 4 + FIELD_RETRY_MS,
    );
    expect(again.correct).toBe(true);
    expect(again.points).toBe(100);
    expect(again.feedback).toBe("Goed.");
    expect(again.feedback.toLowerCase()).not.toContain("barcelona");
    const repeat = await store.mutateTeam(
      login.token,
      (event, team, at) => submitQuiz(event, team, "vd-bogarde", "b", at),
      now + 5 + FIELD_RETRY_MS,
    );
    expect(repeat.points).toBe(0);
    expect(repeat.feedback).toBe("Deze vraag is al goed.");
    const done = await store.teamContext(login.token, now + 6 + FIELD_RETRY_MS);
    expect(done.team.answers.filter((item) => item.questionId === "vd-bogarde")).toHaveLength(1);
    expect(toTeamSnapshot(done.event, done.team, now + 6 + FIELD_RETRY_MS).event.questions.find((question) => question.id === "vd-bogarde")?.solved).toBe(true);
  });

  it("geeft alle zeven bewijzen uit één kamer en bewaart ze als de kamers wijzigen", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sparta-bewijs-"));
    const store = createStore(path.join(dir, "store.json"));
    const now = Date.now();
    const created = await store.createEvent({
      name: "Bewijs",
      accessCode: "bewijs-1888",
      teamCount: 1,
      roomIds: ["bestuurskamer"],
      now,
    });
    await store.mutateOrganizer(created.token, (event, at) => setStatus(event, "start", undefined, at), now + 1);
    const login = await store.loginTeam(created.event.teams[0].joinCode, now + 2);
    await store.mutateTeam(login.token, (event, team) => {
      for (const question of questionsFor("bestuurskamer")) {
        team.answers.push({ questionId: question.id, correct: true, points: 0, at: now, response: "x" });
      }
      for (const station of event.stations.filter((item) => item.roomId === "bestuurskamer" && item.enabled && item.game !== "code")) {
        team.completions.push({
          stationId: station.id,
          game: station.game,
          points: 10,
          completedAt: now,
          breakdown: "test",
          clueTitle: "",
          clueText: "",
          photo: null,
        });
      }
    }, now + 3);
    const done = await store.teamContext(login.token, now + 4);
    expect(done.team.collectedEvidenceIds.slice().sort()).toEqual(EVIDENCE_ITEMS.map((item) => item.id).sort());
    const key = done.event.assignmentKey;
    const reloaded = createStore(path.join(dir, "store.json"));
    const same = await reloaded.teamContext(login.token, now + 5);
    expect(same.event.assignmentKey).toBe(key);
    expect(same.event.evidenceAssignments).toEqual(done.event.evidenceAssignments);
    await reloaded.mutateOrganizer(created.token, (event) => {
      for (const room of event.rooms) room.available = room.id === "museum" || room.id === "kasteel";
    }, now + 6);
    const moved = await reloaded.teamContext(login.token, now + 7);
    expect(moved.event.assignmentKey).toBe("kasteel,museum");
    for (const item of EVIDENCE_ITEMS) expect(moved.team.collectedEvidenceIds).toContain(item.id);
    expect(new Set(moved.team.collectedEvidenceIds).size).toBe(7);
  });

  it("geeft bewijsstuk 1 aan de tweede kamer als die als eerste af is", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sparta-volgorde-"));
    const store = createStore(path.join(dir, "store.json"));
    const now = Date.now();
    const rooms = ["bestuurskamer", "perskamer", "tribune", "museum", "kasteel", "kleedkamer", "deelderzaal"];
    const created = await store.createEvent({
      name: "Volgorde",
      accessCode: "volgorde-1888",
      teamCount: 1,
      roomIds: rooms,
      now,
    });
    await store.mutateOrganizer(created.token, (event, at) => setStatus(event, "start", undefined, at), now + 1);
    const login = await store.loginTeam(created.event.teams[0].joinCode, now + 2);
    await store.mutateTeam(login.token, (event, team) => {
      for (const question of questionsFor("perskamer")) {
        team.answers.push({ questionId: question.id, correct: true, points: 0, at: now + 3, response: "x" });
      }
      const station = event.stations.find((item) => item.roomId === "perskamer" && item.enabled);
      if (!station) throw new Error("minigame ontbreekt");
      team.completions.push({
        stationId: station.id,
        game: station.game,
        points: 10,
        completedAt: now + 4,
        breakdown: "test",
        clueTitle: "",
        clueText: "",
        photo: null,
      });
    }, now + 5);
    const done = await store.teamContext(login.token, now + 6);
    expect(done.event.evidenceAssignments.perskamer).toEqual(["security_camera"]);
    expect(done.team.evidenceGrants?.perskamer).toEqual(["polaroid_1"]);
    expect(done.team.collectedEvidenceIds).toEqual(["polaroid_1"]);
    const snapshot = toTeamSnapshot(done.event, done.team, now + 7);
    expect(snapshot.event.locations.find((location) => location.id === "perskamer")?.evidenceIds).toEqual(["polaroid_1"]);
    expect(snapshot.event.evidence.find((item) => item.id === "polaroid_1")?.found).toBe(true);
    expect(snapshot.event.evidence.find((item) => item.id === "security_camera")?.found).toBe(false);
    expect(snapshot.leaderboard).toEqual([]);
  });

  it("rondt penalty, VAR, spot en foto één keer af en meldt een foute foto", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sparta-games-"));
    const store = createStore(path.join(dir, "store.json"));
    const now = Date.now();
    const created = await store.createEvent({
      name: "Games",
      accessCode: "games-1888",
      teamCount: 1,
      now,
    });
    await store.mutateOrganizer(created.token, (event, at) => setStatus(event, "start", undefined, at), now + 1);
    const login = await store.loginTeam(created.event.teams[0].joinCode, now + 2);
    const penalty = created.event.stations.find((station) => station.game === "penalty");
    const variable = created.event.stations.find((station) => station.game === "var");
    const spot = created.event.stations.find((station) => station.game === "spot");
    const photo = created.event.stations.find((station) => station.game === "photo");
    expect(penalty && variable && spot && photo).toBeTruthy();

    const missed = await store.mutateTeam(login.token, (event, team, at) => submitSpot(event, team, spot!.code, "cam-1", at), now + 3);
    expect(missed.correct).toBe(false);
    expect(missed.finished).toBe(true);
    expect(missed.feedback).toMatch(/camera/i);
    const repeatSpot = await store.mutateTeam(login.token, (event, team, at) => submitSpot(event, team, spot!.code, "cam-5", at), now + 4);
    expect(repeatSpot.awarded).toBe(0);
    expect(repeatSpot.correct).toBe(false);

    const scored = await store.mutateTeam(
      login.token,
      (event, team, at) =>
        submitPenalty(
          event,
          team,
          penalty!.code,
          ["links", "midden", "rechts", "links", "midden"],
          ["rechts", "midden", "links", "links", "rechts"],
          at,
        ),
      now + 5,
    );
    expect(scored.breakdown).toContain("3 van 5");
    expect(scored.points).toBe(60);
    const again = await store.mutateTeam(
      login.token,
      (event, team, at) =>
        submitPenalty(event, team, penalty!.code, ["links", "links", "links", "links", "links"], ["rechts", "rechts", "rechts", "rechts", "rechts"], at),
      now + 6,
    );
    expect(again.awarded).toBe(0);
    expect(again.points).toBe(60);

    const decisions = await store.mutateTeam(
      login.token,
      (event, team, at) => submitVar(event, team, variable!.code, ["b"], at),
      now + 7,
    );
    expect(decisions.breakdown).toContain("1 van 1");
    const repeatVar = await store.mutateTeam(
      login.token,
      (event, team, at) => submitVar(event, team, variable!.code, ["a"], at),
      now + 8,
    );
    expect(repeatVar.awarded).toBe(0);

    await expect(
      store.mutateTeam(login.token, (event, team, at) => submitPhoto(event, team, photo!.code, "geen-foto", at), now + 9),
    ).rejects.toThrow(/foto/i);
    const sent = await store.mutateTeam(
      login.token,
      (event, team, at) => submitPhoto(event, team, photo!.code, "data:image/jpeg;base64,abc", at),
      now + 10,
    );
    expect(sent.pending).toBe(true);
    expect(sent.awarded).toBeGreaterThan(0);
    const sentAgain = await store.mutateTeam(
      login.token,
      (event, team, at) => submitPhoto(event, team, photo!.code, "data:image/jpeg;base64,abc", at),
      now + 11,
    );
    expect(sentAgain.awarded).toBe(0);
    const after = await store.teamContext(login.token, now + 12);
    expect(after.event.finaleOpen).toBe(false);
    expect(after.team.completions).toHaveLength(4);
  });
});

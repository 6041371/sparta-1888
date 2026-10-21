import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { EVIDENCE_ITEMS } from "@/lib/content/evidence";
import { questionsFor } from "@/lib/content/quiz";
import { toTeamSnapshot } from "@/lib/server/dto";
import { DEFAULT_ANSWER } from "@/lib/server/defaults";
import { PUZZLES } from "@/lib/server/puzzles";
import { createStore, enterRoom, setStatus, submitCode, submitFinale, submitQuiz, submitReaction, takeHint } from "@/lib/server/store";
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
    const museum = created.event.stations.find((station) => station.roomId === "museum");
    expect(reaction).toBeTruthy();
    expect(created.event.finaleAnswer).toBe(DEFAULT_ANSWER);

    await store.mutateOrganizer(org, (event) => {
      event.rooms.find((room) => room.id === "museum")!.available = false;
    });
    const teamLogin = await store.loginTeam(created.event.teams[0].joinCode, t0 + 1_000);
    await expect(
      store.mutateTeam(teamLogin.token, (event, team) => submitReaction(event, team, museum!.code, rounds(true), t0 + 1_100), t0 + 1_100),
    ).rejects.toThrow(/niet gestart|niet beschikbaar/i);

    await store.mutateOrganizer(org, (event, now) => setStatus(event, "start", undefined, now), t0 + 2_000);

    const hidden = store.mutateTeam(teamLogin.token, (event, team, now) =>
      submitReaction(event, team, museum!.code, rounds(true), now),
    );
    await expect(hidden).rejects.toThrow(/niet beschikbaar/i);

    const [first, second] = await Promise.all([
      store.mutateTeam(teamLogin.token, (event, team, now) => submitReaction(event, team, reaction!.code, rounds(true), now)),
      store.mutateTeam(teamLogin.token, (event, team, now) => submitReaction(event, team, reaction!.code, rounds(true), now)),
    ]);
    const awarded = [first, second].map((result) => result.awarded).sort((a, b) => a - b);
    expect(awarded).toEqual([0, first.awarded + second.awarded]);
    expect(first.awarded + second.awarded).toBeGreaterThan(0);

    const after = await store.teamContext(teamLogin.token, t0 + 3_000);
    expect(after.team.completions).toHaveLength(1);
    expect(after.team.clues).toHaveLength(0);
    expect(after.team.collectedEvidenceIds).toEqual([]);
    const snapshot = toTeamSnapshot(after.event, after.team, t0 + 3_000);
    const packed = JSON.stringify(snapshot);
    expect(packed).not.toContain(DEFAULT_ANSWER);
    for (const puzzle of PUZZLES) expect(packed).not.toContain(`"answer":"${puzzle.answer}"`);
    expect(snapshot.event.stations.every((station) => station.code === "")).toBe(true);
    expect(snapshot.event.remainingMs).toBe(90 * 60_000 - 1_000);
  });

  it("controleert de codepuzzel op de server en rekent een hint één keer", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sparta-code-"));
    const store = createStore(path.join(dir, "store.json"));
    const t0 = Date.now();
    const created = await store.createEvent({
      name: "Code",
      accessCode: "geheim-123",
      teamCount: 1,
      now: t0,
    });
    await store.mutateOrganizer(created.token, (event, now) => setStatus(event, "start", undefined, now), t0);
    const login = await store.loginTeam(created.event.teams[0].joinCode, t0 + 10);
    const station = created.event.stations.find((item) => item.puzzleId === "verdubbeling");
    expect(station).toBeTruthy();

    const wrong = await store.mutateTeam(login.token, (event, team, now) => submitCode(event, team, station!.code, "12", now));
    expect(wrong.correct).toBe(false);
    expect(wrong.awarded).toBe(0);

    const hinted = await store.mutateTeam(login.token, (event, team, now) => takeHint(event, team, station!.code, now));
    const hintedAgain = await store.mutateTeam(login.token, (event, team, now) => takeHint(event, team, station!.code, now));
    expect(hinted.costCharged).toBe(15);
    expect(hintedAgain.costCharged).toBe(0);
    expect(hinted.hint).toMatch(/twee vorige/i);

    const right = await store.mutateTeam(login.token, (event, team, now) => submitCode(event, team, station!.code, "31", now));
    expect(right.correct).toBe(true);
    expect(right.awarded).toBe(100);
    const state = await store.teamContext(login.token, t0 + 50);
    expect(state.team.score).toBe(85);
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
    expect(first.event.stations.find((station) => station.roomId === "museum")?.roomId).toBe("museum");
    expect(second.event.stations.find((station) => station.roomId === "museum")?.roomId).toBe("museum");

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
    expect(closed.correct).toBe(false);
    const solved = await store.mutateTeam(
      joined.token,
      (event, team, at) => submitFinale(event, team, "", at, { suspectId: "bosman", explanation: "De initialen R.B. en de naam op het document wijzen naar hem." }),
      now + 14,
    );
    expect(solved.correct).toBe(true);
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
    const good = await store.mutateTeam(first.token, (event, team, at) => submitQuiz(event, team, "bk-11", "b", at), now + 9);
    const again = await store.mutateTeam(first.token, (event, team, at) => submitQuiz(event, team, "bk-11", "b", at), now + 10);
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
    expect(created.event.stations.some((station) => station.game === "photo")).toBe(false);
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
      const station = event.stations.find((item) => item.roomId === "bestuurskamer" && item.enabled);
      if (!station) throw new Error("minigame ontbreekt");
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
});

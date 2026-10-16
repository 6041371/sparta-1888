import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { toTeamSnapshot } from "@/lib/server/dto";
import { DEFAULT_ANSWER } from "@/lib/server/defaults";
import { PUZZLES } from "@/lib/server/puzzles";
import { createStore, enterRoom, setStatus, submitCode, submitFinale, submitReaction, takeHint } from "@/lib/server/store";
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
    expect(after.team.clues).toHaveLength(1);
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
    expect(hinted.hint).toMatch(/dubbele/i);

    const right = await store.mutateTeam(login.token, (event, team, now) => submitCode(event, team, station!.code, "64", now));
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
    const closed = await store.mutateTeam(
      joined.token,
      (event, team, at) => submitFinale(event, team, "", at, { suspectId: "mira", explanation: "Zij was volgens ons in de perskamer." }),
      now + 12,
    );
    expect(closed.correct).toBe(false);
    const solved = await store.mutateTeam(
      joined.token,
      (event, team, at) => submitFinale(event, team, "", at, { suspectId: "noor", explanation: "Zij nam om 08:40 de kopie met het rode lint mee." }),
      now + 13,
    );
    expect(solved.correct).toBe(true);
    expect(second.event.status).toBe("lobby");
  });
});

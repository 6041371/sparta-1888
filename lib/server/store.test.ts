import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { toTeamSnapshot } from "@/lib/server/dto";
import { DEFAULT_ANSWER } from "@/lib/server/defaults";
import { PUZZLES } from "@/lib/server/puzzles";
import { createStore, setStatus, submitCode, submitReaction, takeHint } from "@/lib/server/store";
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
});

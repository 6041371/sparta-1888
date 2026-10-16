import { GAME_TITLES } from "@/lib/copy";
import { toTeamSnapshot } from "@/lib/server/dto";
import { fail, json, readToken } from "@/lib/server/http";
import { publicPuzzle } from "@/lib/server/puzzles";
import {
  enterStation,
  store,
  submitCode,
  submitFinale,
  submitMemory,
  submitPhoto,
  submitReaction,
  takeHint,
} from "@/lib/server/store";
import type { ReactionRound } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await readToken("team");
    const { event, team } = await store.teamContext(token);
    return json(toTeamSnapshot(event, team, Date.now()));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.action !== "string") return json({ error: "De invoer kon niet worden gelezen." }, 400);
    const token = await readToken("team");

    const outcome = await store.mutateTeam(token, (event, team, now) => {
      if (body.action === "enter") {
        const entered = enterStation(event, team, String(body.code ?? ""), now);
        const station = entered.station;
        return {
          playable: entered.playable,
          blockReason: entered.blockReason,
          photoPrompt: entered.photoPrompt,
          hintUsed: entered.hintUsed,
          locationLabel: entered.locationLabel,
          completion: entered.completion
            ? {
                points: entered.completion.points,
                breakdown: entered.completion.breakdown,
                photoStatus: entered.completion.photo?.status ?? null,
                clueTitle: entered.completion.clueTitle,
                clueText: entered.completion.clueText,
              }
            : null,
          station: {
            id: station.id,
            code: station.code,
            name: station.name,
            roomId: station.roomId,
            roomName: event.rooms.find((room) => room.id === station.roomId)?.name ?? "Ruimte",
            locationLabel: entered.locationLabel,
            game: station.game,
            gameTitle: GAME_TITLES[station.game],
            pointsMax: station.pointsMax,
            puzzle: station.game === "code" ? publicPuzzle(station.puzzleId) : null,
            available: true,
          },
        };
      }
      if (body.action === "reaction") {
        return submitReaction(event, team, String(body.code ?? ""), (body.rounds as ReactionRound[]) ?? [], now);
      }
      if (body.action === "memory") {
        return submitMemory(
          event,
          team,
          String(body.code ?? ""),
          {
            matches: Number(body.matches),
            attempts: Number(body.attempts),
            elapsedMs: Number(body.elapsedMs),
          },
          now,
        );
      }
      if (body.action === "code") return submitCode(event, team, String(body.code ?? ""), body.answer, now);
      if (body.action === "hint") return takeHint(event, team, String(body.code ?? ""), now);
      if (body.action === "photo") return submitPhoto(event, team, String(body.code ?? ""), body.dataUrl, now);
      if (body.action === "finale") return submitFinale(event, team, body.answer, now);
      throw new Error("Onbekende spelactie.");
    });

    const { event, team } = await store.teamContext(token);
    return json({ outcome, state: toTeamSnapshot(event, team, Date.now()) });
  } catch (error) {
    if (error instanceof Error && error.message === "Onbekende spelactie.") {
      return json({ error: "Onbekende spelactie." }, 400);
    }
    return fail(error);
  }
}

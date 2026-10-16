import { toOrganizerSnapshot } from "@/lib/server/dto";
import { fail, json, readToken } from "@/lib/server/http";
import {
  addStation,
  addTeam,
  adjustScore,
  clearCompletion,
  deleteStation,
  deleteTeam,
  renameTeam,
  retakePhoto,
  reviewPhoto,
  saveStation,
  setStatus,
  store,
  updateRooms,
  updateSettings,
} from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const token = await readToken("organizer");
    const { event } = await store.organizerContext(token);
    const photos = new URL(request.url).searchParams.get("photos") === "1";
    return json(toOrganizerSnapshot(event, Date.now(), photos));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.action !== "string") return json({ error: "De invoer kon niet worden gelezen." }, 400);
    const action = body.action;
    const token = await readToken("organizer");
    const photos = action === "review-photo" || action === "retake-photo";

    await store.mutateOrganizer(token, (event, now, sessions) => {
      switch (action) {
        case "save-settings":
          updateSettings(event, (body.settings as Record<string, unknown>) ?? {});
          return;
        case "save-rooms":
          updateRooms(event, body.rooms);
          return;
        case "save-station":
          saveStation(event, (body.station as Record<string, unknown>) ?? {});
          return;
        case "add-station":
          addStation(event, (body.station as Record<string, unknown>) ?? {});
          return;
        case "delete-station":
          deleteStation(event, String(body.stationId ?? ""), body.confirm);
          return;
        case "add-team":
          addTeam(event, body.name, now);
          return;
        case "rename-team":
          renameTeam(event, String(body.teamId ?? ""), body.name);
          return;
        case "delete-team":
          deleteTeam(event, String(body.teamId ?? ""), body.confirm, sessions);
          return;
        case "adjust-score":
          adjustScore(event, String(body.teamId ?? ""), body.points, body.reason, now);
          return;
        case "clear-completion":
          clearCompletion(event, String(body.teamId ?? ""), String(body.stationId ?? ""), body.confirm);
          return;
        case "review-photo":
          reviewPhoto(
            event,
            {
              teamId: String(body.teamId ?? ""),
              stationId: String(body.stationId ?? ""),
              creativity: Number(body.creativity),
              teamwork: Number(body.teamwork),
              execution: Number(body.execution),
              points: Number(body.points),
            },
            now,
          );
          return;
        case "retake-photo":
          retakePhoto(event, String(body.teamId ?? ""), String(body.stationId ?? ""));
          return;
        default:
          setStatus(event, action, body.confirm, now);
      }
    });

    const { event } = await store.organizerContext(token);
    return json(toOrganizerSnapshot(event, Date.now(), photos));
  } catch (error) {
    return fail(error);
  }
}

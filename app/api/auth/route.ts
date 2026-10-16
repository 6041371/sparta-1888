import { fail, json, setToken, clearToken, readToken } from "@/lib/server/http";
import { store } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return json({ error: "De invoer kon niet worden gelezen." }, 400);

    if (body.kind === "create") {
      const created = await store.createEvent({
        name: String(body.name ?? ""),
        accessCode: String(body.accessCode ?? ""),
        durationMinutes: Number(body.durationMinutes ?? 90),
        teamCount: Number(body.teamCount ?? 4),
        teamNames: Array.isArray(body.teamNames) ? body.teamNames.map(String) : [],
      });
      await setToken("organizer", created.token);
      return json({ eventId: created.event.id, name: created.event.name });
    }

    if (body.kind === "organizer") {
      const logged = await store.loginOrganizer(String(body.eventId ?? ""), String(body.accessCode ?? ""));
      await setToken("organizer", logged.token);
      return json({ eventId: logged.event.id, name: logged.event.name });
    }

    if (body.kind === "team") {
      const logged = await store.loginTeam(String(body.joinCode ?? ""));
      await setToken("team", logged.token);
      return json({ teamName: logged.team.name, eventName: logged.event.name });
    }

    if (body.kind === "logout") {
      const role = body.role === "team" ? "team" : "organizer";
      await store.logout(await readToken(role));
      await clearToken(role);
      return json({ ok: true });
    }

    return json({ error: "Onbekende aanmelding." }, 400);
  } catch (error) {
    return fail(error);
  }
}

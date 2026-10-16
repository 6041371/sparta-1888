import { fail, json, readToken } from "@/lib/server/http";
import { store } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const state = await store.lobbyState(token, await readToken("team"));
    return json(state);
  } catch (error) {
    return fail(error);
  }
}

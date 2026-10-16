import QRCode from "qrcode";
import { fail, readToken } from "@/lib/server/http";
import { store } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const token = await readToken("organizer");
    const { event } = await store.organizerContext(token);
    const station = event.stations.find((item) => item.code.toUpperCase() === code.toUpperCase());
    if (!station) return new Response("Onbekend station", { status: 404 });
    const url = `${new URL(request.url).origin}/spel/station/${station.code}`;
    const svg = await QRCode.toString(url, {
      type: "svg",
      margin: 1,
      width: 280,
      color: { dark: "#202124", light: "#ffffff" },
    });
    return new Response(svg, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
    });
  } catch (error) {
    return fail(error);
  }
}

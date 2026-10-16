import QRCode from "qrcode";
import { ROOM_TEMPLATES } from "@/lib/server/defaults";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await context.params;
  const room = ROOM_TEMPLATES.find((item) => item.id === roomId);
  if (!room) return new Response("Onbekende ruimte", { status: 404 });
  const url = `${new URL(request.url).origin}/ruimte/${room.id}`;
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    width: 320,
    color: { dark: "#202124", light: "#ffffff" },
  });
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}

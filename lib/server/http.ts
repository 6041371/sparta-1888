import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GameError } from "@/lib/game/errors";

const COOKIES = { organizer: "sparta_org", team: "sparta_team" } as const;

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(error: unknown) {
  if (error instanceof GameError) return json({ error: error.message }, error.status);
  console.error(error);
  return json({ error: "Er ging iets mis op de server." }, 500);
}

export async function readToken(role: keyof typeof COOKIES) {
  const jar = await cookies();
  return jar.get(COOKIES[role])?.value ?? null;
}

export async function setToken(role: keyof typeof COOKIES, token: string) {
  const jar = await cookies();
  jar.set(COOKIES[role], token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 16,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearToken(role: keyof typeof COOKIES) {
  const jar = await cookies();
  jar.set(COOKIES[role], "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

"use client";

import { useParams } from "next/navigation";
import { GameScreen } from "@/components/games/GameScreen";

export default function StationPage() {
  const params = useParams<{ code: string }>();
  return <GameScreen code={String(params.code ?? "").toUpperCase()} />;
}

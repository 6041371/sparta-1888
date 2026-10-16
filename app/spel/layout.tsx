"use client";

import { TeamShell } from "@/components/team/TeamShell";

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return <TeamShell>{children}</TeamShell>;
}

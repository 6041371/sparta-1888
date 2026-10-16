"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { Shield } from "@/components/Shield";
import { Banner, Button } from "@/components/ui";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [linked, setLinked] = useState(true);

  useEffect(() => {
    let active = true;
    api<{ outcome: { station?: { code: string } } }>("/api/team", { action: "enter-room", roomId: params.roomId })
      .then((result) => {
        if (!active) return;
        const code = result.outcome.station?.code;
        if (code) router.replace(`/spel/station/${code}`);
        else setMessage("Deze ruimte kon niet worden geopend.");
      })
      .catch((caught) => {
        if (!active) return;
        const text = caught instanceof Error ? caught.message : "Deze ruimte kon niet worden geopend.";
        setLinked(!/niet aangemeld|sessie/i.test(text));
        setMessage(text);
      });
    return () => {
      active = false;
    };
  }, [params.roomId, router]);

  if (!message) {
    return (
      <main className="app">
        <Shield />
        <p>Ruimte openen…</p>
      </main>
    );
  }

  return (
    <main className="app">
      <Shield />
      <h1 className="display">Deze ruimte</h1>
      <Banner tone="warn">{message}</Banner>
      {linked ? (
        <p className="lead">Jullie blijven bij hetzelfde evenement. Vraag de instructeur of deze ruimte vandaag open is.</p>
      ) : (
        <>
          <p className="lead">Deze iPad is nog niet gekoppeld aan een evenement. Vraag de instructeur om de lobbylink van vandaag te openen. Er wordt geen ander evenement gekozen.</p>
          <Button kind="dark" onClick={() => router.push("/")}>Terug</Button>
        </>
      )}
    </main>
  );
}

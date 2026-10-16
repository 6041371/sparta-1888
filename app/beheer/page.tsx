"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { ROOM_TEMPLATES } from "@/lib/server/defaults";
import { Shield } from "@/components/Shield";
import { Banner, Button, Field } from "@/components/ui";

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

export default function OrganizerGate() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "login">("create");
  const [name, setName] = useState("Sparta Rotterdam — De Verdwenen Erfenis");
  const [accessCode, setAccessCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [duration, setDuration] = useState("90");
  const [roomIds, setRoomIds] = useState<string[]>(ROOM_TEMPLATES.map((room) => room.id));
  const [eventId, setEventId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sparta-event-id");
    if (stored) setEventId(stored);
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (accessCode.trim().length < 6) {
      setError("Kies een toegangscode van minstens 6 tekens.");
      return;
    }
    if (accessCode !== confirmCode) {
      setError("De toegangscodes komen niet overeen.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (roomIds.length < 1) {
        setError("Kies minstens één ruimte.");
        setBusy(false);
        return;
      }
      const result = await api<{ eventId: string }>("/api/auth", {
        kind: "create",
        name,
        accessCode,
        durationMinutes: Number(duration),
        teamCount: 0,
        teamNames: [],
        roomIds,
      });
      localStorage.setItem("sparta-event-id", result.eventId);
      sessionStorage.setItem("sparta-access-once", accessCode);
      router.push("/beheer/paneel");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Het evenement kon niet worden gemaakt.");
      setBusy(false);
    }
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ eventId: string }>("/api/auth", { kind: "organizer", eventId: eventId.trim(), accessCode });
      localStorage.setItem("sparta-event-id", result.eventId);
      router.push("/beheer/paneel");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Aanmelden lukte niet.");
      setBusy(false);
    }
  }

  return (
    <main className="app">
      <Link href="/" className="brand-row">
        <Shield size={42} />
        <span>Terug</span>
      </Link>
      <p className="kicker">Instructeur</p>
      <h1 className="display">Evenement openen</h1>
      <div className="row">
        <button type="button" className={`chip ${mode === "create" ? "on" : ""}`} onClick={() => setMode("create")}>Nieuw evenement</button>
        <button type="button" className={`chip ${mode === "login" ? "on" : ""}`} onClick={() => setMode("login")}>Ik heb al een code</button>
      </div>
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {mode === "create" ? (
        <form className="paper stack" onSubmit={create}>
          <Field label="Evenementnaam" value={name} onChange={setName} />
          <Field label="Toegangscode, minstens 6 tekens" value={accessCode} onChange={setAccessCode} type="password" />
          <Field label="Herhaal de toegangscode" value={confirmCode} onChange={setConfirmCode} type="password" />
          <p className="small">De code wordt versleuteld bewaard. Er staat geen vast wachtwoord in de app. Noteer hem, want hij kan niet worden teruggehaald.</p>
          <Field label="Duur in minuten" type="number" value={duration} onChange={setDuration} />
          <fieldset className="stack" style={{ border: 0, padding: 0 }}>
            <legend>Ruimtes voor deze dag</legend>
            {ROOM_TEMPLATES.map((room) => (
              <label key={room.id} className="spread">
                <span>{room.name}</span>
                <input
                  type="checkbox"
                  checked={roomIds.includes(room.id)}
                  onChange={() => setRoomIds((current) => current.includes(room.id) ? current.filter((id) => id !== room.id) : [...current, room.id])}
                />
              </label>
            ))}
          </fieldset>
          <p className="small">Teams typen daarna de ruimtecode op het beginscherm. De gekozen ruimtes blijven bij dit evenement horen.</p>
          <Button type="submit" disabled={busy}>Maak het evenement</Button>
          <Button
            type="button"
            kind="dark"
            disabled={busy}
            onClick={() => {
              const generated = randomCode();
              setAccessCode(generated);
              setConfirmCode(generated);
              setError(null);
            }}
          >
            Vul een oefencode in
          </Button>
        </form>
      ) : (
        <form className="paper stack" onSubmit={login}>
          <Field label="Evenement-id" value={eventId} onChange={setEventId} />
          <Field label="Toegangscode" value={accessCode} onChange={setAccessCode} type="password" />
          <Button type="submit" disabled={busy}>Open het beheer</Button>
        </form>
      )}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { ROOM_CODES } from "@/lib/server/defaults";
import { formatRemaining, suggestedPhotoPoints } from "@/lib/game/logic";
import type { OrganizerSnapshot, OrganizerStation, ScoringConfig } from "@/lib/types";
import { Shield } from "@/components/Shield";
import { Banner, Button, Field, Loading } from "@/components/ui";

const SECTIONS = [
  ["overzicht", "Overzicht"],
  ["instellingen", "Evenement"],
  ["teams", "Teams"],
  ["ruimtes", "Ruimtes"],
  ["stations", "Stations"],
  ["spellen", "Minigames"],
  ["qr", "QR-codes"],
  ["punten", "Punten"],
  ["aanwijzingen", "Aanwijzingen"],
  ["finale", "Finale"],
  ["klassement", "Klassement"],
  ["fotos", "Foto's"],
  ["uitslag", "Uitslag"],
] as const;

type Section = (typeof SECTIONS)[number][0];

export function AdminApp() {
  const router = useRouter();
  const [server, setServer] = useState<OrganizerSnapshot | null>(null);
  const [section, setSection] = useState<Section>("overzicht");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accessOnce, setAccessOnce] = useState<string | null>(null);

  async function refresh(photos = false) {
    const data = await api<OrganizerSnapshot>(`/api/admin${photos ? "?photos=1" : ""}`);
    setServer(data);
    return data;
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("sparta-access-once");
    if (stored) setAccessOnce(stored);
    refresh().catch(() => router.replace("/beheer"));
  }, [router]);

  useEffect(() => {
    const quiet = ["instellingen", "ruimtes", "stations", "punten", "finale", "aanwijzingen"].includes(section);
    if (quiet) return;
    const id = window.setInterval(() => {
      refresh(section === "fotos").catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(id);
  }, [section]);

  async function run(body: Record<string, unknown>, success: string) {
    setBusy(true);
    setError(null);
    try {
      const data = await api<OrganizerSnapshot>("/api/admin", body);
      setServer(data);
      setToast(success);
      window.setTimeout(() => setToast(null), 2500);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Opslaan lukte niet.");
    } finally {
      setBusy(false);
    }
  }

  if (!server) return <main className="app"><Loading label="Beheer openen…" /></main>;
  const { event, leaderboard } = server;

  return (
    <main className="app wide">
      <header className="topbar no-print">
        <Link href="/" className="brand-row" style={{ margin: 0 }}>
          <Shield size={40} />
          <span>
            <strong className="display">Beheer</strong>
            <small className="muted" style={{ display: "block" }}>{event.name}</small>
          </span>
        </Link>
        <div className="timer">
          <small>{event.status.toUpperCase()}</small>
          {formatRemaining(event.remainingMs)}
        </div>
      </header>
      {accessOnce ? (
        <Banner tone="paper">
          Bewaar deze toegangscode. Hij wordt niet opnieuw getoond: {accessOnce}{" "}
          <button
            type="button"
            className="btn dark"
            onClick={() => {
              sessionStorage.removeItem("sparta-access-once");
              setAccessOnce(null);
            }}
          >
            Genoteerd
          </button>
        </Banner>
      ) : null}
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <div className="tabs no-print">
        {SECTIONS.map(([id, label]) => (
          <button key={id} type="button" className={section === id ? "on" : ""} onClick={() => setSection(id)}>
            {label}
          </button>
        ))}
      </div>
      {section === "overzicht" ? <Overview event={event} busy={busy} run={run} /> : null}
      {section === "instellingen" ? <Settings key={event.id + event.name} event={event} busy={busy} run={run} /> : null}
      {section === "teams" ? <Teams event={event} busy={busy} run={run} /> : null}
      {section === "ruimtes" ? <Rooms event={event} busy={busy} run={run} /> : null}
      {section === "stations" ? <Stations event={event} busy={busy} run={run} /> : null}
      {section === "spellen" ? <GamesGuide event={event} /> : null}
      {section === "qr" ? <QrSheet event={event} /> : null}
      {section === "punten" ? <Points event={event} busy={busy} run={run} /> : null}
      {section === "aanwijzingen" ? <Clues event={event} busy={busy} run={run} /> : null}
      {section === "finale" ? <Finale event={event} busy={busy} run={run} /> : null}
      {section === "klassement" ? <AdminBoard rows={leaderboard} /> : null}
      {section === "fotos" ? <Photos event={event} busy={busy} run={run} reload={() => refresh(true)} /> : null}
      {section === "uitslag" ? <Results event={event} busy={busy} run={run} /> : null}
      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}

function Overview({
  event,
  busy,
  run,
}: {
  event: OrganizerSnapshot["event"];
  busy: boolean;
  run: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  const pending = event.teams.reduce((sum, team) => sum + team.pendingPhotos.filter((photo) => photo.status === "pending").length, 0);
  const stuck = event.teams.filter((team) => team.stuck);
  const [lobbyUrl, setLobbyUrl] = useState(`/onderzoek/${event.lobbyToken}`);
  useEffect(() => {
    setLobbyUrl(`${window.location.origin}/onderzoek/${event.lobbyToken}`);
  }, [event.lobbyToken]);
  return (
    <div className="stack">
      <section className="stats">
        <article className="stat"><b>{event.teams.length}</b><span>teams</span></article>
        <article className="stat"><b>{event.stations.filter((station) => station.visible).length}</b><span>open stations</span></article>
        <article className="stat"><b>{pending}</b><span>foto's te doen</span></article>
        <article className="stat"><b>{stuck.length}</b><span>teams zonder start</span></article>
      </section>
      <div className="paper dark stack">
        <p className="kicker">Ruimtecode voor de iPads</p>
        <p className="pad-code">{event.padCode}</p>
        <p className="small">Deze code typen de deelnemers op het allereerste scherm. Zij hoeven geen link in te voeren.</p>
        <p className="small">Open vandaag: {event.rooms.filter((room) => room.available).map((room) => room.name).join(", ") || "geen"}.</p>
        <p className="small">Gesloten: {event.rooms.filter((room) => !room.available).map((room) => room.name).join(", ") || "geen"}.</p>
        <div className="row">
          <Button kind="paper" onClick={() => void navigator.clipboard.writeText(event.padCode)}>Kopieer de ruimtecode</Button>
          <Button kind="ghost" onClick={() => void navigator.clipboard.writeText(lobbyUrl)}>Kopieer de link</Button>
        </div>
        <p className="small">{event.teams.length} {event.teams.length === 1 ? "team is" : "teams zijn"} aangemeld.</p>
        <div className="row">
          {event.status === "lobby" ? <Button disabled={busy} onClick={() => void run({ action: "start" }, "Het onderzoek is gestart.")}>START HET ONDERZOEK</Button> : null}
          {event.status === "active" ? <Button disabled={busy} kind="warn" onClick={() => void run({ action: "pause" }, "Het spel staat op pauze.")}>Pauzeren</Button> : null}
          {event.status === "paused" ? <Button disabled={busy} onClick={() => void run({ action: "resume" }, "Het spel gaat verder.")}>Verder</Button> : null}
          {event.status === "active" || event.status === "paused" ? (
            <Button disabled={busy} kind="dark" onClick={() => void run({ action: "end" }, "Het evenement is beëindigd en de uitslag staat open.")}>Beëindig en toon uitslag</Button>
          ) : null}
          {!event.finaleOpen ? <Button disabled={busy} onClick={() => void run({ action: "open-finale" }, "De finale is open.")}>Open de finale</Button> : <Button disabled={busy} kind="ghost" onClick={() => void run({ action: "close-finale" }, "De finale is weer dicht.")}>Sluit de finale</Button>}
        </div>
      </div>
      {stuck.length ? (
        <Banner>{stuck.map((team) => team.name).join(", ")} {stuck.length === 1 ? "heeft" : "hebben"} na 15 minuten nog geen station voltooid.</Banner>
      ) : null}
      <div className="stack">
        {event.teams.map((team) => (
          <article key={team.id} className="paper spread">
            <div>
              <b>{team.name}</b>
              <p className="small" style={{ margin: 0 }}>Aangemeld · {team.completedCount} opdrachten · {team.clueCount} aanwijzingen · zaak {team.finaleSolved ? "opgelost" : "open"}</p>
              {team.writings.map((writing) => (
                <p key={writing.prompt} className="small" style={{ margin: "8px 0 0" }}><b>{writing.prompt}</b><br />{writing.response}</p>
              ))}
            </div>
            <strong>{team.score}</strong>
          </article>
        ))}
      </div>
    </div>
  );
}

function Settings({
  event,
  busy,
  run,
}: {
  event: OrganizerSnapshot["event"];
  busy: boolean;
  run: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  const [name, setName] = useState(event.name);
  const [duration, setDuration] = useState(String(event.durationMinutes));
  const [tiebreaker, setTiebreaker] = useState(event.tiebreaker);
  return (
    <form
      className="paper stack"
      onSubmit={(submit) => {
        submit.preventDefault();
        void run({ action: "save-settings", settings: { name, durationMinutes: Number(duration), tiebreaker } }, "Instellingen opgeslagen.");
      }}
    >
      <h2 className="display">Evenement</h2>
      <Field label="Naam" value={name} onChange={setName} />
      <Field label="Speelduur in minuten" type="number" value={duration} onChange={setDuration} />
      <label className="field">
        <span>Gelijke stand</span>
        <select value={tiebreaker} onChange={(input) => setTiebreaker(input.target.value as typeof tiebreaker)}>
          <option value="finale_then_time">Eerst de finalescore, daarna wie die score het eerst had</option>
          <option value="time_then_finale">Eerst wie de score het eerst had, daarna de finalescore</option>
        </select>
      </label>
      <Button type="submit" disabled={busy}>Bewaar evenement</Button>
    </form>
  );
}

function Teams({
  event,
  busy,
  run,
}: {
  event: OrganizerSnapshot["event"];
  busy: boolean;
  run: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  return (
    <div className="stack">
      <form
        className="paper stack"
        onSubmit={(submit) => {
          submit.preventDefault();
          void run({ action: "add-team", name }, "Team toegevoegd.");
          setName("");
        }}
      >
        <Field label="Nieuw team" value={name} onChange={setName} />
        <Button type="submit" disabled={busy || !name.trim()}>Team toevoegen</Button>
      </form>
      {event.teams.map((team) => (
        <TeamCard key={team.id} team={team} busy={busy} run={run} />
      ))}
    </div>
  );
}

function TeamCard({
  team,
  busy,
  run,
}: {
  team: OrganizerSnapshot["event"]["teams"][number];
  busy: boolean;
  run: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  const [name, setName] = useState(team.name);
  const [confirm, setConfirm] = useState("");
  const [points, setPoints] = useState("0");
  const [reason, setReason] = useState("");
  const [openReset, setOpenReset] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/deelnemen?code=${team.joinCode}` : team.joinCode;
  return (
    <article className="paper stack">
      <div className="spread">
        <h3 style={{ margin: 0 }}>{team.name}</h3>
        <b>{team.score} pt</b>
      </div>
      <p className="small">Code {team.joinCode} · {team.completedCount} stations · {team.hintsUsed} hints{team.stuck ? " · lijkt vast te lopen" : ""}</p>
      <Button kind="dark" onClick={() => void navigator.clipboard.writeText(link)}>Kopieer uitnodigingslink</Button>
      <Field label="Teamnaam" value={name} onChange={setName} />
      <Button disabled={busy} onClick={() => void run({ action: "rename-team", teamId: team.id, name }, "Naam aangepast.")}>Naam opslaan</Button>
      <div className="grid-2">
        <Field label="Puntencorrectie" type="number" value={points} onChange={setPoints} />
        <Field label="Reden" value={reason} onChange={setReason} />
      </div>
      <Button kind="warn" disabled={busy || !reason.trim()} onClick={() => void run({ action: "adjust-score", teamId: team.id, points: Number(points), reason }, "Correctie opgeslagen.")}>
        Correctie toepassen
      </Button>
      {openReset ? (
        <>
          <p>Typ de teamnaam om dit team definitief te verwijderen.</p>
          <Field label="Bevestiging" value={confirm} onChange={setConfirm} />
          <Button kind="primary" disabled={busy || confirm !== team.name} onClick={() => void run({ action: "delete-team", teamId: team.id, confirm }, "Team verwijderd.")}>
            Verwijder team
          </Button>
        </>
      ) : (
        <Button kind="ghost" onClick={() => setOpenReset(true)}>Team verwijderen</Button>
      )}
    </article>
  );
}

function Rooms({
  event,
  busy,
  run,
}: {
  event: OrganizerSnapshot["event"];
  busy: boolean;
  run: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  return (
    <div className="stack">
      <p>Zet een ruimte uit als die niet gebruikt mag worden. Vul daarna een alternatieve locatie in als de minigame wél gespeeld moet worden.</p>
      {event.rooms.map((room) => {
        const stations = event.stations.filter((station) => station.roomId === room.id);
        return (
          <article key={room.id} className="paper stack">
            <div className="spread">
              <div>
                <h3 style={{ margin: 0 }}>{room.name}</h3>
                <p className="small" style={{ margin: 0 }}>{room.available ? "Beschikbaar als speelplek" : "Verborgen, tenzij een station een alternatief heeft"}</p>
              </div>
              <button
                type="button"
                className={`switch ${room.available ? "on" : ""}`}
                role="switch"
                aria-checked={room.available}
                aria-label={`${room.name} ${room.available ? "sluiten" : "openen"}`}
                disabled={busy}
                onClick={() => void run({ action: "save-rooms", rooms: event.rooms.map((item) => ({ id: item.id, available: item.id === room.id ? !item.available : item.available })) }, room.available ? `${room.name} is gesloten.` : `${room.name} is open.`)}
              >
                <i />
              </button>
            </div>
            {stations.map((station) => (
              <Alternative key={station.id} station={station} busy={busy} run={run} hidden={!room.available && !station.alternativeLocation.trim()} />
            ))}
          </article>
        );
      })}
    </div>
  );
}

function Alternative({
  station,
  busy,
  run,
  hidden,
}: {
  station: OrganizerStation;
  busy: boolean;
  run: (body: Record<string, unknown>, success: string) => Promise<void>;
  hidden: boolean;
}) {
  const [place, setPlace] = useState(station.alternativeLocation);
  return (
    <div className="stack">
      {hidden ? <Banner>Dit station is nu verborgen voor de teams.</Banner> : null}
      <Field label={`Alternatieve locatie voor ${station.name}`} value={place} onChange={setPlace} placeholder="Bijvoorbeeld de skybox" />
      <Button kind="dark" disabled={busy} onClick={() => void run({ action: "save-station", station: { ...station, alternativeLocation: place } }, "Locatie opgeslagen.")}>
        Locatie opslaan
      </Button>
    </div>
  );
}

function Stations({
  event,
  busy,
  run,
}: {
  event: OrganizerSnapshot["event"];
  busy: boolean;
  run: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  return (
    <div className="stack">
      <Button disabled={busy} onClick={() => void run({ action: "add-station", station: { name: "Extra station", roomId: event.rooms[0].id, game: "reaction", pointsMax: event.scoring.reactionMax, clueTitle: "Extra", clueText: "Pas deze aanwijzing aan." } }, "Station toegevoegd.")}>
        Station toevoegen
      </Button>
      {event.stations.map((station) => (
        <StationEditor key={station.id} station={station} event={event} busy={busy} run={run} />
      ))}
    </div>
  );
}

function StationEditor({
  station,
  event,
  busy,
  run,
}: {
  station: OrganizerStation;
  event: OrganizerSnapshot["event"];
  busy: boolean;
  run: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(station);
  const [confirm, setConfirm] = useState("");
  return (
    <form
      className="paper stack"
      onSubmit={(submit) => {
        submit.preventDefault();
        void run({ action: "save-station", station: draft }, "Station opgeslagen.");
      }}
    >
      <div className="spread">
        <h3 style={{ margin: 0 }}>{draft.name}</h3>
        <span className="stamp">{draft.visible ? draft.code : "Verborgen"}</span>
      </div>
      <Field label="Naam" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
      <label className="field">
        <span>Ruimte</span>
        <select value={draft.roomId} onChange={(input) => setDraft({ ...draft, roomId: input.target.value })}>
          {event.rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Minigame</span>
        <select value={draft.game} onChange={(input) => setDraft({ ...draft, game: input.target.value as OrganizerStation["game"] })}>
          <option value="reaction">Reaction Arena</option>
          <option value="memory">Memory Vault</option>
          <option value="code">Crack the Code</option>
          <option value="photo">Photo Mission</option>
        </select>
      </label>
      {draft.game === "code" ? (
        <label className="field">
          <span>Puzzel</span>
          <select value={draft.puzzleId ?? "verdubbeling"} onChange={(input) => setDraft({ ...draft, puzzleId: input.target.value })}>
            <option value="verdubbeling">Het scorebord</option>
            <option value="kasteel">Verschoven letters</option>
            <option value="dambord">Doelpunt of kaart</option>
            <option value="optelsom">De vierde treffer</option>
          </select>
        </label>
      ) : null}
      <Field label="Puntenmaximum" type="number" value={draft.pointsMax} onChange={(value) => setDraft({ ...draft, pointsMax: Number(value) })} />
      <Field label="Alternatieve locatie" value={draft.alternativeLocation} onChange={(alternativeLocation) => setDraft({ ...draft, alternativeLocation })} />
      <label className="spread">
        <span>Station aan</span>
        <input type="checkbox" checked={draft.enabled} onChange={(input) => setDraft({ ...draft, enabled: input.target.checked })} />
      </label>
      <Button type="submit" disabled={busy}>Station opslaan</Button>
      <Field label="Typ VERWIJDER om dit station te wissen" value={confirm} onChange={setConfirm} />
      <Button kind="ghost" disabled={busy || confirm !== "VERWIJDER"} onClick={() => void run({ action: "delete-station", stationId: station.id, confirm }, "Station verwijderd.")}>
        Verwijder station
      </Button>
    </form>
  );
}

function GamesGuide({ event }: { event: OrganizerSnapshot["event"] }) {
  const games = [
    ["reaction", "Reaction Arena", "Twaalf symbolen. Alleen het Sparta-schild is goed. Score op nauwkeurigheid en snelheid."],
    ["memory", "Memory Vault", "Zes paren. Extra pogingen en tijd kosten punten, afronden levert altijd een bodemscore op."],
    ["code", "Crack the Code", "Het antwoord staat alleen op de server. Een foute gok verklapt de oplossing niet."],
    ["photo", "Photo Mission", "Het team stuurt een foto. Jij beoordeelt creativiteit, samenwerking en uitvoering."],
  ] as const;
  return (
    <div className="stack">
      {games.map(([id, title, text]) => (
        <article key={id} className="paper stack">
          <h2 className="display">{title}</h2>
          <p>{text}</p>
          <p className="small">
            Stations: {event.stations.filter((station) => station.game === id).map((station) => `${station.name} (${station.visible ? "open" : "verborgen"})`).join(", ") || "geen"}
          </p>
          {id === "code" ? (
            <p className="small">
              Puzzelantwoorden, alleen voor de organisatie: {event.stations.filter((station) => station.puzzleTitle).map((station) => `${station.puzzleTitle} = ${station.puzzleAnswer}`).join(" · ")}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function QrSheet({ event }: { event: OrganizerSnapshot["event"] }) {
  return (
    <div className="stack qr-sheet">
      <div className="spread no-print">
        <div>
          <h2 className="display">Vaste QR-codes</h2>
          <p className="small">Deze codes horen bij de ruimte, niet bij dit evenement. Print ze één keer en gebruik ze bij elk volgend evenement.</p>
        </div>
        <Button kind="paper" onClick={() => window.print()}>Printen</Button>
      </div>
      <div className="qr-grid">
        {event.rooms.map((room) => (
          <article key={room.id} className="paper qr-card stack">
            <img src={`/api/qr/ruimte/${room.id}`} alt={`QR-code voor ${room.name}`} />
            <h3 className="display" style={{ margin: 0, textAlign: "center" }}>{room.name}</h3>
            <p className="pad-code" style={{ fontSize: "1.4rem" }}>{ROOM_CODES[room.id] ?? room.id.toUpperCase()}</p>
            <p className="small" style={{ textAlign: "center" }}>{room.available ? "Vandaag open" : "Vandaag gesloten"}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function Points({
  event,
  busy,
  run,
}: {
  event: OrganizerSnapshot["event"];
  busy: boolean;
  run: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  const [scoring, setScoring] = useState<ScoringConfig>(event.scoring);
  const field = (key: keyof ScoringConfig, label: string) => (
    <Field label={label} type="number" value={scoring[key]} onChange={(value) => setScoring({ ...scoring, [key]: Number(value) })} />
  );
  return (
    <form
      className="paper stack"
      onSubmit={(submit) => {
        submit.preventDefault();
        void run({ action: "save-settings", settings: { scoring } }, "Puntentelling opgeslagen.");
      }}
    >
      <h2 className="display">Punten en hints</h2>
      <p className="small">Nieuwe stations gebruiken deze standaard. Bestaande stations houden hun eigen maximum, tot je dat bij het station wijzigt. Hints kosten meteen punten en worden maar één keer per opdracht gerekend.</p>
      {field("hintCost", "Kosten per hint")}
      {field("maxHints", "Maximum hints per team")}
      {field("finalePoints", "Punten voor de finale")}
      {field("wrongFinalePenalty", "Strafpunten bij een foute eindcode")}
      {field("memoryAttemptPenalty", "Memory: aftrek per extra poging")}
      {field("memoryTimePenalty", "Memory: aftrek per 15 seconden")}
      <Button type="submit" disabled={busy}>Bewaar puntentelling</Button>
    </form>
  );
}

function Clues({
  event,
  busy,
  run,
}: {
  event: OrganizerSnapshot["event"];
  busy: boolean;
  run: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  return (
    <div className="stack">
      <p>Elk station levert één aanwijzing op, alleen na een geldige afronding. Pas de tekst aan als je de eindcode wijzigt.</p>
      {event.stations.map((station) => (
        <ClueEditor key={station.id} station={station} busy={busy} run={run} />
      ))}
    </div>
  );
}

function ClueEditor({
  station,
  busy,
  run,
}: {
  station: OrganizerStation;
  busy: boolean;
  run: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(station.clueTitle);
  const [text, setText] = useState(station.clueText);
  return (
    <form
      className="paper stack"
      onSubmit={(submit) => {
        submit.preventDefault();
        void run({ action: "save-station", station: { ...station, clueTitle: title, clueText: text } }, "Aanwijzing opgeslagen.");
      }}
    >
      <h3 style={{ margin: 0 }}>{station.name}</h3>
      <Field label="Titel" value={title} onChange={setTitle} />
      <Field label="Tekst" textarea value={text} onChange={setText} />
      <Button type="submit" disabled={busy}>Bewaar aanwijzing</Button>
    </form>
  );
}

function Finale({
  event,
  busy,
  run,
}: {
  event: OrganizerSnapshot["event"];
  busy: boolean;
  run: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  const [answer, setAnswer] = useState(event.finaleAnswer);
  const [prompt, setPrompt] = useState(event.finalePrompt);
  const [hint, setHint] = useState(event.finaleHint);
  const [secret, setSecret] = useState(event.secretText);
  return (
    <form
      className="paper stack"
      onSubmit={(submit) => {
        submit.preventDefault();
        void run({ action: "save-settings", settings: { finaleAnswer: answer, finalePrompt: prompt, finaleHint: hint, secretText: secret } }, "Finale opgeslagen.");
      }}
    >
      <h2 className="display">Finale</h2>
      <p className="small">Het antwoord blijft op de server. Spaties en leestekens vallen weg, hoofdletters maken niet uit. De standaardcode is ROOD1888 en past bij de meegeleverde aanwijzingen.</p>
      <Field label="Eindcode" value={answer} onChange={setAnswer} />
      <Field label="Uitleg voor de teams" textarea value={prompt} onChange={setPrompt} />
      <Field label="Finalehint" textarea value={hint} onChange={setHint} />
      <Field label="Het fictieve geheim" textarea value={secret} onChange={setSecret} />
      <Button type="submit" disabled={busy}>Bewaar finale</Button>
      <div className="row">
        <Button type="button" disabled={busy} onClick={() => void run({ action: event.finaleOpen ? "close-finale" : "open-finale" }, event.finaleOpen ? "Finale gesloten." : "Finale geopend.")}>
          {event.finaleOpen ? "Sluit de finale" : "Open de finale"}
        </Button>
      </div>
    </form>
  );
}

function AdminBoard({ rows }: { rows: OrganizerSnapshot["leaderboard"] }) {
  return (
    <div className="stack">
      <h2 className="display">Klassement</h2>
      <p className="small muted">De stand ververst elke 5 seconden zolang je op dit scherm blijft.</p>
      <table className="table">
        <thead>
          <tr><th>#</th><th>Team</th><th>Score</th><th>Stations</th><th>Finale</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.teamId}>
              <td>{row.position}</td>
              <td>{row.name}</td>
              <td>{row.score}</td>
              <td>{row.completedCount}</td>
              <td>{row.finaleStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Photos({
  event,
  busy,
  run,
  reload,
}: {
  event: OrganizerSnapshot["event"];
  busy: boolean;
  run: (body: Record<string, unknown>, success: string) => Promise<void>;
  reload: () => Promise<OrganizerSnapshot>;
}) {
  const photos = event.teams.flatMap((team) => team.pendingPhotos.map((photo) => ({ ...photo, teamId: team.id, teamName: team.name, max: event.stations.find((station) => station.id === photo.stationId)?.pointsMax ?? 100 })));
  return (
    <div className="stack">
      <Button kind="dark" onClick={() => void reload()}>Laad de foto's</Button>
      {photos.length === 0 ? <Banner>Er staan geen foto's klaar.</Banner> : null}
      {photos.map((photo) => (
        <PhotoCard key={`${photo.teamId}-${photo.stationId}`} photo={photo} busy={busy} run={run} />
      ))}
    </div>
  );
}

function PhotoCard({
  photo,
  busy,
  run,
}: {
  photo: {
    teamId: string;
    teamName: string;
    stationId: string;
    stationName: string;
    prompt: string;
    dataUrl?: string;
    creativity: number;
    teamwork: number;
    execution: number;
    status: "pending" | "reviewed";
    points: number;
    max: number;
  };
  busy: boolean;
  run: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  const [creativity, setCreativity] = useState(photo.creativity);
  const [teamwork, setTeamwork] = useState(photo.teamwork);
  const [execution, setExecution] = useState(photo.execution);
  const [points, setPoints] = useState(photo.status === "reviewed" ? photo.points : suggestedPhotoPoints(photo.creativity, photo.teamwork, photo.execution, photo.max));
  return (
    <article className="paper stack">
      <h3 style={{ margin: 0 }}>{photo.teamName} · {photo.stationName}</h3>
      <p className="small">{photo.prompt}</p>
      {photo.dataUrl ? <img src={photo.dataUrl} alt={`Foto van ${photo.teamName}`} style={{ borderRadius: 16 }} /> : <Banner>De foto zelf laad je met de knop hierboven.</Banner>}
      <Field label="Creativiteit, 0 tot 10" type="number" value={creativity} onChange={(value) => {
        const next = Number(value);
        setCreativity(next);
        setPoints(suggestedPhotoPoints(next, teamwork, execution, photo.max));
      }} />
      <Field label="Samenwerking, 0 tot 10" type="number" value={teamwork} onChange={(value) => {
        const next = Number(value);
        setTeamwork(next);
        setPoints(suggestedPhotoPoints(creativity, next, execution, photo.max));
      }} />
      <Field label="Uitvoering, 0 tot 10" type="number" value={execution} onChange={(value) => {
        const next = Number(value);
        setExecution(next);
        setPoints(suggestedPhotoPoints(creativity, teamwork, next, photo.max));
      }} />
      <Field label="Punten" type="number" value={points} onChange={(value) => setPoints(Number(value))} />
      <Button disabled={busy} onClick={() => void run({ action: "review-photo", teamId: photo.teamId, stationId: photo.stationId, creativity, teamwork, execution, points }, "Foto beoordeeld.")}>
        Ken punten toe
      </Button>
      <Button kind="ghost" disabled={busy} onClick={() => void run({ action: "retake-photo", teamId: photo.teamId, stationId: photo.stationId }, "Het team mag een nieuwe foto sturen.")}>
        Laat opnieuw insturen
      </Button>
    </article>
  );
}

function Results({
  event,
  busy,
  run,
}: {
  event: OrganizerSnapshot["event"];
  busy: boolean;
  run: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  const [reset, setReset] = useState("");
  const [clearTeam, setClearTeam] = useState(event.teams[0]?.id ?? "");
  const [clearStation, setClearStation] = useState(event.stations[0]?.id ?? "");
  const [clearConfirm, setClearConfirm] = useState("");
  return (
    <div className="stack">
      <article className="paper stack">
        <h2 className="display">Uitslag</h2>
        <p>{event.resultsPublished ? "De teams kunnen het geheim en de stand zien." : "Beëindig het evenement om de officiële uitslag te tonen."}</p>
        {event.status !== "finished" ? <Button disabled={busy || event.status === "lobby"} onClick={() => void run({ action: "end" }, "Uitslag getoond.")}>Beëindig en toon uitslag</Button> : null}
      </article>
      {event.teams.map((team) => (
        <article key={team.id} className="paper stack">
          <h3 style={{ margin: 0 }}>{team.name} · {team.score}</h3>
          {team.ledger.map((line, index) => (
            <div key={`${line.label}-${index}`} className="spread"><span>{line.label}</span><b>{line.points}</b></div>
          ))}
        </article>
      ))}
      <form
        className="paper stack"
        onSubmit={(submit) => {
          submit.preventDefault();
          void run({ action: "clear-completion", teamId: clearTeam, stationId: clearStation, confirm: clearConfirm }, "Station vrijgegeven.");
        }}
      >
        <h3>Uitzondering: station opnieuw laten spelen</h3>
        <p className="small">Dit haalt de score en de aanwijzing van dat station weg. Typ OPNIEUW om te bevestigen.</p>
        <label className="field"><span>Team</span>
          <select value={clearTeam} onChange={(input) => setClearTeam(input.target.value)}>
            {event.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Station</span>
          <select value={clearStation} onChange={(input) => setClearStation(input.target.value)}>
            {event.stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
          </select>
        </label>
        <Field label="Bevestiging" value={clearConfirm} onChange={setClearConfirm} />
        <Button type="submit" disabled={busy || clearConfirm !== "OPNIEUW"}>Geef het station vrij</Button>
      </form>
      <form
        className="paper stack"
        onSubmit={(submit) => {
          submit.preventDefault();
          void run({ action: "reset", confirm: reset }, "De speelsessie is leeg. Teams en instellingen blijven staan.");
        }}
      >
        <h3>Nieuwe speelsessie</h3>
        <p>Dit wist scores, aanwijzingen, foto's en de finalevoortgang. Teams, ruimtes en stations blijven. Typ RESET.</p>
        <Field label="Bevestiging" value={reset} onChange={setReset} />
        <Button type="submit" disabled={busy || reset !== "RESET"}>Zet het spel terug</Button>
      </form>
    </div>
  );
}

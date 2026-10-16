import Link from "next/link";
import { Shield } from "@/components/Shield";

export default function HomePage() {
  return (
    <main className="app hero">
      <div className="brand-row">
        <Shield />
        <div>
          <p className="kicker">Sparta Rotterdam</p>
          <strong>De Verdwenen Erfenis</strong>
        </div>
      </div>
      <p className="kicker">Vertrouwelijk dossier</p>
      <h1 className="display">
        DE VERDWENEN
        <br />
        ERFENIS
      </h1>
      <p className="lead">Een onderzoek in Het Kasteel. De verdwijning is een spelverhaal.</p>
      <article className="paper ticket stack" style={{ marginTop: 22 }}>
        <div className="spread">
          <span className="stamp">Verzegeld</span>
          <span className="stamp gold">Spelverhaal</span>
        </div>
        <p className="serif" style={{ fontSize: "1.15rem", lineHeight: 1.5 }}>
          Een oud dossier uit 1888 lijkt verdwenen. Jullie team zoekt in Het Kasteel naar aanwijzingen en wijst aan het
          einde een verzonnen verdachte aan. Deelnemers openen de link van de instructeur en vullen alleen hun teamnaam in.
        </p>
        <div className="stats">
          <div className="stat">
            <b>4</b>
            <span>minigames</span>
          </div>
          <div className="stat">
            <b>6</b>
            <span>ruimtes</span>
          </div>
        </div>
      </article>
      <div className="stack" style={{ marginTop: 18 }}>
        <Link className="btn primary full" href="/beheer">
          Instructeur
        </Link>
        <p className="small">Deelnemers gebruiken de lobbylink op hun iPad. Die link kiest het evenement, niet een code op het scherm.</p>
      </div>
    </main>
  );
}

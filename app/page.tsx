import Link from "next/link";
import { Shield } from "@/components/Shield";
import { EntryForm } from "@/components/home/EntryForm";

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
          einde een verzonnen verdachte aan. Vul de ruimtecode van de instructeur in. Daarna alleen jullie teamnaam.
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
        <EntryForm />
        <Link className="btn ghost full" href="/beheer">
          Instructeur
        </Link>
      </div>
    </main>
  );
}

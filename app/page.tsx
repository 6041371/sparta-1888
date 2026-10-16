import Link from "next/link";
import { Shield } from "@/components/Shield";

export default function HomePage() {
  return (
    <main className="app hero">
      <div className="brand-row">
        <Shield />
        <div>
          <p className="kicker">Sparta Stadion · teamspel</p>
          <strong>90 minuten in Het Kasteel</strong>
        </div>
      </div>
      <p className="kicker">Vertrouwelijk dossier</p>
      <h1 className="display">
        SPARTA
        <br />
        1888
      </h1>
      <p className="lead">Het geheim van Het Kasteel</p>
      <article className="paper ticket stack" style={{ marginTop: 22 }}>
        <div className="spread">
          <span className="stamp">Verzegeld</span>
          <span className="stamp gold">Spelverhaal</span>
        </div>
        <p className="serif" style={{ fontSize: "1.15rem", lineHeight: 1.5 }}>
          Er liggen aanwijzingen over de oorsprong, de identiteit en de mentaliteit van Sparta. Dit dossier is verzonnen
          voor het spel. Jullie kiezen de route, spelen de stations en kraken de eindcode.
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
        <Link className="btn primary full" href="/deelnemen">
          Ik heb een teamcode
        </Link>
        <Link className="btn ghost full" href="/beheer">
          Organisator
        </Link>
      </div>
    </main>
  );
}

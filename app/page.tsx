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
          <strong>Het Geheim van 1888</strong>
        </div>
      </div>
      <p className="kicker">Vertrouwelijk dossier</p>
      <h1 className="display">
        HET GEHEIM
        <br />
        VAN 1888
      </h1>
      <p className="lead">Een interactieve reis door de geschiedenis van Sparta Rotterdam.</p>
      <article className="paper ticket stack" style={{ marginTop: 22 }}>
        <div className="spread">
          <span className="stamp">Verzegeld</span>
          <span className="stamp gold">Spelverhaal</span>
        </div>
        <p className="serif" style={{ fontSize: "1.15rem", lineHeight: 1.5 }}>
          Het standbeeld van Bok de Korver is verdwenen. Jullie zoeken uit wat er gebeurd is en wijzen daarna een verzonnen verdachte aan. Vul de ruimtecode van de instructeur in. Daarna alleen jullie teamnaam.
        </p>
        <div className="stats">
          <div className="stat">
            <b>7</b>
            <span>bewijzen</span>
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

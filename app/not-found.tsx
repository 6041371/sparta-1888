import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app">
      <p className="kicker">Onbekende pagina</p>
      <h1 className="display">Deze route ligt buiten het kasteel</h1>
      <Link className="btn primary" href="/">
        Naar het begin
      </Link>
    </main>
  );
}

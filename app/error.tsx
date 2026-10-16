"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="app">
      <h1 className="display">Er ging iets mis</h1>
      <p className="lead">De pagina kon niet worden geladen. Probeer het opnieuw.</p>
      <button className="btn primary" type="button" onClick={reset}>
        Opnieuw proberen
      </button>
    </main>
  );
}

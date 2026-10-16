"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="nl">
      <body style={{ margin: 0, background: "#202124", color: "#f4efe6", fontFamily: "sans-serif" }}>
        <main style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
          <p style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "#c4a574" }}>Sparta Rotterdam</p>
          <h1>De pagina kon niet laden</h1>
          <p>{error.message || "Er ging iets mis in de app. Vernieuw de pagina en probeer het opnieuw."}</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ background: "#8d1d2c", color: "white", border: 0, borderRadius: 14, minHeight: 52, padding: "0 18px", fontSize: 16 }}
          >
            Opnieuw proberen
          </button>
          <p>
            <a href="/" style={{ color: "#f4efe6" }}>Naar het begin</a>
          </p>
        </main>
      </body>
    </html>
  );
}

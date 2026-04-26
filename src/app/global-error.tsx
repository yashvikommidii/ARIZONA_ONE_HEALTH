"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <main className="container">
          <section className="card">
            <h2>Application error</h2>
            <p>{error.message || "Unexpected error occurred."}</p>
            <button type="button" onClick={() => reset()}>
              Retry
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}

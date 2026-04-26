"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="container">
      <section className="card">
        <h2>Something went wrong</h2>
        <p>Please try reloading this page.</p>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
      </section>
    </main>
  );
}

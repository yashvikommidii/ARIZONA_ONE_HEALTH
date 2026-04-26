"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

export default function LoginPage() {
  const router = useRouter();
  const { tx } = useLanguage();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.trim().toLowerCase(),
      dateOfBirth: dateOfBirth.trim(),
    };
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError(tx.loginFailed);
      return;
    }
    localStorage.setItem("username", payload.username);
    router.push("/home");
  };

  return (
    <main className="container login-shell">
      <section className="card login-card">
        <h2>{tx.login}</h2>
        <p className="home-muted">{tx.loginSubtitle}</p>
        <form className="grid" onSubmit={onSubmit}>
          <input
            placeholder={tx.firstName}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <input
            placeholder={tx.lastName}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          <input
            placeholder={tx.username}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            aria-label={tx.dob}
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
          />
          <button type="submit">{tx.submit}</button>
        </form>
        {error ? <p className="amount-negative">{error}</p> : null}
      </section>
    </main>
  );
}

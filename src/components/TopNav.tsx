"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, tx } = useLanguage();
  const loggedIn = pathname !== "/login";

  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <header className="topnav">
      <strong>{tx.appName}</strong>
      <div className="nav-links">
        {loggedIn && (
          <>
            <Link href="/home" className={isActive("/home") ? "nav-active" : ""}>
              {tx.home}
            </Link>
            <Link href="/risk" className={isActive("/risk") ? "nav-active" : ""}>
              {tx.risk}
            </Link>
            <Link href="/dashboard" className={isActive("/dashboard") ? "nav-active" : ""}>
              {tx.dashboard}
            </Link>
            <Link href="/map" className={isActive("/map") ? "nav-active" : ""}>
              {tx.map}
            </Link>
            <Link href="/chat" className={isActive("/chat") || isActive("/live-chat") ? "nav-active" : ""}>
              {tx.liveChat}
            </Link>
            <Link href="/about" className={isActive("/about") ? "nav-active" : ""}>
              {tx.about}
            </Link>
          </>
        )}
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as "en" | "es")}
          aria-label="Language selector"
        >
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
        {loggedIn && (
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("username");
              router.push("/login");
            }}
          >
            {tx.logout}
          </button>
        )}
      </div>
    </header>
  );
}

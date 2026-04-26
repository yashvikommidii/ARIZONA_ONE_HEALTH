import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { TopNav } from "@/components/TopNav";

export const metadata: Metadata = {
  title: "Arizona One Health",
  description: "Bilingual community risk dashboard prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <TopNav />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

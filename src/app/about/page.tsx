"use client";

import { useLanguage } from "@/components/LanguageProvider";

export default function AboutPage() {
  const { tx } = useLanguage();

  return (
    <main className="container about-shell">
      <section className="card">
        <h3>{tx.about}</h3>
        <p>{tx.aboutText}</p>
        <p>{tx.aboutFocusAreas}</p>
      </section>

      <section className="card">
        <h3>{tx.websiteGuide}</h3>
        <p className="home-muted">{tx.websiteGuideSubtitle}</p>
        <div className="about-page-grid">
          <article className="about-page-card">
            <h4>{tx.guideHomeTitle}</h4>
            <p>{tx.guideHomeDesc}</p>
          </article>
          <article className="about-page-card">
            <h4>{tx.guideRiskTitle}</h4>
            <p>{tx.guideRiskDesc}</p>
          </article>
          <article className="about-page-card">
            <h4>{tx.guideDashboardTitle}</h4>
            <p>{tx.guideDashboardDesc}</p>
          </article>
          <article className="about-page-card">
            <h4>{tx.guideMapTitle}</h4>
            <p>{tx.guideMapDesc}</p>
          </article>
          <article className="about-page-card">
            <h4>{tx.guideLiveChatTitle}</h4>
            <p>{tx.guideLiveChatDesc}</p>
          </article>
          <article className="about-page-card">
            <h4>{tx.guideAboutTitle}</h4>
            <p>{tx.guideAboutDesc}</p>
          </article>
        </div>
      </section>

      <section className="card">
        <h3>{tx.contact}</h3>
        <div className="about-contact-grid">
          <div className="about-contact-card">
            <h4>{tx.supportChannels}</h4>
            <p>{tx.supportEmail}</p>
            <p>{tx.supportWindow}</p>
          </div>
          <div className="about-contact-card">
            <h4>{tx.commonRequests}</h4>
            <p>{tx.reqAccount}</p>
            <p>{tx.reqData}</p>
            <p>{tx.reqPartnership}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

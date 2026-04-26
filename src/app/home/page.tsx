"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

type HomeData = {
  profile: { name: string; county: string; zipCode: string; age: number; username: string };
  todayReport: null | Record<string, string>;
  snapshot: {
    communityRisk: string;
    individualRisk: string;
    countyRisk: string;
    topDisease: string;
  };
  quickActions: { label: string; href: string }[];
  communityAlert: string;
  resources: { label: string; description: string; url: string }[];
  ads: { title: string; description: string; url: string; badge: string; cta: string; imageUrl: string }[];
};

export default function HomePage() {
  const router = useRouter();
  const { tx } = useLanguage();
  const [data, setData] = useState<HomeData | null>(null);

  const adBadgeLabel = (badge: string) => {
    if (badge === "In stock") return tx.adBadgeInStock;
    if (badge === "Open enrollment") return tx.adBadgeOpenEnrollment;
    if (badge === "Walk-ins welcome") return tx.adBadgeWalkIns;
    return badge;
  };
  const adCtaLabel = (cta: string) => {
    if (cta === "Shop now") return tx.adCtaShopNow;
    if (cta === "Compare plans") return tx.adCtaComparePlans;
    if (cta === "Find a clinic") return tx.adCtaFindClinic;
    return cta;
  };
  const adDescriptionLabel = (title: string, description: string) => {
    if (title === "Safeway Pharmacy") return tx.adDescSafeway;
    if (title === "Blue Cross Blue Shield of Arizona") return tx.adDescBlueCross;
    if (title === "CVS Health") return tx.adDescCvs;
    return description;
  };
  const resourceLabel = (label: string) => {
    if (label === "Arizona Department of Health Services") return tx.resourceAzdhs;
    if (label === "Find a nearby clinic") return tx.resourceClinic;
    if (label === "County public health contacts") return tx.resourceCountyContacts;
    if (label === "Health insurance near you") return tx.resourceInsurance;
    if (label === "Emergency contacts") return tx.resourceEmergency;
    if (label === "Nearby urgent care") return tx.resourceUrgentCare;
    return label;
  };
  const resourceDescriptionLabel = (label: string, description: string) => {
    if (label === "Health insurance near you") return tx.resourceInsuranceDesc;
    if (label === "Emergency contacts") return tx.resourceEmergencyDesc;
    if (label === "Nearby urgent care") return tx.resourceUrgentCareDesc;
    return description;
  };
  const quickActionLabel = (label: string) => {
    if (label === "Submit Today's Report") return tx.quickActionSubmit;
    if (label === "Risk Report") return tx.quickActionRisk;
    if (label === "Explore Dashboard") return tx.quickActionDashboard;
    if (label === "Live Chat") return tx.quickActionLiveChat;
    if (label === "Arizona Risk Map") return tx.quickActionAzUpdates;
    return label;
  };

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username) {
      router.push("/login");
      return;
    }
    fetch(`/api/home?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then(setData);
  }, [router]);

  if (!data) return <main className="container">{tx.loading}</main>;

  return (
    <main className="container home-shell">
      <section className="home-header">
        <div>
          <h2>{tx.welcome}, {data.profile.name.split(" ")[0]}</h2>
          <p>{tx.homeSubtitle}</p>
        </div>
      </section>

      <section className="home-grid">
        <article className="card home-info-card">
          <h3>{tx.profile}</h3>
          <p className="home-primary">{data.profile.name}</p>
          <p>
            {tx.age}: {data.profile.age}
          </p>
          <p>
            {tx.county}: {data.profile.county}
          </p>
        </article>

        <article className="card home-info-card">
          <h3>{tx.todayData}</h3>
          {data.todayReport ? (
            <div className="home-report">
              <p>
                <strong>{tx.disease}</strong>: {data.todayReport.suspected_disease}
              </p>
              <p>
                <strong>{tx.severity}</strong>: {data.todayReport.severity}
              </p>
              <p>
                <strong>{tx.zip}</strong>: {data.todayReport.zip_code}
              </p>
            </div>
          ) : (
            <p className="home-muted">{tx.noData}</p>
          )}
        </article>
      </section>

      <section className="home-kpi-grid">
        <article className="card">
          <h4>
            {tx.communityRisk} ({data.profile.zipCode})
          </h4>
          <p className="home-kpi">{data.snapshot.communityRisk}</p>
        </article>
        <article className="card">
          <h4>{tx.individualRisk}</h4>
          <p className="home-kpi">{data.snapshot.individualRisk}</p>
        </article>
        <article className="card">
          <h4>{tx.countyRisk}</h4>
          <p className="home-kpi">{data.snapshot.countyRisk}</p>
        </article>
        <article className="card">
          <h4>
            {tx.topDisease} in {data.profile.zipCode}
          </h4>
          <p className="home-kpi">{data.snapshot.topDisease}</p>
        </article>
      </section>

      <section className="card">
        <h3>{tx.quickActions}</h3>
        <div className="home-actions">
          {data.quickActions.map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="home-action-btn"
              target={action.href.startsWith("http") ? "_blank" : undefined}
              rel={action.href.startsWith("http") ? "noreferrer" : undefined}
            >
              {quickActionLabel(action.label)}
            </a>
          ))}
        </div>
      </section>

      <section className="card home-alert">
        <h3>{tx.communityAlert}</h3>
        <p>{tx.communityAlertMessage}</p>
      </section>

      <section className="card">
        <h3>{tx.resources}</h3>
        <div className="home-resources-grid">
          {data.resources.map((resource) => (
            <a
              key={resource.label}
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="home-resource-card"
            >
              <strong>{resourceLabel(resource.label)}</strong>
              <p>{resourceDescriptionLabel(resource.label, resource.description)}</p>
              <span className="home-ad-link">{tx.resourceMoreInfo} →</span>
            </a>
          ))}
        </div>
      </section>

      <section className="card home-ads">
        <div className="home-ads-head">
          <h3>{tx.ads}</h3>
          <span>{tx.trustedPartners}</span>
        </div>
        <div className="home-ads-grid">
          {data.ads.map((ad, idx) => (
            <a key={ad.title} href={ad.url} target="_blank" rel="noreferrer" className="home-ad-item">
              <div className="home-ad-image" style={{ backgroundImage: `url(${ad.imageUrl})` }}>
                <span className="home-ad-badge">{adBadgeLabel(ad.badge)}</span>
              </div>
              <span className="home-ad-dot" style={{ background: ["#AFA9EC", "#5DCAA5", "#EF9F27"][idx % 3] }} />
              <strong>{ad.title}</strong>
              <p>{adDescriptionLabel(ad.title, ad.description)}</p>
              <span className="home-ad-link">{adCtaLabel(ad.cta)} →</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

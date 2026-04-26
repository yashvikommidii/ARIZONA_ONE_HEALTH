"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { SymptomAnalysis, SymptomAnalysisPanel } from "@/components/SymptomAnalysisPanel";

type HomeData = {
  profile: { name: string; county: string; zipCode: string; age: number; username: string };
  todayReport: null | Record<string, string>;
  snapshot: {
    communityRisk: string;
    individualRisk: string;
    countyRisk: string;
    topDisease: string;
  };
  engagement: {
    submittedLast7Days: number;
    submittedLast30Days: number;
    currentStreakDays: number;
    longestStreakDays: number;
    badges: {
      title: string;
      description: string;
      threshold: string;
      unlocked: boolean;
      progress: number;
      goal: number;
    }[];
    scratchCards: {
      title: string;
      description: string;
      reward: string;
      unlocked: boolean;
      progress: number;
      goal: number;
    }[];
  };
  quickActions: { label: string; href: string }[];
  communityAlert: string;
  resources: { label: string; description: string; url: string }[];
  ads: { title: string; description: string; url: string; badge: string; cta: string; imageUrl: string }[];
};

type RiskMeta = {
  countyOptions: string[];
  zipOptionsByCounty: Record<string, string[]>;
};

const discountedItems = [
  {
    name: "20% off at-home wellness kit",
    url: "https://www.cvs.com/shop/home-health-care",
  },
  {
    name: "Discount pharmacy essentials",
    url: "https://www.safeway.com/pharmacy.html",
  },
  {
    name: "Savings on health plan resources",
    url: "https://www.healthcare.gov/",
  },
  {
    name: "Community care reward options",
    url: "https://www.azahcccs.gov/",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { tx } = useLanguage();
  const [data, setData] = useState<HomeData | null>(null);
  const [riskMeta, setRiskMeta] = useState<RiskMeta | null>(null);
  const [scratchReward, setScratchReward] = useState(discountedItems[0]);
  const [reportCounty, setReportCounty] = useState("");
  const [reportZip, setReportZip] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState("mild");
  const [onset, setOnset] = useState("today");
  const [hasTravel, setHasTravel] = useState(false);
  const [hasAnimalExposure, setHasAnimalExposure] = useState(false);
  const [analysis, setAnalysis] = useState<SymptomAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

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
  const badgeTitleLabel = (title: string) => {
    if (title === "7-Day Health Hero") return tx.badge7DayHeroTitle;
    if (title === "Half the Way Badge") return tx.badgeHalfwayTitle;
    return title;
  };
  const badgeDescriptionLabel = (title: string, description: string) => {
    if (title === "7-Day Health Hero") return tx.badge7DayHeroDescription;
    if (title === "Half the Way Badge") return tx.badgeHalfwayDescription;
    return description;
  };
  const badgeThresholdLabel = (title: string, threshold: string) => {
    if (title === "7-Day Health Hero") return tx.badge7DayHeroThreshold;
    if (title === "Half the Way Badge") return tx.badgeHalfwayThreshold;
    return threshold;
  };
  const scratchTitleLabel = (title: string) => {
    if (title === "2-Week Streak Scratch Card") return tx.scratch2WeekTitle;
    if (title === "30-Day Champion Scratch Card") return tx.scratch30DayTitle;
    return title;
  };
  const scratchDescriptionLabel = (title: string, description: string) => {
    if (title === "2-Week Streak Scratch Card") return tx.scratch2WeekDescription;
    if (title === "30-Day Champion Scratch Card") return tx.scratch30DayDescription;
    return description;
  };
  const symptomLabel = (symptom: string) => {
    const labels: Record<string, string> = {
      fever: tx.symptomFever,
      cough: tx.symptomCough,
      rash: tx.symptomRash,
      nausea: tx.symptomNausea,
      diarrhea: tx.symptomDiarrhea,
      fatigue: tx.symptomFatigue,
      headache: tx.symptomHeadache,
      respiratory: tx.symptomRespiratory,
      "sore throat": tx.symptomSoreThroat,
      "body aches": tx.symptomBodyAches,
    };
    return labels[symptom] ?? symptom;
  };

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username) {
      router.push("/login");
      return;
    }
    fetch(`/api/home?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((res: HomeData) => {
        setData(res);
        setReportCounty(res.profile.county);
        setReportZip(res.profile.zipCode);
      });
  }, [router]);

  useEffect(() => {
    fetch("/api/risk")
      .then((r) => r.json())
      .then((res: RiskMeta) => {
        setRiskMeta(res);
      });
  }, []);

  useEffect(() => {
    setScratchReward(discountedItems[Math.floor(Math.random() * discountedItems.length)]);
  }, []);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((item) => item !== symptom) : [...prev, symptom]
    );
  };

  const onReportCountyChange = (nextCounty: string) => {
    setReportCounty(nextCounty);
    setReportZip(riskMeta?.zipOptionsByCounty[nextCounty]?.[0] ?? "");
  };

  const submitSymptomReport = async () => {
    if (!data || !selectedSymptoms.length || analyzing) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          county: reportCounty,
          zipCode: reportZip,
          symptoms: selectedSymptoms,
          severity,
          onset,
          hasTravel,
          hasAnimalExposure,
          message: `Self-report: ${selectedSymptoms.join(", ")}`,
        }),
      });
      const payload = await res.json();
      if (res.ok) setAnalysis(payload.analysis);
    } finally {
      setAnalyzing(false);
    }
  };

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

      <section className="card self-report-card">
        <div className="home-ads-head">
          <div>
            <h3>{tx.selfReportTitle}</h3>
            <p className="home-muted">{tx.selfReportSubtitle}</p>
          </div>
        </div>
        <div className="self-report-grid">
          <label>
            {tx.county}
            <select value={reportCounty} onChange={(e) => onReportCountyChange(e.target.value)}>
              {(riskMeta?.countyOptions ?? [reportCounty]).filter(Boolean).map((countyOption) => (
                <option key={countyOption} value={countyOption}>
                  {countyOption}
                </option>
              ))}
            </select>
          </label>
          <label>
            ZIP
            <select value={reportZip} onChange={(e) => setReportZip(e.target.value)}>
              {(riskMeta?.zipOptionsByCounty[reportCounty] ?? [reportZip]).filter(Boolean).map((zip) => (
                <option key={zip} value={zip}>
                  {zip}
                </option>
              ))}
            </select>
          </label>
          <label>
            {tx.severityLabel}
            <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="mild">{tx.severityMild}</option>
              <option value="moderate">{tx.severityModerate}</option>
              <option value="severe">{tx.severitySevere}</option>
            </select>
          </label>
          <label>
            {tx.onsetLabel}
            <select value={onset} onChange={(e) => setOnset(e.target.value)}>
              <option value="today">{tx.onsetToday}</option>
              <option value="1-3">{tx.onsetOneToThree}</option>
              <option value="4-7">{tx.onsetFourToSeven}</option>
            </select>
          </label>
        </div>
        <div className="symptom-chip-grid">
          {["fever", "cough", "rash", "nausea", "diarrhea", "fatigue", "headache", "respiratory", "sore throat", "body aches"].map(
            (symptom) => (
              <button
                key={symptom}
                type="button"
                className={selectedSymptoms.includes(symptom) ? "symptom-chip active" : "symptom-chip"}
                onClick={() => toggleSymptom(symptom)}
              >
                {symptomLabel(symptom)}
              </button>
            )
          )}
        </div>
        <div className="self-report-toggles">
          <label>
            <input
              type="checkbox"
              checked={hasTravel}
              onChange={(e) => setHasTravel(e.target.checked)}
            />
            {tx.travelExposure}
          </label>
          <label>
            <input
              type="checkbox"
              checked={hasAnimalExposure}
              onChange={(e) => setHasAnimalExposure(e.target.checked)}
            />
            {tx.animalExposure}
          </label>
        </div>
        <button
          type="button"
          onClick={() => void submitSymptomReport()}
          disabled={!selectedSymptoms.length || analyzing}
        >
          {analyzing ? tx.analyzing : tx.submitAndAnalyze}
        </button>
        {analysis ? <SymptomAnalysisPanel analysis={analysis} /> : null}
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

      <section className="card home-engagement">
        <div className="home-ads-head">
          <div>
            <h3>{tx.submissionStreak}</h3>
            <p className="home-muted">{tx.submissionStreakSubtitle}</p>
          </div>
          <span>{data.engagement.currentStreakDays} {tx.dayStreakSuffix}</span>
        </div>
        <div className="home-streak-grid">
          <article className="home-streak-card">
            <strong>{data.engagement.submittedLast7Days}/7</strong>
            <span>{tx.submittedLast7DaysLabel}</span>
          </article>
          <article className="home-streak-card">
            <strong>{data.engagement.submittedLast30Days}/30</strong>
            <span>{tx.submittedLast30DaysLabel}</span>
          </article>
          <article className="home-streak-card">
            <strong>{data.engagement.longestStreakDays}</strong>
            <span>{tx.longestConsecutiveStreakLabel}</span>
          </article>
        </div>
      </section>

      <section className="home-reward-grid">
        <article className="card">
          <h3>{tx.badgesTitle}</h3>
          <div className="home-badge-list">
            {data.engagement.badges.map((badge) => (
              <div
                key={badge.title}
                className={`home-badge-card ${badge.unlocked ? "unlocked" : "locked"} ${
                  badge.goal >= 15 ? "gold" : "silver"
                }`}
              >
                <div className="home-badge-award" aria-hidden="true">
                  <span />
                </div>
                <div>
                  <div className="home-badge-title-row">
                    <strong>{badgeTitleLabel(badge.title)}</strong>
                    <span className="home-badge-status">
                      {badge.unlocked ? tx.badgeStatusEarned : tx.badgeStatusLocked}
                    </span>
                  </div>
                  <p>{badgeDescriptionLabel(badge.title, badge.description)}</p>
                  <span>
                    {tx.progressLabel}: {badge.progress}/{badge.goal} - {badgeThresholdLabel(badge.title, badge.threshold)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <h3>{tx.scratchCardsTitle}</h3>
          <div className="home-scratch-grid">
            {data.engagement.scratchCards.map((scratchCard) => {
              const cardContent = (
                <>
                  <span className="home-scratch-status">
                    {scratchCard.unlocked ? tx.scratchStatusReady : tx.scratchStatusKeepSubmitting}
                  </span>
                  <strong>{scratchTitleLabel(scratchCard.title)}</strong>
                  <p>{scratchDescriptionLabel(scratchCard.title, scratchCard.description)}</p>
                  <div className="home-scratch-reward">
                    {scratchCard.unlocked
                      ? scratchReward.name
                      : `${scratchCard.progress}/${scratchCard.goal} days`}
                  </div>
                </>
              );

              return scratchCard.unlocked ? (
                <a
                  key={scratchCard.title}
                  href={scratchReward.url}
                  target="_blank"
                  rel="noreferrer"
                  className="home-scratch-card unlocked clickable"
                  aria-label={`Scratch ${scratchCard.title} for ${scratchReward.name}`}
                >
                  {cardContent}
                </a>
              ) : (
                <div key={scratchCard.title} className="home-scratch-card locked">
                  {cardContent}
                </div>
              );
            })}
          </div>
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

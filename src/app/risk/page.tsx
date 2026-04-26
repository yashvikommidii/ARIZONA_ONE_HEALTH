"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type RiskResponse = {
  county: string;
  zipCode: string;
  zipOptions: string[];
  totalPopulation: number;
  scopedReportCount: number;
  communityRisk: number;
  topDiseases: { disease: string; count: number; individualRisk: number }[];
  travelRiskHotspots: { zipCode: string; reportCount: number; risk: number }[];
  countyTravelHotspots: { county: string; reportCount: number; risk: number }[];
};

type RiskMeta = {
  countyOptions: string[];
  zipOptionsByCounty: Record<string, string[]>;
};

export default function RiskPage() {
  const { tx } = useLanguage();
  const [meta, setMeta] = useState<RiskMeta | null>(null);
  const [county, setCounty] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [data, setData] = useState<RiskResponse | null>(null);
  const [travelView, setTravelView] = useState<"zip" | "county">("zip");

  useEffect(() => {
    fetch("/api/risk")
      .then((r) => r.json())
      .then((res: RiskMeta) => {
        setMeta(res);
        const firstCounty = res.countyOptions[0] ?? "";
        const firstZip = firstCounty ? res.zipOptionsByCounty[firstCounty]?.[0] ?? "" : "";
        setCounty(firstCounty);
        setZipCode(firstZip);
      });
  }, []);

  useEffect(() => {
    if (!county) return;
    const params = new URLSearchParams({ county, zipCode, days: "7" });
    fetch(`/api/risk?${params.toString()}`)
      .then((r) => r.json())
      .then(setData);
  }, [county, zipCode]);

  useEffect(() => {
    if (county) localStorage.setItem("riskCounty", county);
    if (zipCode) localStorage.setItem("riskZipCode", zipCode);
  }, [county, zipCode]);

  const onCountyChange = (nextCounty: string) => {
    setCounty(nextCounty);
    setZipCode(meta?.zipOptionsByCounty[nextCounty]?.[0] ?? "");
  };

  const riskPct = Number(((data?.communityRisk ?? 0) * 100).toFixed(2));
  const riskBand = riskPct >= 10 ? "High" : riskPct >= 5 ? "Moderate" : "Low";
  const riskColor = riskBand === "High" ? "#A32D2D" : riskBand === "Moderate" ? "#EF9F27" : "#3B6D11";
  const highestDisease = data?.topDiseases?.[0];
  return (
    <main className="container risk-shell">
      <section className="risk-header">
        <h2>{tx.riskTitle}</h2>
        <p>{tx.riskSubtitle}</p>
      </section>

      <section className="card risk-controls">
        <h3>{tx.communityRisk}</h3>
        <div className="risk-select-row">
          <div>
            <label htmlFor="county">{tx.selectCounty}</label>
            <div style={{ marginTop: 8 }}>
              <select id="county" value={county} onChange={(e) => onCountyChange(e.target.value)}>
                {(meta?.countyOptions ?? []).map((countyOption) => (
                  <option key={countyOption} value={countyOption}>
                    {countyOption}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="zip">{tx.selectZip}</label>
            <div style={{ marginTop: 8 }}>
              <select id="zip" value={zipCode} onChange={(e) => setZipCode(e.target.value)}>
                {(meta?.zipOptionsByCounty[county] ?? []).map((zip) => (
                  <option key={zip} value={zip}>
                    {zip}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {data && (
          <p className="risk-summary">
            {tx.communityRiskSentence
              .replace("{zip}", data.zipCode)
              .replace("{scoped}", String(data.scopedReportCount))
              .replace("{total}", String(data.totalPopulation))
              .replace("{risk}", (data.communityRisk * 100).toFixed(2))}
          </p>
        )}
      </section>

      <section className="risk-kpi-grid">
        <article className="card">
          <h4>{tx.communityRisk}</h4>
          <p className="home-kpi" style={{ color: riskColor }}>
            {riskPct}%
          </p>
          <span className="home-muted">{tx.communityRiskBand}: {riskBand === "High" ? tx.high : riskBand === "Moderate" ? tx.moderate : tx.low}</span>
        </article>
        <article className="card">
          <h4>{tx.selectedCounty}</h4>
          <p className="home-kpi">{county || tx.na}</p>
          <span className="home-muted">{tx.zip}: {zipCode || tx.na}</span>
        </article>
        <article className="card">
          <h4>{tx.weeklySickReports}</h4>
          <p className="home-kpi">{data?.scopedReportCount ?? 0}</p>
          <span className="home-muted">{tx.last7Days}</span>
        </article>
      </section>

      <section className="card">
        <h3>{tx.topDiseases}</h3>
        {highestDisease ? (
          <p className="risk-insight">
            {tx.highestDiseaseSignalSentence
              .replace("{disease}", highestDisease.disease)
              .replace("{count}", String(highestDisease.count))}
          </p>
        ) : null}
        <table>
          <thead>
            <tr>
              <th>{tx.rank}</th>
              <th>{tx.diseaseLabel}</th>
              <th>{tx.sickReportsLabel}</th>
              <th>{tx.individualRisk}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.topDiseases ?? []).map((item, idx) => (
              <tr key={item.disease}>
                <td>#{idx + 1}</td>
                <td>{item.disease}</td>
                <td>{item.count}</td>
                <td>{(item.individualRisk * 100).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h3>{tx.travelRiskTitle}</h3>
        <div className="risk-toggle-row">
          <button
            type="button"
            className={travelView === "zip" ? "risk-toggle-btn active" : "risk-toggle-btn"}
            onClick={() => setTravelView("zip")}
          >
            {tx.zipCodes}
          </button>
          <button
            type="button"
            className={travelView === "county" ? "risk-toggle-btn active" : "risk-toggle-btn"}
            onClick={() => setTravelView("county")}
          >
            {tx.counties}
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>{tx.rank}</th>
              <th>{travelView === "zip" ? tx.zip : tx.county}</th>
              <th>{tx.sickReportsLabel}</th>
              <th>{tx.riskLabel}</th>
            </tr>
          </thead>
          <tbody>
            {travelView === "zip"
              ? (data?.travelRiskHotspots ?? []).map((item, idx) => (
                  <tr key={item.zipCode}>
                    <td>#{idx + 1}</td>
                    <td>{item.zipCode}</td>
                    <td>{item.reportCount}</td>
                    <td>{(item.risk * 100).toFixed(2)}%</td>
                  </tr>
                ))
              : (data?.countyTravelHotspots ?? []).map((item, idx) => (
                  <tr key={item.county}>
                    <td>#{idx + 1}</td>
                    <td>{item.county}</td>
                    <td>{item.reportCount}</td>
                    <td>{(item.risk * 100).toFixed(2)}%</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

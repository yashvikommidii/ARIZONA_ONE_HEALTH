"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DashboardData = {
  weeks: number;
  totals: { reports: number; population: number };
  prevTotals: { reports: number };
  totalDeltaPct: number;
  countyPopulation: Record<string, number>;
  countySickReports: Record<string, number>;
  topDiseases: [string, number][];
  countyDiseaseCounts: Record<string, Record<string, number>>;
  countyTrend: { county: string; current: number; previous: number; deltaPct: number }[];
  alert: null | { county: string; disease: string; currentCount: number; deltaPct: number };
  dailyReports: { date: string; count: number }[];
};

export default function DashboardPage() {
  const { tx } = useLanguage();
  const [weeks, setWeeks] = useState(4);
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedDisease, setSelectedDisease] = useState("");
  const [compareCountyA, setCompareCountyA] = useState("");
  const [compareCountyB, setCompareCountyB] = useState("");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch(`/api/dashboard?weeks=${weeks}`)
      .then(async (r) => {
        if (!r.ok) {
          const errBody = await r.json().catch(() => ({}));
          throw new Error(errBody.message || "Dashboard API failed");
        }
        return r.json();
      })
      .then((res: DashboardData) => {
        setError("");
        setData(res);
        const firstDisease = res.topDiseases[0]?.[0] ?? "";
        setSelectedDisease((prev) => prev || firstDisease);
        const counties = Object.keys(res.countyPopulation);
        setCompareCountyA((prev) => prev || counties[0] || "");
        setCompareCountyB((prev) => prev || counties[1] || counties[0] || "");
      })
      .catch((e: Error) => {
        setError(e.message);
      });
  }, [weeks]);

  const diseaseOptions = (data?.topDiseases ?? []).map(([name]) => name);
  const diseaseVsCounty = Object.keys(data?.countyPopulation ?? {}).map((county) => ({
    county,
    count: data?.countyDiseaseCounts[county]?.[selectedDisease] ?? 0,
  }));

  const peopleVsSick = Object.keys(data?.countyPopulation ?? {}).map((county) => ({
    county,
    totalPeople: data?.countyPopulation[county] ?? 0,
    sickPeople: data?.countySickReports[county] ?? 0,
  }));
  const dailyCompare = (data?.dailyReports ?? []).map((d) => ({
    date: d.date.slice(5),
    [compareCountyA]: Math.round((d.count * ((data?.countySickReports[compareCountyA] ?? 0) / Math.max(data?.totals.reports ?? 1, 1))) || 0),
    [compareCountyB]: Math.round((d.count * ((data?.countySickReports[compareCountyB] ?? 0) / Math.max(data?.totals.reports ?? 1, 1))) || 0),
  }));
  const counties = Object.keys(data?.countyPopulation ?? {});
  const toCsv = (rows: Record<string, string | number>[]) => {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const body = rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
    return [headers.join(","), ...body].join("\n");
  };

  const downloadCsv = (filename: string, rows: Record<string, string | number>[]) => {
    const csv = toCsv(rows);
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const highestRiskCounty = counties
    .map((county) => {
      const pop = data?.countyPopulation[county] ?? 0;
      const sick = data?.countySickReports[county] ?? 0;
      return { county, risk: pop ? (sick / pop) * 100 : 0 };
    })
    .sort((a, b) => b.risk - a.risk)[0];
  const topDisease = data?.topDiseases?.[0];
  const coveragePct = data?.totals.population
    ? ((data.totals.reports / data.totals.population) * 100).toFixed(2)
    : "0.00";

  return (
    <main className="container dashboard-shell">
      <section className="dashboard-header">
        <div>
          <h2>{tx.dashboard}</h2>
          <p>{tx.dashboardSubtitle}</p>
        </div>
      </section>

      <section className="card dashboard-filter-card">
        <h3>Dashboard Filters</h3>
        <div className="dashboard-controls">
          <label htmlFor="period">
            Time window
            <select id="period" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
              <option value={1}>{tx.oneWeek}</option>
              <option value={2}>{tx.twoWeeks}</option>
              <option value={3}>{tx.threeWeeks}</option>
              <option value={4}>{tx.fourWeeks}</option>
            </select>
          </label>
          <label htmlFor="dashboard-disease">
            Disease
            <select
              id="dashboard-disease"
              value={selectedDisease}
              onChange={(e) => setSelectedDisease(e.target.value)}
            >
              {diseaseOptions.map((disease) => (
                <option key={disease} value={disease}>
                  {disease}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? <p style={{ color: "#A32D2D" }}>{error}</p> : null}
      {data?.alert ? (
        <section className="card dashboard-alert">
          <strong>{tx.dashboardAlertLabel}:</strong> {data.alert.county} shows elevated {data.alert.disease} reports ({data.alert.currentCount}), {data.alert.deltaPct}% {tx.vsPreviousPeriod}.
        </section>
      ) : null}
      <section className="risk-kpi-grid">
        <article className="card">
          <h4>{tx.reportsCurrent}</h4>
          <p className="dashboard-subline">{tx.reportsCurrentHint}</p>
          <p className="home-kpi">{data?.totals.reports ?? 0}</p>
        </article>
        <article className="card">
          <h4>{tx.reportsPrevious}</h4>
          <p className="dashboard-subline">{tx.reportsPreviousHint}</p>
          <p className="home-kpi">{data?.prevTotals.reports ?? 0}</p>
        </article>
        <article className="card">
          <h4>{tx.weekOverWeek}</h4>
          <p className="dashboard-subline">{tx.weekOverWeekHint}</p>
          <p className="home-kpi" style={{ color: (data?.totalDeltaPct ?? 0) >= 0 ? "#A32D2D" : "#3B6D11" }}>
            {(data?.totalDeltaPct ?? 0) >= 0 ? "+" : ""}
            {data?.totalDeltaPct ?? 0}%
          </p>
        </article>
      </section>

      <article className="card mini-card">
        <h3>{tx.keyInsightsHeading}</h3>
        <table>
          <tbody>
            <tr>
              <td>
                {tx.topDiseaseSignal}
                <div className="dashboard-subline">{tx.topDiseaseSignalHint}</div>
              </td>
              <td>
                <strong>
                  {topDisease?.[0] ?? "N/A"} ({topDisease?.[1] ?? 0} reports)
                </strong>
              </td>
            </tr>
            <tr>
              <td>
                {tx.highestCountyRisk}
                <div className="dashboard-subline">{tx.highestCountyRiskHint}</div>
              </td>
              <td>
                <strong>
                  {highestRiskCounty?.county ?? "N/A"} ({(highestRiskCounty?.risk ?? 0).toFixed(2)}%)
                </strong>
              </td>
            </tr>
            <tr>
              <td>
                {tx.populationCoverage}
                <div className="dashboard-subline">{tx.populationCoverageHint}</div>
              </td>
              <td>
                <strong>{coveragePct}%</strong>
              </td>
            </tr>
            <tr>
              <td>
                {tx.reportsDelta}
                <div className="dashboard-subline">{tx.reportsDeltaHint}</div>
              </td>
              <td>
                <strong>{(data?.totalDeltaPct ?? 0) >= 0 ? "+" : ""}{data?.totalDeltaPct ?? 0}%</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </article>

      <section className="dashboard-stack">
        <article className="card mini-card">
          <h3>{tx.diseaseVsCounty}</h3>
          <p>{tx.diseaseLabel}: {selectedDisease || tx.na}</p>
          <div className="dashboard-actions">
            <button
              type="button"
              onClick={() =>
                downloadCsv(`disease-vs-county-${selectedDisease || "all"}.csv`, diseaseVsCounty)
              }
            >
              {tx.downloadCsv}
            </button>
          </div>
          <div style={{ width: "100%", height: 320 }}>
            {mounted ? (
              <ResponsiveContainer>
                <BarChart data={diseaseVsCounty}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="county" angle={-20} interval={0} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#AFA9EC" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
          <p className="dashboard-graph-note">
            <strong>{tx.graphExplanation}</strong> {tx.graphExplainDiseaseVsCounty}
          </p>
        </article>

        <article className="card mini-card">
          <h3>{tx.peopleVsSick}</h3>
          <p>{tx.countyLevelComparison}</p>
          <div className="dashboard-actions">
            <button
              type="button"
              onClick={() => downloadCsv("people-vs-sick-by-county.csv", peopleVsSick)}
            >
              {tx.downloadCsv}
            </button>
          </div>
          <div style={{ width: "100%", height: 320 }}>
            {mounted ? (
              <ResponsiveContainer>
                <LineChart data={peopleVsSick}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="county" angle={-20} interval={0} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalPeople"
                    name={tx.totalPeople}
                    stroke="#5DCAA5"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sickPeople"
                    name={tx.sickPeople}
                    stroke="#EF9F27"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>
          <p className="dashboard-graph-note">
            <strong>{tx.graphExplanation}</strong> {tx.graphExplainPeopleVsSick}
          </p>
        </article>

        <article className="card mini-card">
          <h3>{tx.countyCompareTrend}</h3>
          <p>{tx.countyCompareSubtitle}</p>
          <div className="dashboard-controls" style={{ marginBottom: 8 }}>
            <select value={compareCountyA} onChange={(e) => setCompareCountyA(e.target.value)}>
              {counties.map((county) => (
                <option key={county} value={county}>
                  {county}
                </option>
              ))}
            </select>
            <select value={compareCountyB} onChange={(e) => setCompareCountyB(e.target.value)}>
              {counties.map((county) => (
                <option key={county} value={county}>
                  {county}
                </option>
              ))}
            </select>
          </div>
          <div style={{ width: "100%", height: 320 }}>
            {mounted ? (
              <ResponsiveContainer>
                <LineChart data={dailyCompare}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey={compareCountyA} stroke="#AFA9EC" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey={compareCountyB} stroke="#5DCAA5" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>
          <p className="dashboard-graph-note">
            <strong>{tx.graphExplanation}</strong> {tx.graphExplainCountyCompare}
          </p>
        </article>

      </section>
    </main>
  );
}

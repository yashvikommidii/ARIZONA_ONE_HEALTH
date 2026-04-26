import fs from "node:fs/promises";
import path from "node:path";
import { readCsv } from "@/lib/csv";

export type RiskLevel = "Low" | "Moderate" | "High";

export type Assessment = {
  county: string;
  population: number;
  reportCount: number;
  communityRiskPercent: number;
  level: RiskLevel;
  topDiseases: Array<{ disease: string; count: number }>;
};

export type FeedReport = {
  id: string;
  county: string;
  zipCode: string;
  disease: string;
  submittedAt: string;
};

export type MapApiResponse = {
  startDate: string;
  endDate: string;
  geojson: any;
  assessments: Assessment[];
  reports: FeedReport[];
};

function riskBand(riskPercent: number): RiskLevel {
  if (riskPercent >= 5) return "High";
  if (riskPercent >= 2) return "Moderate";
  return "Low";
}

export async function getMapData(): Promise<MapApiResponse> {
  const [users, reportsRaw, geojsonRaw] = await Promise.all([
    readCsv("synthetic_user_accounts.csv"),
    readCsv("synthetic_reports.csv"),
    fs.readFile(path.join(process.cwd(), "team-zwolf-main", "az-counties.json"), "utf8"),
  ]);

  const geojson = JSON.parse(geojsonRaw);

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

  const countyPopulation = users.reduce<Record<string, number>>((acc, user) => {
    acc[user.county] = (acc[user.county] ?? 0) + 1;
    return acc;
  }, {});

  const latestReports: FeedReport[] = reportsRaw
    .filter((r) => {
      const d = new Date(r.submitted_at);
      return d >= start && d <= end;
    })
    .map((r) => ({
      id: r.report_id,
      county: r.county,
      zipCode: r.zip_code,
      disease: r.suspected_disease,
      submittedAt: r.submitted_at,
    }))
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const countyReportCount = latestReports.reduce<Record<string, number>>((acc, report) => {
    acc[report.county] = (acc[report.county] ?? 0) + 1;
    return acc;
  }, {});

  const countyDiseaseCounts = latestReports.reduce<Record<string, Record<string, number>>>(
    (acc, report) => {
      if (!acc[report.county]) acc[report.county] = {};
      acc[report.county][report.disease] = (acc[report.county][report.disease] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const counties = Array.from(new Set(users.map((u) => u.county))).sort();

  const countyAssessments = counties.map((county) => {
    const population = countyPopulation[county] ?? 0;
    const reportCount = countyReportCount[county] ?? 0;
    const communityRiskPercent = population ? Number(((reportCount / population) * 100).toFixed(2)) : 0;
    const diseaseCounts = countyDiseaseCounts[county] ?? {};
    const topDiseases = Object.entries(diseaseCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([disease, count]) => ({ disease, count }));

    return {
      county,
      population,
      reportCount,
      communityRiskPercent,
      level: riskBand(communityRiskPercent),
      topDiseases,
    };
  });

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    geojson,
    assessments: countyAssessments,
    reports: latestReports.slice(0, 100),
  };
}

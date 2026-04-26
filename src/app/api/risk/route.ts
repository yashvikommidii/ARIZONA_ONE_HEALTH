import { NextRequest, NextResponse } from "next/server";
import { readCsv } from "@/lib/csv";

type DiseaseCount = Record<string, number>;
type ZipCount = Record<string, number>;
type CountyCount = Record<string, number>;

export async function GET(request: NextRequest) {
  const county = request.nextUrl.searchParams.get("county");
  const zipCode = request.nextUrl.searchParams.get("zipCode");
  const days = Number(request.nextUrl.searchParams.get("days") ?? "7");

  const users = await readCsv("synthetic_user_accounts.csv");
  const reports = await readCsv("synthetic_reports.csv");
  const countyOptions = Array.from(new Set(users.map((u) => u.county))).sort();

  if (!county) {
    return NextResponse.json({
      countyOptions,
      zipOptionsByCounty: countyOptions.reduce<Record<string, string[]>>((acc, countyName) => {
        acc[countyName] = Array.from(
          new Set(users.filter((u) => u.county === countyName).map((u) => u.zip_code))
        ).sort();
        return acc;
      }, {}),
    });
  }

  const countyUsers = users.filter((u) => u.county === county);
  const zipOptions = Array.from(new Set(countyUsers.map((u) => u.zip_code))).sort();
  const resolvedZip = zipCode && zipOptions.includes(zipCode) ? zipCode : zipOptions[0];

  const selectedPeople = countyUsers.filter((u) => u.zip_code === resolvedZip);
  const totalPopulation = selectedPeople.length;
  const zipPersonIds = new Set(selectedPeople.map((p) => p.person_id));
  const countyPersonIds = new Set(countyUsers.map((p) => p.person_id));
  const countyPopulation = countyUsers.length;

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));

  const zipScopedReports = reports.filter((r) => {
    if (!zipPersonIds.has(r.person_id)) return false;
    const d = new Date(r.submitted_at);
    return d >= start && d <= end;
  });
  const countyScopedReports = reports.filter((r) => {
    if (!countyPersonIds.has(r.person_id)) return false;
    const d = new Date(r.submitted_at);
    return d >= start && d <= end;
  });

  const communityRisk = totalPopulation
    ? Number((zipScopedReports.length / totalPopulation).toFixed(4))
    : 0;

  const diseaseCounts: DiseaseCount = {};
  for (const report of countyScopedReports) {
    diseaseCounts[report.suspected_disease] = (diseaseCounts[report.suspected_disease] ?? 0) + 1;
  }

  const topDiseases = Object.entries(diseaseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([disease, count]) => ({
      disease,
      count,
      individualRisk: countyPopulation ? Number((count / countyPopulation).toFixed(4)) : 0,
    }));

  const zipReportCounts: ZipCount = {};
  for (const report of countyScopedReports) {
    zipReportCounts[report.zip_code] = (zipReportCounts[report.zip_code] ?? 0) + 1;
  }
  const zipPopulation = countyUsers.reduce<Record<string, number>>((acc, person) => {
    acc[person.zip_code] = (acc[person.zip_code] ?? 0) + 1;
    return acc;
  }, {});
  const travelRiskHotspots = Object.entries(zipReportCounts)
    .map(([zip, count]) => ({
      zipCode: zip,
      reportCount: count,
      risk: zipPopulation[zip] ? Number((count / zipPopulation[zip]).toFixed(4)) : 0,
    }))
    .sort((a, b) => b.reportCount - a.reportCount)
    .slice(0, 5);

  const allCountyUsers = users.reduce<Record<string, number>>((acc, person) => {
    acc[person.county] = (acc[person.county] ?? 0) + 1;
    return acc;
  }, {});
  const allCountyReportCounts: CountyCount = {};
  for (const report of reports) {
    const reportDate = new Date(report.submitted_at);
    if (reportDate < start || reportDate > end) continue;
    allCountyReportCounts[report.county] = (allCountyReportCounts[report.county] ?? 0) + 1;
  }
  const countyTravelHotspots = Object.entries(allCountyReportCounts)
    .map(([countyName, count]) => ({
      county: countyName,
      reportCount: count,
      risk: allCountyUsers[countyName] ? Number((count / allCountyUsers[countyName]).toFixed(4)) : 0,
    }))
    .sort((a, b) => b.reportCount - a.reportCount)
    .slice(0, 5);

  return NextResponse.json({
    county,
    zipCode: resolvedZip,
    zipOptions,
    totalPopulation,
    scopedReportCount: zipScopedReports.length,
    communityRisk,
    topDiseases,
    travelRiskHotspots,
    countyTravelHotspots,
  });
}

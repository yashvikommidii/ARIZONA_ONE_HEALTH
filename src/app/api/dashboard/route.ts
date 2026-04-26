import { NextRequest, NextResponse } from "next/server";
import { readCsv } from "@/lib/csv";

type Counter = Record<string, number>;
type CountyDiseaseCounter = Record<string, Counter>;

export async function GET(request: NextRequest) {
  try {
    const weeksRaw = Number(request.nextUrl.searchParams.get("weeks") ?? "4");
    const weeks = Number.isFinite(weeksRaw) ? Math.min(Math.max(weeksRaw, 1), 4) : 4;
    const days = weeks * 7;

    const users = await readCsv("synthetic_user_accounts.csv");
    const reports = await readCsv("synthetic_reports.csv");

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    const prevEnd = new Date(start);
    prevEnd.setDate(start.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevEnd.getDate() - (days - 1));

    const filtered = reports.filter((r) => {
      const d = new Date(r.submitted_at);
      return !Number.isNaN(d.getTime()) && d >= start && d <= end;
    });
    const prevFiltered = reports.filter((r) => {
      const d = new Date(r.submitted_at);
      return !Number.isNaN(d.getTime()) && d >= prevStart && d <= prevEnd;
    });

    const countyPopulation: Counter = {};
    users.forEach((u) => {
      if (!u.county) return;
      countyPopulation[u.county] = (countyPopulation[u.county] ?? 0) + 1;
    });

    const countySickReports: Counter = {};
    const prevCountySickReports: Counter = {};
    const diseaseCounts: Counter = {};
    const prevDiseaseCounts: Counter = {};
    const countyDiseaseCounts: CountyDiseaseCounter = {};
    const dailyCounter: Counter = {};
    for (const report of filtered) {
      const county = report.county || "Unknown";
      const disease = report.suspected_disease || "Unknown";
      const day = report.submitted_at || "Unknown";
      countySickReports[county] = (countySickReports[county] ?? 0) + 1;
      diseaseCounts[disease] = (diseaseCounts[disease] ?? 0) + 1;
      countyDiseaseCounts[county] = countyDiseaseCounts[county] ?? {};
      countyDiseaseCounts[county][disease] = (countyDiseaseCounts[county][disease] ?? 0) + 1;
      dailyCounter[day] = (dailyCounter[day] ?? 0) + 1;
    }
    for (const report of prevFiltered) {
      const county = report.county || "Unknown";
      const disease = report.suspected_disease || "Unknown";
      prevCountySickReports[county] = (prevCountySickReports[county] ?? 0) + 1;
      prevDiseaseCounts[disease] = (prevDiseaseCounts[disease] ?? 0) + 1;
    }

    const currentTopDiseaseEntry = Object.entries(diseaseCounts).sort((a, b) => b[1] - a[1])[0];
    const previousTopDiseaseCount = currentTopDiseaseEntry
      ? prevDiseaseCounts[currentTopDiseaseEntry[0]] ?? 0
      : 0;
    const currentTopDiseaseCount = currentTopDiseaseEntry?.[1] ?? 0;
    const topDiseaseDeltaPct = previousTopDiseaseCount
      ? Number((((currentTopDiseaseCount - previousTopDiseaseCount) / previousTopDiseaseCount) * 100).toFixed(1))
      : currentTopDiseaseCount > 0
        ? 100
        : 0;

    const countyTrend = Object.keys(countyPopulation).map((county) => {
      const current = countySickReports[county] ?? 0;
      const previous = prevCountySickReports[county] ?? 0;
      const deltaPct = previous ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
      return { county, current, previous, deltaPct: Number(deltaPct.toFixed(1)) };
    });
    const highestCounty = [...countyTrend].sort((a, b) => b.current - a.current)[0];
    const totalPrevReports = prevFiltered.length;
    const totalDeltaPct = totalPrevReports
      ? Number((((filtered.length - totalPrevReports) / totalPrevReports) * 100).toFixed(1))
      : filtered.length > 0
        ? 100
        : 0;

    return NextResponse.json({
      weeks,
      totals: {
        reports: filtered.length,
        population: users.length,
      },
      countyPopulation,
      countySickReports,
      prevTotals: {
        reports: prevFiltered.length,
      },
      totalDeltaPct,
      topDiseases: Object.entries(diseaseCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      countyDiseaseCounts,
      countyTrend,
      alert: currentTopDiseaseEntry
        ? {
            county: highestCounty?.county ?? "N/A",
            disease: currentTopDiseaseEntry[0],
            currentCount: currentTopDiseaseCount,
            deltaPct: topDiseaseDeltaPct,
          }
        : null,
      dailyReports: Object.entries(dailyCounter)
        .filter(([day]) => day !== "Unknown")
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to build dashboard data",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

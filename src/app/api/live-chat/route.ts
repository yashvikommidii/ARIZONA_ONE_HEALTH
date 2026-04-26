import { NextRequest, NextResponse } from "next/server";
import { readCsv } from "@/lib/csv";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

function mapOpenAIError(error: {
  code?: string;
  type?: string;
  message?: string;
}): { reasonCode: string; reasonMessage: string } {
  const code = (error.code ?? "").toLowerCase();
  const type = (error.type ?? "").toLowerCase();
  const message = (error.message ?? "").toLowerCase();

  if (code === "insufficient_quota" || message.includes("insufficient_quota")) {
    return {
      reasonCode: "insufficient_quota",
      reasonMessage: "OpenAI quota is exhausted. Add billing credits to continue AI chat.",
    };
  }
  if (code === "invalid_api_key" || message.includes("incorrect api key")) {
    return {
      reasonCode: "invalid_api_key",
      reasonMessage: "OpenAI API key is invalid. Update OPENAI_API_KEY in .env.local.",
    };
  }
  if (code === "rate_limit_exceeded" || type.includes("rate_limit")) {
    return {
      reasonCode: "rate_limit_exceeded",
      reasonMessage: "OpenAI rate limit exceeded. Wait and retry or upgrade limits.",
    };
  }
  return {
    reasonCode: code || type || "openai_request_failed",
    reasonMessage:
      "OpenAI request failed for an unknown reason. Check server logs and API response details.",
  };
}

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function matchDiseaseFromInput(input: string, diseaseCatalog: string[]) {
  const normalizedInput = normalizeText(input);
  const normalizedDiseaseMap = diseaseCatalog.map((d) => ({
    original: d,
    normalized: normalizeText(d),
  }));

  let matchedDisease =
    normalizedDiseaseMap.find((d) => normalizedInput.includes(d.normalized))?.original ?? null;

  if (!matchedDisease) {
    if (normalizedInput.includes("flu")) matchedDisease = "Influenza";
    if (normalizedInput.includes("covid")) matchedDisease = "COVID-19";
    if (normalizedInput.includes("rabies")) matchedDisease = "Rabies Exposure";
    if (normalizedInput.includes("ecoli")) matchedDisease = "E. coli";
    if (
      normalizedInput.includes("noro virus") ||
      normalizedInput.includes("norovirus") ||
      normalizedInput.includes("neuro virus") ||
      normalizedInput.includes("neurovirus") ||
      normalizedInput.includes("neuro")
    ) {
      matchedDisease = "Norovirus";
    }
  }

  return matchedDisease && diseaseCatalog.includes(matchedDisease) ? matchedDisease : null;
}

function detectDiseaseHotspotIntent(input: string, diseaseCatalog: string[]) {
  const lower = input.trim().toLowerCase();
  const matchedDisease = matchDiseaseFromInput(input, diseaseCatalog);

  const asksDiseaseHotspot =
    !!matchedDisease &&
    (
      ((lower.includes("which") || lower.includes("highest") || lower.includes("high")) &&
        (lower.includes("reports") || lower.includes("cases") || lower.includes("reportes"))) ||
      (lower.includes("top") && (lower.includes("county") || lower.includes("counties"))) ||
      (lower.includes("which") && (lower.includes("county") || lower.includes("counties"))) ||
      (lower.includes("which has") && !!matchedDisease) ||
      (lower.includes("with") && (lower.includes("county") || lower.includes("counties"))) ||
      lower.includes("hotspot") ||
      lower.includes("hotspots") ||
      lower.includes("where") ||
      lower.includes("more") ||
      lower.includes("most")
    );

  return { asksDiseaseHotspot, matchedDisease };
}

function detectDiseaseReportCountIntent(input: string, diseaseCatalog: string[]) {
  const lower = input.trim().toLowerCase();
  const matchedDisease = matchDiseaseFromInput(input, diseaseCatalog);
  const asksReportCount =
    !!matchedDisease &&
    (lower.includes("how many") ||
      lower.includes("count") ||
      lower.includes("number") ||
      lower.includes("total") ||
      lower.includes("submitted") ||
      lower.includes("reports") ||
      lower.includes("cases") ||
      lower.includes("security"));

  return { asksReportCount, matchedDisease };
}

function detectProfileIntent(input: string) {
  const lower = input.trim().toLowerCase();
  const refersToMyCounty = lower.includes("my county") || lower.includes("mine");
  const asksMyCountyStats =
    refersToMyCounty &&
    (lower.includes("stats") ||
      lower.includes("statistics") ||
      lower.includes("report") ||
      lower.includes("risk"));
  const asksMyCounty =
    lower.includes("which county is mine") ||
    lower.includes("what is my county") ||
    lower === "my county";
  const asksMyZip =
    lower.includes("what is my zip") ||
    lower.includes("which zip is mine") ||
    lower.includes("my zip code") ||
    lower.includes("my zipcode");
  return { asksMyCounty, asksMyZip, asksMyCountyStats };
}

function detectStatusIntent(input: string) {
  const lower = input.trim().toLowerCase();
  const asksStatus = lower.includes("status");
  const asksRiskStatus = asksStatus && lower.includes("risk");
  const asksCountyStatus = asksStatus && lower.includes("county");
  return { asksStatus, asksRiskStatus, asksCountyStatus };
}

function buildWebsiteKnowledgeReply(
  input: string,
  personalProfile: { county: string; zipCode: string } | null
): string | null {
  const q = normalizeText(input);
  const asksGeneral =
    q.includes("what is this") ||
    q.includes("what is website") ||
    q.includes("about this website") ||
    q.includes("what can you do") ||
    q.includes("help me") ||
    q.includes("how does this work");
  if (asksGeneral) {
    return "This is the Arizona One Health dashboard. It helps track community health risks using symptom reports, county and ZIP trends, disease hotspots, analytics charts, and an Arizona risk map. You can use Home, Risk, Dashboard, Map, About, and Live Chat pages.";
  }

  if (q.includes("home page") || q === "home" || q.includes("what is home")) {
    return "Home shows your profile, today's submitted report, community risk and county risk signals, top disease in your ZIP, quick actions, prevention alerts, resources, and sponsored cards.";
  }
  if (q.includes("risk page") || q === "risk" || q.includes("what is risk")) {
    return "Risk page lets you select county and ZIP, then shows community risk, top diseases, highest disease signal, and travel hotspots by ZIP or county.";
  }
  if (q.includes("risk status")) {
    return "Risk status is available on the Risk page with community risk percentage, top diseases, highest disease signal, and travel hotspots.";
  }
  if (q.includes("dashboard") || q.includes("analytics")) {
    return "Dashboard shows 1 to 4 week analytics, disease vs county trends, people vs sick trends, county comparisons, key insights, and CSV download options.";
  }
  if (q.includes("map page") || q === "map" || q.includes("arizona risk map")) {
    return "Map page shows county risk coloring across Arizona, recent reports, county details, top disease signals, and a plain-language explanation panel.";
  }
  if (q.includes("about page") || q.includes("about us") || q.includes("contact page")) {
    return "About Us explains the platform purpose, dashboard focus areas, website guide, support channels, and common requests.";
  }
  if (q.includes("live chat") || q.includes("voice")) {
    return "Live Chat supports English and Spanish text queries, optional voice input, and optional voice reply output.";
  }
  if (q.includes("quick action") || q.includes("quick actions")) {
    return "Quick Actions include Submit Today's Report, Risk Report, Explore Dashboard, Live Chat, and Arizona Risk Map.";
  }
  if (q.includes("my profile") || q.includes("my county") || q.includes("my zip")) {
    if (personalProfile) {
      return `Your profile is currently set to county ${personalProfile.county} and ZIP ${personalProfile.zipCode}.`;
    }
    return "I cannot identify your profile yet. Please log in and retry.";
  }
  return null;
}

function buildLocalFallbackReply(
  input: string,
  summary: string,
  countyTopDisease: Record<string, { disease: string; count: number }>,
  topCountiesByDisease: Record<string, Array<{ county: string; count: number }>>,
  personalProfile: { county: string; zipCode: string } | null,
  diseaseCatalog: string[],
  countyOptions: string[]
): string {
  const lower = input.trim().toLowerCase();
  const isGreeting = /^(hi|hello|hey|hlo|hola|buenas|good morning|good evening)\b/.test(lower);
  const asksRiskSummary =
    lower.includes("risk summary") ||
    lower.includes("report summary") ||
    lower.includes("summary") ||
    lower.includes("riesgo") ||
    lower.includes("resumen");
  const asksCountyDisease =
    lower.includes("highest disease") ||
    lower.includes("top disease") ||
    lower.includes("disease in") ||
    lower.includes("enfermedad") ||
    (lower.includes("county") &&
      (lower.includes("high reports") ||
        lower.includes("has high reports") ||
        lower.includes("reports on") ||
        lower.includes("more reports")));
  const { asksDiseaseHotspot, matchedDisease } = detectDiseaseHotspotIntent(input, diseaseCatalog);
  const { asksMyCounty, asksMyZip } = detectProfileIntent(input);
  const { asksRiskStatus } = detectStatusIntent(input);
  const knowledgeReply = buildWebsiteKnowledgeReply(input, personalProfile);

  const matchedCounty =
    countyOptions.find((countyName) => lower.includes(countyName.toLowerCase())) ?? null;
  if (isGreeting) {
    return "Hello! Hola! I am having trouble connecting to the AI service right now, but I can still help with this website. Ask me about Home, Risk, Dashboard, Map, About, or Live Chat.";
  }
  if (knowledgeReply) return knowledgeReply;
  if (asksMyCounty) {
    if (personalProfile) {
      return `Your profile county is ${personalProfile.county}.`;
    }
    return "I cannot identify your county yet. Please log in again and retry.";
  }
  if (asksMyZip) {
    if (personalProfile) {
      return `Your profile ZIP code is ${personalProfile.zipCode}.`;
    }
    return "I cannot identify your ZIP code yet. Please log in again and retry.";
  }

  if (asksCountyDisease && matchedCounty) {
    const top = countyTopDisease[matchedCounty];
    if (top) {
      return `I am unable to reach the AI service right now, but from this app data the top disease in ${matchedCounty} County (last 7 days) is ${top.disease} with ${top.count} report(s).`;
    }
    return `I am unable to reach the AI service right now, and I do not see recent disease reports for ${matchedCounty} County in the current 7-day window.`;
  }

  if (asksDiseaseHotspot && matchedDisease) {
    const top = topCountiesByDisease[matchedDisease] ?? [];
    if (top.length) {
      const topText = top
        .slice(0, 3)
        .map((x) => `${x.county} (${x.count})`)
        .join(", ");
      return `I am unable to reach the AI service right now, but in this app data the highest ${matchedDisease} reports (last 7 days) are in: ${topText}.`;
    }
    return `I am unable to reach the AI service right now, and I do not see recent ${matchedDisease} reports in the current 7-day window.`;
  }

  if (asksRiskSummary) {
    return `I am unable to reach the AI service right now, so here is a direct risk summary from this app data.
${summary}
You can still use Risk and Dashboard pages for detailed numbers.`;
  }
  if (asksRiskStatus) {
    return `Current risk status (7-day snapshot): ${summary}`;
  }

  return "I am having trouble connecting to the AI service right now. I can still help with this website navigation and features. Try asking: 'How do I use the Risk page?' or 'Give me a risk summary'.";
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: "OPENAI_API_KEY is missing on server." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      messages?: ChatMessage[];
      username?: string;
      county?: string;
      zipCode?: string;
    };
    const messages = body.messages ?? [];
    const users = await readCsv("synthetic_user_accounts.csv");
    const reports = await readCsv("synthetic_reports.csv");
    const allDiseaseCounts = reports.reduce<Record<string, number>>((acc, report) => {
      acc[report.suspected_disease] = (acc[report.suspected_disease] ?? 0) + 1;
      return acc;
    }, {});
    const allDiseaseCatalog = Object.keys(allDiseaseCounts).sort();
    const loggedInUser = body.username
      ? users.find((u) => u.username === body.username)
      : null;
    const personalProfile = loggedInUser
      ? { county: loggedInUser.county, zipCode: loggedInUser.zip_code }
      : null;
    const countyOptions = Array.from(new Set(users.map((u) => u.county))).sort();
    const requestedCounty = body.county?.trim();
    const profileCounty = personalProfile?.county;
    const selectedCounty =
      (requestedCounty && countyOptions.includes(requestedCounty) ? requestedCounty : null) ??
      (profileCounty && countyOptions.includes(profileCounty) ? profileCounty : null) ??
      countyOptions[0] ??
      "";
    const countyUsers = users.filter((u) => u.county === selectedCounty);
    const zipOptions = Array.from(new Set(countyUsers.map((u) => u.zip_code))).sort();
    const requestedZip = body.zipCode?.trim();
    const profileZip =
      personalProfile?.county === selectedCounty ? personalProfile.zipCode : undefined;
    const selectedZip =
      (requestedZip && zipOptions.includes(requestedZip) ? requestedZip : null) ??
      (profileZip && zipOptions.includes(profileZip) ? profileZip : null) ??
      zipOptions[0] ??
      "";

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);

    const zipPeople = countyUsers.filter((u) => u.zip_code === selectedZip);
    const zipIds = new Set(zipPeople.map((u) => u.person_id));
    const countyIds = new Set(countyUsers.map((u) => u.person_id));

    const zipScopedReports = reports.filter((r) => {
      if (!zipIds.has(r.person_id)) return false;
      const d = new Date(r.submitted_at);
      return d >= start && d <= end;
    });
    const countyScopedReports = reports.filter((r) => {
      if (!countyIds.has(r.person_id)) return false;
      const d = new Date(r.submitted_at);
      return d >= start && d <= end;
    });
    const allSelectedCountyReports = reports.filter((r) => r.county === selectedCounty);
    const allSelectedZipReports = reports.filter(
      (r) => r.county === selectedCounty && r.zip_code === selectedZip
    );

    const diseaseCounts: Record<string, number> = {};
    for (const r of countyScopedReports) {
      diseaseCounts[r.suspected_disease] = (diseaseCounts[r.suspected_disease] ?? 0) + 1;
    }
    const topDiseases = Object.entries(diseaseCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `${name}: ${count}`);

    const zipCounts: Record<string, number> = {};
    for (const r of countyScopedReports) {
      zipCounts[r.zip_code] = (zipCounts[r.zip_code] ?? 0) + 1;
    }
    const zipPopulation = countyUsers.reduce<Record<string, number>>((acc, u) => {
      acc[u.zip_code] = (acc[u.zip_code] ?? 0) + 1;
      return acc;
    }, {});
    const topHotspots = Object.entries(zipCounts)
      .map(([zip, count]) => ({
        zip,
        risk: zipPopulation[zip] ? ((count / zipPopulation[zip]) * 100).toFixed(2) : "0.00",
      }))
      .sort((a, b) => Number(b.risk) - Number(a.risk))
      .slice(0, 5)
      .map((x) => `${x.zip}: ${x.risk}%`);

    const countyTopDisease: Record<string, { disease: string; count: number }> = {};
    const countyDiseaseCounts: Record<string, Record<string, number>> = {};
    for (const report of reports) {
      const d = new Date(report.submitted_at);
      if (d < start || d > end) continue;
      countyDiseaseCounts[report.county] = countyDiseaseCounts[report.county] ?? {};
      countyDiseaseCounts[report.county][report.suspected_disease] =
        (countyDiseaseCounts[report.county][report.suspected_disease] ?? 0) + 1;
    }
    for (const [countyName, counts] of Object.entries(countyDiseaseCounts)) {
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (top) countyTopDisease[countyName] = { disease: top[0], count: top[1] };
    }
    const topCountiesByDisease: Record<string, Array<{ county: string; count: number }>> = {};
    for (const [countyName, counts] of Object.entries(countyDiseaseCounts)) {
      for (const [disease, count] of Object.entries(counts)) {
        topCountiesByDisease[disease] = topCountiesByDisease[disease] ?? [];
        topCountiesByDisease[disease].push({ county: countyName, count });
      }
    }
    for (const disease of Object.keys(topCountiesByDisease)) {
      topCountiesByDisease[disease].sort((a, b) => b.count - a.count);
    }
    const diseaseCatalog = allDiseaseCatalog;
    const diseaseTotalsText = Object.entries(allDiseaseCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([disease, count]) => `${disease}: ${count}`)
      .join(", ");
    const topInfluenzaCounties = (topCountiesByDisease["Influenza"] ?? [])
      .slice(0, 5)
      .map((x) => `${x.county}: ${x.count}`)
      .join(", ");
    const topCovidCounties = (topCountiesByDisease["COVID-19"] ?? [])
      .slice(0, 5)
      .map((x) => `${x.county}: ${x.count}`)
      .join(", ");

    const communityRiskPct = zipPeople.length
      ? ((zipScopedReports.length / zipPeople.length) * 100).toFixed(2)
      : "0.00";
    const riskSummaryContext = `Risk page live summary context (selected county/zip in app):
- County: ${selectedCounty}
- ZIP: ${selectedZip}
- Community risk: ${communityRiskPct}% (${zipScopedReports.length}/${zipPeople.length})
- Top 5 diseases (last 7 days): ${topDiseases.join(", ") || "N/A"}
- Top travel ZIP hotspots (last 7 days): ${topHotspots.join(", ") || "N/A"}
- Highest influenza counties (last 7 days): ${topInfluenzaCounties || "N/A"}
- Highest COVID-19 counties (last 7 days): ${topCovidCounties || "N/A"}
- Local CSV disease report totals, all submitted reports: ${diseaseTotalsText || "N/A"}
- Disease catalog available in reports: ${diseaseCatalog.join(", ") || "N/A"}`;

    const system: ChatMessage = {
      role: "system",
      content: `You are the in-app assistant for the Arizona One Health prototype website.

Answer using the known app structure and local CSV report data below. Do not give generic healthcare templates.
If asked something outside this app and outside the local report data, say you can only answer about this website and its local dataset.

Known pages/components:
- Home: profile, today's submitted data, quick actions, community alert, resources, sponsored cards.
- Risk: county + ZIP selectors, community risk %, top 5 diseases table, highest disease signal line, travel risk table with ZIP/County toggle.
- Dashboard: period selector (1-4 weeks), disease-vs-county chart, people-vs-sick chart, county compare trend, key insights section, CSV downloads.
- Map: Arizona county map with risk coloring (low/moderate/high), recent reports feed, county detail panel, top disease signals, and explanation of what is happening.
- About Us: platform purpose, dashboard focus areas, website guide, support channels, and common requests.
- Live Chat: chat + optional voice input/output.

Response style:
- concise, specific, UI-grounded
- 3-6 bullets or short paragraph
- reference exact page names and controls (e.g., "Risk -> Select County")
- if user asks for "summary/report", provide concrete numbers and percentages from the provided risk context.
- if user asks how many reports/cases were submitted for a disease, answer directly from the local CSV totals.
- if user asks which county has higher reports for a disease (for example influenza), answer with county names and counts first from provided context, not navigation steps.
- return plain text only (no markdown, no **, no *, no headings)

When user asks for risk page summary or report summary, directly include:
1) community risk % with numerator/denominator
2) top diseases with counts
3) travel risk hotspots with percentages
Do not return only navigation steps.`,
    };

    const contextMessage: ChatMessage = {
      role: "system",
      content: riskSummaryContext,
    };

    const riskSummaryText = `Community risk: ${communityRiskPct}% (${zipScopedReports.length}/${zipPeople.length}) in ${selectedZip}, ${selectedCounty}.
Top diseases (last 7 days): ${topDiseases.join(", ") || "N/A"}.
Top travel ZIP hotspots: ${topHotspots.join(", ") || "N/A"}.`;
    const latestUserMessage =
      [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const profileIntent = detectProfileIntent(latestUserMessage);
    const statusIntent = detectStatusIntent(latestUserMessage);
    const lowerUser = latestUserMessage.toLowerCase();
    const matchedCounty =
      countyOptions.find((countyName) => lowerUser.includes(countyName.toLowerCase())) ?? null;

    if (profileIntent.asksMyCountyStats) {
      if (personalProfile) {
        const myCountyUsers = users.filter((u) => u.county === personalProfile.county);
        const myCountyIds = new Set(myCountyUsers.map((u) => u.person_id));
        const myCountyReports7d = reports.filter((r) => {
          if (!myCountyIds.has(r.person_id)) return false;
          const d = new Date(r.submitted_at);
          return d >= start && d <= end;
        });
        const myCountyRiskPct = myCountyUsers.length
          ? ((myCountyReports7d.length / myCountyUsers.length) * 100).toFixed(2)
          : "0.00";
        const myDiseaseCounts: Record<string, number> = {};
        for (const r of myCountyReports7d) {
          myDiseaseCounts[r.suspected_disease] = (myDiseaseCounts[r.suspected_disease] ?? 0) + 1;
        }
        const myTopDiseases = Object.entries(myDiseaseCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([d, c]) => `${d}: ${c}`)
          .join(", ");
        return NextResponse.json({
          reply: `Your county report for ${personalProfile.county} (last 7 days): risk is ${myCountyRiskPct}% (${myCountyReports7d.length}/${myCountyUsers.length}); top diseases are ${myTopDiseases || "N/A"}.`,
        });
      }
      return NextResponse.json({
        reply: "I cannot identify your county profile yet. Please log in again and retry.",
      });
    }
    if (statusIntent.asksCountyStatus && matchedCounty) {
      const countyUsers = users.filter((u) => u.county === matchedCounty);
      const countyIds = new Set(countyUsers.map((u) => u.person_id));
      const countyReports7d = reports.filter((r) => {
        if (!countyIds.has(r.person_id)) return false;
        const d = new Date(r.submitted_at);
        return d >= start && d <= end;
      });
      const countyRisk = countyUsers.length
        ? ((countyReports7d.length / countyUsers.length) * 100).toFixed(2)
        : "0.00";
      const diseaseCounts: Record<string, number> = {};
      for (const r of countyReports7d) {
        diseaseCounts[r.suspected_disease] = (diseaseCounts[r.suspected_disease] ?? 0) + 1;
      }
      const topDiseasesText = Object.entries(diseaseCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([d, c]) => `${d}: ${c}`)
        .join(", ");
      return NextResponse.json({
        reply: `${matchedCounty} County status (last 7 days): risk is ${countyRisk}% (${countyReports7d.length}/${countyUsers.length}); top diseases are ${topDiseasesText || "N/A"}.`,
      });
    }
    if (statusIntent.asksRiskStatus) {
      return NextResponse.json({
        reply: `Current risk status (7-day snapshot): ${riskSummaryText}`,
      });
    }

    if (profileIntent.asksMyCounty) {
      return NextResponse.json({
        reply: personalProfile
          ? `Your profile county is ${personalProfile.county}.`
          : "I cannot identify your county yet. Please log in again and retry.",
      });
    }
    if (profileIntent.asksMyZip) {
      return NextResponse.json({
        reply: personalProfile
          ? `Your profile ZIP code is ${personalProfile.zipCode}.`
          : "I cannot identify your ZIP code yet. Please log in again and retry.",
      });
    }

    const diseaseReportCountIntent = detectDiseaseReportCountIntent(
      latestUserMessage,
      diseaseCatalog
    );
    if (
      diseaseReportCountIntent.asksReportCount &&
      diseaseReportCountIntent.matchedDisease
    ) {
      const disease = diseaseReportCountIntent.matchedDisease;
      const totalCount = allDiseaseCounts[disease] ?? 0;
      const selectedCountyCount = allSelectedCountyReports.filter(
        (r) => r.suspected_disease === disease
      ).length;
      const selectedZipCount = allSelectedZipReports.filter(
        (r) => r.suspected_disease === disease
      ).length;

      return NextResponse.json({
        reply: `${disease} has ${totalCount} submitted report(s) in the local dataset. For the current selection, ${selectedCounty} County has ${selectedCountyCount}, and ZIP ${selectedZip} has ${selectedZipCount}.`,
      });
    }

    const hotspotIntent = detectDiseaseHotspotIntent(latestUserMessage, diseaseCatalog);
    if (hotspotIntent.asksDiseaseHotspot && hotspotIntent.matchedDisease) {
      const top = topCountiesByDisease[hotspotIntent.matchedDisease] ?? [];
      if (top.length) {
        const topText = top
          .slice(0, 5)
          .map((x) => `${x.county}: ${x.count}`)
          .join(", ");
        return NextResponse.json({
          reply: `The counties with the highest ${hotspotIntent.matchedDisease} reports in the last 7 days are: ${topText}.`,
        });
      }
      return NextResponse.json({
        reply: `There are no recent ${hotspotIntent.matchedDisease} reports in the current 7-day window.`,
      });
    }

    const fallbackReply = buildLocalFallbackReply(
      latestUserMessage,
      riskSummaryText,
      countyTopDisease,
      topCountiesByDisease,
      personalProfile,
      diseaseCatalog,
      countyOptions
    );

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
          messages: [system, contextMessage, ...messages],
          temperature: 0.4,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const mapped = mapOpenAIError({
          code: data?.error?.code,
          type: data?.error?.type,
          message: data?.error?.message,
        });
        return NextResponse.json({
          reply: fallbackReply,
          warning: mapped.reasonMessage,
          warningCode: mapped.reasonCode,
          warningRaw: data?.error?.message ?? "OpenAI request failed.",
        });
      }

      const text = data?.choices?.[0]?.message?.content ?? "";
      return NextResponse.json({ reply: text || fallbackReply });
    } catch (error) {
      return NextResponse.json({
        reply: fallbackReply,
        warning:
          "AI network request failed from this server runtime. This is usually a connectivity/runtime restriction issue, not a question-format issue.",
        warningCode: "network_unreachable",
        warningRaw: error instanceof Error ? error.message : "Unknown network error",
      });
    }
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}

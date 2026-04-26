const CDC_ADVISORIES = [
  "H5N1 avian influenza activity elevated in Southeast Asia — Thailand, Vietnam, and Cambodia reporting human cases",
  "Dengue fever outbreak ongoing across Latin America and the Caribbean including Mexico and Guatemala",
  "Measles cases rising in unvaccinated communities across the US Southwest including Arizona",
  "West Nile Virus season beginning in Arizona — mosquito populations increasing with warming temperatures",
  "Mpox clusters reported in several US metropolitan areas — community transmission confirmed"
];

const SEASON_CONTEXT = "Late April in Arizona. Warm and dry, temperatures reaching 95-100°F in the Valley. " +
  "Monsoon season approaching in 60-90 days. Mosquito activity beginning to increase. " +
  "High wildfire smoke risk from neighboring states possible.";

function summarizeReports(countyName) {
  const reports = window["REPORTS"].filter(r => r.county === countyName);
  if (reports.length === 0) return { summary: "No reports on file.", count: 0 };

  const symptomCounts = {};
  const travelDestinations = new Set();
  const animalTypes = new Set();

  for (const r of reports) {
    for (const s of r.symptoms) {
      symptomCounts[s] = (symptomCounts[s] || 0) + 1;
    }
    if (r.recentTravel && r.travelDestination) travelDestinations.add(r.travelDestination);
    if (r.animalContact && r.animalType) animalTypes.add(r.animalType);
  }

  const topSymptoms = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([s, n]) => `${s} (${n})`)
    .join(", ");

  let summary = `${reports.length} reports from ${countyName} County in the past 72 hours. ` +
    `Most common symptoms: ${topSymptoms}.`;

  if (travelDestinations.size > 0) {
    summary += ` ${[...travelDestinations].length} reporter(s) recently traveled to: ${[...travelDestinations].join(", ")}.`;
  }
  if (animalTypes.size > 0) {
    summary += ` Animal contact reported with: ${[...animalTypes].join(", ")}.`;
  }

  return { summary, count: reports.length };
}

function buildPrompt(countyName, reportSummary) {
  return `You are a public health risk analyst for the Arizona Department of Health Services.
Your job is to assess the risk level of an emerging infectious disease threat based on self-reported symptom data and current global pathogen intelligence.

CURRENT CDC GLOBAL ADVISORIES:
${CDC_ADVISORIES.map(a => `- ${a}`).join("\n")}

SEASONAL AND ENVIRONMENTAL CONTEXT:
${SEASON_CONTEXT}

SELF-REPORTED DATA FROM ${countyName.toUpperCase()} COUNTY (PAST 72 HOURS):
${reportSummary}

Based on this information, assess the infectious disease risk for ${countyName} County.

Respond in exactly this format — two lines, nothing else:
RISK_LEVEL: Low
EXPLANATION: [2-3 sentences written for a public health officer. Be specific about which symptoms, travel patterns, or advisories are driving the assessment. Sound like an expert, not a chatbot.]

RISK_LEVEL must be exactly one of: Low, Moderate, High`;
}

window.getRiskAssessment = async function(countyName) {
  const { summary, count } = summarizeReports(countyName);
  const timestamp = new Date().toISOString();
  const fallback = {
    county: countyName,
    level: "Unknown",
    explanation: "Risk assessment unavailable. Manual review recommended.",
    reportCount: count,
    timestamp
  };

  if (count === 0) return { ...fallback, level: "Low", explanation: "No reports on file for this county." };

  try {
    const prompt = buildPrompt(countyName, summary);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${window.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 200 }
        })
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = (await response.json()).candidates[0].content.parts[0].text;
    const levelMatch = text.match(/RISK_LEVEL:\s*(Low|Moderate|High)/i);
    const explanationMatch = text.match(/EXPLANATION:\s*(.+)/is);
    if (!levelMatch) throw new Error("Unparseable response");

    return {
      county: countyName,
      level: levelMatch[1],
      explanation: explanationMatch ? explanationMatch[1].trim() : text.trim(),
      reportCount: count,
      timestamp
    };
  } catch {
    return fallback;
  }
};

/* VERIFICATION — uncomment to test all 5 counties
const TEST_COUNTIES = ["Maricopa", "Pima", "Pinal", "Yavapai", "Coconino"];

async function runVerification() {
  console.log("=== AZ Sentinel Risk Engine Verification ===");
  for (const county of TEST_COUNTIES) {
    const result = await window.getRiskAssessment(county);
    console.log(`\n${county.toUpperCase()}`);
    console.log(`  Level: ${result.level}`);
    console.log(`  Reports: ${result.reportCount}`);
    console.log(`  ${result.explanation}`);
  }
}

runVerification();
*/

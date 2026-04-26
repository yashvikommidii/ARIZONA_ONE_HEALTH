import { readCsv } from "@/lib/csv";

export type ParsedSymptoms = {
  symptoms: string[];
  severity: "mild" | "moderate" | "severe";
  onsetDays: number;
  hasTravel: boolean;
  hasAnimalExposure: boolean;
};

export type SymptomAnalysisResult = {
  parsed: ParsedSymptoms;
  likelyConcern: string;
  symptomMatches: string[];
  area: {
    county: string;
    zipCode: string;
    communityRiskPercent: number;
    communityRiskBand: "Low" | "Moderate" | "High";
    topDiseaseSignals: { disease: string; count: number; rank: number }[];
    localMatch: boolean;
  };
  personalRiskBand: "Low" | "Moderate" | "High";
  nextSteps: string[];
  confidenceNote: string;
};

const SYMPTOM_ALIASES: Record<string, string[]> = {
  fever: ["fever", "temperature", "high temp", "fiebre"],
  cough: ["cough", "coughing", "tos"],
  "sore throat": ["sore throat", "throat pain", "dolor de garganta", "garganta"],
  respiratory: ["shortness of breath", "breathless", "trouble breathing", "respiratory", "dificultad para respirar"],
  fatigue: ["fatigue", "tired", "weak", "cansancio"],
  "body aches": ["body ache", "body pain", "muscle pain", "aches", "dolor corporal"],
  headache: ["headache", "migraine", "dolor de cabeza"],
  nausea: ["nausea", "vomit", "vomiting", "queasiness", "nausea", "náusea"],
  diarrhea: ["diarrhea", "loose stool", "stomach bug", "diarrea"],
  rash: ["rash", "skin spots", "hives", "erupcion", "erupción"],
  "loss of smell/taste": ["loss of smell", "loss of taste", "cant smell", "cant taste", "no smell"],
};

const DISEASE_PROFILES: Record<string, Record<string, number>> = {
  Influenza: { fever: 2.2, cough: 2, fatigue: 1.6, "body aches": 1.8, headache: 1.4, "sore throat": 1.2, respiratory: 0.8 },
  "COVID-19": { fever: 1.7, cough: 2, fatigue: 1.5, respiratory: 2, "loss of smell/taste": 2.4, "sore throat": 1.1, headache: 1 },
  RSV: { cough: 2, fever: 1.2, respiratory: 1.8, fatigue: 1, "sore throat": 1 },
  Norovirus: { nausea: 2.2, diarrhea: 2.5, fatigue: 0.8, fever: 0.7 },
  Salmonella: { nausea: 1.7, diarrhea: 2.4, fever: 1, "body aches": 0.6 },
  "E. coli": { nausea: 1.5, diarrhea: 2.6, fever: 0.6 },
  Dengue: { fever: 2.3, headache: 1.9, "body aches": 1.8, rash: 1.6, nausea: 1 },
  "West Nile Virus": { fever: 1.7, headache: 1.8, "body aches": 1.4, fatigue: 1 },
  "Valley Fever": { cough: 1.9, fever: 1.2, fatigue: 1.5, respiratory: 1.2 },
};

export const SYMPTOM_KEYWORDS = [
  "fever",
  "cough",
  "sore throat",
  "rash",
  "vomit",
  "nausea",
  "fatigue",
  "headache",
  "diarrhea",
  "shortness of breath",
  "i feel",
  "i have",
  "my child",
  "symptoms",
  "sick",
  "ill",
  "tengo",
  "me siento",
];

function normalizeText(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9ñáéíóúü\s]/gi, " ").replace(/\s{2,}/g, " ").trim();
}

export function isSymptomMessage(text: string) {
  const normalized = normalizeText(text);
  return SYMPTOM_KEYWORDS.some((keyword) => normalized.includes(normalizeText(keyword)));
}

function extractSymptoms(text: string, selectedSymptoms: string[] = []) {
  const normalized = normalizeText(text);
  const fromText = Object.entries(SYMPTOM_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => normalized.includes(normalizeText(alias))))
    .map(([symptom]) => symptom);
  return Array.from(new Set([...selectedSymptoms, ...fromText]));
}

function parseSeverity(text: string, selectedSeverity?: string): ParsedSymptoms["severity"] {
  if (selectedSeverity === "mild" || selectedSeverity === "moderate" || selectedSeverity === "severe") {
    return selectedSeverity;
  }
  const lower = text.toLowerCase();
  if (/severe|very bad|can't breathe|cannot breathe|chest pain|urgent|emergency/.test(lower)) return "severe";
  if (/moderate|getting worse|persistent|several days|not improving/.test(lower)) return "moderate";
  return "mild";
}

function parseOnsetDays(text: string, selectedOnset?: string) {
  if (selectedOnset === "today") return 1;
  if (selectedOnset === "1-3") return 3;
  if (selectedOnset === "4-7") return 7;
  const lower = text.toLowerCase();
  const dayMatch = lower.match(/(\d+)\s*(day|days)/);
  if (dayMatch) return Number(dayMatch[1]);
  const weekMatch = lower.match(/(\d+)\s*(week|weeks)/);
  if (weekMatch) return Number(weekMatch[1]) * 7;
  if (lower.includes("today")) return 1;
  if (lower.includes("yesterday")) return 2;
  return 0;
}

function riskBand(percent: number): "Low" | "Moderate" | "High" {
  if (percent >= 8) return "High";
  if (percent >= 4) return "Moderate";
  return "Low";
}

export async function analyzeSymptoms(input: {
  message?: string;
  county?: string;
  zipCode?: string;
  symptoms?: string[];
  severity?: string;
  onset?: string;
  hasTravel?: boolean;
  hasAnimalExposure?: boolean;
}): Promise<SymptomAnalysisResult> {
  const message = input.message ?? "";
  const users = await readCsv("synthetic_user_accounts.csv");
  const reports = await readCsv("synthetic_reports.csv");
  const countyOptions = Array.from(new Set(users.map((u) => u.county))).sort();
  const county = input.county && countyOptions.includes(input.county) ? input.county : countyOptions[0] ?? "";
  const countyUsers = users.filter((u) => u.county === county);
  const zipOptions = Array.from(new Set(countyUsers.map((u) => u.zip_code))).sort();
  const zipCode = input.zipCode && zipOptions.includes(input.zipCode) ? input.zipCode : zipOptions[0] ?? "";

  const parsed: ParsedSymptoms = {
    symptoms: extractSymptoms(message, input.symptoms ?? []),
    severity: parseSeverity(message, input.severity),
    onsetDays: parseOnsetDays(message, input.onset),
    hasTravel: Boolean(input.hasTravel) || /\btravel|trip|airport|flight\b/i.test(message),
    hasAnimalExposure: Boolean(input.hasAnimalExposure) || /\banimal|wildlife|bite|pet|livestock\b/i.test(message),
  };

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  const countyIds = new Set(countyUsers.map((u) => u.person_id));
  const countyReports7d = reports.filter((report) => {
    if (!countyIds.has(report.person_id)) return false;
    const submitted = new Date(report.submitted_at);
    return submitted >= start && submitted <= end;
  });
  const diseaseCounts = countyReports7d.reduce<Record<string, number>>((acc, report) => {
    acc[report.suspected_disease] = (acc[report.suspected_disease] ?? 0) + 1;
    return acc;
  }, {});
  const topDiseaseSignals = Object.entries(diseaseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([disease, count], index) => ({ disease, count, rank: index + 1 }));

  const candidates = Object.entries(DISEASE_PROFILES)
    .map(([disease, profile]) => {
      const symptomScore = parsed.symptoms.reduce((score, symptom) => score + (profile[symptom] ?? 0), 0);
      const localCount = diseaseCounts[disease] ?? 0;
      const localScore = countyReports7d.length ? (localCount / countyReports7d.length) * 3 : 0;
      return { disease, score: symptomScore * 0.75 + localScore * 0.25, localCount };
    })
    .sort((a, b) => b.score - a.score);
  const likely = candidates[0];
  const likelyConcern = likely && likely.score > 0 ? likely.disease : "General symptom concern";
  const symptomMatches = parsed.symptoms.length ? parsed.symptoms : ["Need more symptom detail"];
  const communityRiskPercent = countyUsers.length ? Number(((countyReports7d.length / countyUsers.length) * 100).toFixed(2)) : 0;

  let personalRiskBand: SymptomAnalysisResult["personalRiskBand"] = "Low";
  if (parsed.severity === "severe" || parsed.onsetDays >= 7 || communityRiskPercent >= 8) personalRiskBand = "High";
  else if (parsed.severity === "moderate" || parsed.onsetDays >= 3 || communityRiskPercent >= 4) personalRiskBand = "Moderate";

  const localMatch = topDiseaseSignals.some((signal) => signal.disease === likelyConcern);
  const nextSteps =
    personalRiskBand === "High"
      ? ["Seek urgent medical evaluation today if symptoms are worsening.", "Avoid close contact with high-risk individuals.", "Track breathing, fever, hydration, and symptom changes."]
      : ["Monitor symptoms for the next 48 hours.", "Avoid close contact with high-risk individuals.", "Seek care if symptoms worsen or persist."];

  return {
    parsed,
    likelyConcern,
    symptomMatches,
    area: {
      county,
      zipCode,
      communityRiskPercent,
      communityRiskBand: riskBand(communityRiskPercent),
      topDiseaseSignals,
      localMatch,
    },
    personalRiskBand,
    nextSteps,
    confidenceNote: "This is a data-guided public health interpretation, not a medical diagnosis.",
  };
}

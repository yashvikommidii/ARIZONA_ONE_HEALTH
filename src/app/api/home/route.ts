import { NextRequest, NextResponse } from "next/server";
import { calcAge, readCsv } from "@/lib/csv";

function getLocalDateString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ message: "username is required" }, { status: 400 });
  }

  const users = await readCsv("synthetic_user_accounts.csv");
  const reports = await readCsv("synthetic_reports.csv");
  const user = users.find((u) => u.username === username);

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const today = getLocalDateString();
  const todaysReport = reports.find(
    (r) => r.person_id === user.person_id && r.submitted_at === today
  );

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

  const countyUsers = users.filter((u) => u.county === user.county);
  const zipUsers = countyUsers.filter((u) => u.zip_code === user.zip_code);
  const countyIds = new Set(countyUsers.map((u) => u.person_id));
  const zipIds = new Set(zipUsers.map((u) => u.person_id));

  const countyReports7d = reports.filter((r) => {
    if (!countyIds.has(r.person_id)) return false;
    const d = new Date(r.submitted_at);
    return d >= start && d <= end;
  });
  const zipReports7d = reports.filter((r) => {
    if (!zipIds.has(r.person_id)) return false;
    const d = new Date(r.submitted_at);
    return d >= start && d <= end;
  });

  const diseaseCounts: Record<string, number> = {};
  for (const report of zipReports7d) {
    diseaseCounts[report.suspected_disease] = (diseaseCounts[report.suspected_disease] ?? 0) + 1;
  }
  const topDiseaseEntry =
    Object.entries(diseaseCounts).sort((a, b) => b[1] - a[1])[0] ?? null;
  const topDiseaseName = topDiseaseEntry?.[0] ?? "No major disease signal";
  const topDiseaseCount = topDiseaseEntry?.[1] ?? 0;

  const communityRisk = zipUsers.length
    ? ((zipReports7d.length / zipUsers.length) * 100).toFixed(2)
    : "0.00";
  const countyRisk = countyUsers.length
    ? ((countyReports7d.length / countyUsers.length) * 100).toFixed(2)
    : "0.00";
  const individualRisk = zipUsers.length
    ? ((topDiseaseCount / zipUsers.length) * 100).toFixed(2)
    : "0.00";

  const preventionByDisease: Record<string, string> = {
    Influenza:
      "Top disease signal is Influenza. Wear a mask in crowded indoor spaces, wash hands often, and stay home if fever or cough starts.",
    "COVID-19":
      "Top disease signal is COVID-19. Use well-ventilated spaces, test early if symptoms appear, and avoid close contact when sick.",
    RSV: "Top disease signal is RSV. Protect infants and older adults by avoiding close contact when symptomatic and cleaning high-touch surfaces.",
    Dengue:
      "Top disease signal is Dengue. Prevent mosquito bites with repellent, full sleeves, and removing standing water around homes.",
    "West Nile Virus":
      "Top disease signal is West Nile Virus. Reduce dusk outdoor exposure, use repellent, and remove stagnant water where mosquitoes breed.",
    "Valley Fever":
      "Top disease signal is Valley Fever. Limit dust exposure, use masks in dusty areas, and seek care for persistent cough or fever.",
    Salmonella:
      "Top disease signal is Salmonella. Wash hands, cook food thoroughly, and avoid cross-contamination of raw and cooked foods.",
    "E. coli":
      "Top disease signal is E. coli. Practice safe food handling, avoid undercooked meats, and use clean drinking water.",
    Norovirus:
      "Top disease signal is Norovirus. Wash hands with soap, disinfect shared surfaces, and isolate for 48 hours after symptoms stop.",
    "Rabies Exposure":
      "Top disease signal is rabies exposure. Avoid wildlife contact, report animal bites immediately, and seek urgent post-exposure care.",
  };
  const alertMessage =
    preventionByDisease[topDiseaseName] ??
    `Top disease signal is ${topDiseaseName}. Follow hygiene precautions, avoid close exposure when symptomatic, and monitor symptoms early.`;

  return NextResponse.json({
    profile: {
      name: `${user.first_name} ${user.last_name}`,
      county: user.county,
      zipCode: user.zip_code,
      age: calcAge(user.date_of_birth),
      username: user.username,
    },
    todayReport: todaysReport ?? null,
    snapshot: {
      communityRisk: `${communityRisk}%`,
      individualRisk: `${individualRisk}%`,
      countyRisk: `${countyRisk}%`,
      topDisease: topDiseaseName,
    },
    quickActions: [
      { label: "Submit Today's Report", href: "/home" },
      { label: "Risk Report", href: "/risk" },
      { label: "Explore Dashboard", href: "/dashboard" },
      { label: "Live Chat", href: "/live-chat" },
      { label: "Arizona Risk Map", href: "/map" },
    ],
    communityAlert: alertMessage,
    resources: [
      {
        label: "Health insurance near you",
        description: "Search local plans and coverage options for your county.",
        url: "https://www.healthcare.gov/",
      },
      {
        label: "Emergency contacts",
        description: "Quick access to emergency and county-level response numbers.",
        url: "https://www.azdps.gov/",
      },
      {
        label: "Nearby urgent care",
        description: "Locate urgent care and same-day services near your ZIP.",
        url: "https://www.azahcccs.gov/",
      },
    ],
    ads: [
      {
        title: "Safeway Pharmacy",
        description: "At-home COVID-19 test kit. Fast 15-minute results.",
        url: "https://www.safeway.com/pharmacy.html",
        badge: "In stock",
        cta: "Shop now",
        imageUrl:
          "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "Blue Cross Blue Shield of Arizona",
        description: "Health plans for you and your family with broad coverage.",
        url: "https://www.azblue.com/",
        badge: "Open enrollment",
        cta: "Compare plans",
        imageUrl:
          "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "CVS Health",
        description: "COVID-19 vaccine appointments and neighborhood MinuteClinic care.",
        url: "https://www.cvs.com/",
        badge: "Walk-ins welcome",
        cta: "Find a clinic",
        imageUrl:
          "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  });
}

import { NextRequest, NextResponse } from "next/server";
import { analyzeSymptoms } from "@/lib/symptom-analysis";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const analysis = await analyzeSymptoms({
      message: String(body.message ?? ""),
      county: body.county ? String(body.county) : undefined,
      zipCode: body.zipCode ? String(body.zipCode) : undefined,
      symptoms: Array.isArray(body.symptoms) ? body.symptoms.map(String) : undefined,
      severity: body.severity ? String(body.severity) : undefined,
      onset: body.onset ? String(body.onset) : undefined,
      hasTravel: Boolean(body.hasTravel),
      hasAnimalExposure: Boolean(body.hasAnimalExposure),
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to analyze symptoms." },
      { status: 500 }
    );
  }
}

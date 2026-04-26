import { NextResponse } from "next/server";
import { getMapData } from "@/lib/map-data";

export async function GET() {
  const data = await getMapData();
  return NextResponse.json(data);
}

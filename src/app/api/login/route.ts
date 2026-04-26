import { NextRequest, NextResponse } from "next/server";
import { readCsv } from "@/lib/csv";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const firstName = String(body.firstName ?? "").trim().toLowerCase();
  const lastName = String(body.lastName ?? "").trim().toLowerCase();
  const username = String(body.username ?? "").trim().toLowerCase();
  const dateOfBirth = String(body.dateOfBirth ?? "").trim();
  const users = await readCsv("synthetic_user_accounts.csv");

  const match = users.find(
    (u) =>
      u.first_name.trim().toLowerCase() === firstName &&
      u.last_name.trim().toLowerCase() === lastName &&
      u.username.trim().toLowerCase() === username &&
      u.date_of_birth === dateOfBirth
  );

  if (!match) {
    return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      username: match.username,
      firstName: match.first_name,
      lastName: match.last_name,
      county: match.county,
      zipCode: match.zip_code,
      dateOfBirth: match.date_of_birth,
    },
  });
}

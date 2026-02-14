/**
 * Newsroom Auth API
 *
 * Simple password authentication for the newsroom.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (password === process.env.NEWSROOM_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set("newsroom_auth", password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("newsroom_auth");
  return NextResponse.json({ success: true });
}

/**
 * Entity Blocklist API
 *
 * Manages the list of names that should not be extracted as entities.
 *
 * GET: List all blocked names
 * POST: Add a name to the blocklist
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const blocklist = await prisma.entityBlocklist.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(blocklist);
  } catch (error) {
    console.error("Failed to fetch blocklist:", error);
    return NextResponse.json(
      { error: "Failed to fetch blocklist" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, reason } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const entry = await prisma.entityBlocklist.create({
      data: {
        name: name.trim(),
        reason: reason?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "This name is already blocked" },
        { status: 400 }
      );
    }

    console.error("Failed to add to blocklist:", error);
    return NextResponse.json(
      { error: "Failed to add to blocklist" },
      { status: 500 }
    );
  }
}

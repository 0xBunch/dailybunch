/**
 * Entities API
 *
 * Create new entities.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const aliasesStr = formData.get("aliases") as string;

  if (!name || !type) {
    return NextResponse.json(
      { error: "Name and type are required" },
      { status: 400 }
    );
  }

  // Parse aliases from comma-separated string
  const aliases = aliasesStr
    ? aliasesStr.split(",").map((a) => a.trim()).filter(Boolean)
    : [];

  try {
    await prisma.entity.create({
      data: {
        name,
        type,
        aliases,
        active: true,
      },
    });

    return NextResponse.redirect(new URL("/admin/entities", request.url));
  } catch (error) {
    console.error("Failed to create entity:", error);
    return NextResponse.json(
      { error: "Failed to create entity" },
      { status: 500 }
    );
  }
}

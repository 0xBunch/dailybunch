/**
 * Entity Batch Import API
 *
 * Import multiple entities at once. Supports:
 * - JSON array of entities in request body
 * - Preset imports (nfl, nba, mlb teams)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { NFL_TEAMS, NBA_TEAMS, MLB_TEAMS } from "@/lib/data/sports-teams";

const VALID_TYPES = [
  "person",
  "organization",
  "product",
  "athlete",
  "brand",
  "event",
  "place",
  "media_outlet",
];

interface ImportEntity {
  name: string;
  type: string;
  aliases?: string[];
}

interface ImportRequest {
  entities?: ImportEntity[];
  preset?: string;
  skipDuplicates?: boolean;
}

const PRESETS: Record<string, ImportEntity[]> = {
  nfl: NFL_TEAMS,
  nba: NBA_TEAMS,
  mlb: MLB_TEAMS,
};

export async function POST(request: NextRequest) {
  try {
    const body: ImportRequest = await request.json();
    const { preset, skipDuplicates = true } = body;

    // Resolve entities from preset or request body
    let entities: ImportEntity[];
    if (preset && PRESETS[preset]) {
      entities = PRESETS[preset];
    } else if (body.entities && Array.isArray(body.entities)) {
      entities = body.entities;
    } else {
      return NextResponse.json(
        { error: "Provide either 'entities' array or 'preset' name (nfl, nba, mlb)" },
        { status: 400 }
      );
    }

    // Validate
    const validated = entities.filter(
      (e) => e.name && typeof e.name === "string" && VALID_TYPES.includes(e.type)
    );

    if (validated.length === 0) {
      return NextResponse.json(
        { error: "No valid entities to import. Each needs a name and valid type." },
        { status: 400 }
      );
    }

    const result = await prisma.entity.createMany({
      data: validated.map((e) => ({
        name: e.name,
        type: e.type,
        aliases: e.aliases || [],
        active: true,
        showInTrending: true,
      })),
      skipDuplicates,
    });

    return NextResponse.json({
      created: result.count,
      skipped: validated.length - result.count,
    });
  } catch (error) {
    console.error("Import failed:", error);
    return NextResponse.json(
      { error: "Import failed" },
      { status: 500 }
    );
  }
}

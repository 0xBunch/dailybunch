/**
 * Entity Blocklist Item API
 *
 * DELETE: Remove a name from the blocklist
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.entityBlocklist.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete from blocklist:", error);
    return NextResponse.json(
      { error: "Failed to delete from blocklist" },
      { status: 500 }
    );
  }
}

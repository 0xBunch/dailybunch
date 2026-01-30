/**
 * Blacklist API
 *
 * Add new entries to the blacklist.
 */

import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const type = formData.get("type") as string;
  const pattern = (formData.get("pattern") as string)?.trim().toLowerCase();
  const reason = (formData.get("reason") as string)?.trim() || null;

  if (!type || !pattern) {
    return redirectTo(request, "/admin/blacklist");
  }

  try {
    await prisma.blacklist.create({
      data: {
        type,
        pattern,
        reason,
      },
    });

    return redirectTo(request, "/admin/blacklist");
  } catch (error) {
    console.error("Failed to add to blacklist:", error);
    return redirectTo(request, "/admin/blacklist");
  }
}

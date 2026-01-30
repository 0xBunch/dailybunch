/**
 * Blacklist Entry API
 *
 * Delete blacklist entries.
 */

import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { redirectTo } from "@/lib/redirect";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await request.formData();
  const method = formData.get("_method");

  if (method === "DELETE") {
    try {
      await prisma.blacklist.delete({
        where: { id },
      });
    } catch (error) {
      console.error("Failed to delete blacklist entry:", error);
    }
  }

  return redirectTo(request, "/admin/blacklist");
}

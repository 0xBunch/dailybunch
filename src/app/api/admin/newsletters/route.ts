import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateInboxEmail } from "@/features/sources/services/newsletter-parser";
import { z } from "zod";

const newsletterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  fromEmail: z.string().email().optional().or(z.literal("")),
  description: z.string().optional(),
});

// GET /api/admin/newsletters
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const newsletters = await prisma.newsletter.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { issues: true },
        },
      },
    });

    return NextResponse.json({ newsletters });
  } catch (error) {
    console.error("Newsletters fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch newsletters" },
      { status: 500 }
    );
  }
}

// POST /api/admin/newsletters
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = newsletterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, fromEmail, description } = parsed.data;

    // Generate unique inbox email
    const inboxEmail = generateInboxEmail(name);

    // Check if inbox email already exists (shouldn't happen, but just in case)
    const existing = await prisma.newsletter.findUnique({
      where: { inboxEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Please try again (duplicate inbox generated)" },
        { status: 409 }
      );
    }

    const newsletter = await prisma.newsletter.create({
      data: {
        name,
        fromEmail: fromEmail || null,
        description: description || null,
        inboxEmail,
      },
    });

    return NextResponse.json({ success: true, newsletter }, { status: 201 });
  } catch (error) {
    console.error("Newsletter creation error:", error);
    return NextResponse.json(
      { error: "Failed to create newsletter" },
      { status: 500 }
    );
  }
}

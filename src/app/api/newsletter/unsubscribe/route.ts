import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/newsletter/unsubscribe?email=xxx
export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.redirect(new URL("/unsubscribe", req.url));
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!subscriber) {
      return NextResponse.redirect(new URL("/unsubscribe?error=not-found", req.url));
    }

    if (!subscriber.isActive) {
      return NextResponse.redirect(new URL("/?message=already-unsubscribed", req.url));
    }

    await prisma.subscriber.update({
      where: { email: email.toLowerCase() },
      data: {
        isActive: false,
        unsubscribedAt: new Date(),
      },
    });

    return NextResponse.redirect(new URL("/?message=unsubscribed", req.url));
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.redirect(new URL("/unsubscribe?error=failed", req.url));
  }
}

// POST /api/newsletter/unsubscribe
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!subscriber) {
      // Return success to prevent email enumeration
      return NextResponse.json({ success: true });
    }

    await prisma.subscriber.update({
      where: { email: email.toLowerCase() },
      data: {
        isActive: false,
        unsubscribedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed",
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}

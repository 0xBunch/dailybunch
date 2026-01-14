import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { emailNotifications, weeklyDigest, dailyDigest } = body;

    // Get user's email
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    if (!user?.email) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    // Check if user has an existing subscriber entry
    const existingSubscriber = await prisma.subscriber.findUnique({
      where: { email: user.email },
    });

    if (existingSubscriber) {
      // Update subscription status
      await prisma.subscriber.update({
        where: { email: user.email },
        data: {
          isActive: emailNotifications,
          unsubscribedAt: emailNotifications ? null : new Date(),
        },
      });
    } else if (emailNotifications) {
      // Create subscriber if enabling notifications
      await prisma.subscriber.create({
        data: {
          email: user.email,
          name: session.user.name || null,
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      preferences: {
        emailNotifications,
        weeklyDigest,
        dailyDigest,
      }
    });
  } catch (error) {
    console.error("Preferences update error:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's email
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    if (!user?.email) {
      return NextResponse.json({
        preferences: {
          emailNotifications: false,
          weeklyDigest: true,
          dailyDigest: false,
        }
      });
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { email: user.email },
    });

    return NextResponse.json({
      preferences: {
        emailNotifications: subscriber?.isActive ?? false,
        weeklyDigest: true, // Default values for now
        dailyDigest: false,
      }
    });
  } catch (error) {
    console.error("Preferences fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

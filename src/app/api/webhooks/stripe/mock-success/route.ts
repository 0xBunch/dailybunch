import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Mock success endpoint for development
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  const customerId = searchParams.get("customer_id");
  const subscriptionId = searchParams.get("subscription_id");

  if (!userId) {
    return NextResponse.redirect(
      new URL("/settings/billing?error=missing_user", req.url)
    );
  }

  try {
    // Update user with mock subscription data
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        isPro: true,
        stripeCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    });

    console.log(`Mock checkout success for user ${userId}`);

    // Redirect to success page
    return NextResponse.redirect(
      new URL("/settings/billing?success=true", req.url)
    );
  } catch (error) {
    console.error("Mock success error:", error);
    return NextResponse.redirect(
      new URL("/settings/billing?error=update_failed", req.url)
    );
  }
}

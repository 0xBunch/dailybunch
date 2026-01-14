import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { z } from "zod";

const subscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
});

// POST /api/newsletter/subscribe - Subscribe to newsletter
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, name } = parsed.data;

    // Check if already subscribed
    const existing = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json(
          { error: "This email is already subscribed" },
          { status: 409 }
        );
      }

      // Reactivate subscription
      await prisma.subscriber.update({
        where: { email },
        data: {
          isActive: true,
          unsubscribedAt: null,
          name: name || existing.name,
        },
      });
    } else {
      // Create new subscriber
      await prisma.subscriber.create({
        data: {
          email,
          name,
        },
      });
    }

    // Send welcome email
    await sendEmail({
      to: email,
      subject: "Welcome to Daily Bunch!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937;">Welcome to Daily Bunch!</h1>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Thanks for subscribing! You'll now receive our daily digest of the best links from across the web.
          </p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Every day, we curate the most interesting content in tech, business, and culture - so you can stay informed without the noise.
          </p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Your first newsletter will arrive tomorrow morning.
          </p>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 32px;">
            If you didn't subscribe to Daily Bunch, you can safely ignore this email.
          </p>
        </body>
        </html>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed!",
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}

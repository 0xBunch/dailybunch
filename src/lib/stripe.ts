import Stripe from "stripe";
import { isMockMode } from "@/lib/utils";

// Real Stripe client (only if API key exists)
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    })
  : null;

export interface MockCheckoutSession {
  id: string;
  url: string;
  customer: string;
  subscription: string;
  status: "complete" | "open" | "expired";
}

export interface MockSubscription {
  id: string;
  status: "active" | "canceled" | "past_due";
  current_period_end: number;
  cancel_at_period_end: boolean;
}

// Mock data store (in-memory for development)
const mockSubscriptions: Map<string, MockSubscription> = new Map();

export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  priceId?: string
): Promise<{ url: string } | null> {
  if (isMockMode() || !stripe) {
    // Mock checkout - redirect to success page with mock session
    const mockSessionId = `mock_session_${Date.now()}`;
    const mockCustomerId = `mock_cus_${userId}`;
    const mockSubscriptionId = `mock_sub_${userId}`;

    // Store mock subscription
    mockSubscriptions.set(mockSubscriptionId, {
      id: mockSubscriptionId,
      status: "active",
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
      cancel_at_period_end: false,
    });

    return {
      url: `/api/webhooks/stripe/mock-success?session_id=${mockSessionId}&user_id=${userId}&customer_id=${mockCustomerId}&subscription_id=${mockSubscriptionId}`,
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: userEmail,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId || process.env.STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
      metadata: {
        userId,
      },
    });

    return { url: session.url! };
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return null;
  }
}

export async function createBillingPortalSession(
  customerId: string
): Promise<{ url: string } | null> {
  if (isMockMode() || !stripe) {
    return {
      url: "/settings/billing?portal=mock",
    };
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    });

    return { url: session.url };
  } catch (error) {
    console.error("Stripe portal error:", error);
    return null;
  }
}

export async function getSubscription(
  subscriptionId: string
): Promise<MockSubscription | Stripe.Subscription | null> {
  if (isMockMode() || !stripe) {
    return mockSubscriptions.get(subscriptionId) || null;
  }

  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error("Stripe subscription error:", error);
    return null;
  }
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<boolean> {
  if (isMockMode() || !stripe) {
    const sub = mockSubscriptions.get(subscriptionId);
    if (sub) {
      sub.cancel_at_period_end = true;
      return true;
    }
    return false;
  }

  try {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return true;
  } catch (error) {
    console.error("Stripe cancel error:", error);
    return false;
  }
}

export function getMockSubscription(subscriptionId: string): MockSubscription | undefined {
  return mockSubscriptions.get(subscriptionId);
}

export function setMockSubscription(subscriptionId: string, sub: MockSubscription): void {
  mockSubscriptions.set(subscriptionId, sub);
}

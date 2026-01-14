import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubscribeForm } from "@/features/newsletter/components/subscribe-form";
import { prisma } from "@/lib/prisma";
import { LinkCard } from "@/features/links/components/link-card";
import type { FeedItem } from "@/types";
import { ArrowRight, Zap, Globe, Brain, Mail } from "lucide-react";

async function getTrendingLinks(): Promise<FeedItem[]> {
  try {
    const links = await prisma.link.findMany({
      where: {
        status: { in: ["APPROVED", "FEATURED"] },
      },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 10,
      include: {
        submitter: {
          select: { id: true, name: true },
        },
        tags: {
          include: { tag: true },
        },
        _count: {
          select: { comments: true, mentions: true },
        },
      },
    });

    return links.map((link) => ({
      id: link.id,
      url: link.url,
      title: link.title,
      description: link.description,
      domain: link.domain,
      aiSummary: link.aiSummary,
      score: link.score,
      status: link.status,
      firstSeenAt: link.firstSeenAt,
      createdAt: link.createdAt,
      submitter: link.submitter,
      tags: link.tags.map((t) => t.tag.name),
      commentCount: link._count.comments,
      mentionCount: link._count.mentions,
    }));
  } catch {
    // Database might not be connected yet
    return [];
  }
}

export default async function HomePage() {
  const trendingLinks = await getTrendingLinks();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/30">
          <div className="container py-20 md:py-28">
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="secondary" className="mb-4">
                <Zap className="h-3 w-3 mr-1" />
                AI-Powered Curation
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                The best links from across the web,{" "}
                <span className="text-primary">delivered daily</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of readers who start their day with Daily Bunch.
                We aggregate, curate, and summarize the most interesting content
                so you don&apos;t have to.
              </p>
              <div className="max-w-md mx-auto">
                <SubscribeForm />
              </div>
            </div>
          </div>

          {/* Background decoration */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
          </div>
        </section>

        {/* Features */}
        <section className="py-16 border-b">
          <div className="container">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Multi-Source Aggregation</h3>
                <p className="text-muted-foreground text-sm">
                  We pull from hundreds of RSS feeds and newsletters to find the
                  best content across tech, business, and culture.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">AI-Powered Summaries</h3>
                <p className="text-muted-foreground text-sm">
                  Every link comes with an AI-generated summary so you can
                  quickly decide what&apos;s worth your time.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Daily Newsletter</h3>
                <p className="text-muted-foreground text-sm">
                  Get the top links delivered to your inbox every morning.
                  No spam, just signal.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trending Links */}
        <section className="py-16">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Trending Today</h2>
                <p className="text-muted-foreground">
                  The most popular links from the past 24 hours
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/archive">
                  View Archive
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {trendingLinks.length > 0 ? (
              <div className="space-y-4">
                {trendingLinks.map((link) => (
                  <LinkCard key={link.id} link={link} showVoting={false} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-lg mb-2">No links yet</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to submit a link or wait for RSS feeds to populate.
                </p>
                <Button asChild>
                  <Link href="/login">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to stay informed?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
              Join our newsletter and get the best links delivered to your inbox
              every day. Free forever.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/login?signup=true">Subscribe Now</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                asChild
              >
                <Link href="/pricing">View Pro Features</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

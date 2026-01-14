import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Zap,
  Rss,
  Mail,
  Sparkles,
  TrendingUp,
  Users,
  Shield,
  Globe,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Daily Bunch - your daily source for curated links from across the web.",
};

export default function AboutPage() {
  const features = [
    {
      icon: Rss,
      title: "RSS Aggregation",
      description:
        "We monitor hundreds of RSS feeds from top publications to surface the best content.",
    },
    {
      icon: Mail,
      title: "Newsletter Parsing",
      description:
        "Popular newsletters are automatically parsed to extract and index their recommended links.",
    },
    {
      icon: Sparkles,
      title: "AI Curation",
      description:
        "Every link is enriched with AI-generated summaries and smart categorization.",
    },
    {
      icon: TrendingUp,
      title: "Trending Algorithm",
      description:
        "Our algorithm surfaces the most discussed and shared links based on mentions and engagement.",
    },
  ];

  const values = [
    {
      icon: Shield,
      title: "Quality First",
      description:
        "We prioritize quality over quantity. Every link is vetted before being published.",
    },
    {
      icon: Users,
      title: "Community Driven",
      description:
        "Built for curious minds who want to stay informed without the noise.",
    },
    {
      icon: Globe,
      title: "Open Discovery",
      description:
        "Discover content from diverse sources, not just the usual suspects.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="flex justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Zap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            About Daily Bunch
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Daily Bunch is your daily source for curated links from across the web.
            Think of it as Hacker News meets Morning Brew — a clean,
            thoughtfully curated feed of the best content, powered by AI.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">
                    <span className="text-primary mr-2">{index + 1}.</span>
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value) => (
              <div key={value.title} className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to stay informed?</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of curious minds who start their day with Daily Bunch.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/">Browse Today's Links</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login?signup=true">Create Account</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

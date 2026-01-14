"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { LinkList } from "@/features/links/components/link-list";
import { SubscribeForm } from "@/features/newsletter/components/subscribe-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Flame, Clock, TrendingUp, Bookmark, Settings } from "lucide-react";
import type { FeedItem } from "@/types";
import Link from "next/link";

export default function FeedPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("trending");
  const [links, setLinks] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [topDomains, setTopDomains] = useState<
    { domain: string; linkCount: number; totalScore: number }[]
  >([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  useEffect(() => {
    fetchLinks();
    fetchTopDomains();
  }, [activeTab]);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      let url = "/api/links/trending?limit=30";
      if (activeTab === "trending") {
        url += "&period=day";
      } else if (activeTab === "week") {
        url += "&period=week";
      } else if (activeTab === "new") {
        url = "/api/links/trending?limit=30&period=day";
      }
      const res = await fetch(url);
      const data = await res.json();
      setLinks(data.items || []);
    } catch (error) {
      console.error("Failed to fetch links:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopDomains = async () => {
    try {
      const res = await fetch("/api/links/top-domains?period=week&limit=5");
      const data = await res.json();
      setTopDomains(data.domains || []);
    } catch (error) {
      console.error("Failed to fetch top domains:", error);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main content */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Your Feed</h1>
              <Link
                href="/settings"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Settings className="h-4 w-4" />
                Customize
              </Link>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="trending" className="flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  Trending
                </TabsTrigger>
                <TabsTrigger value="week" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  This Week
                </TabsTrigger>
                <TabsTrigger value="new" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  New
                </TabsTrigger>
                <TabsTrigger value="saved" className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4" />
                  Saved
                </TabsTrigger>
              </TabsList>

              <TabsContent value="trending">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-32 bg-muted animate-pulse rounded-lg"
                      />
                    ))}
                  </div>
                ) : (
                  <LinkList links={links} showRank />
                )}
              </TabsContent>

              <TabsContent value="week">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-32 bg-muted animate-pulse rounded-lg"
                      />
                    ))}
                  </div>
                ) : (
                  <LinkList links={links} showRank />
                )}
              </TabsContent>

              <TabsContent value="new">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-32 bg-muted animate-pulse rounded-lg"
                      />
                    ))}
                  </div>
                ) : (
                  <LinkList links={links} showRank={false} />
                )}
              </TabsContent>

              <TabsContent value="saved">
                <div className="text-center py-12">
                  <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No saved links yet</h3>
                  <p className="text-muted-foreground">
                    Click the bookmark icon on any link to save it here
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Welcome back, {session?.user?.name || "there"}!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Free Plan</Badge>
                </div>
                <Link
                  href="/settings/billing"
                  className="text-sm text-primary hover:underline mt-2 block"
                >
                  Upgrade to Pro →
                </Link>
              </CardContent>
            </Card>

            {/* Top domains */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Top Sources This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topDomains.map((domain, i) => (
                    <div
                      key={domain.domain}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground w-4">
                          {i + 1}.
                        </span>
                        <span className="text-sm truncate">{domain.domain}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {domain.linkCount} links
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Newsletter CTA */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Get the Daily Digest
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Get the top links delivered to your inbox every morning.
                </p>
                <SubscribeForm compact />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

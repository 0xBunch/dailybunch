"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Link2,
  Users,
  Mail,
  Rss,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowRight,
  Newspaper,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DashboardStats {
  links: {
    total: number;
    pending: number;
    approved: number;
    featured: number;
    enriched: number;
  };
  users: {
    total: number;
    pro: number;
    new24h: number;
  };
  subscribers: {
    total: number;
    active: number;
  };
  feeds: {
    total: number;
    active: number;
    lastFetch: string | null;
  };
  newsletters: {
    total: number;
    active: number;
  };
}

interface RecentActivity {
  type: "link" | "user" | "subscription";
  title: string;
  timestamp: string;
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
    if (
      status === "authenticated" &&
      session?.user?.role !== "ADMIN" &&
      session?.user?.role !== "SUPERADMIN"
    ) {
      redirect("/");
    }
  }, [session, status]);

  useEffect(() => {
    if (status === "authenticated") {
      loadStats();
    }
  }, [status]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      setStats(data.stats);
      setActivity(data.activity || []);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const quickLinks = [
    {
      title: "Moderate Links",
      href: "/admin/moderation",
      icon: CheckCircle,
      description: "Review and approve pending links",
    },
    {
      title: "Manage Feeds",
      href: "/admin/feeds",
      icon: Rss,
      description: "Configure RSS feed sources",
    },
    {
      title: "Newsletter Sources",
      href: "/admin/newsletters",
      icon: Mail,
      description: "Manage newsletter subscriptions",
    },
    {
      title: "Send Newsletter",
      href: "/admin/newsletter",
      icon: Newspaper,
      description: "Compose and send daily digest",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your Daily Bunch platform
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Links</CardTitle>
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.links.total || 0}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{stats?.links.approved || 0} approved</span>
                <span>•</span>
                <span className="text-orange-500">
                  {stats?.links.pending || 0} pending
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.users.total || 0}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{stats?.users.pro || 0} pro</span>
                <span>•</span>
                <span className="text-green-500">
                  +{stats?.users.new24h || 0} today
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.subscribers.total || 0}
              </div>
              <div className="text-xs text-muted-foreground">
                {stats?.subscribers.active || 0} active
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">RSS Feeds</CardTitle>
              <Rss className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.feeds.total || 0}
              </div>
              <div className="text-xs text-muted-foreground">
                {stats?.feeds.active || 0} active
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links and Status */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Links */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common admin tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {quickLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <link.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{link.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {link.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Health check</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Rss className="h-4 w-4" />
                  <span className="text-sm">RSS Fetching</span>
                </div>
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm">AI Enrichment</span>
                </div>
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Email Service</span>
                </div>
                <Badge variant="secondary" className="gap-1">
                  Mock Mode
                </Badge>
              </div>

              {stats?.feeds.lastFetch && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Last fetch:{" "}
                      {formatDistanceToNow(new Date(stats.feeds.lastFetch), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              )}

              {/* AI Enrichment Status */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Links Enriched</span>
                  <span className="text-sm text-muted-foreground">
                    {stats?.links.enriched || 0} / {stats?.links.total || 0}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${
                        stats?.links.total
                          ? ((stats.links.enriched || 0) /
                              stats.links.total) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

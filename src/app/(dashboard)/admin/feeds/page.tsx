"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, Trash2, Rss, Check, X } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface RssFeed {
  id: string;
  name: string;
  url: string;
  description: string | null;
  isActive: boolean;
  lastFetchedAt: string | null;
  lastError: string | null;
  createdAt: string;
  _count?: {
    subscribers: number;
  };
}

export default function AdminFeedsPage() {
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFeed, setNewFeed] = useState({ name: "", url: "", description: "" });
  const [addingFeed, setAddingFeed] = useState(false);

  const loadFeeds = async () => {
    try {
      const res = await fetch("/api/admin/feeds");
      if (!res.ok) throw new Error("Failed to load feeds");
      const data = await res.json();
      setFeeds(data.feeds || []);
    } catch (error) {
      toast.error("Failed to load feeds");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeeds();
  }, []);

  const handleFetchAll = async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/cron/fetch-rss", { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      toast.success(
        `Fetched ${data.totalLinksAdded} new links from ${data.successfulFeeds} feeds`
      );
      loadFeeds();
    } catch (error) {
      toast.error("Failed to fetch feeds");
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  const handleSeedFeeds = async () => {
    try {
      const res = await fetch("/api/cron/fetch-rss?seed=true");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      toast.success(data.message);
      loadFeeds();
    } catch (error) {
      toast.error("Failed to seed feeds");
      console.error(error);
    }
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingFeed(true);

    try {
      const res = await fetch("/api/admin/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFeed),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Feed added successfully");
      setShowAddForm(false);
      setNewFeed({ name: "", url: "", description: "" });
      loadFeeds();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add feed");
    } finally {
      setAddingFeed(false);
    }
  };

  const handleToggleFeed = async (feedId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/feeds/${feedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (!res.ok) throw new Error("Failed to update feed");

      setFeeds(
        feeds.map((f) => (f.id === feedId ? { ...f, isActive } : f))
      );
      toast.success(`Feed ${isActive ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Failed to update feed");
      console.error(error);
    }
  };

  const handleDeleteFeed = async (feedId: string) => {
    if (!confirm("Are you sure you want to delete this feed?")) return;

    try {
      const res = await fetch(`/api/admin/feeds/${feedId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete feed");

      setFeeds(feeds.filter((f) => f.id !== feedId));
      toast.success("Feed deleted");
    } catch (error) {
      toast.error("Failed to delete feed");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">RSS Feeds</h1>
            <p className="text-muted-foreground">
              Manage RSS feed sources for link aggregation
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSeedFeeds}>
              Seed Defaults
            </Button>
            <Button variant="outline" onClick={handleFetchAll} disabled={fetching}>
              {fetching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Fetch All
                </>
              )}
            </Button>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Feed
            </Button>
          </div>
        </div>

        {/* Add Feed Form */}
        {showAddForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add New RSS Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddFeed} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newFeed.name}
                      onChange={(e) =>
                        setNewFeed({ ...newFeed, name: e.target.value })
                      }
                      placeholder="TechCrunch"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">Feed URL</Label>
                    <Input
                      id="url"
                      type="url"
                      value={newFeed.url}
                      onChange={(e) =>
                        setNewFeed({ ...newFeed, url: e.target.value })
                      }
                      placeholder="https://example.com/rss"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={newFeed.description}
                    onChange={(e) =>
                      setNewFeed({ ...newFeed, description: e.target.value })
                    }
                    placeholder="Technology news and analysis"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={addingFeed}>
                    {addingFeed && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Feed
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Feeds List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : feeds.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Rss className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No RSS feeds yet</h3>
              <p className="text-muted-foreground mb-4">
                Add some RSS feeds to start aggregating links
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleSeedFeeds}>Seed Default Feeds</Button>
                <Button variant="outline" onClick={() => setShowAddForm(true)}>
                  Add Custom Feed
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {feeds.map((feed) => (
              <Card key={feed.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Rss className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{feed.name}</h3>
                          <Badge variant={feed.isActive ? "default" : "secondary"}>
                            {feed.isActive ? "Active" : "Disabled"}
                          </Badge>
                          {feed.lastError && (
                            <Badge variant="destructive">Error</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {feed.url}
                        </p>
                        {feed.description && (
                          <p className="text-sm text-muted-foreground">
                            {feed.description}
                          </p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          {feed.lastFetchedAt && (
                            <span className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-green-500" />
                              Last fetched: {formatRelativeTime(feed.lastFetchedAt)}
                            </span>
                          )}
                          {feed.lastError && (
                            <span className="flex items-center gap-1 text-red-500">
                              <X className="h-3 w-3" />
                              {feed.lastError}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={feed.isActive}
                        onCheckedChange={(checked) =>
                          handleToggleFeed(feed.id, checked)
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteFeed(feed.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

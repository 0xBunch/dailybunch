"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Mail, Copy, Check, X } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface Newsletter {
  id: string;
  name: string;
  fromEmail: string | null;
  inboxEmail: string;
  description: string | null;
  isActive: boolean;
  lastReceivedAt: string | null;
  lastError: string | null;
  createdAt: string;
  _count?: {
    issues: number;
  };
}

export default function AdminNewslettersPage() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNewsletter, setNewNewsletter] = useState({
    name: "",
    fromEmail: "",
    description: "",
  });
  const [adding, setAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadNewsletters = async () => {
    try {
      const res = await fetch("/api/admin/newsletters");
      if (!res.ok) throw new Error("Failed to load newsletters");
      const data = await res.json();
      setNewsletters(data.newsletters || []);
    } catch (error) {
      toast.error("Failed to load newsletters");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNewsletters();
  }, []);

  const handleAddNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);

    try {
      const res = await fetch("/api/admin/newsletters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNewsletter),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Newsletter source added");
      setShowAddForm(false);
      setNewNewsletter({ name: "", fromEmail: "", description: "" });
      loadNewsletters();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add newsletter");
    } finally {
      setAdding(false);
    }
  };

  const handleToggleNewsletter = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/newsletters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (!res.ok) throw new Error("Failed to update newsletter");

      setNewsletters(
        newsletters.map((n) => (n.id === id ? { ...n, isActive } : n))
      );
      toast.success(`Newsletter ${isActive ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Failed to update newsletter");
      console.error(error);
    }
  };

  const handleDeleteNewsletter = async (id: string) => {
    if (!confirm("Are you sure you want to delete this newsletter source?")) return;

    try {
      const res = await fetch(`/api/admin/newsletters/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete newsletter");

      setNewsletters(newsletters.filter((n) => n.id !== id));
      toast.success("Newsletter deleted");
    } catch (error) {
      toast.error("Failed to delete newsletter");
      console.error(error);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Newsletter Sources</h1>
            <p className="text-muted-foreground">
              Configure email addresses to receive and parse newsletters
            </p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Newsletter
          </Button>
        </div>

        {/* Instructions */}
        <Card className="mb-8 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="py-4">
            <h3 className="font-semibold mb-2">How it works</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Add a newsletter source with a descriptive name</li>
              <li>Copy the generated inbox email address</li>
              <li>Subscribe to the newsletter using that email address</li>
              <li>Incoming emails will be automatically parsed for links</li>
            </ol>
          </CardContent>
        </Card>

        {/* Add Form */}
        {showAddForm && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <form onSubmit={handleAddNewsletter} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Newsletter Name</Label>
                    <Input
                      id="name"
                      value={newNewsletter.name}
                      onChange={(e) =>
                        setNewNewsletter({ ...newNewsletter, name: e.target.value })
                      }
                      placeholder="Morning Brew"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fromEmail">Expected Sender (optional)</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      value={newNewsletter.fromEmail}
                      onChange={(e) =>
                        setNewNewsletter({ ...newNewsletter, fromEmail: e.target.value })
                      }
                      placeholder="newsletter@morningbrew.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={newNewsletter.description}
                    onChange={(e) =>
                      setNewNewsletter({ ...newNewsletter, description: e.target.value })
                    }
                    placeholder="Daily business news digest"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={adding}>
                    {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Newsletter
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

        {/* Newsletter List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : newsletters.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No newsletter sources yet</h3>
              <p className="text-muted-foreground mb-4">
                Add newsletter sources to start collecting links from email
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Newsletter
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {newsletters.map((newsletter) => (
              <Card key={newsletter.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{newsletter.name}</h3>
                          <Badge variant={newsletter.isActive ? "default" : "secondary"}>
                            {newsletter.isActive ? "Active" : "Disabled"}
                          </Badge>
                          {newsletter._count && newsletter._count.issues > 0 && (
                            <Badge variant="outline">
                              {newsletter._count.issues} issues
                            </Badge>
                          )}
                        </div>
                        {newsletter.description && (
                          <p className="text-sm text-muted-foreground">
                            {newsletter.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {newsletter.inboxEmail}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              copyToClipboard(newsletter.inboxEmail, newsletter.id)
                            }
                          >
                            {copiedId === newsletter.id ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          {newsletter.fromEmail && (
                            <span>From: {newsletter.fromEmail}</span>
                          )}
                          {newsletter.lastReceivedAt && (
                            <span className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-green-500" />
                              Last received: {formatRelativeTime(newsletter.lastReceivedAt)}
                            </span>
                          )}
                          {newsletter.lastError && (
                            <span className="flex items-center gap-1 text-red-500">
                              <X className="h-3 w-3" />
                              {newsletter.lastError}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={newsletter.isActive}
                        onCheckedChange={(checked) =>
                          handleToggleNewsletter(newsletter.id, checked)
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteNewsletter(newsletter.id)}
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

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Send,
  Eye,
  History,
  Loader2,
  Mail,
  Check,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface EditionLink {
  id: string;
  title: string;
  url: string;
  domain: string;
  aiSummary: string | null;
  score: number;
}

interface Edition {
  id: string;
  title: string;
  sentAt: string | null;
  sentCount: number | null;
  createdAt: string;
}

export default function AdminNewsletterPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("compose");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLinks, setPreviewLinks] = useState<EditionLink[]>([]);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [testEmail, setTestEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [sending, setSending] = useState(false);

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
    if (activeTab === "compose") {
      loadPreview();
    } else if (activeTab === "history") {
      loadEditions();
    }
  }, [activeTab]);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setPreviewHtml(data.html);
      setPreviewLinks(data.links || []);
    } catch (error) {
      toast.error("Failed to load preview");
    } finally {
      setLoading(false);
    }
  };

  const loadEditions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter/editions");
      const data = await res.json();
      setEditions(data.editions || []);
    } catch (error) {
      toast.error("Failed to load editions");
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address");
      return;
    }

    setSendingTest(true);
    try {
      const res = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testEmail,
          linkIds: previewLinks.map((l) => l.id),
        }),
      });
      const data = await res.json();

      if (data.success || data.sent > 0) {
        toast.success(`Test email sent to ${testEmail}`);
      } else {
        toast.error("Failed to send test email");
      }
    } catch (error) {
      toast.error("Failed to send test email");
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendNewsletter = async () => {
    if (
      !confirm(
        "Are you sure you want to send this newsletter to all subscribers?"
      )
    ) {
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkIds: previewLinks.map((l) => l.id),
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Newsletter sent to ${data.sent} subscribers`);
        setActiveTab("history");
        loadEditions();
      } else {
        toast.error(
          `Sent ${data.sent}, failed ${data.failed}. Check console for errors.`
        );
      }
    } catch (error) {
      toast.error("Failed to send newsletter");
    } finally {
      setSending(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Newsletter</h1>
          <p className="text-muted-foreground">
            Compose and send the Daily Bunch newsletter
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="compose" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Links selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Today's Links</CardTitle>
                  <CardDescription>
                    These links will be included in the newsletter (top 10 by
                    score)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="h-16 bg-muted animate-pulse rounded"
                        />
                      ))}
                    </div>
                  ) : previewLinks.length > 0 ? (
                    <div className="space-y-3">
                      {previewLinks.map((link, i) => (
                        <div
                          key={link.id}
                          className="flex items-start gap-3 p-3 border rounded-lg"
                        >
                          <span className="text-lg font-bold text-muted-foreground">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:underline line-clamp-1"
                            >
                              {link.title}
                            </a>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{link.domain}</span>
                              <span>•</span>
                              <span>{link.score} pts</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No links available. Add some links first.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Send options */}
              <Card>
                <CardHeader>
                  <CardTitle>Send Options</CardTitle>
                  <CardDescription>
                    Test before sending to all subscribers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Test email */}
                  <div className="space-y-3">
                    <Label htmlFor="testEmail">Send Test Email</Label>
                    <div className="flex gap-2">
                      <Input
                        id="testEmail"
                        type="email"
                        placeholder="test@example.com"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                      />
                      <Button
                        onClick={handleSendTest}
                        disabled={sendingTest || !testEmail}
                      >
                        {sendingTest && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Test
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Send a test email to yourself before sending to subscribers
                    </p>
                  </div>

                  {/* Send to all */}
                  <div className="pt-4 border-t">
                    <Button
                      onClick={handleSendNewsletter}
                      disabled={sending || previewLinks.length === 0}
                      className="w-full"
                      size="lg"
                    >
                      {sending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Send className="mr-2 h-4 w-4" />
                      Send to All Subscribers
                    </Button>
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      This will send the newsletter to all active subscribers
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Email Preview</CardTitle>
                <CardDescription>
                  This is how the newsletter will look in email clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-96 bg-muted animate-pulse rounded" />
                ) : previewHtml ? (
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full h-[600px]"
                      title="Email Preview"
                    />
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No preview available
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Sent Editions</CardTitle>
                <CardDescription>
                  History of sent newsletters
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-16 bg-muted animate-pulse rounded"
                      />
                    ))}
                  </div>
                ) : editions.length > 0 ? (
                  <div className="space-y-3">
                    {editions.map((edition) => (
                      <div
                        key={edition.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <h3 className="font-medium">{edition.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(
                                new Date(edition.createdAt),
                                "MMM d, yyyy 'at' h:mm a"
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {edition.sentAt ? (
                            <Badge variant="default" className="gap-1">
                              <Check className="h-3 w-3" />
                              Sent to {edition.sentCount}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Draft
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No editions sent yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

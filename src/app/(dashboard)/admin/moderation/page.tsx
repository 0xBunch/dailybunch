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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Check,
  X,
  Star,
  MoreVertical,
  ExternalLink,
  Loader2,
  Clock,
  Globe,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ModerationLink {
  id: string;
  url: string;
  title: string;
  description: string | null;
  domain: string;
  aiSummary: string | null;
  score: number;
  status: string;
  createdAt: string;
  submitter: {
    id: string;
    name: string | null;
  } | null;
  _count: {
    mentions: number;
  };
}

export default function ModerationPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("pending");
  const [links, setLinks] = useState<ModerationLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

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
      loadLinks();
    }
  }, [status, activeTab]);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const statusFilter = activeTab === "all" ? "" : `status=${activeTab.toUpperCase()}`;
      const res = await fetch(`/api/admin/links?${statusFilter}&limit=50`);
      const data = await res.json();
      setLinks(data.links || []);
    } catch (error) {
      toast.error("Failed to load links");
    } finally {
      setLoading(false);
    }
  };

  const updateLinkStatus = async (linkId: string, newStatus: string) => {
    setProcessingId(linkId);
    try {
      const res = await fetch(`/api/admin/links/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update link");
      }

      toast.success(`Link ${newStatus.toLowerCase()}`);
      loadLinks();
    } catch (error) {
      toast.error("Failed to update link status");
    } finally {
      setProcessingId(null);
    }
  };

  const deleteLink = async (linkId: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return;

    setProcessingId(linkId);
    try {
      const res = await fetch(`/api/admin/links/${linkId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete link");
      }

      toast.success("Link deleted");
      loadLinks();
    } catch (error) {
      toast.error("Failed to delete link");
    } finally {
      setProcessingId(null);
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
          <h1 className="text-3xl font-bold">Content Moderation</h1>
          <p className="text-muted-foreground">
            Review and approve submitted links
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending">
              Pending
              <Badge variant="secondary" className="ml-2">
                {links.filter((l) => l.status === "PENDING").length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="featured">Featured</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === "pending"
                    ? "Pending Review"
                    : activeTab === "all"
                    ? "All Links"
                    : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Links`}
                </CardTitle>
                <CardDescription>
                  {links.length} links found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-24 bg-muted animate-pulse rounded-lg"
                      />
                    ))}
                  </div>
                ) : links.length > 0 ? (
                  <div className="space-y-4">
                    {links.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-start gap-4 p-4 border rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:underline line-clamp-1 flex items-center gap-1"
                            >
                              {link.title}
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                            <Badge
                              variant={
                                link.status === "FEATURED"
                                  ? "default"
                                  : link.status === "APPROVED"
                                  ? "secondary"
                                  : link.status === "REJECTED"
                                  ? "destructive"
                                  : "outline"
                              }
                            >
                              {link.status}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Globe className="h-3 w-3" />
                            <span>{link.domain}</span>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(link.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                            <span>•</span>
                            <span>{link.score} pts</span>
                            {link._count.mentions > 0 && (
                              <>
                                <span>•</span>
                                <span>{link._count.mentions} mentions</span>
                              </>
                            )}
                          </div>

                          {link.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {link.description}
                            </p>
                          )}

                          {link.aiSummary && (
                            <div className="flex items-start gap-2 text-sm bg-muted/50 rounded p-2">
                              <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{link.aiSummary}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {link.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateLinkStatus(link.id, "APPROVED")
                                }
                                disabled={processingId === link.id}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateLinkStatus(link.id, "FEATURED")
                                }
                                disabled={processingId === link.id}
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateLinkStatus(link.id, "REJECTED")
                                }
                                disabled={processingId === link.id}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {link.status !== "APPROVED" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateLinkStatus(link.id, "APPROVED")
                                  }
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                              )}
                              {link.status !== "FEATURED" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateLinkStatus(link.id, "FEATURED")
                                  }
                                >
                                  <Star className="h-4 w-4 mr-2" />
                                  Feature
                                </DropdownMenuItem>
                              )}
                              {link.status !== "REJECTED" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateLinkStatus(link.id, "REJECTED")
                                  }
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteLink(link.id)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No links found
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

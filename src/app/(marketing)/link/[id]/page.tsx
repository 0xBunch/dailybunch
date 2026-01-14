import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ExternalLink,
  ArrowUp,
  MessageSquare,
  Share2,
  Clock,
  Globe,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LinkDetailPage({ params }: Props) {
  const { id } = await params;

  const link = await prisma.link.findUnique({
    where: { id },
    include: {
      submitter: {
        select: { id: true, name: true },
      },
      tags: {
        include: { tag: true },
      },
      comments: {
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      _count: {
        select: { comments: true, mentions: true, votes: true },
      },
    },
  });

  if (!link || !["APPROVED", "FEATURED"].includes(link.status)) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back link */}
        <Link
          href="/archive"
          className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-flex items-center"
        >
          ← Back to archive
        </Link>

        {/* Main content */}
        <div className="space-y-6">
          {/* Link header */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2">{link.title}</h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Globe className="h-4 w-4" />
                    <span>{link.domain}</span>
                    <span>•</span>
                    <Clock className="h-4 w-4" />
                    <span>
                      {formatDistanceToNow(link.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                  {link.description && (
                    <p className="text-muted-foreground">{link.description}</p>
                  )}
                </div>
                <div className="flex flex-col items-center gap-1 px-4 py-2 bg-muted rounded-lg">
                  <ArrowUp className="h-5 w-5 text-orange-500" />
                  <span className="font-bold text-lg">{link.score}</span>
                  <span className="text-xs text-muted-foreground">points</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* AI Summary */}
              {link.aiSummary && (
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      AI Summary
                    </span>
                  </div>
                  <p className="text-sm">{link.aiSummary}</p>
                </div>
              )}

              {/* Tags */}
              {link.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {link.tags.map((t) => (
                    <Badge key={t.tagId} variant="secondary">
                      {t.tag.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Link
                  </a>
                </Button>
                <Button variant="outline">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold">{link._count.mentions}</div>
                <div className="text-sm text-muted-foreground">
                  Newsletter Mentions
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold">{link._count.votes}</div>
                <div className="text-sm text-muted-foreground">Votes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold">{link._count.comments}</div>
                <div className="text-sm text-muted-foreground">Comments</div>
              </CardContent>
            </Card>
          </div>

          {/* Comments section */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments ({link.comments.length})
              </h2>
            </CardHeader>
            <CardContent>
              {link.comments.length > 0 ? (
                <div className="space-y-4">
                  {link.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">
                          {comment.user?.name || "Anonymous"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(comment.createdAt, {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No comments yet. Be the first to share your thoughts!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, MessageSquare, TrendingUp, Clock, ChevronUp } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { FeedItem } from "@/types";

interface LinkCardProps {
  link: FeedItem;
  rank?: number;
  showVoting?: boolean;
  onVote?: (linkId: string, value: number) => void;
  compact?: boolean;
}

export function LinkCard({ link, rank, showVoting = true, onVote, compact = false }: LinkCardProps) {
  const handleVote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onVote) {
      const newValue = link.userVote === 1 ? 0 : 1;
      onVote(link.id, newValue);
    }
  };

  if (compact) {
    return (
      <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
        {showVoting && (
          <Button
            variant="ghost"
            size="sm"
            className={`flex-col h-auto py-1 px-2 ${
              link.userVote === 1 ? "text-primary" : "text-muted-foreground"
            }`}
            onClick={handleVote}
          >
            <ChevronUp className="h-4 w-4" />
            <span className="text-xs font-medium">{link.score}</span>
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <Link
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <h3 className="font-medium text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">
              {link.title}
            </h3>
          </Link>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{link.domain}</span>
            <span>•</span>
            <span>{formatRelativeTime(link.createdAt)}</span>
            {link.commentCount > 0 && (
              <>
                <span>•</span>
                <Link
                  href={`/link/${link.id}`}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <MessageSquare className="h-3 w-3" />
                  {link.commentCount}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex gap-4">
          {rank && (
            <div className="flex items-center justify-center w-8 text-2xl font-bold text-muted-foreground/50">
              {rank}
            </div>
          )}
          {showVoting && (
            <div className="flex flex-col items-center">
              <Button
                variant="ghost"
                size="sm"
                className={`flex-col h-auto py-2 px-3 ${
                  link.userVote === 1 ? "text-primary bg-primary/10" : "text-muted-foreground"
                }`}
                onClick={handleVote}
              >
                <ChevronUp className="h-5 w-5" />
                <span className="text-sm font-semibold">{link.score}</span>
              </Button>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex-1"
              >
                <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                  {link.title}
                  <ArrowUpRight className="inline-block ml-1 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
              </Link>
            </div>

            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {link.domain}
              </Badge>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(link.createdAt)}
              </span>
              {link.mentionCount > 1 && (
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {link.mentionCount} sources
                </span>
              )}
            </div>

            {link.aiSummary && (
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                {link.aiSummary}
              </p>
            )}

            {link.tags && link.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {link.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t bg-muted/30 px-4 py-2">
        <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <Link
              href={`/link/${link.id}`}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              {link.commentCount} {link.commentCount === 1 ? "comment" : "comments"}
            </Link>
          </div>
          {link.submitter && (
            <span>
              by{" "}
              <span className="font-medium text-foreground">
                {link.submitter.name || "Anonymous"}
              </span>
            </span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

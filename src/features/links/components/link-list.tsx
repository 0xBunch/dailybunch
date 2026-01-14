"use client";

import { LinkCard } from "./link-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { FeedItem } from "@/types";

interface LinkListProps {
  links: FeedItem[];
  loading?: boolean;
  compact?: boolean;
  showVoting?: boolean;
  showRank?: boolean;
  onVote?: (linkId: string, value: number) => void;
  emptyMessage?: string;
}

export function LinkList({
  links,
  loading = false,
  compact = false,
  showVoting = true,
  showRank = false,
  onVote,
  emptyMessage = "No links found",
}: LinkListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <LinkCardSkeleton key={i} compact={compact} />
        ))}
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={compact ? "divide-y" : "space-y-4"}>
      {links.map((link, index) => (
        <LinkCard
          key={link.id}
          link={link}
          rank={showRank ? index + 1 : undefined}
          compact={compact}
          showVoting={showVoting}
          onVote={onVote}
        />
      ))}
    </div>
  );
}

function LinkCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-start gap-3 py-3">
        <Skeleton className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex gap-4">
        <Skeleton className="h-16 w-12" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

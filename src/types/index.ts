import type { Link, User, Tag, Comment, RssFeed, Newsletter, Mention } from "@prisma/client";

// Extended Link type with relations
export interface LinkWithRelations extends Link {
  submitter?: Pick<User, "id" | "name" | "email" | "image"> | null;
  tags?: Array<{
    tag: Tag;
  }>;
  _count?: {
    comments: number;
    votes: number;
    mentions: number;
  };
  mentions?: Mention[];
}

// Comment with user
export interface CommentWithUser extends Comment {
  user: Pick<User, "id" | "name" | "email" | "image">;
  replies?: CommentWithUser[];
}

// User profile
export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  isPro: boolean;
  createdAt: Date;
  _count?: {
    submittedLinks: number;
    votes: number;
    comments: number;
  };
}

// Feed item for frontend
export interface FeedItem {
  id: string;
  url: string;
  title: string;
  description: string | null;
  domain: string;
  aiSummary: string | null;
  score: number;
  status: string;
  firstSeenAt: Date;
  createdAt: Date;
  submitter?: {
    id: string;
    name: string | null;
  } | null;
  tags?: string[];
  commentCount: number;
  mentionCount: number;
  userVote?: number | null;
}

// RSS Feed with status
export interface RssFeedWithStatus extends RssFeed {
  _count?: {
    subscribers: number;
  };
  recentLinks?: number;
}

// Newsletter source with status
export interface NewsletterWithStatus extends Newsletter {
  _count?: {
    issues: number;
  };
  lastIssue?: {
    subject: string | null;
    receivedAt: Date;
    linkCount: number;
  } | null;
}

// Filter criteria type
export interface FilterCriteria {
  keywords?: string[];
  domains?: string[];
  minMentions?: number;
  categories?: string[];
  excludeDomains?: string[];
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Trending period
export type TrendingPeriod = "day" | "week" | "month" | "all";

// Link status
export type LinkStatusType = "PENDING" | "APPROVED" | "FEATURED" | "ARCHIVED" | "REJECTED";

// Source types
export type SourceTypeValue = "RSS" | "NEWSLETTER";

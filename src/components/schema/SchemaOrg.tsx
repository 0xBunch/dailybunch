/**
 * Schema.org Markup Components
 *
 * JSON-LD structured data for SEO and GEO (Generative Engine Optimization).
 * These schemas help search engines and AI systems understand our content.
 */

import Script from "next/script";

/**
 * Organization schema for Daily Bunch
 */
export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Daily Bunch",
    alternateName: "dailybunch",
    url: "https://dailybunch.com",
    logo: "https://dailybunch.com/logo.png",
    description:
      "Cultural signal intelligence platform that surfaces what tastemakers are collectively pointing at.",
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: "https://dailybunch.com/contact",
    },
  };

  return (
    <Script
      id="organization-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * WebSite schema for search engines
 */
export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Daily Bunch",
    url: "https://dailybunch.com",
    description:
      "What are tastemakers collectively pointing at right now? Daily Bunch surfaces the links traveling across the curated web.",
    publisher: {
      "@type": "Organization",
      name: "Daily Bunch",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: "https://dailybunch.com/links?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Script
      id="website-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface LinkSchemaProps {
  title: string;
  url: string;
  description?: string;
  datePublished: Date;
  velocity: number;
  sourceNames: string[];
  domain: string;
  categoryName?: string;
}

/**
 * Article/Link schema for individual link pages
 *
 * This helps AI systems understand and cite our link analysis.
 */
export function LinkSchema({
  title,
  url,
  description,
  datePublished,
  velocity,
  sourceNames,
  domain,
  categoryName,
}: LinkSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    url: `https://dailybunch.com/links/${encodeURIComponent(url)}`,
    description:
      description ||
      `${title} - mentioned by ${velocity} sources including ${sourceNames.slice(0, 3).join(", ")}`,
    datePublished: datePublished.toISOString(),
    dateModified: new Date().toISOString(),
    publisher: {
      "@type": "Organization",
      name: "Daily Bunch",
      url: "https://dailybunch.com",
    },
    author: {
      "@type": "Organization",
      name: "Daily Bunch",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://dailybunch.com/links/${encodeURIComponent(url)}`,
    },
    about: {
      "@type": "WebPage",
      url: url,
      name: title,
      publisher: {
        "@type": "Organization",
        name: domain,
      },
    },
    // Custom properties for AI understanding
    keywords: categoryName ? [categoryName] : [],
    mentions: sourceNames.map((name) => ({
      "@type": "Organization",
      name,
    })),
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/ShareAction",
      userInteractionCount: velocity,
    },
  };

  return (
    <Script
      id="link-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface CollectionSchemaProps {
  title: string;
  description: string;
  items: Array<{
    title: string;
    url: string;
    velocity: number;
  }>;
}

/**
 * CollectionPage schema for dashboard/feed pages
 */
export function CollectionSchema({
  title,
  description,
  items,
}: CollectionSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: "https://dailybunch.com/dashboard",
    publisher: {
      "@type": "Organization",
      name: "Daily Bunch",
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.slice(0, 10).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Article",
          headline: item.title,
          url: item.url,
        },
      })),
    },
  };

  return (
    <Script
      id="collection-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface WeeklyReviewSchemaProps {
  title: string;
  content: string;
  weekOf: Date;
  publishedAt?: Date;
  sources: Array<{ title: string; url: string }>;
}

/**
 * NewsArticle schema for weekly reviews
 */
export function WeeklyReviewSchema({
  title,
  content,
  weekOf,
  publishedAt,
  sources,
}: WeeklyReviewSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description: content.slice(0, 200) + "...",
    datePublished: (publishedAt || weekOf).toISOString(),
    dateModified: new Date().toISOString(),
    publisher: {
      "@type": "Organization",
      name: "Daily Bunch",
      url: "https://dailybunch.com",
    },
    author: {
      "@type": "Organization",
      name: "Daily Bunch",
    },
    citation: sources.map((source) => ({
      "@type": "CreativeWork",
      name: source.title,
      url: source.url,
    })),
    isAccessibleForFree: true,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://dailybunch.com/weekly-review/${weekOf.toISOString().split("T")[0]}`,
    },
  };

  return (
    <Script
      id="weekly-review-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * BreadcrumbList schema for navigation
 */
export function BreadcrumbSchema({
  items,
}: {
  items: Array<{ name: string; url: string }>;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Script
      id="breadcrumb-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

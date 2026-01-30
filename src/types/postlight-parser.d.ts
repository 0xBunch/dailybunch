/**
 * Type declarations for @postlight/parser (Mercury Parser)
 */

declare module "@postlight/parser" {
  interface ParseResult {
    title: string | null;
    author: string | null;
    date_published: string | null;
    dek: string | null;
    lead_image_url: string | null;
    content: string | null;
    next_page_url: string | null;
    url: string;
    domain: string;
    excerpt: string | null;
    word_count: number | null;
    direction: "ltr" | "rtl";
    total_pages: number;
    rendered_pages: number;
  }

  interface ParseOptions {
    html?: string;
    headers?: Record<string, string>;
    fetchAllPages?: boolean;
    fallback?: boolean;
  }

  const Parser: {
    parse(url: string, options?: ParseOptions): Promise<ParseResult>;
  };

  export default Parser;
}

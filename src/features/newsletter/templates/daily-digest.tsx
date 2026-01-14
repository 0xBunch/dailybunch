import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface LinkItem {
  id: string;
  title: string;
  url: string;
  domain: string;
  aiSummary?: string | null;
  score: number;
}

interface DailyDigestProps {
  links: LinkItem[];
  date: string;
  unsubscribeUrl: string;
  previewText?: string;
}

export function DailyDigestEmail({
  links,
  date,
  unsubscribeUrl,
  previewText,
}: DailyDigestProps) {
  const preview = previewText || `Your Daily Bunch for ${date} - ${links.length} top links`;

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>⚡ Daily Bunch</Heading>
            <Text style={tagline}>Your daily dose of curated links</Text>
            <Text style={dateText}>{date}</Text>
          </Section>

          <Hr style={hr} />

          {/* Links */}
          <Section style={content}>
            {links.map((link, index) => (
              <Section key={link.id} style={linkContainer}>
                <Text style={linkNumber}>{index + 1}</Text>
                <Section style={linkContent}>
                  <Link href={link.url} style={linkTitle}>
                    {link.title}
                  </Link>
                  <Text style={linkDomain}>{link.domain}</Text>
                  {link.aiSummary && (
                    <Text style={linkSummary}>{link.aiSummary}</Text>
                  )}
                  <Text style={linkScore}>{link.score} points</Text>
                </Section>
              </Section>
            ))}
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this because you subscribed to Daily Bunch.
            </Text>
            <Link href={unsubscribeUrl} style={unsubscribeLink}>
              Unsubscribe
            </Link>
            <Text style={footerCopy}>
              © {new Date().getFullYear()} Daily Bunch. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  padding: "32px 48px",
  textAlign: "center" as const,
};

const logo = {
  fontSize: "32px",
  fontWeight: "bold",
  margin: "0 0 8px",
  color: "#1a1a1a",
};

const tagline = {
  fontSize: "14px",
  color: "#666666",
  margin: "0 0 4px",
};

const dateText = {
  fontSize: "12px",
  color: "#999999",
  margin: "0",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "0",
};

const content = {
  padding: "24px 48px",
};

const linkContainer = {
  marginBottom: "24px",
  display: "flex",
  gap: "12px",
};

const linkNumber = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#e0e0e0",
  margin: "0",
  minWidth: "32px",
};

const linkContent = {
  flex: "1",
};

const linkTitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1a1a1a",
  textDecoration: "none",
  lineHeight: "1.4",
};

const linkDomain = {
  fontSize: "12px",
  color: "#666666",
  margin: "4px 0",
};

const linkSummary = {
  fontSize: "14px",
  color: "#4a4a4a",
  lineHeight: "1.5",
  margin: "8px 0",
};

const linkScore = {
  fontSize: "12px",
  color: "#999999",
  margin: "0",
};

const footer = {
  padding: "24px 48px",
  textAlign: "center" as const,
};

const footerText = {
  fontSize: "12px",
  color: "#666666",
  margin: "0 0 8px",
};

const unsubscribeLink = {
  fontSize: "12px",
  color: "#999999",
};

const footerCopy = {
  fontSize: "12px",
  color: "#999999",
  margin: "16px 0 0",
};

export default DailyDigestEmail;

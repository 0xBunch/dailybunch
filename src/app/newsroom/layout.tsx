/**
 * Newsroom Layout
 *
 * Wraps all newsroom pages. Handles auth gate via cookie check.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function NewsroomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("newsroom_auth");

  // Check auth - if no cookie or wrong value, redirect to login
  const isAuthed = authCookie?.value === process.env.NEWSROOM_PASSWORD;

  // Allow login page without auth
  // Note: This layout wraps ALL /newsroom/* routes including /newsroom/login
  // The login page handles its own display

  return (
    <div className="min-h-dvh" style={{ background: "var(--surface-cream)" }}>
      {children}
    </div>
  );
}

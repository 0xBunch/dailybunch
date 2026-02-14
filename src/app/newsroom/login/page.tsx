/**
 * Newsroom Login Page
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

export default async function NewsroomLoginPage() {
  // Check if already authed
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("newsroom_auth");

  if (authCookie?.value === process.env.NEWSROOM_PASSWORD) {
    redirect("/newsroom");
  }

  return (
    <div
      className="min-h-dvh flex items-center justify-center"
      style={{ background: "var(--surface-cream)" }}
    >
      <div
        className="w-full max-w-sm p-8"
        style={{ background: "#fff", border: "1px solid var(--border)" }}
      >
        <h1
          className="text-xl font-medium mb-6 text-center"
          style={{ color: "var(--ink)" }}
        >
          Newsroom
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}

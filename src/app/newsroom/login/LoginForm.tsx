"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/newsroom/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/newsroom");
        router.refresh();
      } else {
        setError("Invalid password");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full px-4 py-3 text-sm mb-4"
        style={{
          border: "1px solid var(--border)",
          background: "var(--surface-cream)",
        }}
        autoFocus
      />
      {error && (
        <p
          className="text-sm mb-4"
          style={{ color: "var(--status-error)" }}
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ background: "var(--ink)", color: "#fff" }}
      >
        {loading ? "..." : "Enter"}
      </button>
    </form>
  );
}

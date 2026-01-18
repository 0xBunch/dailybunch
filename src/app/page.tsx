import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">Daily Bunch</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        Cultural signal intelligence platform
      </p>
      <div className="flex gap-4">
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Dashboard
        </Link>
        <Link
          href="/admin"
          className="px-6 py-3 border border-foreground/20 rounded-lg font-medium hover:bg-foreground/5 transition-colors"
        >
          Admin
        </Link>
      </div>
    </main>
  );
}

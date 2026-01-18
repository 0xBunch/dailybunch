"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn, formatRelativeTime } from "@/lib/utils";
import { ArrowLeft, Plus, Trash2, Edit2, Rss, Mail, Check } from "lucide-react";
import { toast } from "sonner";

interface Source {
  id: string;
  name: string;
  type: "RSS" | "NEWSLETTER";
  url: string | null;
  emailTrigger: string | null;
  isActive: boolean;
  lastFetchedAt: string | null;
  category: { id: string; name: string };
  subcategory: { id: string; name: string } | null;
}

interface Category {
  id: string;
  name: string;
  subcategories: Array<{ id: string; name: string }>;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<"RSS" | "NEWSLETTER">("RSS");
  const [url, setUrl] = useState("");
  const [emailTrigger, setEmailTrigger] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [sourcesRes, catsRes] = await Promise.all([
        fetch("/api/admin/sources"),
        fetch("/api/categories"),
      ]);
      const [sourcesData, catsData] = await Promise.all([
        sourcesRes.json(),
        catsRes.json(),
      ]);
      setSources(sourcesData.sources || []);
      setCategories(catsData.categories || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to fetch sources");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setType("RSS");
    setUrl("");
    setEmailTrigger("");
    setCategoryId("");
    setSubcategoryId("");
    setEditingSource(null);
    setShowForm(false);
  }

  function startEdit(source: Source) {
    setEditingSource(source);
    setName(source.name);
    setType(source.type);
    setUrl(source.url || "");
    setEmailTrigger(source.emailTrigger || "");
    setCategoryId(source.category.id);
    setSubcategoryId(source.subcategory?.id || "");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const data = {
      name,
      type,
      url: type === "RSS" ? url : null,
      emailTrigger: type === "NEWSLETTER" ? emailTrigger : null,
      categoryId,
      subcategoryId: subcategoryId || null,
    };

    try {
      const res = await fetch(
        editingSource
          ? `/api/admin/sources/${editingSource.id}`
          : "/api/admin/sources",
        {
          method: editingSource ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (!res.ok) throw new Error("Failed to save source");

      toast.success(editingSource ? "Source updated" : "Source created");
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to save source");
    }
  }

  async function deleteSource(id: string) {
    if (!confirm("Delete this source?")) return;

    try {
      const res = await fetch(`/api/admin/sources/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Source deleted");
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to delete source");
    }
  }

  async function toggleActive(source: Source) {
    try {
      const res = await fetch(`/api/admin/sources/${source.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !source.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to update source");
    }
  }

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-foreground/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Sources</h1>
          <div className="flex-1" />
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Source
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Form */}
        {showForm && (
          <div className="mb-8 p-6 border border-foreground/20 rounded-lg">
            <h2 className="text-lg font-medium mb-4">
              {editingSource ? "Edit Source" : "Add Source"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-foreground/20 rounded-lg bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) =>
                      setType(e.target.value as "RSS" | "NEWSLETTER")
                    }
                    className="w-full px-3 py-2 border border-foreground/20 rounded-lg bg-transparent"
                  >
                    <option value="RSS">RSS Feed</option>
                    <option value="NEWSLETTER">Newsletter</option>
                  </select>
                </div>
              </div>

              {type === "RSS" ? (
                <div>
                  <label className="block text-sm mb-1">Feed URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    placeholder="https://example.com/feed/"
                    className="w-full px-3 py-2 border border-foreground/20 rounded-lg bg-transparent"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm mb-1">
                    Email Trigger (domain)
                  </label>
                  <input
                    type="text"
                    value={emailTrigger}
                    onChange={(e) => setEmailTrigger(e.target.value)}
                    required
                    placeholder="morningbrew.com"
                    className="w-full px-3 py-2 border border-foreground/20 rounded-lg bg-transparent"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      setSubcategoryId("");
                    }}
                    required
                    className="w-full px-3 py-2 border border-foreground/20 rounded-lg bg-transparent"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">
                    Subcategory (optional)
                  </label>
                  <select
                    value={subcategoryId}
                    onChange={(e) => setSubcategoryId(e.target.value)}
                    disabled={!selectedCategory}
                    className="w-full px-3 py-2 border border-foreground/20 rounded-lg bg-transparent disabled:opacity-50"
                  >
                    <option value="">None</option>
                    {selectedCategory?.subcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium"
                >
                  {editingSource ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-foreground/20 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Source List */}
        {loading ? (
          <div className="text-center py-12 text-foreground/50">Loading...</div>
        ) : sources.length === 0 ? (
          <div className="text-center py-12 text-foreground/50">
            No sources yet. Add your first source above.
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map((source) => (
              <div
                key={source.id}
                className={cn(
                  "p-4 border rounded-lg flex items-center gap-4",
                  source.isActive
                    ? "border-foreground/10"
                    : "border-foreground/5 opacity-50"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    source.type === "RSS" ? "bg-orange-500/10" : "bg-blue-500/10"
                  )}
                >
                  {source.type === "RSS" ? (
                    <Rss className="w-5 h-5 text-orange-500" />
                  ) : (
                    <Mail className="w-5 h-5 text-blue-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium">{source.name}</div>
                  <div className="text-sm text-foreground/50 truncate">
                    {source.type === "RSS" ? source.url : source.emailTrigger}
                  </div>
                </div>

                <div className="text-sm text-foreground/50">
                  {source.category.name}
                  {source.subcategory && ` / ${source.subcategory.name}`}
                </div>

                {source.lastFetchedAt && (
                  <div className="text-xs text-foreground/40">
                    {formatRelativeTime(source.lastFetchedAt)}
                  </div>
                )}

                <button
                  onClick={() => toggleActive(source)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    source.isActive
                      ? "bg-green-500/10 text-green-500"
                      : "bg-foreground/5 text-foreground/30"
                  )}
                  title={source.isActive ? "Active" : "Inactive"}
                >
                  <Check className="w-4 h-4" />
                </button>

                <button
                  onClick={() => startEdit(source)}
                  className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => deleteSource(source.id)}
                  className="p-2 hover:bg-red-500/10 text-red-500/50 hover:text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

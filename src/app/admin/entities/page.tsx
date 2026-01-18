"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft, Plus, Trash2, Edit2, User, Building, Package, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Entity {
  id: string;
  name: string;
  type: "PERSON" | "ORGANIZATION" | "PRODUCT";
  aliases: string[];
  isActive: boolean;
}

interface SuggestedEntity {
  id: string;
  name: string;
  type: "PERSON" | "ORGANIZATION" | "PRODUCT";
  reason: string | null;
}

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<"PERSON" | "ORGANIZATION" | "PRODUCT">("PERSON");
  const [aliases, setAliases] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [entitiesRes, suggestionsRes] = await Promise.all([
        fetch("/api/admin/entities"),
        fetch("/api/admin/entities/suggestions"),
      ]);
      const [entitiesData, suggestionsData] = await Promise.all([
        entitiesRes.json(),
        suggestionsRes.json(),
      ]);
      setEntities(entitiesData.entities || []);
      setSuggestions(suggestionsData.suggestions || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to fetch entities");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setType("PERSON");
    setAliases("");
    setEditingEntity(null);
    setShowForm(false);
  }

  function startEdit(entity: Entity) {
    setEditingEntity(entity);
    setName(entity.name);
    setType(entity.type);
    setAliases(entity.aliases.join(", "));
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const data = {
      name,
      type,
      aliases: aliases
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    };

    try {
      const res = await fetch(
        editingEntity
          ? `/api/admin/entities/${editingEntity.id}`
          : "/api/admin/entities",
        {
          method: editingEntity ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (!res.ok) throw new Error("Failed to save");

      toast.success(editingEntity ? "Entity updated" : "Entity created");
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to save entity");
    }
  }

  async function deleteEntity(id: string) {
    if (!confirm("Delete this entity?")) return;

    try {
      const res = await fetch(`/api/admin/entities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Entity deleted");
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to delete entity");
    }
  }

  async function approveSuggestion(suggestion: SuggestedEntity) {
    try {
      // Create the entity
      await fetch("/api/admin/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: suggestion.name,
          type: suggestion.type,
          aliases: [],
        }),
      });

      // Mark suggestion as approved
      await fetch(`/api/admin/entities/suggestions/${suggestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: true }),
      });

      toast.success("Entity approved and created");
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to approve suggestion");
    }
  }

  async function rejectSuggestion(id: string) {
    try {
      await fetch(`/api/admin/entities/suggestions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: false }),
      });
      toast.success("Suggestion rejected");
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to reject suggestion");
    }
  }

  const TypeIcon = ({ type }: { type: string }) => {
    switch (type) {
      case "PERSON":
        return <User className="w-4 h-4" />;
      case "ORGANIZATION":
        return <Building className="w-4 h-4" />;
      case "PRODUCT":
        return <Package className="w-4 h-4" />;
      default:
        return null;
    }
  };

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
          <h1 className="text-xl font-bold">Entities</h1>
          <div className="flex-1" />
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Entity
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-medium mb-4">
              AI Suggestions ({suggestions.length})
            </h2>
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="p-4 border border-yellow-500/20 bg-yellow-500/5 rounded-lg flex items-center gap-4"
                >
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <TypeIcon type={suggestion.type} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{suggestion.name}</div>
                    <div className="text-sm text-foreground/50">
                      {suggestion.type.toLowerCase()}
                      {suggestion.reason && ` - ${suggestion.reason}`}
                    </div>
                  </div>
                  <button
                    onClick={() => approveSuggestion(suggestion)}
                    className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => rejectSuggestion(suggestion.id)}
                    className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="mb-8 p-6 border border-foreground/20 rounded-lg">
            <h2 className="text-lg font-medium mb-4">
              {editingEntity ? "Edit Entity" : "Add Entity"}
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
                      setType(
                        e.target.value as "PERSON" | "ORGANIZATION" | "PRODUCT"
                      )
                    }
                    className="w-full px-3 py-2 border border-foreground/20 rounded-lg bg-transparent"
                  >
                    <option value="PERSON">Person</option>
                    <option value="ORGANIZATION">Organization</option>
                    <option value="PRODUCT">Product</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">
                  Aliases (comma-separated)
                </label>
                <input
                  type="text"
                  value={aliases}
                  onChange={(e) => setAliases(e.target.value)}
                  placeholder="@handle, nickname, abbreviation"
                  className="w-full px-3 py-2 border border-foreground/20 rounded-lg bg-transparent"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium"
                >
                  {editingEntity ? "Update" : "Create"}
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

        {/* Entity List */}
        {loading ? (
          <div className="text-center py-12 text-foreground/50">Loading...</div>
        ) : entities.length === 0 ? (
          <div className="text-center py-12 text-foreground/50">
            No entities yet. Add your first entity above.
          </div>
        ) : (
          <div className="space-y-2">
            {entities.map((entity) => (
              <div
                key={entity.id}
                className={cn(
                  "p-4 border rounded-lg flex items-center gap-4",
                  entity.isActive
                    ? "border-foreground/10"
                    : "border-foreground/5 opacity-50"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    entity.type === "PERSON" && "bg-purple-500/10 text-purple-500",
                    entity.type === "ORGANIZATION" && "bg-blue-500/10 text-blue-500",
                    entity.type === "PRODUCT" && "bg-green-500/10 text-green-500"
                  )}
                >
                  <TypeIcon type={entity.type} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium">{entity.name}</div>
                  {entity.aliases.length > 0 && (
                    <div className="text-sm text-foreground/50">
                      {entity.aliases.join(", ")}
                    </div>
                  )}
                </div>

                <div className="text-sm text-foreground/50">
                  {entity.type.toLowerCase()}
                </div>

                <button
                  onClick={() => startEdit(entity)}
                  className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => deleteEntity(entity.id)}
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

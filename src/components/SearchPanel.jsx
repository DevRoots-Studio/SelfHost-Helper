import React, { useState } from "react";
import { Search, Loader2, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API = window.api;

export default function SearchPanel({
  projectRoot,
  projectPathLabel,
  onOpenResult,
  isOpen,
  onClose,
}) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!query.trim() || !projectRoot) return;
    setIsSearching(true);
    setError(null);
    setResults([]);
    try {
      const list = await API.searchInProject(projectRoot, query.trim(), {});
      setResults(list);
    } catch (err) {
      setError(err?.message || "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full border-t border-white/5 bg-background/80">
      <div className="flex items-center gap-2 p-2 border-b border-white/5 shrink-0">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="Search in project..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button
          size="sm"
          className="shrink-0 cursor-pointer"
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>Search</>
          )}
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {error && (
          <p className="text-sm text-destructive py-2">{error}</p>
        )}
        {!error && results.length === 0 && !isSearching && query.trim() && (
          <p className="text-sm text-muted-foreground py-2">No results</p>
        )}
        {!error && results.length > 0 && (
          <ul className="space-y-0.5">
            {results.map((r, i) => (
              <li key={`${r.filePath}-${r.lineNumber}-${i}`}>
                <button
                  type="button"
                  onClick={() => onOpenResult(r.filePath, r.lineNumber)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-white/10 transition-colors flex gap-2"
                  )}
                >
                  <FileCode className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-foreground">
                      {projectPathLabel
                        ? r.filePath.replace(projectRoot, "").replace(/^[/\\]/, "")
                        : r.filePath}
                      :{r.lineNumber}
                    </div>
                    <div className="text-muted-foreground truncate text-xs mt-0.5">
                      {r.lineText}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

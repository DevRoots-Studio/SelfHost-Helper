import React, { useState, useMemo } from "react";
import { Search, Loader2, FileCode, X } from "lucide-react";
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
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [includePattern, setIncludePattern] = useState("");

  const summary = useMemo(() => {
    if (!results.length) return null;
    const fileCount = new Set(results.map((r) => r.filePath)).size;
    return { resultCount: results.length, fileCount };
  }, [results]);

  const handleSearch = async () => {
    if (!query.trim() || !projectRoot) return;
    setIsSearching(true);
    setError(null);
    setResults([]);
    try {
      const options = {
        caseSensitive,
        wholeWord,
        includePattern: includePattern.trim() || undefined,
      };
      const list = await API.searchInProject(projectRoot, query.trim(), options);
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

  const renderHighlightedLine = (lineText, matchText) => {
    if (!lineText || !matchText) return lineText;
    const lower = lineText.toLowerCase();
    const lowerMatch = matchText.toLowerCase();
    const idx = lower.indexOf(lowerMatch);
    if (idx === -1) return lineText;
    const before = lineText.slice(0, idx);
    const match = lineText.slice(idx, idx + matchText.length);
    const after = lineText.slice(idx + matchText.length);
    return (
      <>
        {before}
        <span className="text-primary font-medium">{match}</span>
        {after}
      </>
    );
  };

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
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Search</>}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 cursor-pointer"
          onClick={onClose}
          title="Close"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center gap-4 px-3 py-1.5 border-b border-white/5 text-[11px] text-muted-foreground shrink-0">
        <label className="inline-flex items-center gap-1 cursor-pointer select-none">
          <input
            type="checkbox"
            className="h-3 w-3 rounded border-white/20 bg-transparent"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
          />
          <span>Case sensitive</span>
        </label>
        <label className="inline-flex items-center gap-1 cursor-pointer select-none">
          <input
            type="checkbox"
            className="h-3 w-3 rounded border-white/20 bg-transparent"
            checked={wholeWord}
            onChange={(e) => setWholeWord(e.target.checked)}
          />
          <span>Whole word</span>
        </label>
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span className="shrink-0">Include:</span>
          <input
            type="text"
            placeholder="e.g. *.ts,*.tsx"
            value={includePattern}
            onChange={(e) => setIncludePattern(e.target.value)}
            className="flex-1 min-w-0 px-2 py-0.5 text-[11px] bg-white/5 border border-white/10 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {summary && (
          <span className="shrink-0">
            {summary.resultCount} results in {summary.fileCount} files
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto p-2">
        {error && <p className="text-sm text-destructive py-2">{error}</p>}
        {!error && results.length === 0 && !isSearching && query.trim() && (
          <p className="text-sm text-muted-foreground py-2">
            No results. Try a different query or pattern.
          </p>
        )}
        {!error && results.length > 0 && (
          <ul className="space-y-0.5 min-w-0">
            {results.map((r, i) => (
              <li key={`${r.filePath}-${r.lineNumber}-${i}`} className="min-w-0">
                <button
                  type="button"
                  onClick={() => onOpenResult(r.filePath, r.lineNumber)}
                  className={cn(
                    "w-full min-w-0 text-left px-2 py-1.5 rounded-lg text-sm hover:bg-white/10 transition-colors flex gap-2 overflow-hidden"
                  )}
                >
                  <FileCode className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="truncate text-foreground">
                      {projectPathLabel
                        ? r.filePath.replace(projectRoot, "").replace(/^[/\\]/, "")
                        : r.filePath}
                      :{r.lineNumber}
                    </div>
                    <div className="text-muted-foreground text-xs mt-0.5 overflow-hidden">
                      <span className="block truncate">
                        {renderHighlightedLine(r.lineText, r.matchText || query.trim())}
                      </span>
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

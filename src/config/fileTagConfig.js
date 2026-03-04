// File tag visual mode configuration
// Modes:
// - "letters": circular badges with single-letter codes (U, M, A, D, S)
// - "icons": minimal icon-style dots without letters
const rawMode = import.meta.env.VITE_FILE_TAG_MODE;

export const FILE_TAG_MODE = rawMode === "letters" ? "letters" : "icons";

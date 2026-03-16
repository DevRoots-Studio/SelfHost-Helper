export function formatMemory(bytes) {
  if (!bytes || bytes === 0) return "0 MB";

  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return gb.toFixed(2) + " GB";
  }

  const mb = bytes / (1024 * 1024);
  return mb.toFixed(1) + " MB";
}


const key = (analysisId: string) => `echo.picked.${analysisId}`;

export function readPicks(analysisId: string): string[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(key(analysisId)) ?? "[]");
    return Array.isArray(saved) ? saved.filter((ref): ref is string => typeof ref === "string") : [];
  } catch {
    return [];
  }
}

export function savePicks(analysisId: string, picked: string[]) {
  try {
    if (picked.length) window.localStorage.setItem(key(analysisId), JSON.stringify(picked));
    else window.localStorage.removeItem(key(analysisId));
  } catch {
    return;
  }
}

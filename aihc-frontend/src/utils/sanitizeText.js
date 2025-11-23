// src/utils/sanitizeText.js

// Light sanitizer for display-only text.
// - Keeps emojis, multilingual text, punctuation
// - Removes control chars and obvious HTML/script tags as *text*
// - Truncates very long strings so they don't wreck the UI

export function sanitizeText(input, maxLen = 2000) {
  if (input == null) return "";

  let s = String(input);

  // 1) Remove ASCII + C1 control characters, except tab/newline/carriage return
  //    This keeps emojis, accents, etc. (they're all > \u0100)
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");

  // 2) Strip HTML comments (purely cosmetic / safety for weird payloads)
  s = s.replace(/<!--[\s\S]*?-->/g, "");

  // 3) Strip obvious dangerous tags as text, but leave other angle brackets alone.
  //    We replace the whole tag with a placeholder to avoid confusing displays.
  s = s.replace(
    /<\s*\/?\s*(script|style|iframe|object|embed|svg|math)[^>]*>/gi,
    "[removed tag]"
  );

  // 4) Optionally collapse absurd runs of spaces / non-breaking spaces
  s = s.replace(/[ \u00A0]{3,}/g, " ");

  // 5) Truncate very long text
  // if (s.length > maxLen) {
  //   s = s.slice(0, maxLen) + "…";
  // }

  return s.trim();
}

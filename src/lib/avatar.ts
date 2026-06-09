/**
 * Random avatar URL helper.
 *
 * Backed by DiceBear's public HTTP API — every call returns a stable image
 * URL that resolves to a unique generated avatar. We rotate between a few
 * styles so a batch of new sign-ups doesn't visually collapse onto one
 * look. The seed mixes a caller-provided hint (typically the user's name
 * or id) with a random suffix so identical names still produce distinct
 * pictures.
 */

const STYLES = [
  "avataaars",
  "adventurer",
  "big-smile",
  "bottts",
  "fun-emoji",
  "lorelei",
  "micah",
  "miniavs",
  "notionists",
  "personas",
  "thumbs",
] as const;

function pickStyle(): (typeof STYLES)[number] {
  return STYLES[Math.floor(Math.random() * STYLES.length)];
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Build a DiceBear SVG avatar URL for a brand-new user.
 *
 * @param hint Anything identifying about the user (full name, email, etc).
 *             Falls back to "user" if nothing useful is provided.
 */
export function randomAvatarUrl(hint?: string | null): string {
  const cleanHint = (hint ?? "").trim().replace(/\s+/g, "-") || "user";
  const seed = `${cleanHint}-${randomSuffix()}`;
  const style = pickStyle();
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

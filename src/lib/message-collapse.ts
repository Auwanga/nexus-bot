/** Session memory for Show more / Show less. Survives re-renders, resets on reload. */
const choices = new Map<string, boolean>();

export const COLLAPSE_HEIGHT_PX = 280;
export const COLLAPSE_CHARS = 700;
export const COLLAPSE_CHARS_NARROW = 500;
export const COLLAPSE_LINES = 12;
export const NARROW_WIDTH_PX = 360;

export function collapseChoice(messageId: string): boolean | undefined {
  return choices.get(messageId);
}

export function rememberCollapse(messageId: string, collapsed: boolean) {
  choices.set(messageId, collapsed);
}

/** Unicode length with simple Markdown markers removed. */
export function plainCharCount(text: string): number {
  const plain = text
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/[*_`#]+/g, '');
  return Array.from(plain).length;
}

export function charLimitForWidth(contentWidthPx: number | null | undefined): number {
  if (contentWidthPx != null && contentWidthPx > 0 && contentWidthPx < NARROW_WIDTH_PX) {
    return COLLAPSE_CHARS_NARROW;
  }
  return COLLAPSE_CHARS;
}

/** First matching trigger wins: height, then wrapped lines, then characters. */
export function shouldCollapseText(input: {
  text: string;
  heightPx?: number | null;
  lineCount?: number | null;
  contentWidthPx?: number | null;
}): boolean {
  if (input.heightPx != null && input.heightPx > COLLAPSE_HEIGHT_PX) return true;
  if (input.lineCount != null && input.lineCount > COLLAPSE_LINES) return true;
  return plainCharCount(input.text) > charLimitForWidth(input.contentWidthPx);
}

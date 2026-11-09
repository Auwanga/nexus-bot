/** Chat Markdown: WhatsApp emphasis plus headings, lists, quotes, tables, code, links, callouts. */

export type InlineKind = 'text' | 'bold' | 'italic' | 'strike' | 'mono' | 'link';

export type InlineToken =
  | { kind: 'text' | 'bold' | 'italic' | 'strike' | 'mono'; value: string }
  | { kind: 'link'; value: string; href: string };

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'paragraph'; lines: string[] }
  | { type: 'quote'; lines: string[] }
  | { type: 'callout'; tone: 'info' | 'warning' | 'success'; lines: string[] }
  | { type: 'code'; language: string; code: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'hr' };

const INLINE_DELIMS: { kind: Exclude<InlineKind, 'text' | 'link'>; open: string; close: string }[] = [
  { kind: 'mono', open: '`', close: '`' },
  { kind: 'bold', open: '**', close: '**' },
  { kind: 'bold', open: '*', close: '*' },
  { kind: 'italic', open: '__', close: '__' },
  { kind: 'italic', open: '_', close: '_' },
  { kind: 'strike', open: '~~', close: '~~' },
  { kind: 'strike', open: '~', close: '~' },
];

const BULLET_LINE = /^[-*•]\s+/;
const HEADING_LINE = /^(#{1,6})\s+(.+)$/;
const HR_LINE = /^(?:-{3,}|\*{3,}|_{3,})$/;
const CALLOUT_LINE = /^>\s*\[!(info|warning|success)\]\s*(.*)$/i;
const TABLE_BLOCK = /(?:^|\n)((?:\|[^\n]+\|\n)(?:\|[-\s|:]+\|\n)(?:\|[^\n]+\|\n?)+)/g;
const FENCE_BLOCK = /```([\w-]*)\n?([\s\S]*?)```/g;
const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/;

function isSpecialLine(line: string) {
  return (
    HEADING_LINE.test(line) ||
    HR_LINE.test(line) ||
    /^>\s?/.test(line) ||
    BULLET_LINE.test(line) ||
    /^\d+\.\s/.test(line) ||
    line.startsWith('```')
  );
}

export function parseInline(line: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let pos = 0;

  while (pos < line.length) {
    const linkMatch = line.slice(pos).match(LINK_RE);
    const linkIndex = linkMatch ? pos + (linkMatch.index ?? 0) : -1;

    let match: { index: number; delim: (typeof INLINE_DELIMS)[number] } | null = null;
    for (const delim of INLINE_DELIMS) {
      const index = line.indexOf(delim.open, pos);
      if (index === -1) continue;
      if (!match || index < match.index || (index === match.index && delim.open.length > match.delim.open.length)) {
        match = { index, delim };
      }
    }

    if (linkMatch && linkIndex !== -1 && (!match || linkIndex <= match.index)) {
      if (linkIndex > pos) tokens.push({ kind: 'text', value: line.slice(pos, linkIndex) });
      tokens.push({ kind: 'link', value: linkMatch[1] ?? '', href: linkMatch[2] ?? '' });
      pos = linkIndex + linkMatch[0].length;
      continue;
    }

    if (!match) {
      tokens.push({ kind: 'text', value: line.slice(pos) });
      break;
    }
    if (match.index > pos) tokens.push({ kind: 'text', value: line.slice(pos, match.index) });

    const contentStart = match.index + match.delim.open.length;
    const closeIndex = line.indexOf(match.delim.close, contentStart);
    const markerEnd = closeIndex === -1 ? match.index + match.delim.open.length : closeIndex + match.delim.close.length;
    if (closeIndex === -1) {
      tokens.push({ kind: 'text', value: line.slice(match.index, markerEnd) });
      pos = markerEnd;
      continue;
    }
    const inner = line.slice(contentStart, closeIndex);
    if (!inner.trim()) {
      tokens.push({ kind: 'text', value: line.slice(match.index, markerEnd) });
      pos = markerEnd;
      continue;
    }
    tokens.push({ kind: match.delim.kind, value: inner });
    pos = markerEnd;
  }
  return tokens;
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line === '') {
      i += 1;
      continue;
    }
    if (HR_LINE.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }
    const headingMatch = line.match(HEADING_LINE);
    if (headingMatch) {
      const level = Math.min(6, headingMatch[1]?.length ?? 1) as 1 | 2 | 3 | 4 | 5 | 6;
      blocks.push({ type: 'heading', level, text: (headingMatch[2] ?? '').trim() });
      i += 1;
      continue;
    }
    const calloutMatch = line.match(CALLOUT_LINE);
    if (calloutMatch) {
      const tone = (calloutMatch[1] ?? 'info').toLowerCase() as 'info' | 'warning' | 'success';
      const quoteLines: string[] = [];
      if ((calloutMatch[2] ?? '').trim()) quoteLines.push((calloutMatch[2] ?? '').trim());
      i += 1;
      while (i < lines.length && /^>\s?/.test(lines[i] ?? '')) {
        quoteLines.push((lines[i] ?? '').replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'callout', tone, lines: quoteLines.length ? quoteLines : [''] });
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i] ?? '')) {
        quoteLines.push((lines[i] ?? '').replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'quote', lines: quoteLines });
      continue;
    }
    if (BULLET_LINE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && BULLET_LINE.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(BULLET_LINE, ''));
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\d+\.\s/, ''));
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }
    const paraLines: string[] = [];
    while (i < lines.length) {
      const current = lines[i] ?? '';
      if (current === '' || isSpecialLine(current)) break;
      paraLines.push(current);
      i += 1;
    }
    if (paraLines.length > 0) blocks.push({ type: 'paragraph', lines: paraLines });
  }
  return blocks;
}

export type MarkdownPiece =
  | { kind: 'text'; blocks: Block[] }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'code'; language: string; code: string };

export function parseMarkdown(text: string): MarkdownPiece[] {
  const pieces: MarkdownPiece[] = [];
  const markers: { start: number; end: number; piece: MarkdownPiece }[] = [];

  for (const match of text.matchAll(TABLE_BLOCK)) {
    const start = match.index ?? 0;
    const lines = (match[1] ?? '').trim().split('\n').filter((line) => line.trim().startsWith('|'));
    if (lines.length >= 2) {
      markers.push({
        start,
        end: start + match[0].length,
        piece: {
          kind: 'table',
          header: parseTableRow(lines[0] ?? ''),
          rows: lines.slice(2).map(parseTableRow),
        },
      });
    }
  }

  for (const match of text.matchAll(FENCE_BLOCK)) {
    const start = match.index ?? 0;
    markers.push({
      start,
      end: start + match[0].length,
      piece: {
        kind: 'code',
        language: (match[1] ?? '').trim(),
        code: (match[2] ?? '').replace(/\n$/, ''),
      },
    });
  }

  markers.sort((a, b) => a.start - b.start);
  let lastIndex = 0;
  for (const marker of markers) {
    if (marker.start < lastIndex) continue;
    const before = text.slice(lastIndex, marker.start).trim();
    if (before) pieces.push({ kind: 'text', blocks: parseBlocks(before) });
    pieces.push(marker.piece);
    lastIndex = marker.end;
  }
  const tail = text.slice(lastIndex).trim();
  if (tail) pieces.push({ kind: 'text', blocks: parseBlocks(tail) });
  if (pieces.length === 0 && text.trim()) pieces.push({ kind: 'text', blocks: parseBlocks(text) });
  return pieces;
}

/** One-line preview with markers removed, for the home list. */
export function plainPreview(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/^>\s*\[!(?:info|warning|success)\]\s*/gim, '')
    .replace(/[*_~`#]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

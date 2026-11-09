import * as WebBrowser from 'expo-web-browser';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Radius, Space, Type } from '@/constants/theme';
import { useThemed, type Palette } from '@/lib/appearance';
import { parseInline, parseMarkdown, type Block, type InlineToken } from '@/lib/markdown';

type Props = {
  text: string;
  color?: string;
};

export function FormattedText({ text, color }: Props) {
  const { ink, styles } = useThemed(makeStyles);
  const tone = color ?? ink.text;
  const pieces = parseMarkdown(text);
  return (
    <View style={styles.stack}>
      {pieces.map((piece, index) => {
        if (piece.kind === 'table') {
          return (
            <ScrollView key={`table-${index}`} horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHead]}>
                  {piece.header.map((cell, cellIndex) => (
                    <Text key={`h-${cellIndex}`} style={[styles.cell, styles.headerCell, { color: tone }]}>
                      {cell}
                    </Text>
                  ))}
                </View>
                {piece.rows.map((row, rowIndex) => (
                  <View key={`r-${rowIndex}`} style={styles.tableRow}>
                    {row.map((cell, cellIndex) => (
                      <Text key={`c-${cellIndex}`} style={[styles.cell, { color: tone }]} numberOfLines={4}>
                        {cell}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          );
        }
        if (piece.kind === 'code') {
          return (
            <ScrollView key={`code-${index}`} horizontal showsHorizontalScrollIndicator={false} style={styles.codeScroll}>
              <View style={styles.codeBlock}>
                {piece.language ? <Text style={styles.codeLang}>{piece.language}</Text> : null}
                <Text style={styles.codeText}>{piece.code}</Text>
              </View>
            </ScrollView>
          );
        }
        return piece.blocks.map((block, blockIndex) => (
          <BlockView key={`${index}-${blockIndex}`} block={block} color={tone} />
        ));
      })}
    </View>
  );
}

function BlockView({ block, color }: { block: Block; color: string }) {
  const { ink, styles } = useThemed(makeStyles);
  if (block.type === 'hr') return <View style={styles.hr} />;
  if (block.type === 'heading') {
    return <Text style={[styles.heading, headingSize(block.level, styles), { color }]}>{inline(block.text, color, styles)}</Text>;
  }
  if (block.type === 'callout') {
    const toneStyle =
      block.tone === 'warning' ? styles.calloutWarning : block.tone === 'success' ? styles.calloutSuccess : styles.calloutInfo;
    const label = block.tone === 'warning' ? 'Warning' : block.tone === 'success' ? 'Success' : 'Info';
    return (
      <View style={[styles.callout, toneStyle]}>
        <Text style={[styles.calloutLabel, { color }]}>{label}</Text>
        {block.lines.map((line, index) => (
          <Text key={index} style={[styles.body, { color }]}>
            {inline(line, color, styles)}
          </Text>
        ))}
      </View>
    );
  }
  if (block.type === 'code') {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.codeScroll}>
        <View style={styles.codeBlock}>
          {block.language ? <Text style={styles.codeLang}>{block.language}</Text> : null}
          <Text style={styles.codeText}>{block.code}</Text>
        </View>
      </ScrollView>
    );
  }
  if (block.type === 'quote') {
    return (
      <View style={styles.quote}>
        {block.lines.map((line, index) => (
          <Text key={index} style={[styles.body, styles.quoteText, { color }]}>
            {inline(line, color, styles)}
          </Text>
        ))}
      </View>
    );
  }
  if (block.type === 'ul' || block.type === 'ol') {
    return (
      <View style={styles.list}>
        {block.items.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={[styles.marker, { color: ink.textMuted }]}>{block.type === 'ol' ? `${index + 1}.` : '•'}</Text>
            <Text style={[styles.body, styles.itemText, { color }]}>{inline(item, color, styles)}</Text>
          </View>
        ))}
      </View>
    );
  }
  return (
    <Text style={[styles.body, { color }]}>
      {block.lines.map((line, index) => (
        <Text key={index}>
          {index > 0 ? '\n' : ''}
          {inline(line, color, styles)}
        </Text>
      ))}
    </Text>
  );
}

function inline(line: string, color: string, styles: ReturnType<typeof makeStyles>) {
  return parseInline(line).map((token, index) => renderToken(token, `${index}`, color, styles));
}

function renderToken(token: InlineToken, key: string, color: string, styles: ReturnType<typeof makeStyles>) {
  if (token.kind === 'text') return <Text key={key}>{token.value}</Text>;
  if (token.kind === 'link') {
    return (
      <Text
        key={key}
        style={styles.link}
        onPress={() => {
          void WebBrowser.openBrowserAsync(token.href);
        }}>
        {token.value}
      </Text>
    );
  }
  const nested = parseInline(token.value).map((child, index) => renderToken(child, `${key}-${index}`, color, styles));
  if (token.kind === 'bold') {
    return (
      <Text key={key} style={styles.bold}>
        {nested}
      </Text>
    );
  }
  if (token.kind === 'italic') {
    return (
      <Text key={key} style={styles.italic}>
        {nested}
      </Text>
    );
  }
  if (token.kind === 'strike') {
    return (
      <Text key={key} style={styles.strike}>
        {nested}
      </Text>
    );
  }
  return (
    <Text key={key} style={styles.inlineCode}>
      {nested}
    </Text>
  );
}

function headingSize(level: number, styles: ReturnType<typeof makeStyles>) {
  if (level <= 1) return styles.h1;
  if (level === 2) return styles.h2;
  return styles.h3;
}

function makeStyles(ink: Palette) {
  return StyleSheet.create({
    stack: { gap: Space[2], alignSelf: 'stretch', maxWidth: '100%' },
    tableScroll: { flexGrow: 0, maxWidth: '100%' },
    body: { ...Type.chat, color: ink.text },
    bold: { fontWeight: '700' },
    italic: { fontStyle: 'italic' },
    strike: { textDecorationLine: 'line-through' },
    link: { color: ink.accent, textDecorationLine: 'underline' },
    inlineCode: {
      fontFamily: 'monospace',
      fontSize: 13,
      lineHeight: 18,
      backgroundColor: ink.backgroundSelected,
      borderRadius: 4,
      overflow: 'hidden',
      paddingHorizontal: 4,
    },
    heading: { fontWeight: '700', color: ink.text, marginTop: 2 },
    h1: { fontSize: 20, lineHeight: 26 },
    h2: { fontSize: 17, lineHeight: 23 },
    h3: { fontSize: 15, lineHeight: 21 },
    quote: {
      borderLeftWidth: 3,
      borderLeftColor: ink.border,
      paddingLeft: Space[3],
      gap: 2,
    },
    quoteText: { color: ink.textMuted },
    callout: {
      borderRadius: Radius.card,
      borderWidth: 1,
      padding: Space[3],
      gap: Space[1],
      maxWidth: '100%',
    },
    calloutInfo: { backgroundColor: ink.surface, borderColor: ink.border },
    calloutWarning: { backgroundColor: 'rgba(217,119,6,0.12)', borderColor: 'rgba(217,119,6,0.35)' },
    calloutSuccess: { backgroundColor: 'rgba(22,163,74,0.12)', borderColor: 'rgba(22,163,74,0.35)' },
    calloutLabel: { ...Type.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    list: { gap: 6, maxWidth: '100%' },
    listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, maxWidth: '100%' },
    marker: { ...Type.chat, width: 18, textAlign: 'center' },
    itemText: { flex: 1, flexShrink: 1 },
    table: {
      borderWidth: 1,
      borderColor: ink.border,
      borderRadius: Radius.card,
      overflow: 'hidden',
      backgroundColor: ink.surfaceRaised,
    },
    tableHead: { backgroundColor: ink.backgroundSelected },
    tableRow: { flexDirection: 'row' },
    cell: {
      ...Type.meta,
      minWidth: 88,
      maxWidth: 160,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: ink.border,
    },
    headerCell: { fontWeight: '700' },
    codeScroll: { flexGrow: 0, maxWidth: '100%' },
    codeBlock: {
      minWidth: '100%',
      borderRadius: Radius.card,
      backgroundColor: ink.backgroundSelected,
      borderWidth: 1,
      borderColor: ink.border,
      padding: Space[3],
      gap: Space[1],
    },
    codeLang: { ...Type.caption, color: ink.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    codeText: {
      fontFamily: 'monospace',
      fontSize: 12,
      lineHeight: 18,
      color: ink.text,
    },
    hr: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: ink.border,
      marginVertical: Space[2],
      alignSelf: 'stretch',
    },
  });
}

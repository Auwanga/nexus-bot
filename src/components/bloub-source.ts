import { Asset } from 'expo-asset';

const ORIGINAL_GREEN = '#3ecf8e';

const MOOD_ASSET = {
  idle: require('../../assets/bloub-cloud/bloub-nuage-neutre-vert-anime.svg'),
  attentive: require('../../assets/bloub-cloud/bloub-nuage-attentif-vert-anime.svg'),
  surprised: require('../../assets/bloub-cloud/bloub-nuage-surpris-vert-anime.svg'),
  excited: require('../../assets/bloub-cloud/bloub-nuage-excite-vert-anime.svg'),
  happy: require('../../assets/bloub-cloud/bloub-nuage-heureux-vert-anime.svg'),
  laughing: require('../../assets/bloub-cloud/bloub-nuage-hilare-vert-anime.svg'),
  angry: require('../../assets/bloub-cloud/bloub-nuage-colere-vert-anime.svg'),
  sad: require('../../assets/bloub-cloud/bloub-nuage-triste-vert-anime.svg'),
  scared: require('../../assets/bloub-cloud/bloub-nuage-effraye-vert-anime.svg'),
  wary: require('../../assets/bloub-cloud/bloub-nuage-mefiant-vert-anime.svg'),
  confused: require('../../assets/bloub-cloud/bloub-nuage-confus-vert-anime.svg'),
  curious: require('../../assets/bloub-cloud/bloub-nuage-curieux-vert-anime.svg'),
  proud: require('../../assets/bloub-cloud/bloub-nuage-fier-vert-anime.svg'),
  shy: require('../../assets/bloub-cloud/bloub-nuage-timide-vert-anime.svg'),
  bored: require('../../assets/bloub-cloud/bloub-nuage-blase-vert-anime.svg'),
  sleepy: require('../../assets/bloub-cloud/bloub-nuage-somnolent-vert-anime.svg'),
} as const;

export type BloubMood = keyof typeof MOOD_ASSET;

export const BLOUB_MOODS = Object.keys(MOOD_ASSET) as BloubMood[];

const svgText = new Map<number, Promise<string>>();
const svgReady = new Map<number, string>();

export function bloubText(mood: BloubMood = 'idle') {
  return svgReady.get(MOOD_ASSET[mood]) ?? null;
}

async function readAssetText(uri: string) {
  if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('/')) {
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`Could not read bloub (${response.status})`);
    return response.text();
  }
  const { File } = await import('expo-file-system');
  return new File(uri).text();
}

function loadSvg(moduleId: number) {
  const cached = svgText.get(moduleId);
  if (cached) return cached;
  const pending = (async () => {
    const asset = Asset.fromModule(moduleId);
    if (!asset.localUri) await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    const text = await readAssetText(uri);
    if (!text.includes('<svg')) throw new Error('Bloub file was not an SVG');
    svgReady.set(moduleId, text);
    return text;
  })();
  pending.catch(() => {
    svgText.delete(moduleId);
  });
  svgText.set(moduleId, pending);
  return pending;
}

export function bloubReady(mood: BloubMood = 'idle') {
  return loadSvg(MOOD_ASSET[mood]).then(() => undefined);
}

export function paintSvg(svg: string, color: string, instance: string) {
  const tint = /^#[0-9a-f]{6}$/i.test(color) ? color : ORIGINAL_GREEN;
  return svg
    .replace('width="250" height="250"', 'width="100%" height="100%"')
    .replaceAll(ORIGINAL_GREEN, tint)
    .replaceAll(/bot-mask-[a-z0-9]+/gi, (id) => `${id}-${instance}`);
}

export async function paintedSvg(mood: BloubMood, color: string, instance: string) {
  const svg = await loadSvg(MOOD_ASSET[mood]);
  return paintSvg(svg, color, instance);
}

export function svgDocument(svg: string) {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" /><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;width:100%;height:100%}svg{width:100%;height:100%;display:block}</style></head><body>${svg}</body></html>`;
}

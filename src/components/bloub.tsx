import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { bloubReady, bloubText, paintSvg, paintedSvg, type BloubMood } from '@/components/bloub-source';
import { Bone } from '@/components/bone';
import { useAppearance } from '@/lib/appearance';

type Matrix = [number, number, number, number, number, number];
type Frame = { t: number; m: Matrix };
type Track = { duration: number; frames: Frame[] };
type Shape = { blob: string; eye: string; color: string; maskId: string; tracks: [Track, Track] };

type Props = {
  size: number;
  color?: string;
  /** Defaults to the current theme background so eyes cut through cleanly. */
  eyeColor?: string;
  mood?: BloubMood;
};

function parseTrack(svg: string, name: string): Track {
  const duration = Number(svg.match(/animation-duration:([0-9.]+)s/)?.[1] ?? 3);
  const body =
    svg.match(new RegExp(`@keyframes ${name}\\{([\\s\\S]*?)\\}(?:@keyframes|</style>)`))?.[1] ?? '';
  const frames: Frame[] = [];
  for (const match of body.matchAll(/([0-9.]+)%\{transform:matrix\(([-\d.,]+)\)/g)) {
    const values = match[2].split(',').map(Number);
    if (values.length === 6 && values.every((value) => Number.isFinite(value))) {
      frames.push({ t: Number(match[1]) / 100, m: values as Matrix });
    }
  }
  return { duration, frames };
}

function readShape(svg: string): Shape | null {
  const blob = svg.match(/<mask[^>]*>\s*<path d="([^"]+)" fill="#fff"/)?.[1];
  const eye = svg.match(/<path d="([^"]+)" class="oeil0"/)?.[1];
  const maskId = svg.match(/<mask id="([^"]+)"/)?.[1];
  const color = '#3ecf8e';
  const tracks: [Track, Track] = [parseTrack(svg, 'oeil0'), parseTrack(svg, 'oeil1')];
  if (!blob || !eye || !maskId || tracks.some((track) => track.frames.length < 2)) return null;
  return { blob, eye, color, maskId, tracks };
}

function sample(track: Track, elapsed: number): Matrix {
  const duration = track.duration * 1000;
  const span = elapsed % (duration * 2);
  const progress = span <= duration ? span / duration : (duration * 2 - span) / duration;
  let index = 0;
  while (index < track.frames.length - 1 && track.frames[index + 1].t <= progress) index += 1;
  const from = track.frames[index];
  const to = track.frames[Math.min(index + 1, track.frames.length - 1)];
  const gap = to.t - from.t;
  const mix = gap === 0 ? 0 : (progress - from.t) / gap;
  return from.m.map((value, part) => value + (to.m[part] - value) * mix) as Matrix;
}

function matrixOf(value: Matrix) {
  return `matrix(${value.join(',')})`;
}

export function useBloubReady(mood: BloubMood = 'idle') {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void bloubReady(mood)
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [mood]);

  return ready;
}

export function Bloub({ size, color = '#3ecf8e', eyeColor, mood = 'idle' }: Props) {
  const { ink } = useAppearance();
  const fill = /^#[0-9a-f]{6}$/i.test(color) ? color : '#3ecf8e';
  const eyesFill = eyeColor && /^#[0-9a-f]{6}$/i.test(eyeColor) ? eyeColor : ink.bg;
  const instance = `${mood}-${fill.replace('#', '')}-${size}`;
  const [svg, setSvg] = useState<string | null>(() => {
    const cached = bloubText(mood);
    return cached ? paintSvg(cached, fill, instance) : null;
  });
  const [eyes, setEyes] = useState<[string, string] | null>(null);
  const shape = useMemo(() => (svg ? readShape(svg) : null), [svg]);

  useEffect(() => {
    let active = true;
    const instanceId = `${mood}-${fill.replace('#', '')}-${size}`;
    void paintedSvg(mood, fill, instanceId)
      .then((next) => {
        if (active) setSvg(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [fill, mood, size]);

  useEffect(() => {
    if (!shape) return;
    const started = Date.now();
    let frame = 0;
    const tick = () => {
      const elapsed = Date.now() - started;
      setEyes([matrixOf(sample(shape.tracks[0], elapsed)), matrixOf(sample(shape.tracks[1], elapsed))]);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [shape]);

  const resting = shape ? matrixOf(shape.tracks[0].frames[0].m) : '';
  const leftEye = eyes?.[0] ?? resting;
  const rightEye = eyes?.[1] ?? resting;

  return (
    <View
      collapsable={false}
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {shape ? (
        <Svg width={size} height={size} viewBox="-125 -125 250 250">
          <Path d={shape.blob} fill={fill} />
          <Path d={shape.eye} fill={eyesFill} transform={leftEye} />
          <Path d={shape.eye} fill={eyesFill} transform={rightEye} />
        </Svg>
      ) : (
        <Bone width={size} height={size} radius={size / 2} />
      )}
    </View>
  );
}

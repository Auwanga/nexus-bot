import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, Polygon, Rect } from 'react-native-svg';

const GREEN = '#3DDC6A';
const PINK = '#FF3D9A';
const PURPLE = '#8B5CF6';
const BROWN = '#7A5230';
const ORANGE = '#FF8A1E';
const RED = '#FF3B30';
const BLUE = '#2F6BFF';
const HEX = '#FF6A00';
const TEAL = '#14C4B0';

type EyeStyle = 'pills' | 'dots';

type Mark = {
  color: string;
  kind: 'circle' | 'squircle' | 'hex' | 'cloud' | 'pebble';
  top: `${number}%`;
  left?: `${number}%`;
  right?: `${number}%`;
  size: number;
  rotate?: string;
  eyes: EyeStyle;
};

const MARKS: Mark[] = [
  { kind: 'cloud', color: GREEN, top: '9%', left: '12%', size: 112, eyes: 'pills' },
  { kind: 'circle', color: PINK, top: '6%', left: '62%', size: 74, eyes: 'dots' },
  { kind: 'pebble', color: PURPLE, top: '28%', left: '-4%', size: 76, rotate: '-14deg', eyes: 'pills' },
  { kind: 'circle', color: BROWN, top: '24%', right: '5%', size: 66, eyes: 'pills' },
  { kind: 'circle', color: ORANGE, top: '58%', left: '1%', size: 68, eyes: 'pills' },
  { kind: 'pebble', color: RED, top: '42%', right: '-16%', size: 84, rotate: '16deg', eyes: 'pills' },
  { kind: 'squircle', color: BLUE, top: '78%', left: '6%', size: 72, eyes: 'pills' },
  { kind: 'hex', color: HEX, top: '82%', left: '37%', size: 78, eyes: 'pills' },
  { kind: 'circle', color: TEAL, top: '72%', right: '4%', size: 68, eyes: 'pills' },
];

function Eyes({ size, kind }: { size: number; kind: EyeStyle }) {
  if (kind === 'dots') {
    const dot = Math.max(6, size * 0.1);
    return (
      <View style={[styles.dots, { top: size * 0.22, right: size * 0.2, gap: size * 0.06 }]}>
        <View style={{ width: dot, height: dot, borderRadius: dot, backgroundColor: '#FFFFFF' }} />
        <View
          style={{
            width: dot * 0.72,
            height: dot * 0.72,
            borderRadius: dot,
            backgroundColor: '#FFFFFF',
            marginTop: size * 0.08,
          }}
        />
      </View>
    );
  }

  const eyeW = Math.max(5, size * 0.11);
  const eyeH = Math.max(14, size * 0.28);
  return (
    <View style={[styles.eyes, { gap: size * 0.09 }]}>
      <View style={{ width: eyeW, height: eyeH, borderRadius: eyeW, backgroundColor: '#FFFFFF' }} />
      <View style={{ width: eyeW, height: eyeH, borderRadius: eyeW, backgroundColor: '#FFFFFF' }} />
    </View>
  );
}

function Shape({ kind, color, size }: { kind: Mark['kind']; color: string; size: number }) {
  if (kind === 'cloud') {
    const width = size;
    const height = size * 0.72;
    return (
      <Svg width={width} height={height} viewBox="0 0 120 86">
        <Circle cx="40" cy="48" r="30" fill={color} />
        <Circle cx="70" cy="38" r="34" fill={color} />
        <Circle cx="92" cy="52" r="24" fill={color} />
      </Svg>
    );
  }

  if (kind === 'hex') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Polygon points="50,3 95,27 95,73 50,97 5,73 5,27" fill={color} />
      </Svg>
    );
  }

  if (kind === 'squircle') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Rect x="4" y="4" width="92" height="92" rx="28" fill={color} />
      </Svg>
    );
  }

  if (kind === 'pebble') {
    return (
      <Svg width={size} height={size * 1.08} viewBox="0 0 100 108">
        <Ellipse cx="50" cy="54" rx="44" ry="50" fill={color} />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="50" fill={color} />
    </Svg>
  );
}

export function WelcomeMarks({ scale }: { scale: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {MARKS.map((mark) => {
        const size = Math.round(mark.size * scale);
        const height = mark.kind === 'cloud' ? size * 0.72 : mark.kind === 'pebble' ? size * 1.08 : size;
        return (
          <View
            key={`${mark.color}-${mark.top}`}
            style={{
              position: 'absolute',
              top: mark.top,
              left: mark.left,
              right: mark.right,
              width: mark.kind === 'cloud' ? size : size,
              height,
              transform: mark.rotate ? [{ rotate: mark.rotate }] : undefined,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Shape kind={mark.kind} color={mark.color} size={size} />
            <View style={styles.eyeLayer}>
              <Eyes size={size} kind={mark.eyes} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  eyeLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dots: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});

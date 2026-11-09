import { useId } from 'react';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  color: string;
  /** How far the page colour stays solid before the dissolve starts. */
  solid?: number;
  /** Length of the dissolve. */
  fade?: number;
};

export function TopFade({ color, solid = 36, fade = 72 }: Props) {
  const id = `top-fade-${useId().replace(/:/g, '')}`;
  const height = solid + fade;
  const hold = solid / height;
  const mid = (solid + fade * 0.42) / height;
  return (
    <Svg pointerEvents="none" width="100%" height={height} style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 }}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset={hold} stopColor={color} stopOpacity={1} />
          <Stop offset={mid} stopColor={color} stopOpacity={0.72} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height={height} fill={`url(#${id})`} />
    </Svg>
  );
}

/** Short dissolve pinned to the bottom edge. The solid band stays below the composer. */
export function BottomFade({ color, solid = 0, fade = 20 }: Props) {
  const id = `bottom-fade-${useId().replace(/:/g, '')}`;
  const height = Math.max(solid + fade, 1);
  const clear = fade / height;
  const mid = (fade * 0.58) / height;
  return (
    <Svg pointerEvents="none" width="100%" height={height} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1 }}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0} />
          <Stop offset={mid} stopColor={color} stopOpacity={0.72} />
          <Stop offset={clear} stopColor={color} stopOpacity={1} />
          <Stop offset="1" stopColor={color} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height={height} fill={`url(#${id})`} />
    </Svg>
  );
}

import { useAppearance } from '@/lib/appearance';

/** The chosen appearance, not the device setting. */
export function useColorScheme() {
  return useAppearance().scheme;
}

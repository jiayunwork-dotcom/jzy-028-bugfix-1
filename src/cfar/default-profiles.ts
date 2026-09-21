import { WindowProfile } from './domain/types';

/**
 * 启动时载入内存的默认具名窗规（不落库；运行期追加的窗规重启即失效）。
 */
export const DEFAULT_PROFILES: WindowProfile[] = [
  {
    name: 'default',
    guardCells: 2,
    referenceCellsPerSide: 4,
    pfa: 1e-3,
  },
  {
    name: 'narrow',
    guardCells: 1,
    referenceCellsPerSide: 2,
    pfa: 1e-3,
  },
  {
    name: 'wide-loose',
    guardCells: 4,
    referenceCellsPerSide: 8,
    pfa: 1e-2,
  },
];

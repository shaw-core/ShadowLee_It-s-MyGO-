// 通用类型
export enum Layer {
  REAL = 'REAL',
  MANGA = 'MANGA',
}

export interface LevelResult {
  chapter: 1 | 2;
  levelId: number;
  timeTaken: number;
  deathCount: number;
  collectedIds: string[];
  skipped?: boolean;
}

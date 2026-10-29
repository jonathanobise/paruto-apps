export type StageResult =
  | { kind: 'DONE'; state: string }
  | { kind: 'SKIPPED'; reason: string }
  | { kind: 'DEFER'; untilMs: number; reason: string };

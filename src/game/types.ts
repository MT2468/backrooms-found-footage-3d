export type ChapterId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type Vec3Tuple = [number, number, number];

export interface AabbCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
}

export interface Interactable {
  id: string;
  prompt: string;
  position: Vec3Tuple;
  radius?: number;
  once?: boolean;
  meshName?: string;
}

export interface ChapterWorld {
  id: ChapterId;
  title: string;
  kicker: string;
  objective: string;
  spawn: Vec3Tuple;
  yaw: number;
  colliders: AabbCollider[];
  interactables: Interactable[];
  goal?: Vec3Tuple;
  goalRadius?: number;
  vhs: boolean;
  threat: 'none' | 'glimpse' | 'chase';
  ambient: 'async' | 'showroom' | 'yellow' | 'therapy' | 'memory' | 'kingdom' | 'chase' | 'facility';
}

export interface SaveState {
  chapter: ChapterId;
  completed: string[];
  reducedFlicker: boolean;
  grain: number;
  sensitivity: number;
  volume: number;
}

export const CHAPTER_COUNT = 10;

export const clampChapter = (value: number): ChapterId => Math.max(0, Math.min(9, Math.floor(value))) as ChapterId;

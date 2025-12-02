
export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  RESULT = 'RESULT',
  DIALOGUE = 'DIALOGUE',
  GALLERY = 'GALLERY',
  SECRET_ENDING = 'SECRET_ENDING'
}

export enum Layer {
  REAL = 'REAL',
  MANGA = 'MANGA'
}

export enum EntityType {
  PLATFORM = 'PLATFORM',
  HAZARD = 'HAZARD',
  GOAL = 'GOAL',
  COLLECTIBLE_PAGE = 'COLLECTIBLE_PAGE',
  COLLECTIBLE_SHARD = 'COLLECTIBLE_SHARD',
  TEXT = 'TEXT' // New entity for Easter eggs
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LevelEntity extends Rect {
  id: string;
  type: EntityType;
  layerMask: 'REAL' | 'MANGA' | 'BOTH';
  text?: string; // Content for TEXT entities
  color?: string; // Custom color for text
  visible?: boolean; // Runtime prop
}

export interface LevelConfig {
  id: number;
  name: string;
  entities: LevelEntity[];
  playerStart: { x: number; y: number };
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isGrounded: boolean;
  facingRight: boolean;
}

export interface LevelResult {
  levelId: number;
  timeTaken: number;
  deathCount: number;
  collectedIds: string[];
}

export interface AffectionState {
  characterId: string;
  name: string;
  value: number;
  color: string;
}

// Dialogue Types
export interface DialogueChoice {
  id: string;
  text: string;
  affectionDelta?: { charId: string; amount: number };
  nextNodeId: string | null; // null ends dialogue
  requiresClear?: boolean; // ONLY visible after finishing the game once
}

export interface DialogueNode {
  id: string;
  speakerName: string;
  speakerImage?: string; // URL
  text: string;
  choices: DialogueChoice[];
  backgroundStyle?: 'REAL' | 'MANGA'; 
}

export interface YuriEvent {
  id: string;
  requiredPageId: string;
  nodes: Record<string, DialogueNode>;
  startNodeId: string;
}
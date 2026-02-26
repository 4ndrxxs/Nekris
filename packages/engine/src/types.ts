export enum CellType {
  EMPTY = 0,
  START = 1,
  WATER = 2,
  COUCH = 3,
  PLANT = 4,
  BOX = 5,
  TREAT = 6,
  YARN = 7,
  SAUCER = 8,
}

export interface Point {
  x: number;
  y: number;
}

export interface LevelData {
  grid: CellType[][];
  startPoint: Point;
  endPoint: Point;
  path: Point[];
  gridSize: number;
  width: number;
  height: number;
  targetCount: number;
}

export interface EngineState {
  path: Point[];
  score: number;
  levelScore: number;
  collectedSet: Set<string>;
  isWon: boolean;
  moveCount: number;
}

export interface MoveResult {
  state: EngineState;
  effects: GameEffect[];
  valid: boolean;
}

export type GameEffect =
  | { type: 'AUDIO'; sound: 'backspace' | 'fish' | 'yarn' | 'stretch' | 'goal' | 'win' }
  | { type: 'TIMER_ADD'; seconds: number }
  | { type: 'WATER_RESET'; points: Point[] }
  | { type: 'WIN' }
  | { type: 'LEVEL_ADVANCE'; nextLevel: number };

export interface MoveOptions {
  isTreatActive?: boolean;
  isYarnActive?: boolean;
  totalLevels?: number;
  currentLevel?: number;
}

export interface TimedMove {
  point: Point;
  t: number;
}

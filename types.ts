export interface Vector {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export type ScoreEvent = 'playerScored' | 'aiScored' | 'start' | 'aiHit';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface GameConfig {
  aiLevel: number; // 0 (Easy) to 3 (God)
  speedMulti: number; // 0.8 to 2.0
  difficultyName: string;
}

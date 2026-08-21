import './styles.css';
import { Game } from './game/Game';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Missing game canvas');

const game = new Game(canvas);
game.boot();

(window as unknown as { thresholdGame: Game }).thresholdGame = game;

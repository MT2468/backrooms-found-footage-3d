import './styles.css';
import { Campaign } from './game/Campaign';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Game canvas not found.');

try {
  new Campaign(canvas);
} catch (error) {
  console.error(error);
  document.body.innerHTML = `<main class="fatal"><h1>WEBGL INITIALIZATION FAILED</h1><p>This build needs a browser with WebGL2 enabled.</p><pre>${String(error)}</pre></main>`;
}

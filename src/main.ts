import './styles.css';
import { Campaign } from './game/Campaign';
import { applyPtBRPatches } from './game/ptbrPatch';
import { applyLightingPatch } from './game/lightingPatch';

applyPtBRPatches();
applyLightingPatch();

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Canvas do jogo não encontrado.');

try {
  new Campaign(canvas);
} catch (error) {
  console.error(error);
  document.body.innerHTML = `<main class="fatal"><h1>FALHA AO INICIAR O WEBGL</h1><p>Esta versão precisa de um navegador com WebGL2 ativado.</p><pre>${String(error)}</pre></main>`;
}

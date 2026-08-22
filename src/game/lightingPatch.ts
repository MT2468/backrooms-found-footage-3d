import * as THREE from 'three';
import { Campaign } from './Campaign';
import type { ChapterWorld } from './types';

type CampaignInternals = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  world: ChapterWorld;
  chapter: number;
  started: boolean;
  paused: boolean;
  choiceOpen: boolean;
  enqueue: (beats: Array<{ speaker?: string; text: string; danger?: boolean }>) => void;
};

type LightingState = {
  ambient: THREE.AmbientLight;
  hemisphere: THREE.HemisphereLight;
  flashlight: THREE.SpotLight;
  flashlightTarget: THREE.Object3D;
  nearFill: THREE.PointLight;
  enabled: boolean;
};

const states = new WeakMap<object, LightingState>();
let patched = false;

const LIGHTING: Record<ChapterWorld['ambient'], { ambient: number; hemi: number; exposure: number }> = {
  async:    { ambient: 0.30, hemi: 0.42, exposure: 1.16 },
  showroom: { ambient: 0.27, hemi: 0.38, exposure: 1.14 },
  yellow:   { ambient: 0.20, hemi: 0.30, exposure: 1.10 },
  therapy:  { ambient: 0.35, hemi: 0.48, exposure: 1.20 },
  memory:   { ambient: 0.36, hemi: 0.50, exposure: 1.22 },
  kingdom:  { ambient: 0.38, hemi: 0.52, exposure: 1.23 },
  chase:    { ambient: 0.31, hemi: 0.44, exposure: 1.17 },
  facility: { ambient: 0.24, hemi: 0.34, exposure: 1.12 },
};

function ensureHud(): void {
  const status = document.querySelector<HTMLElement>('#hud .status');
  if (status && !document.querySelector('#flashlight-state')) {
    const item = document.createElement('span');
    item.innerHTML = 'LANTERNA <b id="flashlight-state">LIGADA</b>';
    status.appendChild(item);
  }

  const controls = document.querySelector<HTMLElement>('.controls');
  if (controls && !controls.textContent?.includes('T lanterna')) {
    const text = controls.textContent ?? '';
    controls.textContent = text.includes('E interagir')
      ? text.replace('E interagir', 'E interagir · T lanterna')
      : `${text} · T lanterna`;
  }
}

function makeState(game: CampaignInternals): LightingState {
  const ambient = new THREE.AmbientLight(0xeaf0ee, 0.3);
  ambient.name = 'player-minimum-ambient';

  const hemisphere = new THREE.HemisphereLight(0xdce8f0, 0x19140f, 0.42);
  hemisphere.name = 'player-minimum-hemisphere';

  const flashlight = new THREE.SpotLight(
    0xfff2d6,
    8.5,
    32,
    Math.PI / 7,
    0.48,
    1.35,
  );
  flashlight.name = 'player-flashlight';
  flashlight.castShadow = false;

  const flashlightTarget = new THREE.Object3D();
  flashlightTarget.name = 'player-flashlight-target';
  flashlight.target = flashlightTarget;

  const nearFill = new THREE.PointLight(0xffe8c8, 0.55, 5.5, 2);
  nearFill.name = 'player-flashlight-near-fill';

  game.scene.add(ambient, hemisphere, flashlight, flashlightTarget, nearFill);

  const state: LightingState = {
    ambient,
    hemisphere,
    flashlight,
    flashlightTarget,
    nearFill,
    enabled: true,
  };

  states.set(game as object, state);
  updateHud(state);
  return state;
}

function stateFor(game: CampaignInternals): LightingState {
  return states.get(game as object) ?? makeState(game);
}

function updateHud(state: LightingState): void {
  const el = document.querySelector<HTMLElement>('#flashlight-state');
  if (el) el.textContent = state.enabled ? 'LIGADA' : 'DESLIGADA';
}

function applyChapterProfile(game: CampaignInternals): void {
  const state = stateFor(game);
  const ambient: ChapterWorld['ambient'] = game.world?.ambient ?? 'yellow';
  const profile = LIGHTING[ambient];

  state.ambient.intensity = profile.ambient;
  state.hemisphere.intensity = profile.hemi;
  game.renderer.toneMappingExposure = profile.exposure;

  const dark = ambient === 'therapy' || ambient === 'memory' || ambient === 'kingdom' || ambient === 'chase';
  state.flashlight.intensity = dark ? 10.5 : 8.0;
  state.flashlight.distance = dark ? 36 : 30;
  state.nearFill.intensity = dark ? 0.78 : 0.48;
}

function updateFlashlight(game: CampaignInternals): void {
  const state = stateFor(game);
  const camera = game.camera;
  const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();

  state.flashlight.visible = state.enabled;
  state.nearFill.visible = state.enabled;

  state.flashlight.position.copy(camera.position).addScaledVector(direction, 0.08);
  state.flashlightTarget.position.copy(camera.position).addScaledVector(direction, 12);
  state.nearFill.position.copy(camera.position).addScaledVector(direction, 0.45);

  updateHud(state);
}

function toggleFlashlight(game: CampaignInternals): void {
  const state = stateFor(game);
  state.enabled = !state.enabled;
  updateFlashlight(game);
  game.enqueue([{ text: state.enabled ? 'Lanterna ligada.' : 'Lanterna desligada.' }]);
}

export function applyLightingPatch(): void {
  if (patched) return;
  patched = true;
  ensureHud();

  const proto = Campaign.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
  const originalLoadChapter = proto.loadChapter;
  const originalUpdate = proto.update;
  const originalKeyDown = proto.keyDown;

  proto.loadChapter = function (this: Campaign, ...args: unknown[]): unknown {
    const result = originalLoadChapter.apply(this, args);
    const game = this as unknown as CampaignInternals;
    ensureHud();
    applyChapterProfile(game);
    updateFlashlight(game);
    return result;
  };

  proto.update = function (this: Campaign, ...args: unknown[]): unknown {
    const result = originalUpdate.apply(this, args);
    updateFlashlight(this as unknown as CampaignInternals);
    return result;
  };

  proto.keyDown = function (this: Campaign, eventUnknown: unknown): unknown {
    const e = eventUnknown as KeyboardEvent;
    if (e.code === 'KeyT' && !e.repeat) {
      e.preventDefault();
      toggleFlashlight(this as unknown as CampaignInternals);
      return;
    }
    return originalKeyDown.call(this, e);
  };
}

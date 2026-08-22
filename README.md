# BACKROOMS // Threshold Archive

A complete browser-playable first-person horror campaign built with **Three.js + TypeScript + Vite**. The project adapts the narrative spine and visual grammar researched from Kane Parsons' 2026 *Backrooms* feature into an interactive found-footage experience without reproducing screenplay dialogue.

## Campaign

The game is structured as ten authored chapters rather than one endless procedural maze:

0. Async Survey 06
1. Cap'n Clark's Ottoman Empire
2. First Entry
3. Dr. Mary Kline
4. The VHS Expedition
5. Separation
6. Mary
7. Clark's Kingdom
8. Pirate Clark
9. Async Recovery

The complete loop includes first-person exploration, staged interactions, breaker sequencing, evidence collection, dialogue choices, VHS camera presentation, a rope expedition set piece, memory-corrupted rooms, Still Life figures, a full Pirate Clark pursuit, handprint stun mechanic, gas-valve escape, Async observation/interview and a final controlled-threshold sequence.

## Controls

- **WASD** move
- **Mouse** look
- **Shift** sprint
- **Ctrl / C** crouch
- **E** interact
- **Space** strike with the handprint during the chase
- **F** toggle reduced fluorescent flicker
- **F3** diagnostics
- **Alt + 0..9** chapter warp while diagnostics are enabled
- **Esc** release pointer lock / pause

## Systems

- Authored chapter state machine with local save/resume
- Collision against authored AABB room geometry
- DOM HUD and menus kept outside WebGL
- Procedural fluorescent, footstep, static, impact and danger audio through WebAudio
- VHS / found-footage overlay, scanlines, tape roll, signal-loss and stress vignette
- Threat director behavior for restrained glimpses before the full reveal
- Breadcrumb pursuit AI in the chase, following the player's actual route instead of tunneling through level geometry
- Stamina, stress, crouch, head bob, interaction gating and chapter objectives
- Accessibility controls for flicker, film grain, sensitivity and volume
- Runtime diagnostics for FPS, draw calls, triangle counts and chapter state
- WebGL fallback screen and responsive UI

## Run locally

```bash
npm install
npm run dev
```

Open the Vite URL, click **NEW TAPE**, then click the 3D view if the browser asks to reacquire pointer lock.

## Production build

```bash
npm run build
npm run preview
```

## Architecture

- `src/game/Campaign.ts` — game loop, chapter progression, player, save system, interaction logic and threat runtime
- `src/game/WorldBuilder.ts` — all ten authored 3D environments, geometry, colliders, lighting and interactive props
- `src/game/story.ts` — paraphrased narrative beats and dialogue choices
- `src/game/AudioEngine.ts` — procedural browser audio
- `src/game/types.ts` — simulation contracts
- `src/styles.css` — HUD, menus, VHS treatment, transitions and accessibility
- `docs/FILM_RESEARCH.md` — research basis
- `docs/GAME_PLAN.md` — production plan

The runtime deliberately keeps simulation/story state separate from Three.js world construction. Hero props can later be replaced with GLB/glTF assets without rewriting the campaign logic.

## Quality targets

The repository CI runs TypeScript + Vite production builds on pushes and pull requests. The game is designed to remain self-contained, with no external runtime model or texture downloads required for a complete playthrough.

This is a fan-made interactive project. No screenplay text, film footage, ripped models or soundtrack assets are included.

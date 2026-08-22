# THRESHOLD // Backrooms 2026 adaptation plan

## Goal
Build a complete browser-playable first-person 3D adaptation of the narrative spine of Kane Parsons' 2026 Backrooms film using Three.js + TypeScript + Vite. The experience should feel authored and cinematic, not like an endless procedural Backrooms asset demo.

Target first complete campaign: 45–70 minutes.

## Pillars
1. **Film-faithful progression**: Clark -> discovery -> VHS expedition -> separation -> Mary -> Clark's refuge -> Pirate Clark reveal -> chase -> Async.
2. **Banal-space horror**: the level is frightening because it is ordinary, endless and subtly wrong, not because every corridor is black.
3. **POV as storytelling**: clean cinematic first-person, VHS camera footage, surveillance/Async capture and damaged signal states each have different render/audio behavior.
4. **Memory corruption**: world modules are authored from real-world motifs and then algorithmically degraded, duplicated and recombined.
5. **Threat restraint**: Pirate Clark is not a constantly patrolling videogame monster. Presence is staged, intermittent and meaningful.

## Campaign structure

### 0. PROLOGUE // ASYNC TAPE
- Playable 3–5 minute cold open as an Async explorer.
- Survey equipment, red safety markings, anomalous architecture.
- Learn movement and camera without a tutorial box.
- Distant pursuit, cut signal before full reveal.

### 1. CAP'N CLARK'S OTTOMAN EMPIRE
- Player becomes Clark.
- Explore failing showroom after hours.
- Environmental story: broken display throne, pirate campaign props, unpaid notices, makeshift sleeping area, CRT television.
- Breaker puzzle: fluorescent zones die one by one, exposing the impossible seam in the basement wall.

### 2. FIRST ENTRY
- Bright yellow Backrooms.
- Navigation landmarks: furniture cairn, embedded shoes, reversed sign, wrong door placement, cardboard cutout, moving audio source.
- Objective is to bring one impossible object back as proof.
- No full monster encounter. Only a silhouette/impact/sound cue that teaches the player to retreat.

### 3. THERAPY / PROOF LOOP
- Short interactive scene with Mary built around selecting what evidence Clark shows and how insistently he argues.
- Outcome is fixed narratively, but performance affects optional dialogue and later memory fragments.
- Clark recruits Kat and Bobby.

### 4. VHS EXPEDITION
- Player controls Bobby through the viewfinder while Clark/Kat are spatialized voices behind him.
- Rope descent physically constrains movement and framing.
- Clothing room, wrong duplicate shirt, flickering black threshold.
- Pirate silhouette event.
- Escape-to-rope sequence; violent pull; camera tumbles and perspective becomes partially uncontrolled.
- Brief switch to Clark after the fall.

### 5. SEPARATION
- Clark moves through Christmas/festive rooms, red-lit service rooms, impossible cuts and passive Still Lifes.
- Kat is heard through walls/incorrect portals.
- The VHS camera becomes an object that can be placed, dropped and later appear somewhere impossible.
- Kat's fate remains partially unseen to preserve the film's ambiguity.

### 6. MARY
- Perspective shifts to Mary after Clark's disappearance.
- Real-world lead-in includes her childhood handprint memento and subtle memory fragments.
- Enter the portal alone.
- Backrooms generation changes: domestic geometry and covered-window motifs begin contaminating the yellow rooms.

### 7. CLARK'S KINGDOM
- Discover Clark's constructed refuge / pseudo-home.
- Passive Still Lifes act as uncanny residents.
- Exploration uncovers how Clark has arranged furniture and people into a counterfeit domestic life.
- Interactive dinner/role-play scene with limited player responses as Mary.
- Clark explains the memory-reconstruction model via spaces the player has already seen.

### 8. PIRATE CLARK
- Full creature reveal only here.
- Clark is killed in front of Mary.
- Chase is authored as a sequence of connected arenas, not a random AI sprint:
  1. refuge collapse
  2. yellow maze
  3. compressed corridor
  4. suburban/dollhouse memory rooms
  5. furniture showroom echo
  6. gas-canister trap
- Mary can stun/slow the creature with the concrete handprint object and environmental interactions.

### 9. ASYNC
- Hazmat recovery.
- Transition to sterile research facility.
- Phil interrogation through a deliberately static camera composition.
- Optional observation window reveals captured Pirate Clark.
- Final walk through a controlled Async threshold.
- End image: Mary-memory spaces and a Mary Still Life, then hard tape stop.

## Mechanics
- First-person movement: walk, sprint, crouch, lean/peek, interact.
- Physical stamina is mild; the game must not become a running simulator.
- Context interactions: breaker switches, doors, ropes, VHS camera, pickups, props, gas valves, handprint weapon.
- Camera modes: human POV, shoulder VHS, dropped VHS, Async fixed camera.
- Memory contamination system alters room dressing based on narrative state rather than pure randomness.
- Threat director controls sound, glimpses, light behavior and creature visibility.
- Authored chase spline + navmesh fallback for Pirate Clark.
- Minimal HUD. Most objective information comes from character voice, tape labels and environmental signage.

## Technology
- Three.js + TypeScript + Vite.
- Simulation state separated from render objects.
- Collision/physics: Rapier when environmental physics enters production; initial scaffold may use deterministic capsule/grid collision.
- GLB/glTF 2.0 for character/prop shipping assets.
- DOM overlays for menus, captions, accessibility and settings.
- Post-processing chain kept measurable and toggleable: film grain/VHS chroma drift, subtle lens distortion, bloom only for practical lights, exposure adaptation.
- WebAudio procedural fluorescent hum plus authored SFX/music assets later.

## World architecture
- `simulation/`: story state, triggers, threat director, objectives, save state.
- `render/app/`: renderer/camera/context lifecycle.
- `render/world/`: modular room chunks and memory corruptor.
- `render/characters/`: character and Still Life/Pirate Clark presentation.
- `physics/`: player capsule, props, rope/environment collisions.
- `audio/`: room tone, positional events, VHS distortion.
- `ui/`: menu, captions, accessibility, pause/settings.
- `diagnostics/`: FPS/draw calls, trigger viewer, AI path debug, chapter warp.

## Asset plan
- Phase 1 ships with procedural/basic geometry for every scene so the whole campaign is playable early.
- Phase 2 replaces hero assets with authored GLB props: furniture, breaker board, VHS camera, rope gear, Still Lifes, Pirate Clark.
- Repeating wall/floor materials use tileable compressed textures; unique memory props use atlases.
- Character faces and costumes need original game-ready models based on the film's roles, not scraped meshes.

## Quality bar
- 60 fps target on a typical desktop GPU at 1080p; scalable shadows/post FX.
- No corridor can exist only to pad time. Every space either advances navigation, character, dread or a set piece.
- No constant jumpscare spam.
- Film-filter strength should never make navigation unreadable.
- Full keyboard/mouse remapping and sensitivity control before release candidate.

## Test gates
1. `npm run build` clean TypeScript/Vite build.
2. Desktop Chrome smoke test with pointer lock, resize and pause/resume.
3. Complete campaign can be finished from clean save.
4. No softlocks after dropped camera, rope event, chapter transition or creature stun.
5. Creature cannot clip through closed collision during authored chase.
6. Context-loss recovery and WebGL fallback messaging.
7. Performance capture in the heaviest chase scene.
8. Visual QA at 16:9, 16:10 and ultrawide.

## Immediate build order
1. Replace generic maze scaffold with scene/chapter state machine.
2. Build showroom + breaker portal sequence.
3. Build film-faithful yellow-room kit and authored first-entry path.
4. Implement VHS camera pipeline.
5. Build rope/Bobby set piece.
6. Add Clark/Kat/Bobby/Mary placeholder rigs and subtitle/voice event system.
7. Build Mary memory-corruption system.
8. Build Clark refuge and Still Life behavior.
9. Build Pirate Clark authored chase + Async ending.
10. Full browser playtest, performance pass, bug fixing and art replacement.

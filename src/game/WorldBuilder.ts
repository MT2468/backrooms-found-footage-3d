import * as THREE from 'three';
import type { AabbCollider, ChapterId, ChapterWorld, Interactable, Vec3Tuple } from './types';

const YELLOW = 0xc8bd67;
const CARPET = 0x6f6844;
const CEILING = 0xc9c8ac;
const WHITE = 0xd9ddd8;
const DARK = 0x191a17;
const RED = 0x8c1e1e;

export class WorldBuilder {
  readonly group = new THREE.Group();
  private colliders: AabbCollider[] = [];
  private interactables: Interactable[] = [];
  private emissives: THREE.MeshStandardMaterial[] = [];
  private fixtures: THREE.PointLight[] = [];
  private chapter!: ChapterWorld;
  private rng = mulberry32(1337);

  build(id: ChapterId): ChapterWorld {
    this.clear();
    this.rng = mulberry32(1000 + id * 997);
    if (id === 0) this.asyncPrologue();
    if (id === 1) this.showroom();
    if (id === 2) this.firstEntry();
    if (id === 3) this.therapy();
    if (id === 4) this.vhsExpedition();
    if (id === 5) this.separation();
    if (id === 6) this.maryEntry();
    if (id === 7) this.kingdom();
    if (id === 8) this.chase();
    if (id === 9) this.asyncEnding();
    return this.chapter;
  }

  update(t: number, reducedFlicker: boolean, intensity = 1): void {
    if (reducedFlicker) return;
    const hard = this.chapter?.ambient === 'chase' ? 0.24 : 0.08;
    for (let i = 0; i < this.fixtures.length; i++) {
      const l = this.fixtures[i];
      const pulse = Math.sin(t * (3.7 + i * .17)) * .06;
      const glitch = Math.sin(t * 31 + i * 4.1) > .992 ? hard : 0;
      l.intensity = Math.max(.25, (2.1 + pulse - glitch) * intensity);
    }
    for (let i = 0; i < this.emissives.length; i++) {
      this.emissives[i].emissiveIntensity = 1.5 + Math.sin(t * 2.2 + i) * .08;
    }
  }

  setFixtureFactor(factor: number): void {
    this.fixtures.forEach((l, i) => l.visible = i / Math.max(1, this.fixtures.length - 1) < factor);
  }

  clear(): void {
    while (this.group.children.length) {
      const child = this.group.children.pop()!;
      child.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach(mat => mat.dispose());
        }
      });
    }
    this.colliders = [];
    this.interactables = [];
    this.emissives = [];
    this.fixtures = [];
  }

  canStand(x: number, z: number, radius = .34): boolean {
    for (const c of this.colliders) {
      if (x > c.minX - radius && x < c.maxX + radius && z > c.minZ - radius && z < c.maxZ + radius) return false;
    }
    return true;
  }

  getInteractableMeshes(): THREE.Object3D[] {
    const names = new Set(this.interactables.map(i => i.meshName).filter(Boolean) as string[]);
    const out: THREE.Object3D[] = [];
    this.group.traverse(o => { if (names.has(o.name)) out.push(o); });
    return out;
  }

  private begin(id: ChapterId, title: string, kicker: string, objective: string, spawn: Vec3Tuple, yaw: number, ambient: ChapterWorld['ambient'], vhs = false, threat: ChapterWorld['threat'] = 'none'): void {
    this.chapter = { id, title, kicker, objective, spawn, yaw, colliders: this.colliders, interactables: this.interactables, ambient, vhs, threat };
  }

  private finish(goal?: Vec3Tuple, goalRadius = 2.2): void {
    if (goal) { this.chapter.goal = goal; this.chapter.goalRadius = goalRadius; }
  }

  private mat(color: number, roughness = .9, emissive?: number, emissiveIntensity = 0): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: .02, emissive: emissive ?? 0x000000, emissiveIntensity });
    if (emissive) this.emissives.push(m);
    return m;
  }

  private box(name: string, p: Vec3Tuple, s: Vec3Tuple, color: number, collider = true, mat?: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...s), mat ?? this.mat(color));
    mesh.position.set(...p); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; this.group.add(mesh);
    if (collider) this.colliders.push({ minX: p[0] - s[0] / 2, maxX: p[0] + s[0] / 2, minZ: p[2] - s[2] / 2, maxZ: p[2] + s[2] / 2 });
    return mesh;
  }

  private planeFloor(cx: number, cz: number, w: number, d: number, color: number, y = 0): void {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, .12, d), this.mat(color, 1));
    mesh.position.set(cx, y - .06, cz); mesh.receiveShadow = true; this.group.add(mesh);
  }

  private wall(x: number, z: number, w: number, d: number, h = 3.25, color = YELLOW): void {
    this.box('wall', [x, h / 2, z], [w, h, d], color, true);
  }

  private ceiling(cx: number, cz: number, w: number, d: number, color = CEILING, y = 3.25): void {
    this.box('ceiling', [cx, y + .07, cz], [w, .14, d], color, false);
  }

  private fluorescent(x: number, z: number, rot = 0, color = 0xfff2aa): void {
    const m = this.mat(0xf1efcc, .55, color, 2.4);
    const fixture = this.box('fixture', [x, 3.16, z], [1.7, .05, .48], 0xffffff, false, m);
    fixture.rotation.y = rot;
    const l = new THREE.PointLight(color, 2.1, 8.5, 1.5); l.position.set(x, 2.9, z); this.fixtures.push(l); this.group.add(l);
  }

  private room(cx: number, cz: number, w: number, d: number, opts: { floor?: number; wall?: number; ceiling?: number; openings?: ('n'|'s'|'e'|'w')[]; h?: number; lights?: boolean } = {}): void {
    const h = opts.h ?? 3.25, floor = opts.floor ?? CARPET, wall = opts.wall ?? YELLOW, ceil = opts.ceiling ?? CEILING;
    this.planeFloor(cx, cz, w, d, floor); this.ceiling(cx, cz, w, d, ceil, h);
    const o = new Set(opts.openings ?? []); const t = .16;
    const addSide = (side: 'n'|'s'|'e'|'w') => {
      const horizontal = side === 'n' || side === 's'; const span = horizontal ? w : d; const door = o.has(side) ? 2.1 : 0;
      const seg = (span - door) / 2;
      if (door <= 0) {
        if (horizontal) this.wall(cx, cz + (side === 'n' ? -d/2 : d/2), w, t, h, wall);
        else this.wall(cx + (side === 'w' ? -w/2 : w/2), cz, t, d, h, wall);
      } else {
        if (horizontal) {
          this.wall(cx - (door/2 + seg/2), cz + (side === 'n' ? -d/2 : d/2), seg, t, h, wall);
          this.wall(cx + (door/2 + seg/2), cz + (side === 'n' ? -d/2 : d/2), seg, t, h, wall);
        } else {
          this.wall(cx + (side === 'w' ? -w/2 : w/2), cz - (door/2 + seg/2), t, seg, h, wall);
          this.wall(cx + (side === 'w' ? -w/2 : w/2), cz + (door/2 + seg/2), t, seg, h, wall);
        }
      }
    };
    addSide('n'); addSide('s'); addSide('e'); addSide('w');
    if (opts.lights !== false) {
      const count = Math.max(1, Math.floor((w * d) / 55));
      for (let i = 0; i < count; i++) this.fluorescent(cx + ((i % 3) - 1) * Math.min(3.2, w / 4), cz + (Math.floor(i / 3) - .5) * Math.min(3.4, d / 3), i % 2 ? Math.PI / 2 : 0);
    }
  }

  private corridor(a: Vec3Tuple, b: Vec3Tuple, width = 3.2, wallColor = YELLOW, floorColor = CARPET, lights = true): void {
    const dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz), cx = (a[0] + b[0]) / 2, cz = (a[2] + b[2]) / 2;
    const horizontal = Math.abs(dx) > Math.abs(dz);
    if (horizontal) this.room(cx, cz, len + width, width, { floor: floorColor, wall: wallColor, openings: ['e','w'], lights });
    else this.room(cx, cz, width, len + width, { floor: floorColor, wall: wallColor, openings: ['n','s'], lights });
  }

  private addInteract(id: string, prompt: string, p: Vec3Tuple, mesh?: THREE.Object3D, radius = 2): void {
    const meshName = mesh ? `interact:${id}` : undefined; if (mesh) mesh.name = meshName!;
    this.interactables.push({ id, prompt, position: p, radius, once: true, meshName });
  }

  private propChair(x: number, z: number, color = 0x73503b, scale = 1): THREE.Group {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2,.25,1.1), this.mat(color,.9)); seat.position.y=.72;
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,.22), this.mat(color,.9)); back.position.set(0,1.35,.44);
    g.add(seat,back);
    for (const sx of [-.48,.48]) for (const sz of [-.4,.4]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.13,.7,.13), this.mat(0x4a3428)); leg.position.set(sx,.35,sz); g.add(leg); }
    g.traverse(o => { const m=o as THREE.Mesh; if(m.geometry){m.castShadow=true;m.receiveShadow=true;} }); this.group.add(g); return g;
  }

  private human(name: string, p: Vec3Tuple, color = 0x777777, distorted = false): THREE.Group {
    const g = new THREE.Group(); g.name = name; g.position.set(...p);
    const skin = this.mat(0xb99b7b,.9), cloth = this.mat(color,.88);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(distorted ? .42 : .34, distorted ? 1.15 : .9, 6, 10), cloth); body.position.y = 1.15;
    const head = new THREE.Mesh(new THREE.SphereGeometry(distorted ? .37 : .29, 14, 10), skin); head.position.set(distorted?.15:0, distorted?2.15:2.0, distorted?.08:0); if(distorted) head.scale.set(1.25,.75,.9);
    g.add(body,head);
    for(const s of [-1,1]){ const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.1, distorted?1.35:.75,4,8),skin); arm.position.set(s*.48,1.35,0); arm.rotation.z=s*(distorted?-.18:.15); g.add(arm); }
    g.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry)m.castShadow=true;}); this.group.add(g); return g;
  }

  private label(text: string, p: Vec3Tuple, scale = 1, color = '#241f13'): THREE.Sprite {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const ctx = c.getContext('2d')!;
    ctx.fillStyle='rgba(227,218,169,.92)';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#554b2a';ctx.lineWidth=8;ctx.strokeRect(4,4,c.width-8,c.height-8);
    ctx.fillStyle=color;ctx.font='700 40px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace; const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));spr.position.set(...p);spr.scale.set(4*scale,1*scale,1);this.group.add(spr);return spr;
  }

  private asyncPrologue(): void {
    this.begin(0,'ASYNC SURVEY 06','TAPE // 00','Reach the marked survey station.',[0,1.65,12],Math.PI,'async',true,'glimpse');
    this.room(0,0,8,30,{floor:0x3c3e38,wall:0x8e9288,ceiling:0x6f746d,openings:['n','s']});
    for(let z=-10;z<=10;z+=5){ this.box('cable',[2.6,.05,z],[.09,.08,3.8],0x181818,false); if(z<8)this.label(`A-${String((z+15)/5).padStart(2,'0')}`,[2.7,1.8,z],.5,'#7b1212'); }
    const console=this.box('survey-console',[0,1,-9],[1.5,2,1],0x2f3430,true); this.addInteract('survey-console','E  LOG ANOMALY',[0,1.4,-8.2],console,2.3);
    this.finish([0,1.6,-12.5],2.1);
  }

  private showroom(): void {
    this.begin(1,"CAP'N CLARK'S OTTOMAN EMPIRE",'1990 // AFTER HOURS','Restore power to the basement.',[0,1.65,13],Math.PI,'showroom');
    this.room(0,6,18,18,{floor:0x50453e,wall:0xc9a76a,ceiling:0x7c7362,openings:['n']});
    this.room(0,-8,12,10,{floor:0x42413a,wall:0xb4ad91,ceiling:0x858373,openings:['s']});
    this.corridor([0,0,-1],[0,0,1],4.5,0xb4ad91,0x42413a);
    const colors=[0x6f3f32,0x39545c,0x6c6242,0x77565a,0x3e5741];
    for(let i=0;i<11;i++)this.propChair(-6+(i%4)*4,1+Math.floor(i/4)*4,colors[i%colors.length],.8+this.rng()*.25);
    const throne=this.propChair(5.5,9,0x8a1f1f,1.5); throne.rotation.y=.25; this.label("CAP'N CLARK'S",[5.5,2.9,8.5],.85,'#6b130d');
    const bed=this.box('cot',[-3,.35,-9],[3,.7,1.8],0x555c57,true); bed.rotation.y=.08;
    const panel=this.box('breaker-panel',[4.7,1.5,-10.7],[1.2,2.2,.25],0x454a43,true);
    this.addInteract('breaker-a','E  RESET BREAKER A',[4.2,1.7,-10.2],panel,2.2);
    this.addInteract('breaker-b','E  RESET BREAKER B',[4.7,1.7,-10.2],undefined,2.2);
    this.addInteract('breaker-c','E  RESET BREAKER C',[5.2,1.7,-10.2],undefined,2.2);
    const seam=this.box('portal-seam',[-5.82,1.6,-8],[.05,2.8,2.1],0xf2eab5,false,this.mat(0xf6efc0,.4,0xe8e096,3));
    seam.visible=false; seam.userData.portal=true; this.addInteract('portal','E  TOUCH THE LIGHT',[-5.2,1.6,-8],seam,2.4);
    this.finish([-5.1,1.6,-8],1.5);
  }

  private firstEntry(): void {
    this.begin(2,'FIRST ENTRY','NO ADDRESS // NO EXIT','Find something that should not be here.',[0,1.65,15],Math.PI,'yellow',false,'glimpse');
    const pts:[[number,number],[number,number]][]=[[[0,15],[0,5]],[[0,5],[8,5]],[[8,5],[8,-5]],[[8,-5],[-6,-5]],[[-6,-5],[-6,-15]],[[-6,-15],[5,-15]]];
    pts.forEach(([a,b])=>this.corridor([a[0],0,a[1]],[b[0],0,b[1]],4.2));
    this.room(0,5,8,8,{openings:['n','e','s']});this.room(8,-5,8,8,{openings:['n','w','s']});this.room(-6,-15,9,8,{openings:['n','e']});
    this.propChair(2.2,4.2,0x766048,.9); this.propChair(2.7,4.7,0x766048,.9); this.propChair(3.3,5.1,0x766048,.85);
    const sign=this.label('EXIT ←  TIXE',[7.5,1.8,-2.2],.8); this.addInteract('wrong-sign','E  EXAMINE SIGN',[7.2,1.5,-2.2],sign,2.4);
    const shoe=this.box('proof-object',[3,.08,-15],[.7,.16,1.4],0x423c35,false); shoe.rotation.y=.6; this.addInteract('proof-object','E  TAKE IMPOSSIBLE SHOE',[3,.35,-15],shoe,2);
    const portal=this.box('return-portal',[5.8,1.5,-15],[.05,3,2],0xece1a3,false,this.mat(0xece1a3,.4,0xe1d37f,2)); this.addInteract('return-portal','E  GO BACK',[5.2,1.5,-15],portal,2.1);
  }

  private therapy(): void {
    this.begin(3,'DR. MARY KLINE','SESSION // RECORDED','Sit down and tell Mary what you found.',[0,1.65,4.5],Math.PI,'therapy');
    this.room(0,0,9,10,{floor:0x675d4e,wall:0xb5aa91,ceiling:0xd7d3c5,lights:false});
    const lamp=this.box('lamp',[-3.2,1.6,-2.5],[.25,2.5,.25],0x3d362e,true);const shade=this.box('shade',[-3.2,2.75,-2.5],[1.1,.55,1.1],0xc29f69,false); shade.rotation.y=.2;
    const light=new THREE.PointLight(0xffc98d,3.2,8,2);light.position.set(-3.2,2.5,-2.5);this.group.add(light);
    this.propChair(0,2.2,0x50535a,1);this.propChair(0,-2.2,0x7a5d4c,1);this.human('mary',[0,0,-3.1],0x4b5057);
    this.addInteract('therapy-seat','E  SIT',[0,1,1.6],undefined,2.2);
  }

  private vhsExpedition(): void {
    this.begin(4,'THE EXPEDITION','VHS // BOBBY','Keep the camera rolling.',[0,1.65,14],Math.PI,'yellow',true,'glimpse');
    this.corridor([0,0,14],[0,0,4],4.5);this.room(0,1,11,8,{openings:['n','s']});this.corridor([0,0,-2],[0,0,-10],4.5);this.room(0,-14,11,8,{openings:['n'],floor:0x625f4d});
    this.human('clark',[-1.4,0,10],0x6a5845);this.human('kat',[1.4,0,10],0x4e6269);
    const cam=this.box('vhs-camera',[0,1.05,7],[.75,.45,.65],0x20211f,false);this.addInteract('camera-check','E  CHECK CAMERA',[0,1.1,7],cam,1.8);
    const rope=this.box('rope',[0,.08,-4],[.08,.08,8],0x8c7650,false);this.addInteract('rope','E  CLIP INTO ROPE',[0,.5,-2.8],rope,2);
    for(let i=0;i<18;i++){const cloth=this.box('cloth',[(-4+i%6)*.75,.04,-15+Math.floor(i/6)*.8],[.6,.05,.9],[0x5d4b45,0x293f51,0x6d6656,0x5f3b3b][i%4],false);cloth.rotation.y=this.rng()*Math.PI;}
    const threshold=this.box('black-threshold',[0,1.5,-17.9],[2.4,3,.12],DARK,false,this.mat(DARK,.8,0x100000,.05));this.addInteract('threshold','E  AIM CAMERA INTO DARKNESS',[0,1.5,-17.1],threshold,2.1);
  }

  private separation(): void {
    this.begin(5,'SEPARATION','TAPE DAMAGED','Follow Kat’s voice.',[0,1.65,13],Math.PI,'memory',true,'glimpse');
    this.corridor([0,0,13],[0,0,6],4,YELLOW,CARPET);this.room(-4,2,8,8,{openings:['e','s'],floor:0x4e3b31,wall:0x5e321e,ceiling:0x281a17,lights:false});
    this.room(5,2,9,8,{openings:['w','s'],floor:0x3b352f,wall:0x682323,ceiling:0x332222,lights:false});this.corridor([5,0,-2],[5,0,-10],3.5,0x5b4b3e,0x3d3832,false);
    const redLight=new THREE.PointLight(0xff2211,4.2,11,2);redLight.position.set(5,2.4,1);this.group.add(redLight);
    for(let i=0;i<12;i++){const bulb=new THREE.PointLight(i%3===0?0xff3344:i%3===1?0x33aa55:0xffcc55,.45,2.5,2);bulb.position.set(-7+(i%4)*2,2.3,-1+Math.floor(i/4)*2);this.group.add(bulb);}
    for(let i=0;i<4;i++)this.human(`still-life-${i}`,[-2+i*1.4,0,-4-i*.4],0x777266,true);
    const camera=this.box('lost-camera',[4.7,.15,-6],[.8,.3,.6],0x191919,false);this.addInteract('lost-camera','E  PICK UP THE CAMERA',[4.7,.5,-6],camera,2);
    this.addInteract('kat-voice','E  CALL FOR KAT',[5,1.5,-9],undefined,2.4);
    this.finish([5,1.6,-11],1.8);
  }

  private maryEntry(): void {
    this.begin(6,'MARY','SEARCH // DAY 3','Take the handprint. Find Clark.',[0,1.65,13],Math.PI,'memory');
    this.room(0,8,10,10,{floor:0x61564c,wall:0xb5a48d,ceiling:0xd1c7b6,openings:['n']});
    const slab=this.box('handprint',[-2.5,.7,8],[1.2,1.4,.18],0x9b978d,false);this.addInteract('handprint','E  TAKE CONCRETE HANDPRINT',[-2.5,1,8],slab,2);
    this.corridor([0,0,3],[0,0,-4],3.8,0xb5a48d,0x61564c);this.room(0,-8,9,8,{floor:CARPET,wall:YELLOW,ceiling:CEILING,openings:['s','n']});
    this.corridor([0,0,-12],[7,0,-12],4,YELLOW,CARPET);this.room(10,-12,8,8,{openings:['w'],floor:0x5e5a50,wall:0xc2b79b,lights:false});
    for(let i=0;i<3;i++){this.box('covered-window',[11.8,1.7,-14+i*2],[.15,2.3,1.4],0x3f4548,true);this.box('curtain',[11.6,1.7,-14+i*2],[.08,2.6,1.7],0x8b8174,false);}
    const portal=this.box('mary-portal',[0,1.5,-12.1],[2.3,3,.08],0xe9dda1,false,this.mat(0xe9dda1,.5,0xd5c66e,1.8));this.addInteract('mary-portal','E  CROSS OVER',[0,1.5,-11.4],portal,2);
    this.finish([10,1.6,-12],1.9);
  }

  private kingdom(): void {
    this.begin(7,"CLARK'S KINGDOM",'NO CLOCKS // NO WINDOWS','Find Clark in the counterfeit home.',[0,1.65,14],Math.PI,'kingdom',false,'glimpse');
    this.corridor([0,0,14],[0,0,7],4,YELLOW,CARPET);this.room(0,2,14,11,{openings:['n','s'],floor:0x4f4438,wall:0x8e7959,ceiling:0x716451,lights:false});
    const warm=new THREE.PointLight(0xffb16b,5.5,14,2);warm.position.set(0,2.7,1);this.group.add(warm);
    for(let i=0;i<6;i++)this.propChair(-4+(i%3)*4,-.8+Math.floor(i/3)*4,[0x73503b,0x4e5f53,0x684659][i%3],.9);
    for(let i=0;i<5;i++)this.human(`resident-${i}`,[-5+i*2.5,0,4.7-(i%2)*1.2],0x716c63,true);
    const table=this.box('dinner-table',[0,.75,0],[4.8,1.5,1.5],0x584331,true);this.addInteract('dinner','E  SIT WITH CLARK',[0,1.2,1.5],table,2.4);
    this.human('clark',[0,0,-2.2],0x685343);
    const door=this.box('kingdom-door',[0,1.5,-3.45],[2.2,3,.16],0x3f3227,true);this.addInteract('kingdom-door','E  OPEN THE BACK DOOR',[0,1.5,-2.7],door,2);
  }

  private chase(): void {
    this.begin(8,'PIRATE CLARK','RUN // DO NOT LOOK BACK','Run. Use SPACE to strike when he is close.',[0,1.65,16],Math.PI,'chase',false,'chase');
    this.corridor([0,0,16],[0,0,8],4.5,0x8e7959,0x4f4438,false);
    this.room(0,4,10,8,{openings:['n','e'],floor:0x4f4438,wall:0x8e7959,lights:false});
    this.corridor([5,0,4],[13,0,4],3.5,YELLOW,CARPET);this.room(17,4,9,7,{openings:['w','s']});
    this.corridor([17,0,0],[17,0,-9],2.8,YELLOW,CARPET);this.room(17,-13,8,8,{openings:['n','w'],floor:0x5f5a51,wall:0xb9ad90,lights:false});
    this.corridor([13,0,-13],[4,0,-13],3.6,0xb9ad90,0x5f5a51,false);this.room(0,-13,8,9,{openings:['e','s'],floor:0x514842,wall:0xa18660,lights:false});
    this.corridor([0,0,-17],[0,0,-25],4,0x82745f,0x413b37,false);this.room(0,-29,11,8,{openings:['n'],floor:0x353a37,wall:0x6d746f,ceiling:0x4b504d,lights:false});
    const red=new THREE.PointLight(0xff4422,5.5,14,2);red.position.set(0,2.4,-29);this.group.add(red);
    const slab=this.box('handprint-weapon',[.5,.65,13],[.9,1.1,.16],0xaaa59b,false);this.addInteract('weapon-check','E  GRIP THE HANDPRINT',[.5,1,13],slab,1.8);
    const valve=this.box('gas-valve',[2.8,1.1,-30],[.5,2.2,.5],0xa13622,true);this.addInteract('gas-valve','E  OPEN GAS VALVE',[2.8,1.3,-29.3],valve,2.1);
    this.finish([0,1.6,-31.5],1.9);
  }

  private asyncEnding(): void {
    this.begin(9,'ASYNC','RECOVERY // INTERVIEW','Walk through the observation wing.',[0,1.65,14],Math.PI,'facility');
    this.corridor([0,0,14],[0,0,5],4.5,WHITE,0x6c716e);this.room(0,0,12,9,{openings:['n','s'],floor:0x707774,wall:WHITE,ceiling:0xa7afaa,lights:false});
    for(let z=4;z>-4;z-=3){const l=new THREE.RectAreaLight(0xe7f5ef,4,3,1);l.position.set(0,3,z);l.rotation.x=-Math.PI/2;this.group.add(l);}
    const glassMat=new THREE.MeshPhysicalMaterial({color:0x9dc0b8,transparent:true,opacity:.22,roughness:.12,transmission:.25});
    const glass=this.box('observation-glass',[5.7,1.6,0],[.1,3,6],0x99bbbb,true,glassMat);this.addInteract('observation','E  LOOK THROUGH GLASS',[4.9,1.6,0],glass,2.1);
    const captive=this.human('captured-pirate',[8,0,0],0x372d27,true);captive.scale.set(1.7,2.4,1.4);
    const chair=this.propChair(0,-1.2,0x303b40,1);this.addInteract('interview','E  SIT FOR INTERVIEW',[0,1,-.2],chair,2);
    this.corridor([0,0,-5],[0,0,-13],4.5,WHITE,0x6c716e);const threshold=this.box('controlled-threshold',[0,1.5,-15],[2.4,3,.12],0xdbc971,false,this.mat(0xe8dc93,.5,0xd7c55c,2.5));this.addInteract('final-threshold','E  ENTER CONTROLLED THRESHOLD',[0,1.5,-14.1],threshold,2.2);
  }
}

function mulberry32(seed: number): () => number {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

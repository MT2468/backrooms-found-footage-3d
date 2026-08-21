import * as THREE from 'three';

export type Cell = { x: number; z: number };
type MazeCell = { n: boolean; e: boolean; s: boolean; w: boolean; visited: boolean };

const DIRS = [
  { dx: 0, dz: -1, a: 'n', b: 's' },
  { dx: 1, dz: 0, a: 'e', b: 'w' },
  { dx: 0, dz: 1, a: 's', b: 'n' },
  { dx: -1, dz: 0, a: 'w', b: 'e' },
] as const;

export class World {
  readonly width = 18;
  readonly height = 18;
  readonly cellSize = 5.8;
  readonly wallHeight = 3.15;
  readonly group = new THREE.Group();
  readonly start: Cell = { x: 1, z: 1 };
  readonly exit: Cell = { x: this.width - 2, z: this.height - 2 };
  readonly tapeCells: Cell[] = [];
  readonly practicalLights: THREE.PointLight[] = [];
  private grid: MazeCell[][] = [];
  private rng: () => number;

  constructor(seed = Date.now() & 0xfffffff) {
    this.rng = mulberry32(seed);
    this.generate();
    this.chooseTapeCells();
    this.build();
  }

  cell(x: number, z: number): MazeCell | undefined { return this.grid[z]?.[x]; }

  cellCenter(c: Cell, y = 1.63): THREE.Vector3 {
    const ox = -this.width * this.cellSize * 0.5;
    const oz = -this.height * this.cellSize * 0.5;
    return new THREE.Vector3(ox + (c.x + .5) * this.cellSize, y, oz + (c.z + .5) * this.cellSize);
  }

  worldToCell(position: THREE.Vector3): Cell {
    const ox = -this.width * this.cellSize * 0.5;
    const oz = -this.height * this.cellSize * 0.5;
    return {
      x: THREE.MathUtils.clamp(Math.floor((position.x - ox) / this.cellSize), 0, this.width - 1),
      z: THREE.MathUtils.clamp(Math.floor((position.z - oz) / this.cellSize), 0, this.height - 1),
    };
  }

  canStand(position: THREE.Vector3, radius = .34): boolean {
    const c = this.worldToCell(position);
    const cell = this.cell(c.x, c.z);
    if (!cell) return false;
    const center = this.cellCenter(c, position.y);
    const half = this.cellSize * .5;
    const lx = position.x - center.x;
    const lz = position.z - center.z;
    if (cell.w && lx < -half + radius) return false;
    if (cell.e && lx > half - radius) return false;
    if (cell.n && lz < -half + radius) return false;
    if (cell.s && lz > half - radius) return false;
    return true;
  }

  neighbors(c: Cell): Cell[] {
    const cell = this.cell(c.x, c.z);
    if (!cell) return [];
    const result: Cell[] = [];
    if (!cell.n) result.push({ x: c.x, z: c.z - 1 });
    if (!cell.e) result.push({ x: c.x + 1, z: c.z });
    if (!cell.s) result.push({ x: c.x, z: c.z + 1 });
    if (!cell.w) result.push({ x: c.x - 1, z: c.z });
    return result.filter(n => this.cell(n.x, n.z));
  }

  path(start: Cell, goal: Cell): Cell[] {
    const key = (c: Cell) => `${c.x},${c.z}`;
    const queue: Cell[] = [start];
    const came = new Map<string, Cell | null>([[key(start), null]]);
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];
      if (current.x === goal.x && current.z === goal.z) break;
      for (const n of this.neighbors(current)) {
        if (!came.has(key(n))) { came.set(key(n), current); queue.push(n); }
      }
    }
    if (!came.has(key(goal))) return [];
    const out: Cell[] = [];
    let cur: Cell | null = goal;
    while (cur) { out.push(cur); cur = came.get(key(cur)) ?? null; }
    return out.reverse();
  }

  randomCell(minDistanceFromStart = 0): Cell {
    for (let i = 0; i < 400; i++) {
      const c = { x: 1 + Math.floor(this.rng() * (this.width - 2)), z: 1 + Math.floor(this.rng() * (this.height - 2)) };
      const d = Math.abs(c.x - this.start.x) + Math.abs(c.z - this.start.z);
      if (d >= minDistanceFromStart) return c;
    }
    return { ...this.exit };
  }

  private generate(): void {
    this.grid = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => ({ n: true, e: true, s: true, w: true, visited: false }))
    );
    const stack: Cell[] = [{ ...this.start }];
    this.grid[this.start.z][this.start.x].visited = true;
    while (stack.length) {
      const current = stack[stack.length - 1];
      const options = DIRS.filter(d => {
        const nx = current.x + d.dx, nz = current.z + d.dz;
        return nx > 0 && nz > 0 && nx < this.width - 1 && nz < this.height - 1 && !this.grid[nz][nx].visited;
      });
      if (!options.length) { stack.pop(); continue; }
      const d = options[Math.floor(this.rng() * options.length)];
      const next = { x: current.x + d.dx, z: current.z + d.dz };
      this.grid[current.z][current.x][d.a] = false;
      this.grid[next.z][next.x][d.b] = false;
      this.grid[next.z][next.x].visited = true;
      stack.push(next);
    }
    // Punch extra connections into the perfect maze so it feels architectural rather than puzzle-like.
    for (let z = 2; z < this.height - 2; z++) for (let x = 2; x < this.width - 2; x++) {
      if (this.rng() > .82) {
        const d = DIRS[Math.floor(this.rng() * DIRS.length)];
        const nx = x + d.dx, nz = z + d.dz;
        this.grid[z][x][d.a] = false;
        this.grid[nz][nx][d.b] = false;
      }
    }
  }

  private chooseTapeCells(): void {
    const candidates: { cell: Cell; distance: number }[] = [];
    for (let z = 1; z < this.height - 1; z++) for (let x = 1; x < this.width - 1; x++) {
      const p = this.path(this.start, { x, z });
      candidates.push({ cell: { x, z }, distance: p.length });
    }
    candidates.sort((a, b) => b.distance - a.distance);
    const pool = candidates.slice(0, Math.max(18, Math.floor(candidates.length * .2)));
    while (this.tapeCells.length < 3 && pool.length) {
      const pick = pool.splice(Math.floor(this.rng() * pool.length), 1)[0].cell;
      if (this.tapeCells.every(c => Math.abs(c.x - pick.x) + Math.abs(c.z - pick.z) > 5)) this.tapeCells.push(pick);
    }
    while (this.tapeCells.length < 3) this.tapeCells.push(this.randomCell(12));
  }

  private build(): void {
    const wallpaper = this.wallpaperTexture();
    const carpet = this.carpetTexture();
    const wallMat = new THREE.MeshStandardMaterial({ map: wallpaper, roughness: .96, metalness: 0, color: 0xd1c96e });
    const floorMat = new THREE.MeshStandardMaterial({ map: carpet, roughness: 1, color: 0x8b8253 });
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xcac8a8, roughness: .92 });
    const wallGeo = new THREE.BoxGeometry(this.cellSize, this.wallHeight, .12);
    const floorGeo = new THREE.BoxGeometry(this.cellSize, .1, this.cellSize);
    const total = (this.width - 2) * (this.height - 2);
    const floors = new THREE.InstancedMesh(floorGeo, floorMat, total);
    const ceilings = new THREE.InstancedMesh(floorGeo, ceilingMat, total);
    floors.receiveShadow = true; ceilings.receiveShadow = true;
    const wallTransforms: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let z = 1; z < this.height - 1; z++) for (let x = 1; x < this.width - 1; x++) {
      const c = { x, z }, center = this.cellCenter(c, 0);
      dummy.position.set(center.x, -.07, center.z); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); floors.setMatrixAt(idx, dummy.matrix);
      dummy.position.set(center.x, this.wallHeight + .07, center.z); dummy.updateMatrix(); ceilings.setMatrixAt(idx, dummy.matrix); idx++;
      const cell = this.grid[z][x], h = this.wallHeight * .5;
      if (cell.n) wallTransforms.push(new THREE.Matrix4().compose(new THREE.Vector3(center.x, h, center.z - this.cellSize / 2), new THREE.Quaternion(), new THREE.Vector3(1,1,1)));
      if (cell.w) {
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), Math.PI / 2);
        wallTransforms.push(new THREE.Matrix4().compose(new THREE.Vector3(center.x - this.cellSize / 2, h, center.z), q, new THREE.Vector3(1,1,1)));
      }
      if (z === this.height - 2 && cell.s) wallTransforms.push(new THREE.Matrix4().compose(new THREE.Vector3(center.x, h, center.z + this.cellSize / 2), new THREE.Quaternion(), new THREE.Vector3(1,1,1)));
      if (x === this.width - 2 && cell.e) {
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), Math.PI / 2);
        wallTransforms.push(new THREE.Matrix4().compose(new THREE.Vector3(center.x + this.cellSize / 2, h, center.z), q, new THREE.Vector3(1,1,1)));
      }
    }
    const walls = new THREE.InstancedMesh(wallGeo, wallMat, wallTransforms.length);
    wallTransforms.forEach((m, i) => walls.setMatrixAt(i, m));
    walls.castShadow = true; walls.receiveShadow = true;
    this.group.add(floors, ceilings, walls);

    const fixtureGeo = new THREE.BoxGeometry(1.8, .035, .72);
    const fixtureMat = new THREE.MeshStandardMaterial({ color: 0xf7f3c3, emissive: 0xe8e29e, emissiveIntensity: 3.8, toneMapped: false });
    const fixtureCells: Cell[] = [];
    for (let z = 1; z < this.height - 1; z++) for (let x = 1; x < this.width - 1; x++) if ((x + z * 3) % 3 === 0) fixtureCells.push({ x, z });
    const fixtures = new THREE.InstancedMesh(fixtureGeo, fixtureMat, fixtureCells.length);
    fixtureCells.forEach((c, i) => { const p = this.cellCenter(c, this.wallHeight - .025); dummy.position.copy(p); dummy.rotation.set(0, (c.x % 2) * Math.PI / 2, 0); dummy.updateMatrix(); fixtures.setMatrixAt(i, dummy.matrix); });
    this.group.add(fixtures);

    // A limited number of real lights keeps the fluorescent volume without hundreds of shadow sources.
    fixtureCells.filter((_, i) => i % 5 === 0).forEach((c, i) => {
      const p = this.cellCenter(c, this.wallHeight - .24);
      const light = new THREE.PointLight(0xfff4b2, i % 4 === 0 ? 8 : 5.5, 11, 2.1);
      light.position.copy(p); this.practicalLights.push(light); this.group.add(light);
    });
  }

  private wallpaperTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const g = c.getContext('2d')!; g.fillStyle = '#c9c16c'; g.fillRect(0,0,256,256);
    for (let y=0;y<256;y+=8) { g.fillStyle = `rgba(86,79,36,${.035 + this.rng()*.035})`; g.fillRect(0,y,256,1); }
    for (let i=0;i<900;i++) { const v = 110 + Math.floor(this.rng()*80); g.fillStyle = `rgba(${v},${v-8},70,.035)`; g.fillRect(this.rng()*256,this.rng()*256,1,1); }
    const t = new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(2.5,1.2); t.colorSpace=THREE.SRGBColorSpace; return t;
  }

  private carpetTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas'); c.width=256; c.height=256; const g=c.getContext('2d')!;
    g.fillStyle='#81794e'; g.fillRect(0,0,256,256);
    for(let i=0;i<5000;i++){ const a=.035+this.rng()*.08; g.fillStyle=`rgba(${80+this.rng()*70},${78+this.rng()*60},${40+this.rng()*45},${a})`; g.fillRect(this.rng()*256,this.rng()*256,1,2); }
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(4,4); t.colorSpace=THREE.SRGBColorSpace; return t;
  }
}

function mulberry32(seed: number): () => number { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

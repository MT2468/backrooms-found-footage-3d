import * as THREE from 'three';
import { AudioEngine } from './AudioEngine';
import { WorldBuilder } from './WorldBuilder';
import { chapterIntros, dinnerChoices, interactions, therapyChoices, type Beat, type Choice } from './story';
import { CHAPTER_COUNT, clampChapter, type ChapterId, type ChapterWorld, type Interactable, type SaveState } from './types';

const SAVE_KEY = 'threshold-backrooms-save-v2';

export class Campaign {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .05, 180);
  private builder = new WorldBuilder();
  private audio = new AudioEngine();
  private world!: ChapterWorld;
  private chapter: ChapterId = 0;
  private completed = new Set<string>();
  private keys = new Set<string>();
  private yaw = 0;
  private pitch = 0;
  private velocity = new THREE.Vector3();
  private player = new THREE.Vector3();
  private stamina = 100;
  private stress = 0;
  private started = false;
  private paused = false;
  private elapsed = 0;
  private chapterElapsed = 0;
  private interactionCooldown = 0;
  private stepSurface: 'carpet'|'hard' = 'carpet';
  private reducedFlicker = false;
  private grain = .42;
  private sensitivity = .0021;
  private volume = .72;
  private dialogueQueue: Beat[] = [];
  private dialogueTimer = 0;
  private choiceOpen = false;
  private choiceCallback?: () => void;
  private chapterTransitioning = false;
  private threat = new THREE.Group();
  private threatActive = false;
  private threatStun = 0;
  private threatReveal = 0;
  private threatTrail: {p: THREE.Vector3; t: number}[] = [];
  private threatSpawn = new THREE.Vector3();
  private handprintReady = false;
  private vhsDrop = false;
  private debug = false;
  private fpsSamples: number[] = [];
  private lastFrame = performance.now();
  private pendingReset = false;

  private el = {
    menu: document.querySelector<HTMLElement>('#menu')!,
    start: document.querySelector<HTMLButtonElement>('#start')!,
    continue: document.querySelector<HTMLButtonElement>('#continue')!,
    hud: document.querySelector<HTMLElement>('#hud')!,
    objective: document.querySelector<HTMLElement>('#objective')!,
    prompt: document.querySelector<HTMLElement>('#prompt')!,
    subtitle: document.querySelector<HTMLElement>('#subtitle')!,
    timecode: document.querySelector<HTMLElement>('#timecode')!,
    stamina: document.querySelector<HTMLElement>('#stamina')!,
    stress: document.querySelector<HTMLElement>('#stress')!,
    chapterCard: document.querySelector<HTMLElement>('#chapter-card')!,
    chapterKicker: document.querySelector<HTMLElement>('#chapter-kicker')!,
    chapterTitle: document.querySelector<HTMLElement>('#chapter-title')!,
    pause: document.querySelector<HTMLElement>('#pause')!,
    resume: document.querySelector<HTMLButtonElement>('#resume')!,
    restartChapter: document.querySelector<HTMLButtonElement>('#restart-chapter')!,
    choices: document.querySelector<HTMLElement>('#choices')!,
    choicePrompt: document.querySelector<HTMLElement>('#choice-prompt')!,
    choiceButtons: document.querySelector<HTMLElement>('#choice-buttons')!,
    end: document.querySelector<HTMLElement>('#end')!,
    rewind: document.querySelector<HTMLButtonElement>('#rewind')!,
    settings: document.querySelector<HTMLElement>('#settings')!,
    settingsButton: document.querySelector<HTMLButtonElement>('#settings-button')!,
    settingsClose: document.querySelector<HTMLButtonElement>('#settings-close')!,
    flicker: document.querySelector<HTMLInputElement>('#reduced-flicker')!,
    grain: document.querySelector<HTMLInputElement>('#grain')!,
    sensitivity: document.querySelector<HTMLInputElement>('#sensitivity')!,
    volume: document.querySelector<HTMLInputElement>('#volume')!,
    debug: document.querySelector<HTMLElement>('#debug')!,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.scene.background = new THREE.Color(0x11110d);
    this.scene.fog = new THREE.FogExp2(0xb3ab70, .013);
    this.scene.add(this.builder.group, this.threat);
    this.bind();
    this.restoreSettings();
    this.updateContinue();
    this.renderIdle();
  }

  private bind(): void {
    this.el.start.addEventListener('click', () => this.start(0));
    this.el.continue.addEventListener('click', () => { const save=this.readSave(); this.start(save?.chapter ?? 0); });
    this.el.rewind.addEventListener('click', () => { localStorage.removeItem(SAVE_KEY); location.reload(); });
    this.el.resume.addEventListener('click', () => this.resume());
    this.el.restartChapter.addEventListener('click', () => { this.el.pause.classList.add('hidden'); this.loadChapter(this.chapter, true); this.requestLock(); });
    this.el.settingsButton.addEventListener('click', () => this.el.settings.classList.remove('hidden'));
    this.el.settingsClose.addEventListener('click', () => this.el.settings.classList.add('hidden'));
    this.el.flicker.addEventListener('change', () => { this.reducedFlicker=this.el.flicker.checked;this.applySettings(); });
    this.el.grain.addEventListener('input', () => { this.grain=Number(this.el.grain.value);this.applySettings(); });
    this.el.sensitivity.addEventListener('input', () => { this.sensitivity=Number(this.el.sensitivity.value);this.applySettings(); });
    this.el.volume.addEventListener('input', () => { this.volume=Number(this.el.volume.value);this.audio.setVolume(this.volume);this.save(); });
    addEventListener('resize', () => this.resize());
    addEventListener('keydown', (e) => this.keyDown(e));
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('mousemove', (e) => this.mouseMove(e));
    document.addEventListener('pointerlockchange', () => this.pointerChanged());
    this.canvas.addEventListener('click', () => { if(this.started && !this.paused && !this.choiceOpen) this.requestLock(); });
    addEventListener('contextmenu', e => { if(this.started) e.preventDefault(); });
    addEventListener('beforeunload', () => this.save());
  }

  private async start(chapter: ChapterId): Promise<void> {
    await this.audio.start();
    this.el.menu.classList.add('hidden'); this.el.end.classList.add('hidden'); this.el.hud.classList.remove('hidden');
    this.started=true; this.paused=false; this.loadChapter(chapter, true); this.requestLock(); this.loop(performance.now());
  }

  private loadChapter(id: ChapterId, showCard = true): void {
    this.chapter=id;this.chapterElapsed=0;this.completed.clear();this.dialogueQueue=[];this.dialogueTimer=0;this.choiceOpen=false;this.chapterTransitioning=false;this.pendingReset=false;
    this.threatActive=false;this.threatReveal=0;this.threatStun=0;this.threatTrail=[];this.handprintReady=id===8;this.vhsDrop=false;
    this.world=this.builder.build(id);this.player.set(...this.world.spawn);this.yaw=this.world.yaw;this.pitch=0;this.velocity.set(0,0,0);this.stamina=100;this.stress=id===8?62:8;
    this.stepSurface=['async','showroom','therapy','facility'].includes(this.world.ambient)?'hard':'carpet';
    this.camera.position.copy(this.player);this.camera.rotation.order='YXZ';
    this.scene.background=new THREE.Color(this.backgroundFor(this.world.ambient));this.scene.fog=new THREE.FogExp2(this.fogFor(this.world.ambient),this.fogDensity(this.world.ambient));
    this.audio.setMood(this.world.ambient);this.audio.staticBurst(.08,.035);
    this.el.objective.textContent=this.world.objective;document.body.classList.toggle('vhs',this.world.vhs);document.body.classList.toggle('chase',id===8);document.body.classList.remove('signal-loss');
    this.buildThreat();
    if(showCard)this.showChapterCard();
    setTimeout(()=>this.enqueue(chapterIntros[id]),showCard?1600:300);
    this.save();
  }

  private buildThreat(): void {
    while(this.threat.children.length){const c=this.threat.children.pop()!;c.traverse(o=>{const m=o as THREE.Mesh;m.geometry?.dispose();if(m.material){(Array.isArray(m.material)?m.material:[m.material]).forEach(x=>x.dispose());}});}
    if(this.world.threat==='none')return;
    const cloth=new THREE.MeshStandardMaterial({color:0x241c17,roughness:.93});const skin=new THREE.MeshStandardMaterial({color:0x725d4b,roughness:.98});
    const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.58,1.75,7,12),cloth);torso.position.y=1.8;torso.scale.set(1.1,1.4,.78);this.threat.add(torso);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.43,16,12),skin);head.position.set(.1,3.58,.06);head.scale.set(1.2,.78,1);this.threat.add(head);
    for(const s of [-1,1]){const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.13,2.05,5,9),skin);arm.position.set(s*.78,2.0,0);arm.rotation.z=s*.17;this.threat.add(arm);const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.16,1.8,5,9),cloth);leg.position.set(s*.31,.45,0);this.threat.add(leg);}
    const hat=new THREE.Mesh(new THREE.ConeGeometry(.92,.38,3),cloth);hat.position.set(.1,4,.05);hat.rotation.y=Math.PI/2;this.threat.add(hat);
    const eyeMat=new THREE.MeshBasicMaterial({color:0xf1e6b2});for(const s of [-1,1]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.035,6,4),eyeMat);eye.position.set(s*.16,3.6,.38);this.threat.add(eye);}
    this.threat.scale.setScalar(this.world.threat==='chase'?1.18:.95);this.threat.visible=false;
    if(this.chapter===8)this.threatSpawn.set(0,0,20);else this.threatSpawn.set(0,0,-18);this.threat.position.copy(this.threatSpawn);
  }

  private loop = (now: number): void => {
    if(!this.started)return;const dt=Math.min(.05,(now-this.lastFrame)/1000||.016);this.lastFrame=now;
    if(!this.paused){this.elapsed+=dt;this.chapterElapsed+=dt;this.update(dt);}
    this.renderer.render(this.scene,this.camera);this.updateFps(dt);requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.interactionCooldown=Math.max(0,this.interactionCooldown-dt);this.dialogueTimer=Math.max(0,this.dialogueTimer-dt);this.threatStun=Math.max(0,this.threatStun-dt);this.threatReveal=Math.max(0,this.threatReveal-dt);
    this.updateDialogue();this.move(dt);this.updateInteractionPrompt();this.updateGoal();this.updateThreat(dt);this.builder.update(this.elapsed,this.reducedFlicker,this.chapter===8?1.12:1);
    this.el.timecode.textContent=this.formatTime(this.elapsed);this.el.stamina.textContent=String(Math.round(this.stamina));this.el.stress.textContent=String(Math.round(this.stress));
    document.documentElement.style.setProperty('--stress',String(this.stress/100));
    if(this.chapter===1){const breakers=['breaker-a','breaker-b','breaker-c'].filter(x=>this.completed.has(x)).length;this.builder.setFixtureFactor(.35+breakers*.2);}
  }

  private move(dt: number): void {
    if(this.choiceOpen||this.chapterTransitioning)return;
    const forward=(this.keys.has('KeyW')?1:0)-(this.keys.has('KeyS')?1:0),side=(this.keys.has('KeyD')?1:0)-(this.keys.has('KeyA')?1:0);
    const moving=Math.hypot(forward,side)>0;const sprint=this.keys.has('ShiftLeft')&&moving&&this.stamina>4;const crouch=this.keys.has('ControlLeft')||this.keys.has('KeyC');
    const maxSpeed=crouch?2.05:sprint?5.75:3.45;const dir=new THREE.Vector3();
    if(moving){dir.set(side,0,-forward).normalize().applyAxisAngle(new THREE.Vector3(0,1,0),this.yaw);}
    this.velocity.x=THREE.MathUtils.damp(this.velocity.x,dir.x*maxSpeed,moving?13:9,dt);this.velocity.z=THREE.MathUtils.damp(this.velocity.z,dir.z*maxSpeed,moving?13:9,dt);
    const nx=this.player.x+this.velocity.x*dt,nz=this.player.z+this.velocity.z*dt;
    if(this.builder.canStand(nx,this.player.z)){this.player.x=nx;}else this.velocity.x=0;
    if(this.builder.canStand(this.player.x,nz)){this.player.z=nz;}else this.velocity.z=0;
    if(sprint)this.stamina=Math.max(0,this.stamina-dt*14);else this.stamina=Math.min(100,this.stamina+dt*(moving?7:11));
    const speed=Math.hypot(this.velocity.x,this.velocity.z);this.audio.footstep(speed,this.stepSurface);
    const bob=moving?Math.sin(this.elapsed*(sprint?12:8.5))*Math.min(.045,speed*.009):0;const lean=(this.keys.has('KeyQ')?-1:0)+(this.keys.has('KeyE')&&this.interactionCooldown>0?0:this.keys.has('KeyE')?1:0);
    const targetY=crouch?1.18:1.65;this.player.y=THREE.MathUtils.damp(this.player.y,targetY,12,dt);this.camera.position.set(this.player.x,this.player.y+bob,this.player.z);this.camera.rotation.set(this.pitch,this.yaw,lean*.055,'YXZ');
    if(speed>.3){this.threatTrail.push({p:this.player.clone(),t:this.chapterElapsed});if(this.threatTrail.length>420)this.threatTrail.shift();}
  }

  private updateInteractionPrompt(): void {
    if(this.choiceOpen||this.chapterTransitioning){this.el.prompt.textContent='';return;}
    const i=this.nearestInteractable();if(!i){this.el.prompt.textContent=this.chapter===8&&this.handprintReady?'SPACE  STRIKE WITH HANDPRINT':'';return;}
    this.el.prompt.textContent=i.prompt;
  }

  private nearestInteractable(): Interactable|undefined {
    let best:Interactable|undefined,bestD=Infinity;
    for(const i of this.world.interactables){if(i.once&&this.completed.has(i.id))continue;const mesh=i.meshName?this.builder.group.getObjectByName(i.meshName):undefined;if(mesh&&!mesh.visible)continue;const d=this.player.distanceTo(new THREE.Vector3(...i.position));if(d<(i.radius??2)&&d<bestD){best=i;bestD=d;}}
    return best;
  }

  private interact(): void {
    if(this.interactionCooldown>0||this.choiceOpen||this.chapterTransitioning)return;const i=this.nearestInteractable();if(!i)return;
    if(!this.allowed(i.id)){this.enqueue([{text:this.lockedMessage(i.id)}]);this.audio.hit('switch');return;}
    this.interactionCooldown=.28;this.completed.add(i.id);this.audio.hit(i.id.includes('camera')?'tape':i.id.includes('door')||i.id.includes('portal')?'door':i.id.includes('proof')||i.id==='handprint'?'pickup':'switch');
    const mesh=i.meshName?this.builder.group.getObjectByName(i.meshName):undefined;if(mesh&&i.once&&!['portal','return-portal','mary-portal','kingdom-door','gas-valve','observation','interview','final-threshold'].includes(i.id))mesh.visible=false;
    this.enqueue(interactions[i.id]??[]);this.handleInteraction(i.id);this.save();
  }

  private allowed(id:string):boolean {
    if(id==='breaker-b')return this.completed.has('breaker-a');if(id==='breaker-c')return this.completed.has('breaker-b');if(id==='portal')return this.completed.has('breaker-c');
    if(id==='return-portal')return this.completed.has('proof-object');if(id==='rope')return this.completed.has('camera-check');if(id==='threshold')return this.completed.has('rope');
    if(id==='mary-portal')return this.completed.has('handprint');if(id==='kingdom-door')return this.completed.has('dinner');if(id==='gas-valve')return this.chapterElapsed>6;
    if(id==='final-threshold')return this.completed.has('interview');return true;
  }

  private lockedMessage(id:string):string {
    if(id.startsWith('breaker'))return 'The previous circuit is still dead.';if(id==='portal')return 'The seam is dark.';if(id==='return-portal')return 'You need proof first.';if(id==='rope')return 'Check the camera before going down.';if(id==='threshold')return 'The rope is not secured.';if(id==='mary-portal')return 'You cannot leave the handprint behind.';if(id==='kingdom-door')return 'Clark blocks the way.';if(id==='gas-valve')return 'Not yet. Keep moving.';if(id==='final-threshold')return 'Phil is waiting for the interview.';return 'Not yet.';
  }

  private handleInteraction(id:string):void {
    if(id==='survey-console'){this.el.objective.textContent='Return to the red boundary marker.';this.revealThreat(1.1);}
    if(id==='breaker-c'){const portal=this.builder.group.getObjectByName('interact:portal');if(portal)portal.visible=true;this.el.objective.textContent='Investigate the light behind the wall.';}
    if(id==='portal')this.transition(2);
    if(id==='proof-object')this.el.objective.textContent='Take the duplicate back to the showroom.';
    if(id==='return-portal')this.transition(3);
    if(id==='therapy-seat')this.openChoice('What do you tell Mary?',therapyChoices,()=>this.transition(4));
    if(id==='rope'){this.el.objective.textContent='Descend and inspect the lower room.';this.player.z=-11.5;this.player.x=0;this.audio.staticBurst(.25,.09);}
    if(id==='threshold'){this.revealThreat(1.5);this.vhsDrop=true;document.body.classList.add('signal-loss');this.el.objective.textContent='GET BACK TO THE ROPE';this.audio.hit('danger');setTimeout(()=>this.transition(5),3000);}
    if(id==='kat-voice')this.el.objective.textContent='Follow the red service corridor.';
    if(id==='handprint'){this.handprintReady=true;this.el.objective.textContent='Enter Clark’s impossible doorway.';}
    if(id==='mary-portal'){this.player.set(7.7,1.65,-12);this.yaw=-Math.PI/2;this.audio.staticBurst(.18,.07);this.el.objective.textContent='The rooms are using your memories. Keep moving.';}
    if(id==='dinner')this.openChoice('Mary refuses to play along. What does she say?',dinnerChoices,()=>{this.el.objective.textContent='Make Clark open the back door.';});
    if(id==='kingdom-door'){this.revealThreat(1.8);this.audio.hit('danger');setTimeout(()=>this.transition(8),2200);}
    if(id==='weapon-check')this.handprintReady=true;
    if(id==='gas-valve'){this.threatStun=5;this.audio.hit('stun');document.body.classList.add('signal-loss');setTimeout(()=>document.body.classList.remove('signal-loss'),850);this.el.objective.textContent='Reach the Async breach team.';}
    if(id==='observation')this.revealThreat(.8);
    if(id==='interview')this.el.objective.textContent='Follow Phil to the controlled threshold.';
    if(id==='final-threshold')this.finishCampaign();
  }

  private updateGoal():void {
    if(!this.world.goal||this.chapterTransitioning)return;const d=this.player.distanceTo(new THREE.Vector3(...this.world.goal));if(d>(this.world.goalRadius??2))return;
    if(this.chapter===0&&this.completed.has('survey-console'))this.transition(1);
    if(this.chapter===5&&this.completed.has('kat-voice'))this.transition(6);
    if(this.chapter===6&&this.completed.has('mary-portal'))this.transition(7);
    if(this.chapter===8&&this.completed.has('gas-valve'))this.transition(9);
  }

  private updateThreat(dt:number):void {
    if(this.world.threat==='none')return;
    if(this.world.threat==='glimpse'){
      if(!this.threat.visible&&this.threatReveal<=0&&this.chapterElapsed>10&&this.chapterElapsed<11.2)this.revealThreat(.75);
      if(this.threatReveal<=0)this.threat.visible=false;else{this.threat.visible=true;this.threat.lookAt(this.player.x,this.threat.position.y,this.player.z);}return;
    }
    if(this.chapterElapsed>2.3)this.threatActive=true;if(!this.threatActive)return;this.threat.visible=true;
    const delay=this.threatStun>0?5.2:2.15;let target:THREE.Vector3|undefined;
    for(let i=this.threatTrail.length-1;i>=0;i--){if(this.chapterElapsed-this.threatTrail[i].t>delay){target=this.threatTrail[i].p;break;}}
    target??=this.player;const dir=target.clone().sub(this.threat.position);dir.y=0;const dist=dir.length();if(dist>.05){dir.normalize();const speed=this.threatStun>0?1.0:4.65+Math.min(1.35,this.chapterElapsed*.015);this.threat.position.addScaledVector(dir,speed*dt);this.threat.lookAt(this.player.x,1.8,this.player.z);}
    const bob=Math.abs(Math.sin(this.elapsed*7))*0.08;this.threat.position.y=bob;
    const playerDist=this.threat.position.distanceTo(new THREE.Vector3(this.player.x,0,this.player.z));this.stress=THREE.MathUtils.damp(this.stress,Math.max(45,100-playerDist*4.5),3.5,dt);
    if(playerDist<1.25&&this.threatStun<=0)this.caught();
  }

  private strike():void {
    if(this.chapter!==8||!this.handprintReady||this.threatStun>0)return;const d=this.threat.position.distanceTo(new THREE.Vector3(this.player.x,0,this.player.z));if(d<3.3){this.threatStun=2.2;this.audio.hit('stun');this.stress=Math.max(35,this.stress-18);this.el.subtitle.innerHTML='<b>MARY</b>  MOVE.';this.dialogueTimer=1.1;this.threat.position.add(new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),this.yaw).multiplyScalar(1.4));}else{this.audio.hit('switch');}
  }

  private caught():void {
    if(this.pendingReset)return;this.pendingReset=true;this.audio.hit('danger');this.audio.staticBurst(.8,.25);document.body.classList.add('signal-loss');this.el.subtitle.innerHTML='<b>TAPE ERROR</b>  SUBJECT LOST';
    setTimeout(()=>{document.body.classList.remove('signal-loss');this.loadChapter(8,false);this.requestLock();},1300);
  }

  private revealThreat(seconds:number):void {
    if(this.world.threat==='none')return;this.threat.position.copy(this.world.threat==='chase'?new THREE.Vector3(0,0,19):this.threatSpawn);this.threat.visible=true;this.threatReveal=seconds;this.audio.staticBurst(Math.min(.5,seconds),.12);this.stress=Math.min(100,this.stress+18);
  }

  private openChoice(prompt:string,choices:Choice[],done:()=>void):void {
    this.choiceOpen=true;this.choiceCallback=done;this.el.choicePrompt.textContent=prompt;this.el.choiceButtons.innerHTML='';this.el.choices.classList.remove('hidden');document.exitPointerLock?.();
    choices.forEach((choice,index)=>{const b=document.createElement('button');b.textContent=`${index+1}. ${choice.label}`;b.addEventListener('click',()=>this.selectChoice(choice));this.el.choiceButtons.appendChild(b);});
  }

  private selectChoice(choice:Choice):void {
    if(!this.choiceOpen)return;this.choiceOpen=false;this.el.choices.classList.add('hidden');this.enqueue(choice.response);const cb=this.choiceCallback;this.choiceCallback=undefined;setTimeout(()=>{cb?.();if(this.started&&!this.chapterTransitioning)this.requestLock();},Math.max(1200,choice.response.length*1500));
  }

  private enqueue(beats:Beat[]):void {if(!beats.length)return;this.dialogueQueue.push(...beats);if(this.dialogueTimer<=0)this.updateDialogue(true);}

  private updateDialogue(force=false):void {
    if(!force&&this.dialogueTimer>0)return;if(!this.dialogueQueue.length){if(this.dialogueTimer<=0)this.el.subtitle.textContent='';return;}
    const beat=this.dialogueQueue.shift()!;this.el.subtitle.innerHTML=beat.speaker?`<b>${this.escape(beat.speaker)}</b>  ${this.escape(beat.text)}`:this.escape(beat.text);this.dialogueTimer=Math.min(4.6,2.25+beat.text.length*.025);if(beat.danger){this.audio.staticBurst(.24,.11);this.stress=Math.min(100,this.stress+12);}
  }

  private transition(next:number):void {
    if(this.chapterTransitioning)return;this.chapterTransitioning=true;this.save();document.body.classList.add('cut');this.el.prompt.textContent='';setTimeout(()=>{document.body.classList.remove('cut');this.loadChapter(clampChapter(next),true);this.requestLock();},950);
  }

  private finishCampaign():void {
    if(this.chapterTransitioning)return;this.chapterTransitioning=true;this.audio.staticBurst(.7,.15);document.body.classList.add('cut');
    setTimeout(()=>{this.started=false;document.exitPointerLock?.();this.el.hud.classList.add('hidden');this.el.end.classList.remove('hidden');document.body.classList.remove('cut','vhs','chase');localStorage.removeItem(SAVE_KEY);this.renderer.render(this.scene,this.camera);},1200);
  }

  private showChapterCard():void {
    this.el.chapterKicker.textContent=this.world.kicker;this.el.chapterTitle.textContent=this.world.title;this.el.chapterCard.classList.remove('hidden');setTimeout(()=>this.el.chapterCard.classList.add('hidden'),1500);
  }

  private keyDown(e:KeyboardEvent):void {
    this.keys.add(e.code);
    if(e.code==='KeyE'&&!e.repeat){this.interactionCooldown=.001;this.interact();}
    if(e.code==='Space'&&!e.repeat){e.preventDefault();this.strike();}
    if(e.code==='KeyF'&&!e.repeat){this.reducedFlicker=!this.reducedFlicker;this.el.flicker.checked=this.reducedFlicker;this.applySettings();this.enqueue([{text:`Fluorescent flicker ${this.reducedFlicker?'reduced':'enabled'}.`}]);}
    if(e.code==='F3'&&!e.repeat){e.preventDefault();this.debug=!this.debug;this.el.debug.classList.toggle('hidden',!this.debug);}
    if(this.debug&&e.altKey&&/^Digit\d$/.test(e.code)){const n=Number(e.code.slice(-1));if(n<CHAPTER_COUNT)this.loadChapter(n as ChapterId,true);}
    if(this.choiceOpen&&/^Digit[123]$/.test(e.code)){const b=this.el.choiceButtons.children[Number(e.code.slice(-1))-1] as HTMLButtonElement|undefined;b?.click();}
  }

  private mouseMove(e:MouseEvent):void {
    if(document.pointerLockElement!==this.canvas||this.paused||this.choiceOpen)return;this.yaw-=e.movementX*this.sensitivity;this.pitch-=e.movementY*this.sensitivity;this.pitch=THREE.MathUtils.clamp(this.pitch,-1.42,1.42);
  }

  private pointerChanged():void {
    if(!this.started||this.choiceOpen||this.chapterTransitioning)return;const locked=document.pointerLockElement===this.canvas;if(!locked&&!this.pendingReset){this.paused=true;this.el.pause.classList.remove('hidden');}else if(locked){this.paused=false;this.el.pause.classList.add('hidden');}
  }

  private resume():void {this.el.pause.classList.add('hidden');this.paused=false;this.requestLock();}
  private requestLock():void {if(document.pointerLockElement!==this.canvas)this.canvas.requestPointerLock?.();}

  private resize():void {this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));}

  private restoreSettings():void {const s=this.readSave();if(!s)return;this.reducedFlicker=s.reducedFlicker;this.grain=s.grain;this.sensitivity=s.sensitivity;this.volume=s.volume;this.el.flicker.checked=this.reducedFlicker;this.el.grain.value=String(this.grain);this.el.sensitivity.value=String(this.sensitivity);this.el.volume.value=String(this.volume);this.applySettings();}
  private applySettings():void {document.documentElement.style.setProperty('--grain-alpha',String(this.grain));document.body.classList.toggle('reduced-flicker',this.reducedFlicker);this.save();}
  private save():void {if(!this.started&&this.chapter===0)return;const s:SaveState={chapter:this.chapter,completed:[...this.completed],reducedFlicker:this.reducedFlicker,grain:this.grain,sensitivity:this.sensitivity,volume:this.volume};localStorage.setItem(SAVE_KEY,JSON.stringify(s));this.updateContinue();}
  private readSave():SaveState|undefined {try{const raw=localStorage.getItem(SAVE_KEY);return raw?JSON.parse(raw) as SaveState:undefined;}catch{return undefined;}}
  private updateContinue():void {const s=this.readSave();this.el.continue.classList.toggle('hidden',!s);if(s)this.el.continue.textContent=`CONTINUE // CHAPTER ${s.chapter}`;}

  private backgroundFor(m:ChapterWorld['ambient']):number {return ({async:0x30322f,showroom:0x302820,yellow:0xa9a264,therapy:0x443a31,memory:0x514b3c,kingdom:0x2f251d,chase:0x241c18,facility:0x89918d})[m];}
  private fogFor(m:ChapterWorld['ambient']):number {return ({async:0x777b75,showroom:0x8b765e,yellow:0xb8b06b,therapy:0x75695c,memory:0x8f856b,kingdom:0x6e5943,chase:0x6d4d39,facility:0xb7c1bc})[m];}
  private fogDensity(m:ChapterWorld['ambient']):number {return m==='yellow'?.016:m==='chase'?.02:m==='facility'?.008:.012;}
  private formatTime(sec:number):string {const s=Math.floor(sec)%60,m=Math.floor(sec/60)%60,h=Math.floor(sec/3600);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
  private escape(s:string):string {return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]!));}
  private updateFps(dt:number):void {if(!this.debug)return;this.fpsSamples.push(1/Math.max(.001,dt));if(this.fpsSamples.length>40)this.fpsSamples.shift();const fps=this.fpsSamples.reduce((a,b)=>a+b,0)/this.fpsSamples.length;this.el.debug.textContent=`F3 DIAGNOSTICS\nFPS ${fps.toFixed(0)}\nChapter ${this.chapter} / ${this.world?.title??'-'}\nDraw calls ${this.renderer.info.render.calls}\nTriangles ${this.renderer.info.render.triangles}\nObjects ${this.scene.children.length}\nPlayer ${this.player.x.toFixed(1)}, ${this.player.z.toFixed(1)}\nThreat ${this.world?.threat??'none'} ${this.threatActive?'ACTIVE':''}\nALT+0..9 chapter warp`;}
  private renderIdle():void {this.scene.background=new THREE.Color(0x17170f);const light=new THREE.AmbientLight(0x8b876a,1.2);this.scene.add(light);this.camera.position.set(0,1.6,5);this.renderer.render(this.scene,this.camera);this.scene.remove(light);}
}

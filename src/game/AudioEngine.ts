export type AudioMood = 'async' | 'showroom' | 'yellow' | 'therapy' | 'memory' | 'kingdom' | 'chase' | 'facility';

export class AudioEngine {
  private ctx?: AudioContext;
  private master?: GainNode;
  private hum?: GainNode;
  private humOsc?: OscillatorNode;
  private buzzOsc?: OscillatorNode;
  private noise?: AudioBufferSourceNode;
  private noiseGain?: GainNode;
  private volume = .72;
  private stepGate = 0;

  async start(): Promise<void> {
    if (!this.ctx) this.create();
    if (this.ctx?.state === 'suspended') await this.ctx.resume();
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    this.master?.gain.setTargetAtTime(this.volume, this.ctx?.currentTime ?? 0, .03);
  }

  setMood(mood: AudioMood): void {
    if (!this.ctx || !this.hum || !this.noiseGain || !this.humOsc || !this.buzzOsc) return;
    const settings: Record<AudioMood, [number, number, number, number]> = {
      async: [57, 116, .045, .012], showroom: [60, 120, .022, .006], yellow: [59.7, 119.4, .075, .018], therapy: [52, 104, .009, .003],
      memory: [59.4, 118.8, .055, .028], kingdom: [56, 112, .038, .021], chase: [60, 121, .095, .06], facility: [60, 120, .028, .01],
    };
    const [a,b,g,n] = settings[mood]; const t=this.ctx.currentTime;
    this.humOsc.frequency.setTargetAtTime(a,t,.2);this.buzzOsc.frequency.setTargetAtTime(b,t,.2);this.hum.gain.setTargetAtTime(g,t,.25);this.noiseGain.gain.setTargetAtTime(n,t,.25);
  }

  footstep(speed: number, surface: 'carpet'|'hard' = 'carpet'): void {
    if (!this.ctx || !this.master || speed < .3) return;
    const now = this.ctx.currentTime; const spacing = Math.max(.22, .48 - speed * .025);
    if (now < this.stepGate) return; this.stepGate = now + spacing;
    const osc=this.ctx.createOscillator(), gain=this.ctx.createGain(), filter=this.ctx.createBiquadFilter();
    osc.type='triangle';osc.frequency.setValueAtTime(surface==='carpet'?72:115,now);osc.frequency.exponentialRampToValueAtTime(42,now+.055);
    filter.type='lowpass';filter.frequency.value=surface==='carpet'?420:980;
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(surface==='carpet'?.028:.045,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.09);
    osc.connect(filter).connect(gain).connect(this.master);osc.start(now);osc.stop(now+.1);
  }

  hit(kind: 'switch'|'pickup'|'door'|'stun'|'danger'|'tape'|'success'): void {
    if (!this.ctx || !this.master) return; const now=this.ctx.currentTime;
    const ranges: Record<typeof kind,[number,number,number]>={switch:[180,92,.07],pickup:[420,620,.09],door:[105,58,.16],stun:[72,33,.24],danger:[48,24,.38],tape:[860,240,.12],success:[350,520,.16]};
    const [a,b,d]=ranges[kind];const osc=this.ctx.createOscillator(),g=this.ctx.createGain();osc.type=kind==='danger'?'sawtooth':'triangle';osc.frequency.setValueAtTime(a,now);osc.frequency.exponentialRampToValueAtTime(b,now+d);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(kind==='danger'?.12:.075,now+.01);g.gain.exponentialRampToValueAtTime(.0001,now+d);osc.connect(g).connect(this.master);osc.start();osc.stop(now+d+.02);
  }

  staticBurst(duration=.18, amount=.12): void {
    if (!this.ctx || !this.master) return;const src=this.ctx.createBufferSource();src.buffer=this.noiseBuffer(this.ctx,Math.max(.2,duration));const g=this.ctx.createGain();const filter=this.ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=2600;filter.Q.value=.7;const now=this.ctx.currentTime;g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(amount,now+.01);g.gain.exponentialRampToValueAtTime(.0001,now+duration);src.connect(filter).connect(g).connect(this.master);src.start();src.stop(now+duration+.02);
  }

  private create(): void {
    this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=this.volume;this.master.connect(this.ctx.destination);
    this.hum=this.ctx.createGain();this.hum.gain.value=.04;const low=this.ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=320;this.hum.connect(low).connect(this.master);
    this.humOsc=this.ctx.createOscillator();this.humOsc.type='sine';this.humOsc.frequency.value=60;this.humOsc.connect(this.hum);this.humOsc.start();
    this.buzzOsc=this.ctx.createOscillator();this.buzzOsc.type='triangle';this.buzzOsc.frequency.value=120;const buzzGain=this.ctx.createGain();buzzGain.gain.value=.018;this.buzzOsc.connect(buzzGain).connect(this.hum);this.buzzOsc.start();
    this.noise=this.ctx.createBufferSource();this.noise.buffer=this.noiseBuffer(this.ctx,2);this.noise.loop=true;this.noiseGain=this.ctx.createGain();this.noiseGain.gain.value=.01;const band=this.ctx.createBiquadFilter();band.type='bandpass';band.frequency.value=1750;band.Q.value=.35;this.noise.connect(band).connect(this.noiseGain).connect(this.master);this.noise.start();
  }

  private noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*seconds),ctx.sampleRate);const d=b.getChannelData(0);let last=0;for(let i=0;i<d.length;i++){const white=Math.random()*2-1;last=last*.86+white*.14;d[i]=last;}return b;
  }
}

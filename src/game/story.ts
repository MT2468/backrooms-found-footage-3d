import type { ChapterId } from './types';

export interface Beat { speaker?: string; text: string; danger?: boolean; }
export interface Choice { label: string; response: Beat[]; }

export const chapterIntros: Record<ChapterId, Beat[]> = {
  0: [{speaker:'ASYNC CONTROL',text:'Survey Six, maintain visual contact with the red markers.'},{text:'A fluorescent buzz rolls through a place that should not exist.'}],
  1: [{speaker:'CLARK',text:'Third time tonight. If the freezer killed another circuit, I am selling the freezer.'}],
  2: [{speaker:'CLARK',text:'Same carpet. Same walls. No windows. No building can be this deep.'}],
  3: [{speaker:'MARY',text:'You brought a shoe to therapy, Clark.'},{speaker:'CLARK',text:'I brought proof.'}],
  4: [{speaker:'BOBBY',text:'Tape is rolling.'},{speaker:'KAT',text:'Then keep it pointed forward.'}],
  5: [{speaker:'KAT',text:'Clark? Bobby?'},{text:'Her voice arrives from the wrong side of the wall.'}],
  6: [{speaker:'MARY',text:'Three days. No calls. No Clark.'},{text:'The handprint is heavier than you remember.'}],
  7: [{speaker:'CLARK',text:'I stopped looking for the exit. That was when it started showing me things.'}],
  8: [{speaker:'CLARK',text:'Mary, do not move.'},{text:'Something wearing Clark’s old advertisement stands where the wall was.',danger:true}],
  9: [{speaker:'PHIL',text:'You were recovered forty-six meters from Threshold Two.'},{speaker:'MARY',text:'There are no meters in there.'}],
};

export const interactions: Record<string, Beat[]> = {
  'survey-console':[{speaker:'ASYNC CONTROL',text:'Anomaly logged. Signal degradation increasing.'},{text:'Something knocks once behind you.',danger:true}],
  'breaker-a':[{speaker:'CLARK',text:'Aisles one and two.'}],
  'breaker-b':[{speaker:'CLARK',text:'Showroom signage.'}],
  'breaker-c':[{speaker:'CLARK',text:'Basement lights… wait.'},{text:'A clean bar of yellow light leaks through solid plaster.'}],
  'portal':[{speaker:'CLARK',text:'That is not a crack.'}],
  'wrong-sign':[{speaker:'CLARK',text:'It copied the word. It did not understand it.'}],
  'proof-object':[{speaker:'CLARK',text:'My shoe. Except I am wearing both of mine.'}],
  'return-portal':[{speaker:'CLARK',text:'Mary is going to see this.'}],
  'camera-check':[{speaker:'BOBBY',text:'Battery full. Forty-three minutes on the tape.'},{speaker:'CLARK',text:'Do not stop recording.'}],
  'rope':[{speaker:'KAT',text:'We lower you. We do not drop you.'},{speaker:'BOBBY',text:'Fantastic distinction.'}],
  'threshold':[{speaker:'BOBBY',text:'There is something standing past the clothes.'},{speaker:'CLARK',text:'Bobby, come back up. Now.'},{text:'The rope snaps tight in the wrong direction.',danger:true}],
  'lost-camera':[{text:'The camera is still recording. The timecode is impossible.'}],
  'kat-voice':[{speaker:'CLARK',text:'KAT!'},{speaker:'KAT',text:'I can hear you. I cannot find the door.'},{text:'The answer repeats several rooms away, perfectly identical.'}],
  'handprint':[{speaker:'MARY',text:'Mom kept the windows covered. I kept this.'}],
  'mary-portal':[{speaker:'MARY',text:'Clark, if this is another performance…'},{text:'The wall accepts your hand.'}],
  'dinner':[{speaker:'CLARK',text:'Sit. We can finish the session here. It remembers the important parts.'}],
  'kingdom-door':[{speaker:'MARY',text:'Clark, what is behind that door?'},{speaker:'CLARK',text:'Something it made from me.'}],
  'weapon-check':[{speaker:'MARY',text:'Concrete. Real weight. Real edge.'}],
  'gas-valve':[{text:'The valve screams open. Gas floods the service room.',danger:true}],
  'observation':[{speaker:'PHIL',text:'We contained the larger specimen.'},{speaker:'MARY',text:'That is not a specimen. That is a mistake it learned.'}],
  'interview':[{speaker:'PHIL',text:'Async built imaging hardware before Threshold One. Then we found a better image.'},{speaker:'MARY',text:'It is not an image. It is remembering us.'}],
  'final-threshold':[{speaker:'PHIL',text:'We need you to identify one room.'},{speaker:'MARY',text:'No. You need it to stop identifying me.'}],
};

export const therapyChoices: Choice[] = [
  {label:'Show Mary the duplicate shoe',response:[{speaker:'CLARK',text:'The stitching is mine. The wear is mine. It made another one.'},{speaker:'MARY',text:'Then tell me what you want the object to prove about you.'}]},
  {label:'Describe the endless rooms',response:[{speaker:'CLARK',text:'Every turn feels designed, but nothing has a destination.'},{speaker:'MARY',text:'That sounds familiar.'}]},
  {label:'Insist that Mary come see it',response:[{speaker:'CLARK',text:'You think this is metaphor because metaphor is safer.'},{speaker:'MARY',text:'And you think discovery erases responsibility.'}]},
];

export const dinnerChoices: Choice[] = [
  {label:'“This is not your home.”',response:[{speaker:'MARY',text:'You arranged a room until it stopped contradicting you.'},{speaker:'CLARK',text:'I arranged what it gave me.'}]},
  {label:'Ask about the Still Lifes',response:[{speaker:'MARY',text:'Those people are not people.'},{speaker:'CLARK',text:'They are close enough when they do not leave.'}]},
  {label:'Refuse the role-play',response:[{speaker:'MARY',text:'I will not play your wife. I will not give you the line you want.'},{text:'For the first time, Clark looks afraid of the room.'}]},
];

import * as THREE from 'three';
import { Campaign } from './Campaign';
import { WorldBuilder } from './WorldBuilder';
import { chapterIntros, dinnerChoices, interactions, therapyChoices, type Beat, type Choice } from './story';
import type { ChapterId, ChapterWorld } from './types';

const chapterMeta: Record<ChapterId, { title: string; kicker: string; objective: string }> = {
  0: { title: 'PESQUISA ASYNC 06', kicker: 'FITA // 00', objective: 'Chegue à estação de pesquisa marcada.' },
  1: { title: "IMPÉRIO DE PUFFS DO CAPITÃO CLARK", kicker: '1990 // APÓS O EXPEDIENTE', objective: 'Restaure a energia do subsolo.' },
  2: { title: 'PRIMEIRA ENTRADA', kicker: 'SEM ENDEREÇO // SEM SAÍDA', objective: 'Encontre algo que não deveria estar aqui.' },
  3: { title: 'DRA. MARY KLINE', kicker: 'SESSÃO // GRAVADA', objective: 'Sente-se e conte a Mary o que você encontrou.' },
  4: { title: 'A EXPEDIÇÃO', kicker: 'VHS // BOBBY', objective: 'Mantenha a câmera gravando.' },
  5: { title: 'SEPARAÇÃO', kicker: 'FITA DANIFICADA', objective: 'Siga a voz de Kat.' },
  6: { title: 'MARY', kicker: 'BUSCA // DIA 3', objective: 'Pegue a marca de mão. Encontre Clark.' },
  7: { title: 'O REINO DE CLARK', kicker: 'SEM RELÓGIOS // SEM JANELAS', objective: 'Encontre Clark na casa falsificada.' },
  8: { title: 'PIRATA CLARK', kicker: 'CORRA // NÃO OLHE PARA TRÁS', objective: 'Corra. Use ESPAÇO para golpeá-lo quando ele chegar perto.' },
  9: { title: 'ASYNC', kicker: 'RECUPERAÇÃO // INTERROGATÓRIO', objective: 'Atravesse a ala de observação.' },
};

const promptById: Record<string, string> = {
  'survey-console': 'E  REGISTRAR ANOMALIA',
  'breaker-a': 'E  REARMAR DISJUNTOR A',
  'breaker-b': 'E  REARMAR DISJUNTOR B',
  'breaker-c': 'E  REARMAR DISJUNTOR C',
  'portal': 'E  TOCAR A LUZ',
  'wrong-sign': 'E  EXAMINAR PLACA',
  'proof-object': 'E  PEGAR O SAPATO IMPOSSÍVEL',
  'return-portal': 'E  VOLTAR',
  'therapy-seat': 'E  SENTAR',
  'camera-check': 'E  VERIFICAR CÂMERA',
  'rope': 'E  PRENDER-SE À CORDA',
  'threshold': 'E  APONTAR A CÂMERA PARA A ESCURIDÃO',
  'lost-camera': 'E  PEGAR A CÂMERA',
  'kat-voice': 'E  CHAMAR POR KAT',
  'handprint': 'E  PEGAR A MARCA DE MÃO DE CONCRETO',
  'mary-portal': 'E  ATRAVESSAR',
  'dinner': 'E  SENTAR-SE COM CLARK',
  'kingdom-door': 'E  ABRIR A PORTA DOS FUNDOS',
  'weapon-check': 'E  SEGURAR A MARCA DE MÃO',
  'gas-valve': 'E  ABRIR A VÁLVULA DE GÁS',
  'observation': 'E  OLHAR PELO VIDRO',
  'interview': 'E  SENTAR PARA O INTERROGATÓRIO',
  'final-threshold': 'E  ENTRAR NO LIMIAR CONTROLADO',
};

const uiText: Record<string, string> = {
  'Return to the red boundary marker.': 'Retorne à marcação vermelha do limite.',
  'Investigate the light behind the wall.': 'Investigue a luz atrás da parede.',
  'Take the duplicate back to the showroom.': 'Leve a cópia de volta ao showroom.',
  'What do you tell Mary?': 'O que você diz a Mary?',
  'Descend and inspect the lower room.': 'Desça e investigue a sala inferior.',
  'GET BACK TO THE ROPE': 'VOLTE PARA A CORDA',
  'Follow the red service corridor.': 'Siga o corredor de serviço vermelho.',
  'Enter Clark’s impossible doorway.': 'Entre pela passagem impossível de Clark.',
  'The rooms are using your memories. Keep moving.': 'As salas estão usando suas memórias. Continue andando.',
  'Mary refuses to play along. What does she say?': 'Mary se recusa a participar. O que ela diz?',
  'Make Clark open the back door.': 'Faça Clark abrir a porta dos fundos.',
  'Reach the Async breach team.': 'Chegue até a equipe de incursão da Async.',
  'Follow Phil to the controlled threshold.': 'Siga Phil até o limiar controlado.',
  'The previous circuit is still dead.': 'O circuito anterior ainda está desligado.',
  'The seam is dark.': 'A fissura continua escura.',
  'You need proof first.': 'Você precisa de uma prova primeiro.',
  'Check the camera before going down.': 'Verifique a câmera antes de descer.',
  'The rope is not secured.': 'A corda ainda não está presa.',
  'You cannot leave the handprint behind.': 'Você não pode deixar a marca de mão para trás.',
  'Clark blocks the way.': 'Clark bloqueia o caminho.',
  'Not yet. Keep moving.': 'Ainda não. Continue andando.',
  'Phil is waiting for the interview.': 'Phil está esperando pelo interrogatório.',
  'Not yet.': 'Ainda não.',
  'SPACE  STRIKE WITH HANDPRINT': 'ESPAÇO  GOLPEAR COM A MARCA DE MÃO',
  'Fluorescent flicker reduced.': 'Cintilação fluorescente reduzida.',
  'Fluorescent flicker enabled.': 'Cintilação fluorescente ativada.',
  'CONTINUE': 'CONTINUAR',
  'TAPE ERROR': 'ERRO DE FITA',
  'SUBJECT LOST': 'SUJEITO PERDIDO',
  'MOVE.': 'CORRA.',
};

function setStory(): void {
  const intros: Record<ChapterId, Beat[]> = {
    0: [{ speaker: 'CONTROLE ASYNC', text: 'Pesquisa Seis, mantenha contato visual com as marcações vermelhas.' }, { text: 'O zumbido fluorescente percorre um lugar que não deveria existir.' }],
    1: [{ speaker: 'CLARK', text: 'Terceira vez hoje. Se o freezer derrubou outro circuito, eu vou vender esse freezer.' }],
    2: [{ speaker: 'CLARK', text: 'Mesmo carpete. Mesmas paredes. Nenhuma janela. Nenhum prédio pode ser tão fundo.' }],
    3: [{ speaker: 'MARY', text: 'Você trouxe um sapato para a terapia, Clark.' }, { speaker: 'CLARK', text: 'Eu trouxe uma prova.' }],
    4: [{ speaker: 'BOBBY', text: 'A fita está gravando.' }, { speaker: 'KAT', text: 'Então mantenha a câmera apontada para a frente.' }],
    5: [{ speaker: 'KAT', text: 'Clark? Bobby?' }, { text: 'A voz dela vem do lado errado da parede.' }],
    6: [{ speaker: 'MARY', text: 'Três dias. Nenhuma ligação. Nenhum Clark.' }, { text: 'A marca de mão parece mais pesada do que você lembrava.' }],
    7: [{ speaker: 'CLARK', text: 'Eu parei de procurar a saída. Foi aí que este lugar começou a me mostrar coisas.' }],
    8: [{ speaker: 'CLARK', text: 'Mary, não se mexa.' }, { text: 'Algo vestindo a antiga propaganda de Clark está onde antes havia uma parede.', danger: true }],
    9: [{ speaker: 'PHIL', text: 'Você foi recuperada a quarenta e seis metros do Limiar Dois.' }, { speaker: 'MARY', text: 'Não existem metros lá dentro.' }],
  };
  (Object.keys(intros) as unknown as ChapterId[]).forEach(id => { chapterIntros[id] = intros[id]; });

  const translatedInteractions: Record<string, Beat[]> = {
    'survey-console': [{ speaker: 'CONTROLE ASYNC', text: 'Anomalia registrada. A degradação do sinal está aumentando.' }, { text: 'Alguma coisa bate uma única vez atrás de você.', danger: true }],
    'breaker-a': [{ speaker: 'CLARK', text: 'Corredores um e dois.' }],
    'breaker-b': [{ speaker: 'CLARK', text: 'Letreiro do showroom.' }],
    'breaker-c': [{ speaker: 'CLARK', text: 'Luzes do subsolo... espera.' }, { text: 'Uma faixa limpa de luz amarela atravessa o reboco sólido.' }],
    'portal': [{ speaker: 'CLARK', text: 'Isso não é uma rachadura.' }],
    'wrong-sign': [{ speaker: 'CLARK', text: 'Ele copiou a palavra. Só não entendeu o que ela significa.' }],
    'proof-object': [{ speaker: 'CLARK', text: 'Meu sapato. Só que eu estou usando os dois.' }],
    'return-portal': [{ speaker: 'CLARK', text: 'Mary vai ter que ver isto.' }],
    'camera-check': [{ speaker: 'BOBBY', text: 'Bateria cheia. Quarenta e três minutos de fita.' }, { speaker: 'CLARK', text: 'Não pare de gravar.' }],
    'rope': [{ speaker: 'KAT', text: 'A gente desce você. A gente não joga você lá embaixo.' }, { speaker: 'BOBBY', text: 'Uma diferença reconfortante.' }],
    'threshold': [{ speaker: 'BOBBY', text: 'Tem alguma coisa parada depois das roupas.' }, { speaker: 'CLARK', text: 'Bobby, volta para cima. Agora.' }, { text: 'A corda estica com violência na direção errada.', danger: true }],
    'lost-camera': [{ text: 'A câmera ainda está gravando. O contador de tempo é impossível.' }],
    'kat-voice': [{ speaker: 'CLARK', text: 'KAT!' }, { speaker: 'KAT', text: 'Eu consigo ouvir você. Não consigo encontrar a porta.' }, { text: 'A resposta se repete várias salas adiante, perfeitamente idêntica.' }],
    'handprint': [{ speaker: 'MARY', text: 'Minha mãe mantinha as janelas cobertas. Eu guardei isto.' }],
    'mary-portal': [{ speaker: 'MARY', text: 'Clark, se isso for outra encenação...' }, { text: 'A parede aceita sua mão.' }],
    'dinner': [{ speaker: 'CLARK', text: 'Sente-se. Podemos terminar a sessão aqui. Este lugar lembra das partes importantes.' }],
    'kingdom-door': [{ speaker: 'MARY', text: 'Clark, o que tem atrás daquela porta?' }, { speaker: 'CLARK', text: 'Algo que este lugar fez de mim.' }],
    'weapon-check': [{ speaker: 'MARY', text: 'Concreto. Peso de verdade. Uma quina de verdade.' }],
    'gas-valve': [{ text: 'A válvula se abre gritando. Gás invade a sala de serviço.', danger: true }],
    'observation': [{ speaker: 'PHIL', text: 'Conseguimos conter o espécime maior.' }, { speaker: 'MARY', text: 'Aquilo não é um espécime. É um erro que aprendeu.' }],
    'interview': [{ speaker: 'PHIL', text: 'A Async fabricava equipamentos de imagem antes do Limiar Um. Depois encontramos uma imagem melhor.' }, { speaker: 'MARY', text: 'Não é uma imagem. Este lugar está lembrando de nós.' }],
    'final-threshold': [{ speaker: 'PHIL', text: 'Precisamos que você identifique uma sala.' }, { speaker: 'MARY', text: 'Não. Vocês precisam fazer isto parar de me identificar.' }],
  };
  Object.keys(interactions).forEach(key => delete interactions[key]);
  Object.assign(interactions, translatedInteractions);

  const therapy: Choice[] = [
    { label: 'Mostrar a Mary o sapato duplicado', response: [{ speaker: 'CLARK', text: 'A costura é a minha. O desgaste é o meu. Aquele lugar fez outro.' }, { speaker: 'MARY', text: 'Então me diga o que você quer que esse objeto prove sobre você.' }] },
    { label: 'Descrever as salas intermináveis', response: [{ speaker: 'CLARK', text: 'Cada curva parece planejada, mas nada leva a lugar nenhum.' }, { speaker: 'MARY', text: 'Isso parece familiar.' }] },
    { label: 'Insistir para Mary ir ver', response: [{ speaker: 'CLARK', text: 'Você acha que é uma metáfora porque metáforas são mais seguras.' }, { speaker: 'MARY', text: 'E você acha que uma descoberta apaga a responsabilidade.' }] },
  ];
  therapyChoices.splice(0, therapyChoices.length, ...therapy);

  const dinner: Choice[] = [
    { label: '“Isto não é a sua casa.”', response: [{ speaker: 'MARY', text: 'Você arrumou uma sala até ela parar de contradizer você.' }, { speaker: 'CLARK', text: 'Eu arrumei o que ela me deu.' }] },
    { label: 'Perguntar sobre os Still Lifes', response: [{ speaker: 'MARY', text: 'Aquelas pessoas não são pessoas.' }, { speaker: 'CLARK', text: 'São próximas o bastante quando não vão embora.' }] },
    { label: 'Recusar a encenação', response: [{ speaker: 'MARY', text: 'Eu não vou interpretar sua esposa. Não vou dizer a frase que você quer ouvir.' }, { text: 'Pela primeira vez, Clark parece ter medo da sala.' }] },
  ];
  dinnerChoices.splice(0, dinnerChoices.length, ...dinner);
}

function addPrologueSafety(this: WorldBuilder): void {
  const self = this as unknown as { group: THREE.Group; colliders: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }> };
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x858980, roughness: .96 });
  for (const z of [-14.92, 14.92]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.25, .18), wallMat.clone());
    wall.position.set(0, 1.625, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    self.group.add(wall);
    self.colliders.push({ minX: -1.25, maxX: 1.25, minZ: z - .09, maxZ: z + .09 });
  }

  const red = new THREE.MeshStandardMaterial({ color: 0x8d1717, emissive: 0xff2020, emissiveIntensity: 1.5, roughness: .55 });
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(7.1, .025, .22), red);
  stripe.position.set(0, .02, -12.65);
  self.group.add(stripe);
  for (const x of [-3.2, 3.2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(.12, 2.5, .12), red.clone());
    post.position.set(x, 1.25, -12.65);
    self.group.add(post);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(6.5, .12, .12), red.clone());
  top.position.set(0, 2.45, -12.65);
  self.group.add(top);
  const light = new THREE.PointLight(0xff2a1f, 3.8, 7, 2);
  light.position.set(0, 2.2, -12.2);
  self.group.add(light);
}

function patchWorldBuilder(): void {
  const original = WorldBuilder.prototype.build;
  WorldBuilder.prototype.build = function (id: ChapterId): ChapterWorld {
    const world = original.call(this, id);
    const meta = chapterMeta[id];
    world.title = meta.title;
    world.kicker = meta.kicker;
    world.objective = meta.objective;
    world.interactables.forEach(item => { item.prompt = promptById[item.id] ?? item.prompt; });
    if (id === 0) addPrologueSafety.call(this);
    return world;
  };
}

function localizeNode(el: Element | null): void {
  if (!el) return;
  const current = el.textContent?.trim() ?? '';
  if (!current) return;
  const direct = uiText[current];
  if (direct && direct !== current) {
    el.textContent = direct;
    return;
  }
  const chapter = current.match(/^CONTINUE \/\/ CHAPTER (\d+)$/);
  if (chapter) el.textContent = `CONTINUAR // CAPÍTULO ${chapter[1]}`;
}

function localizeRuntimeUi(): void {
  ['#objective', '#prompt', '#choice-prompt', '#continue'].forEach(selector => localizeNode(document.querySelector(selector)));
  const subtitle = document.querySelector<HTMLElement>('#subtitle');
  if (subtitle) {
    let html = subtitle.innerHTML;
    html = html.replace('TAPE ERROR', 'ERRO DE FITA').replace('SUBJECT LOST', 'SUJEITO PERDIDO').replace('MOVE.', 'CORRA.');
    if (html !== subtitle.innerHTML) subtitle.innerHTML = html;
  }
}

function patchCampaignInput(): void {
  const proto = Campaign.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
  const originalKeyDown = proto.keyDown;
  proto.keyDown = function (this: Campaign, eventUnknown: unknown): void {
    const e = eventUnknown as KeyboardEvent;
    const self = this as unknown as {
      interactionCooldown: number;
      interact: () => void;
    };
    if (e.code === 'KeyE') {
      if (!e.repeat) {
        self.interactionCooldown = 0;
        self.interact();
      }
      return;
    }
    originalKeyDown.call(this, e);
    queueMicrotask(localizeRuntimeUi);
  };
}

export function applyPtBRPatches(): void {
  setStory();
  patchWorldBuilder();
  patchCampaignInput();
  const observer = new MutationObserver(() => localizeRuntimeUi());
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  localizeRuntimeUi();
}

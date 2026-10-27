/* =========================================================
   1) DADOS MUSICAIS
   ========================================================= */
const NOTAS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];                       // 12 notas com sustenido (índice = classe de altura)
const SOLFEJO = ['Dó','Dó#','Ré','Ré#','Mi','Fá','Fá#','Sol','Sol#','Lá','Lá#','Si'];      // mesmos nomes em Dó Ré Mi
const INTERVALOS = ['1','b2','2','b3','3','4','b5','5','b6','6','b7','7'];                 // sigla do intervalo pela distância em semitons
const NOME_INT = ['Tônica','2ª menor','2ª maior','3ª menor','3ª maior','4ª justa','5ª diminuta','5ª justa','6ª menor','6ª maior','7ª menor','7ª maior']; // nome por extenso
const CASAS = 20;                                                                            // quantidade de casas desenhadas no braço
const MARCAS = [3,5,7,9,12,15,17,19];                                                        // casas com bolinha de madrepérola
const AFINACOES = {                                                                          // cordas da mais grave para a mais aguda (midi = altura)
  4: [{n:'E', midi:28}, {n:'A', midi:33}, {n:'D', midi:38}, {n:'G', midi:43}],               // baixo de 4 cordas
  5: [{n:'B', midi:23}, {n:'E', midi:28}, {n:'A', midi:33}, {n:'D', midi:38}, {n:'G', midi:43}] // baixo de 5 cordas (B grave)
};
const ESCALAS = {                                                                            // cada escala = lista de intervalos em semitons a partir da tônica
  maior:      { nome:'Maior (jônica)',        iv:[0,2,4,5,7,9,11],  uso:'A base de tudo: pop, sertanejo, gospel, MPB. Som alegre e resolvido. Quase toda teoria (campo harmônico, graus) parte dela.' },
  menor:      { nome:'Menor natural (eólia)', iv:[0,2,3,5,7,8,10],  uso:'Som mais sombrio e melancólico. Muito usada em rock, baladas e pop. Tem as mesmas notas da maior que começa uma 3ª menor acima.' },
  pentaMenor: { nome:'Pentatônica menor',     iv:[0,3,5,7,10],      uso:'Só 5 notas e nenhum semitom: difícil soar errado. É a escala mais usada para frases e viradas de rock, blues e funk.' },
  pentaMaior: { nome:'Pentatônica maior',     iv:[0,2,4,7,9],       uso:'Versão alegre da pentatônica. Segura para linhas sobre acordes maiores no country, pop, gospel e sertanejo.' },
  blues:      { nome:'Blues',                 iv:[0,3,5,6,7,10],    uso:'Pentatônica menor com a 5ª diminuta (a “blue note”). Use a b5 como nota de passagem entre a 4ª e a 5ª.' },
  dorica:     { nome:'Dórica',                iv:[0,2,3,5,7,9,10],  uso:'Menor com 6ª maior. Som de funk, soul e jazz. Ótima para grooves em acordes menores com sétima (m7).' },
  mixolidia:  { nome:'Mixolídia',             iv:[0,2,4,5,7,9,10],  uso:'Maior com 7ª menor. Encaixa em acordes dominantes (7). Aparece em funk, rock e na música nordestina.' },
  menorHarm:  { nome:'Menor harmônica',       iv:[0,2,3,5,7,8,11],  uso:'Menor com 7ª maior, o que cria uma tensão forte puxando para a tônica. Clássico, tango e metal neoclássico.' },
  arpMaior:   { nome:'Arpejo maior (1-3-5)',  iv:[0,4,7],           uso:'As três notas do acorde maior. Tocar arpejos é a forma mais direta de o baixo “desenhar” a harmonia.' },
  arpMenor:   { nome:'Arpejo menor (1-b3-5)', iv:[0,3,7],           uso:'As três notas do acorde menor. Compare com o maior: só a 3ª muda, uma casa para trás.' },
  arpDom7:    { nome:'Arpejo dominante (1-3-5-b7)', iv:[0,4,7,10],  uso:'Acorde com sétima menor (ex.: G7). Muito usado em walking bass, blues e para preparar a volta à tônica.' }
};
const PERMUTACOES = ['1234','1324','1423','2413','4321','3142'];                              // ordens de dedos para o exercício de permutação

/* =========================================================
   2) ESTADO E PREFERÊNCIAS
   ========================================================= */
const PADRAO = { tom:7, escala:'maior', cordas:4, rotulo:'nota', janela:null, velEscala:100, ex:'cordas-soltas', bpm:70, porBatida:1, metro:true, loop:true, pontos:'dedo', casa:5, perm:'1324', quizModo:'encontrar', quizArea:12 }; // valores iniciais
const estado = carregar();                                                                   // estado atual do app
function carregar() {                                                                        // lê preferências salvas no navegador
  try { return Object.assign({}, PADRAO, JSON.parse(localStorage.getItem('escola-grave') || '{}'), { janela:null }); } // mistura padrão + salvo
  catch (e) { return Object.assign({}, PADRAO); }                                            // se o navegador bloquear, usa o padrão
}
function salvar() {                                                                          // grava preferências
  try { localStorage.setItem('escola-grave', JSON.stringify(estado)); } catch (e) {}         // ignora erro de armazenamento
}
const afin = () => AFINACOES[estado.cordas];                                                 // afinação em uso
const off = () => (estado.cordas === 5 ? 1 : 0);                                             // deslocamento para achar a corda E no baixo de 5
const $ = (s) => document.querySelector(s);                                                  // atalho para buscar elemento

function rotular(midi) {                                                                     // texto que vai dentro da bolinha
  const pc = midi % 12;                                                                      // classe da nota (0 = C)
  if (estado.rotulo === 'solfejo') return SOLFEJO[pc];                                       // modo Dó Ré Mi
  if (estado.rotulo === 'intervalo') return INTERVALOS[(pc - estado.tom + 12) % 12];         // modo intervalo em relação ao tom
  return NOTAS[pc];                                                                          // modo cifra
}

/* =========================================================
   3) SOM (sintetizador de baixo com Web Audio)
   ========================================================= */
let ctx = null, mestre = null;                                                               // contexto de áudio e volume geral
function audio() {                                                                           // cria o áudio só após o primeiro clique
  if (!ctx) {                                                                                // primeira vez
    ctx = new (window.AudioContext || window.webkitAudioContext)();                          // contexto de áudio
    mestre = ctx.createGain(); mestre.gain.value = 0.7; mestre.connect(ctx.destination);     // volume geral ligado à saída
  }
  if (ctx.state === 'suspended') ctx.resume();                                               // reativa se o navegador pausou
  return ctx;                                                                                // devolve o contexto
}
const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);                                  // converte número MIDI em frequência (Hz)
function tocarNota(midi, dur = 1.1) {                                                        // toca uma nota de baixo
  const a = audio(), t = a.currentTime;                                                      // agora
  const serra = a.createOscillator(); serra.type = 'sawtooth'; serra.frequency.value = freq(midi); // onda rica em harmônicos (dá o "ataque")
  const seno = a.createOscillator(); seno.type = 'sine'; seno.frequency.value = freq(midi);   // onda pura (dá o "corpo" grave)
  const gSerra = a.createGain(); gSerra.gain.value = 0.35;                                   // serra mais baixa que o seno
  const filtro = a.createBiquadFilter(); filtro.type = 'lowpass'; filtro.Q.value = 3;        // filtro que deixa passar graves
  filtro.frequency.setValueAtTime(1500, t);                                                  // começa brilhante (ataque do dedo)
  filtro.frequency.exponentialRampToValueAtTime(240, t + 0.35);                              // escurece rápido, como corda real
  const env = a.createGain();                                                                // envelope de volume
  env.gain.setValueAtTime(0.0001, t);                                                        // começa em silêncio
  env.gain.exponentialRampToValueAtTime(0.55, t + 0.008);                                    // ataque rápido
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);                                    // decaimento natural
  serra.connect(gSerra).connect(filtro); seno.connect(filtro);                               // osciladores → filtro
  filtro.connect(env).connect(mestre);                                                       // filtro → envelope → saída
  serra.start(t); seno.start(t); serra.stop(t + dur + 0.05); seno.stop(t + dur + 0.05);      // liga e desliga
}
function clique(forte) {                                                                     // batida do metrônomo
  const a = audio(), t = a.currentTime;                                                      // agora
  const o = a.createOscillator(); o.type = 'square'; o.frequency.value = forte ? 1600 : 1100; // tempo 1 mais agudo
  const g = a.createGain(); g.gain.setValueAtTime(forte ? 0.18 : 0.1, t);                    // volume do clique
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);                                     // clique curtinho
  o.connect(g).connect(mestre); o.start(t); o.stop(t + 0.05);                                // toca
}

/* =========================================================
   4) SEQUENCIADOR (toca uma lista de notas no tempo)
   ========================================================= */
const seq = { id:null, ativo:false, aoParar:null };                                          // controle do sequenciador
function pararSeq() {                                                                        // para o que estiver tocando
  clearTimeout(seq.id); seq.ativo = false;                                                   // cancela o próximo passo
  const f = seq.aoParar; seq.aoParar = null; if (f) f();                                     // avisa quem iniciou
}
function iniciarSeq(passos, op) {                                                            // op: {ms(), loop(), metro(), porBatida(), aoPasso(p,i), aoParar()}
  pararSeq(); if (!passos.length) return;                                                    // limpa e valida
  seq.ativo = true; seq.aoParar = op.aoParar || null;                                        // marca como tocando
  let i = 0;                                                                                 // índice do passo atual
  const passo = () => {                                                                      // executa um passo
    if (!seq.ativo) return;                                                                  // foi parado
    if (i >= passos.length) {                                                                // chegou ao fim
      if (op.loop && op.loop()) i = 0;                                                       // recomeça se "Repetir" estiver ligado
      else { pararSeq(); return; }                                                           // senão encerra
    }
    const pb = op.porBatida ? op.porBatida() : 1;                                            // notas por tempo
    const ms = op.ms();                                                                      // duração de cada nota em milissegundos
    if (op.metro && op.metro() && i % pb === 0) clique(i % (4 * pb) === 0);                  // clique a cada tempo, mais forte no 1
    tocarNota(passos[i].midi, Math.min(1.3, (ms / 1000) * 1.8));                             // toca a nota
    op.aoPasso(passos[i], i);                                                                // atualiza a tela
    i++;                                                                                     // avança
    seq.id = setTimeout(passo, ms);                                                          // agenda o próximo
  };
  passo();                                                                                   // começa já
}

/* =========================================================
   5) COMPONENTE DO BRAÇO
   ========================================================= */
function colunas() {                                                                         // largura das casas diminui como num baixo real
  let c = '48px';                                                                            // coluna das cordas soltas
  for (let f = 1; f <= CASAS; f++) c += ` minmax(34px, ${(Math.pow(2, -(f - 1) / 12) * 100).toFixed(1)}fr)`; // cada casa ~5,6% menor
  return c;                                                                                  // devolve o grid-template-columns
}
function criarBraco(el, numEl) {                                                             // cria um braço dentro de "el"
  const api = { celulas:{}, aoClicar:null, ativa:null, janelaEl:null };                      // objeto com as funções públicas
  api.construir = () => {                                                                    // desenha tudo
    const a = afin(), n = a.length;                                                          // cordas em uso
    el.innerHTML = ''; api.celulas = {}; api.ativa = null;                                   // limpa
    el.style.gridTemplateColumns = colunas();                                                // colunas das casas
    el.style.gridTemplateRows = `repeat(${n}, 40px)`;                                        // uma linha por corda
    MARCAS.forEach((f) => {                                                                  // bolinhas de madrepérola
      const linhas = f === 12 ? [`1 / span 2`, `${n - 1} / span 2`] : [`1 / span ${n}`];     // casa 12 tem duas bolinhas
      linhas.forEach((r) => { const d = document.createElement('div'); d.className = 'inlay'; d.style.gridColumn = f + 1; d.style.gridRow = r; el.appendChild(d); });
    });
    api.janelaEl = document.createElement('div'); api.janelaEl.className = 'janela'; api.janelaEl.hidden = true; // moldura da posição
    api.janelaEl.style.gridRow = `1 / span ${n}`; el.appendChild(api.janelaEl);              // ocupa todas as cordas
    for (let r = 0; r < n; r++) {                                                            // r = linha na tela (0 = topo)
      const s = n - 1 - r;                                                                   // corda aguda em cima, como na TAB
      for (let f = 0; f <= CASAS; f++) {                                                     // cada casa
        const b = document.createElement('button');                                          // a casa é um botão
        const midi = a[s].midi + f;                                                          // altura da nota nessa casa
        b.className = 'casa'; b.dataset.s = s; b.dataset.f = f;                              // guarda corda e casa
        b.style.gridRow = r + 1; b.style.gridColumn = f + 1;                                 // posição no grid
        b.style.setProperty('--esp', (1.2 + (n - 1 - s) * 0.7).toFixed(1) + 'px'); // corda grave mais grossa
        b.setAttribute('aria-label', `Corda ${a[s].n}, casa ${f}: ${NOTAS[midi % 12]}`);     // leitura para leitor de tela
        b.innerHTML = '<span class="ponto"></span>';                                         // bolinha (oculta por padrão)
        b.addEventListener('click', () => {                                                  // clique na casa
          if (!api.aoClicar || api.aoClicar(s, f, midi, b) !== false) tocarNota(midi);      // toca, a menos que o quiz bloqueie
        });
        el.appendChild(b); api.celulas[s + ':' + f] = b;                                     // adiciona e guarda referência
      }
    }
    numEl.style.gridTemplateColumns = colunas();                                             // números alinhados com as casas
    numEl.innerHTML = Array.from({ length: CASAS + 1 }, (_, f) => `<span class="${MARCAS.includes(f) ? 'marcada' : ''}">${f}</span>`).join(''); // 0 a 20
  };
  api.cel = (s, f) => api.celulas[s + ':' + f];                                              // pega uma casa
  api.pintar = (cel, m) => {                                                                 // aplica marcação numa casa
    cel.className = 'casa';                                                                  // zera classes
    if (!m) { cel.firstChild.textContent = ''; return; }                                     // sem marcação
    cel.classList.add('marcado', m.tipo); if (m.fora) cel.classList.add('fora');             // tipo: nota/tonica/fantasma/certo/errado
    cel.firstChild.textContent = m.texto ?? '';                                              // texto da bolinha
  };
  api.marcar = (fn) => {                                                                     // fn(s,f,midi) devolve marcação ou null
    const a = afin(); api.ativa = null;                                                      // afinação e reset da nota ativa
    Object.values(api.celulas).forEach((c) => { const s = +c.dataset.s, f = +c.dataset.f; api.pintar(c, fn ? fn(s, f, a[s].midi + f) : null); }); // pinta todas
  };
  api.ativar = (s, f, m) => {                                                                // destaca a nota que está soando
    if (api.ativa) api.ativa.classList.remove('ativa');                                      // tira o destaque anterior
    const c = api.cel(s, f); if (!c) return;                                                 // casa existe?
    if (m) api.pintar(c, m);                                                                 // aplica marcação nova, se veio
    c.classList.add('ativa'); api.ativa = c;                                                 // destaca
    c.scrollIntoView({ block:'nearest', inline:'center', behavior:'smooth' });               // rola o braço até a nota no celular
  };
  api.janela = (j) => {                                                                      // mostra a moldura da posição (5 casas)
    if (j === null) { api.janelaEl.hidden = true; return; }                                  // braço todo
    api.janelaEl.hidden = false; api.janelaEl.style.gridColumn = `${j + 1} / span 5`;        // da casa j até j+4
  };
  return api;                                                                                // devolve o componente
}

/* =========================================================
   6) ABA: BRAÇO E ESCALAS
   ========================================================= */
const bEsc = criarBraco($('#braco-escala'), $('#num-escala'));                               // braço da aba escalas
const doTom = (pc) => (pc - estado.tom + 12) % 12;                                           // distância da nota até a tônica

function posicoes() {                                                                        // casas iniciais das posições (na corda mais grave)
  const esc = ESCALAS[estado.escala], a = afin(), r = [];                                    // escala e cordas
  for (let f = 0; f <= 12; f++) if (esc.iv.includes(doTom((a[0].midi + f) % 12))) r.push(f); // cada nota da escala na corda grave abre uma posição
  return r;                                                                                  // lista de casas
}
function nomePos(j) {                                                                        // texto "Posição 3 · casas 5–9"
  if (j === null) return 'Braço todo';                                                       // sem posição
  const i = posicoes().indexOf(j);                                                           // índice da posição
  return `Posição ${i + 1} · casas ${j}–${j + 4}`;                                           // rótulo
}
function notasJanela(j) {                                                                    // notas da escala dentro de uma posição, em ordem de altura
  const esc = ESCALAS[estado.escala], a = afin(), r = [];                                    // dados
  for (let s = 0; s < a.length; s++) for (let f = j; f <= Math.min(CASAS, j + 4); f++) {     // percorre a moldura
    const midi = a[s].midi + f;                                                              // altura
    if (esc.iv.includes(doTom(midi % 12))) r.push({ s, f, midi, janela:j });                 // nota da escala
  }
  r.sort((x, y) => x.midi - y.midi);                                                         // grave → agudo
  return r.filter((p, i) => i === 0 || p.midi !== r[i - 1].midi);                            // remove repetidas
}
function renderEscala() {                                                                    // redesenha marcações e painel
  const esc = ESCALAS[estado.escala], j = estado.janela;                                     // escala e posição
  bEsc.marcar((s, f, midi) => {                                                              // regra de pintura
    const iv = doTom(midi % 12); if (!esc.iv.includes(iv)) return null;                      // fora da escala: sem bolinha
    return { tipo: iv === 0 ? 'tonica' : 'nota', texto: rotular(midi), fora: j !== null && (f < j || f > j + 4) }; // tônica, nota e esmaecida fora da posição
  });
  bEsc.janela(j); $('#pos-nome').textContent = nomePos(j);                                   // moldura e rótulo
  $('#esc-uso').textContent = esc.uso;                                                       // para que serve
  const iv = esc.iv.concat(12);                                                              // inclui a oitava para fechar a fórmula
  const passos = iv.slice(1).map((x, i) => x - iv[i]);                                       // distância entre graus vizinhos
  const NOME_PASSO = { 1:'S', 2:'T', 3:'T+S', 4:'2T', 5:'2T+S' };                            // como escrever cada distância
  $('#formula').innerHTML = passos.map((p) => `<span class="passo-f ${p === 1 ? 's' : ''}">${NOME_PASSO[p]}</span>`).join('<span aria-hidden="true">›</span>'); // fórmula
  $('#graus').innerHTML = esc.iv.map((x) => {                                                // cartinha por grau
    const pc = (estado.tom + x) % 12;                                                        // nota do grau
    return `<button class="grau ${x === 0 ? 't' : ''}" data-pc="${pc}"><span class="n">${NOTAS[pc]}</span><span class="i">${INTERVALOS[x]}</span><span class="d">${NOME_INT[x]}</span></button>`;
  }).join('');
  const a = afin(), sR = off(), fR = (estado.tom - a[sR].midi % 12 + 12) % 12;               // casa da tônica na corda E
  $('#esc-passo').innerHTML = `Na prática: comece em <b>${NOTAS[estado.tom]}</b> (corda ${a[sR].n}, casa ${fR}) e ande pela mesma corda seguindo a fórmula: ${passos.map((p) => '+' + p).join(' ')} casas. Você chega na oitava, casa ${fR + 12}. Depois toque as mesmas notas numa posição só, usando as outras cordas.`; // passo a passo
}
function tocarPosicao() {                                                                    // toca a posição atual subindo e descendo
  if (estado.janela === null) {                                                              // se estiver no braço todo
    const ps = posicoes(); estado.janela = ps.find((f) => doTom((afin()[0].midi + f) % 12) === 0) ?? ps[0]; renderEscala(); // escolhe a posição que começa na tônica
  }
  const sobe = notasJanela(estado.janela), notas = sobe.concat(sobe.slice(0, -1).reverse()); // sobe e desce
  iniciarSeq(notas, {
    ms: () => 60000 / estado.velEscala,                                                      // uma nota por tempo
    aoPasso: (p) => { $('#leitura').innerHTML = descrever(p); bEsc.ativar(p.s, p.f); },      // destaca a nota
    aoParar: () => bEsc.ativa && bEsc.ativa.classList.remove('ativa')                        // tira destaque ao parar
  });
}
function caminhar() {                                                                        // toca todas as posições em sequência
  const notas = []; posicoes().forEach((j) => notas.push(...notasJanela(j)));                // sobe posição por posição
  let jAtual = -1;                                                                           // posição que está na tela
  iniciarSeq(notas, {
    ms: () => 60000 / estado.velEscala,                                                      // andamento
    aoPasso: (p) => {                                                                        // a cada nota
      if (p.janela !== jAtual) { jAtual = p.janela; estado.janela = jAtual; renderEscala(); } // troca de posição quando muda
      bEsc.ativar(p.s, p.f); $('#leitura').innerHTML = descrever(p);                         // destaca a nota
    },
    aoParar: () => bEsc.ativa && bEsc.ativa.classList.remove('ativa')                        // limpa no fim
  });
}
function descrever(p) {                                                                      // texto "Você tocou..."
  const pc = p.midi % 12, iv = doTom(pc);                                                    // nota e intervalo
  return `Nota: <b>${NOTAS[pc]}</b> (${SOLFEJO[pc]}) · corda ${afin()[p.s].n}, casa ${p.f} · <b>${NOME_INT[iv]}</b> de ${NOTAS[estado.tom]}`; // frase
}
bEsc.aoClicar = (s, f, midi) => { $('#leitura').innerHTML = descrever({ s, f, midi }); };    // clique livre no braço mostra a nota

/* =========================================================
   7) ABA: EXERCÍCIOS
   ========================================================= */
const bEx = criarBraco($('#braco-ex'), $('#num-ex'));                                        // braço da aba exercícios
const P = (s, f, dedo, extra) => Object.assign({ s, f, dedo, midi: afin()[s].midi + f }, extra || {}); // cria um passo
const casaNa = (pc, s) => (pc - afin()[s].midi % 12 + 12) % 12;                              // casa (0–11) de uma nota numa corda

function montarPosicao(tomPc, ivs) {                                                         // escala/arpejo numa posição, "um dedo por casa"
  const a = afin(), o = off();                                                               // cordas
  let s0 = o, r = casaNa(tomPc, o); if (r < 2) r += 12;                                      // tônica na corda E, deixando espaço para o dedo 1
  if (r > 9) { s0 = o + 1; r = casaNa(tomPc, o + 1); if (r < 2) r += 12; }                   // se ficar alto demais, usa a corda A
  const raiz = a[s0].midi + r, alvos = ivs.map((i) => raiz + i);                             // notas que queremos tocar
  for (const larg of [4, 5]) for (const w of [r - 1, r, r - 2, r - 3]) {                     // tenta caber em 4 casas (sem esticar), depois 5
    if (w < 1) continue;                                                                     // não sai do braço
    const res = []; let sMin = s0, ok = true;                                                // resultado parcial
    for (const m of alvos) {                                                                 // para cada nota
      let achou = false;                                                                     // flag
      for (let s = sMin; s < a.length; s++) {                                                // procura na corda atual ou nas de cima
        const f = m - a[s].midi;                                                             // casa onde a nota cai
        if (f >= w && f <= w + larg - 1) { res.push(P(s, f, Math.min(4, f - w + 1))); sMin = s; achou = true; break; } // cabe na mão
      }
      if (!achou) { ok = false; break; }                                                     // não coube: tenta outra posição
    }
    if (ok) return res;                                                                      // achou um desenho que funciona
  }
  return [];                                                                                 // não deveria acontecer
}
const vaiVolta = (sobe) => sobe.concat(sobe.slice(1, -1).reverse());                         // sobe e desce sem repetir as pontas

const EXERCICIOS = [
  { id:'cordas-soltas', nome:'Cordas soltas: i-m alternado', nivel:1, foco:'Mão direita',
    obj:'Treinar a mão direita sozinha: alternar indicador (i) e médio (m) com volume igual, sem a mão esquerda atrapalhar.',
    como:['Apoie o polegar no captador ou na corda E quando não estiver tocando nela.','Toque cada corda 4 vezes alternando i, m, i, m. A bolinha mostra qual dedo da mão direita usar.','Puxe a corda em direção ao corpo do baixo e deixe o dedo descansar na corda de baixo (toque apoiado).','Ligue o metrônomo e mantenha todas as notas com o mesmo volume.'],
    dica:'<b>Sem levantar demais os dedos.</b> Puxar a corda para cima deixa o som fino. O ataque para dentro do instrumento dá um grave mais cheio e firme.',
    gerar() { const o = off(), r = []; let k = 0; [0,1,2,3,2,1].forEach((c) => { for (let x = 0; x < 4; x++) r.push(P(o + c, 0, (k++ % 2) ? 'm' : 'i')); }); return r; } },
  { id:'aranha', nome:'Aranha cromática 1-2-3-4', nivel:1, foco:'Mão esquerda',
    obj:'Exercício clássico de aquecimento: um dedo por casa em todas as cordas, subindo e descendo.',
    params:['casa'],
    como:['Coloque o indicador na casa inicial e deixe os outros dedos sobre as três casas seguintes.','Toque casa por casa com os dedos 1, 2, 3 e 4, mudando de corda até a G.','Na volta, use 4, 3, 2, 1 descendo as cordas.','Mantenha os dedos perto das cordas e só levante o dedo que vai usar em seguida.'],
    dica:'<b>Comece na casa 5.</b> Lá as casas são menores e a abertura dói menos. Quando ficar confortável, desça uma casa por dia até a casa 1.',
    gerar() { const o = off(), c = estado.casa, r = []; for (let s = 0; s < 4; s++) for (let d = 1; d <= 4; d++) r.push(P(o + s, c + d - 1, d)); for (let s = 3; s >= 0; s--) for (let d = 4; d >= 1; d--) r.push(P(o + s, c + d - 1, d)); return r; } },
  { id:'permutacao', nome:'Permutações de dedos', nivel:2, foco:'Independência dos dedos',
    obj:'Treinar todas as combinações de dedos da mão esquerda. Cada ordem diferente fortalece uma ligação diferente entre os dedos.',
    params:['casa','perm'],
    como:['Escolha a ordem dos dedos (ex.: 1-3-2-4).','Toque essa ordem em cada corda, subindo da E para a G.','Na descida, a ordem é invertida.','Troque de ordem quando a atual sair limpa 4 vezes seguidas.'],
    dica:'<b>A troca 2→3 costuma ser a mais difícil.</b> É normal. Diminua o andamento até sair sem trancos antes de acelerar.',
    gerar() { const o = off(), c = estado.casa, d = estado.perm.split('').map(Number), r = []; for (let s = 0; s < 4; s++) d.forEach((x) => r.push(P(o + s, c + x - 1, x))); const inv = d.slice().reverse(); for (let s = 3; s >= 0; s--) inv.forEach((x) => r.push(P(o + s, c + x - 1, x))); return r; } },
  { id:'maior-posicao', nome:'Escala maior numa posição', nivel:1, foco:'Escalas',
    obj:'Tocar a escala maior do tom escolhido sem mexer a mão: um dedo por casa, tônica com o dedo 2.',
    como:['Ache a tônica (bolinha âmbar) e coloque o dedo 2 nela.','Toque as 8 notas subindo, com o dedo que a bolinha mostra.','Desça pelo mesmo caminho.','Troque o tom no painel de cima: o desenho é o mesmo, só muda de lugar.'],
    dica:'<b>Esse desenho vale para os 12 tons.</b> Isso acontece porque o baixo é afinado em quartas. Decore o formato, não as casas.',
    gerar() { return vaiVolta(montarPosicao(estado.tom, [0,2,4,5,7,9,11,12])); } },
  { id:'uma-corda', nome:'Escala maior numa corda só', nivel:2, foco:'Mapa do braço',
    obj:'Andar pela escala numa única corda, na horizontal. Mostra a fórmula T T S T T T S na prática e treina os deslocamentos da mão.',
    como:['Comece na tônica e conte as casas: T = 2 casas, S = 1 casa.','Use os dedos 1 e 3 para tons e 1 e 2 para semitons, deslizando a mão.','Olhe para a casa de destino antes de mover a mão.','Faça devagar: a meta é chegar sem olhar.'],
    dica:'<b>Diga o nome da nota em voz alta</b> enquanto toca. Assim você aprende a escala e as notas do braço ao mesmo tempo.',
    gerar() { const o = off(); let s = o + 1, f0 = casaNa(estado.tom, s); if (f0 > 8) { s = o; f0 = casaNa(estado.tom, s); } return vaiVolta([0,2,4,5,7,9,11,12].map((i) => P(s, f0 + i, null))); } },
  { id:'oitavas', nome:'Oitavas pela escala', nivel:2, foco:'Mapa do braço',
    obj:'Tocar cada nota da escala e a sua oitava. O desenho da oitava (duas cordas acima, duas casas à frente) é o atalho mais usado no braço.',
    como:['Dedo 1 na nota grave, dedo 4 (ou 3) na oitava.','Abafe a corda do meio com a parte de baixo do dedo 1.','Suba pela escala maior do tom escolhido.','Repare que o formato nunca muda.'],
    dica:'<b>Oitavas são a base do disco e do funk.</b> Quando estiver seguro, toque a nota grave e a oitava alternando em colcheias.',
    gerar() { const o = off(); let s = o, r0 = casaNa(estado.tom, s); if (r0 > 7) { s = o + 1; r0 = casaNa(estado.tom, s); } const pares = [0,2,4,5,7,9,11,12].map((i) => [P(s, r0 + i, 1), P(s + 2, r0 + i + 2, 4)]); return vaiVolta(pares).flat(); } },
  { id:'arpejos', nome:'Arpejos maior e menor (1-3-5-8)', nivel:2, foco:'Harmonia',
    obj:'Tocar as notas do acorde maior e depois do menor no mesmo tom, para ouvir a diferença que a 3ª faz.',
    como:['Primeiro o arpejo maior: tônica, 3ª maior, 5ª e oitava.','Depois o menor: a 3ª recua uma casa.','Cante as notas junto: isso ajuda o ouvido a reconhecer acordes.','Troque o tom e repita.'],
    dica:'<b>Linha de baixo quase sempre nasce do arpejo.</b> Se você sabe o arpejo do acorde, já tem notas seguras para qualquer música.',
    gerar() { return vaiVolta(montarPosicao(estado.tom, [0,4,7,12])).concat(vaiVolta(montarPosicao(estado.tom, [0,3,7,12]))); } },
  { id:'groove', nome:'Groove 1-5-8 em I–V–vi–IV', nivel:2, foco:'Linha de baixo',
    obj:'Aplicar tônica, quinta e oitava numa progressão muito comum no pop e no gospel. É a primeira linha de baixo “de verdade”.',
    como:['Para cada acorde: tônica (dedo 1), 5ª (dedo 3), oitava (dedo 4), 5ª de novo.','Cada acorde é tocado duas vezes antes de mudar.','O status mostra em qual acorde você está.','Depois de pegar, invente variações: repita a tônica, troque a ordem.'],
    dica:'<b>O desenho 1-5-8 não muda de acorde para acorde.</b> A mão só muda de lugar. Mantenha o ritmo firme nas trocas: errar a nota com o tempo certo soa melhor que acertar a nota atrasado.',
    gerar() { const o = off(), r = []; [{iv:0,g:'I',m:''},{iv:7,g:'V',m:''},{iv:9,g:'vi',m:'m'},{iv:5,g:'IV',m:''}].forEach((c) => { const pc = (estado.tom + c.iv) % 12; let s = o, f = casaNa(pc, o); if (f > 7) { s = o + 1; f = casaNa(pc, s); } const d = f === 0 ? [0,2,3,2] : [1,3,4,3], rot = `${NOTAS[pc]}${c.m} (${c.g})`; for (let x = 0; x < 2; x++) [[s,f],[s+1,f+2],[s+2,f+2],[s+1,f+2]].forEach(([cs, cf], k) => r.push(P(cs, cf, d[k], { rot }))); }); return r; } },
  { id:'penta-braco', nome:'Pentatônica menor: 5 posições', nivel:3, foco:'Braço inteiro',
    obj:'Caminhar pelas 5 posições da pentatônica menor, duas notas por corda, até cobrir o braço. As posições se encaixam umas nas outras.',
    como:['Cada posição começa numa nota da escala na corda E.','Toque duas notas por corda, subindo até a G.','Passe para a posição seguinte: a nota mais aguda de uma corda vira a mais grave da próxima posição.','Depois de decorar, improvise dentro de uma posição sobre uma bateria.'],
    dica:'<b>Ligue as posições, não decore caixas soltas.</b> Note que a posição seguinte começa onde termina a primeira nota da posição anterior em cada corda.',
    gerar() {
      const a = afin(), o = off(), ivs = [0,3,5,7,10], pcs = ivs.map((i) => (estado.tom + i) % 12), r = []; // dados da escala
      const fr = casaNa(estado.tom, o), naE = []; for (let f = 0; f <= 19; f++) if (pcs.includes((a[o].midi + f) % 12)) naE.push(f); // notas da escala na corda E
      let ini = naE.indexOf(fr > 7 ? naE.find((f) => f >= 0) : fr); if (ini < 0) ini = 0;     // começa pela tônica (ou pelo início do braço)
      naE.slice(ini, ini + 5).forEach((p) => {                                                // 5 posições
        const num = ivs.indexOf(doTom((a[o].midi + p) % 12)) + 1, caixa = []; let s = o, cont = 0; // número da posição
        for (let m = a[o].midi + p; caixa.length < 8; m++) {                                  // sobe nota por nota
          if (!pcs.includes(m % 12)) continue;                                                // só notas da escala
          if (cont === 2) { s++; cont = 0; }                                                  // duas notas por corda
          caixa.push({ s, f: m - a[s].midi }); cont++;                                        // guarda
        }
        const min = Math.min(...caixa.map((x) => x.f));                                       // casa mais baixa da caixa
        caixa.forEach((x) => r.push(P(x.s, x.f, Math.max(1, Math.min(4, x.f - min + 1)), { rot: `Posição ${num}` }))); // dedo pela distância
      });
      return r;
    } }
];

function exAtual() { return EXERCICIOS.find((e) => e.id === estado.ex) || EXERCICIOS[0]; }   // exercício escolhido
let passosEx = [];                                                                           // notas do exercício atual
function renderListaEx() {                                                                   // monta a lista lateral
  $('#ex-lista').innerHTML = EXERCICIOS.map((e) => `<button class="ex-item" data-id="${e.id}" aria-pressed="${e.id === estado.ex}"><span class="nome">${e.nome}</span><span class="meta">${['','Iniciante','Intermediário','Avançado'][e.nivel]} · ${e.foco}</span></button>`).join('');
}
function textoPonto(p) {                                                                     // o que aparece na bolinha do exercício
  if (estado.pontos === 'nota' || p.dedo === null || p.dedo === undefined) return rotular(p.midi); // nota
  return String(p.dedo);                                                                     // dedo
}
function baseEx() {                                                                          // pinta todas as notas do exercício como "fantasma"
  const mapa = {}; passosEx.forEach((p) => { const k = p.s + ':' + p.f; if (!mapa[k]) mapa[k] = p; }); // uma por casa
  bEx.marcar((s, f) => { const p = mapa[s + ':' + f]; return p ? { tipo: doTom(p.midi % 12) === 0 && estado.ex !== 'cordas-soltas' ? 'tonica' : 'fantasma', texto: textoPonto(p) } : null; });
}
function renderTab() {                                                                       // desenha a tablatura
  const a = afin(), n = a.length;                                                            // cordas
  let h = `<div class="tab-col nomes">${a.slice().reverse().map((c) => `<span>${c.n}</span>`).join('')}</div>`; // nomes das cordas
  passosEx.forEach((p, i) => {                                                               // uma coluna por nota
    const comp = i > 0 && i % (4 * estado.porBatida) === 0 ? ' compasso' : '';               // linha a cada compasso de 4 tempos
    h += `<div class="tab-col${comp}" data-i="${i}">`;                                       // abre coluna
    for (let s = n - 1; s >= 0; s--) h += s === p.s ? `<span>${p.f}</span>` : `<span class="vazio">–</span>`; // número na corda certa
    h += '</div>';                                                                           // fecha coluna
  });
  $('#tab').innerHTML = h;                                                                   // aplica
}
function statusEx(p, i) {                                                                    // linha de status
  if (!p) { $('#ex-status').innerHTML = `<span><b>${passosEx.length}</b> notas</span><span>Tom: <b>${NOTAS[estado.tom]}</b></span>`; return; } // parado
  const md = p.dedo === 'i' || p.dedo === 'm';                                               // exercício de mão direita?
  $('#ex-status').innerHTML = `<span>Nota <b>${i + 1}/${passosEx.length}</b></span><span>Corda <b>${afin()[p.s].n}</b></span><span>Casa <b>${p.f}</b></span><span>${md ? 'Mão direita' : 'Dedo'} <b>${p.dedo ?? '–'}</b></span><span>Soa <b>${NOTAS[p.midi % 12]}</b></span>${p.rot ? `<span><b>${p.rot}</b></span>` : ''}`;
}
function renderEx() {                                                                        // atualiza a aba de exercícios
  pararSeq();                                                                                // para se estiver tocando
  const e = exAtual(); passosEx = e.gerar();                                                 // gera as notas
  $('#ex-nome').textContent = e.nome;                                                        // título
  const ch = $('#ex-nivel'); ch.textContent = ['','Iniciante','Intermediário','Avançado'][e.nivel]; ch.className = 'chip nv' + e.nivel; // nível
  $('#ex-obj').textContent = e.obj;                                                          // objetivo
  $('#ex-como').innerHTML = e.como.map((c) => `<li>${c}</li>`).join('');                     // passo a passo
  $('#ex-dica').innerHTML = e.dica;                                                          // dica
  $('#g-casa').hidden = !(e.params || []).includes('casa');                                  // mostra "casa inicial" se usar
  $('#g-perm').hidden = !(e.params || []).includes('perm');                                  // mostra "ordem dos dedos" se usar
  renderListaEx(); baseEx(); renderTab(); statusEx(null);                                    // redesenha
}
function tocarEx() {                                                                         // toca o exercício
  let colAnt = null;                                                                         // coluna da TAB destacada
  iniciarSeq(passosEx, {
    ms: () => 60000 / estado.bpm / estado.porBatida,                                         // duração de cada nota
    porBatida: () => estado.porBatida, metro: () => estado.metro, loop: () => estado.loop,   // opções lidas ao vivo
    aoPasso: (p, i) => {                                                                     // a cada nota
      baseEx(); bEx.ativar(p.s, p.f, { tipo: 'nota', texto: textoPonto(p) });                // destaca no braço
      if (colAnt) colAnt.classList.remove('atual');                                          // tira destaque da TAB
      colAnt = $(`#tab [data-i="${i}"]`); if (colAnt) { colAnt.classList.add('atual'); const t = $('#tab'); t.scrollLeft = colAnt.offsetLeft - t.clientWidth / 2; } // centraliza a coluna
      statusEx(p, i);                                                                        // status
    },
    aoParar: () => { baseEx(); if (colAnt) colAnt.classList.remove('atual'); statusEx(null); } // limpa ao parar
  });
}

/* =========================================================
   8) ABA: TÉCNICAS
   ========================================================= */
const TECNICAS = [
  { nome:'Postura e afinação', nivel:1, para:'Tocar sem dor e com o instrumento afinado em E A D G (quartas).',
    passos:['Sentado ou em pé, o braço do baixo fica levemente inclinado para cima.','O polegar da mão esquerda fica atrás do braço, mais ou menos atrás do dedo médio.','Pulso o mais reto possível: a força vem do braço, não de apertar o polegar.','Afine com afinador antes de todo estudo.'],
    erro:'Apertar as cordas com força demais. Basta encostar perto do traste para a nota soar limpa.', ex:'aranha' },
  { nome:'Mão direita alternada (i-m)', nivel:1, para:'Tocar notas rápidas e com volume igual usando indicador e médio.',
    passos:['Alterne sempre i e m, mesmo em notas repetidas.','Puxe a corda em direção ao corpo do baixo.','Depois de tocar, o dedo descansa na corda de baixo (toque apoiado).','Na corda E, o dedo descansa no polegar.'],
    erro:'Usar só um dedo ou puxar a corda para cima. O som fica fraco e irregular.', ex:'cordas-soltas' },
  { nome:'Um dedo por casa', nivel:1, para:'Cobrir 4 casas sem mexer a mão, com cada dedo responsável por uma casa.',
    passos:['Dedo 1 na primeira casa da posição, 2 na seguinte, e assim por diante.','Mantenha os dedos baixos, perto das cordas.','Só levante o dedo que vai tocar a próxima nota.','Nas primeiras casas, se a abertura for grande, use 1-2-4 (sistema Simandl).'],
    erro:'Forçar a abertura até doer. Comece no meio do braço e desça aos poucos.', ex:'permutacao' },
  { nome:'Abafamento (muting)', nivel:2, para:'Evitar que as cordas que você não está tocando fiquem soando e embolem o som.',
    passos:['Mão direita: o dedo que acabou de tocar descansa na corda de baixo.','O polegar pode ir para a corda E quando você toca nas agudas.','Mão esquerda: os dedos que não pressionam encostam de leve nas outras cordas.','Ao trocar de nota, solte a pressão para cortar a nota anterior.'],
    erro:'Achar que é “sujeira” do baixo. Corda soando sem querer é falta de abafamento.', ex:'oitavas' },
  { nome:'Hammer-on e pull-off (ligados)', nivel:2, para:'Tocar duas notas com uma só palhetada da mão direita, deixando a frase mais fluida.',
    passos:['Hammer-on: toque a nota e “martele” outro dedo numa casa à frente.','Pull-off: com dois dedos posicionados, toque a nota de cima e puxe o dedo de leve para baixo.','O volume da segunda nota deve ser parecido com o da primeira.','Treine na pentatônica: duas notas por corda é perfeito para isso.'],
    erro:'Martelar sem firmeza ou soltar sem puxar: a segunda nota quase não soa.', ex:'penta-braco' },
  { nome:'Slide (glissando)', nivel:2, para:'Ligar notas deslizando o dedo pela corda, típico de soul, funk e MPB.',
    passos:['Toque a nota e, sem soltar a pressão, deslize até a casa de destino.','Mantenha pressão constante durante o caminho.','Chegue no tempo certo: o slide termina na batida.','Use para trocar de posição sem pular.'],
    erro:'Aliviar a pressão no meio do caminho e a nota morrer.', ex:'uma-corda' },
  { nome:'Ghost notes (notas fantasma)', nivel:2, para:'Dar balanço ao groove com notas percussivas, sem altura definida.',
    passos:['Encoste os dedos da mão esquerda na corda sem pressionar até o traste.','Toque normalmente com a mão direita: sai um “tuc” abafado.','Coloque ghost notes entre as notas principais do groove.','Elas devem ser mais baixas que as notas reais.'],
    erro:'Ghost note alta demais ou com nota aparecendo. Ela é ritmo, não melodia.', ex:'groove' },
  { nome:'Slap e pop', nivel:3, para:'Som percussivo do funk e do gospel: o polegar bate na corda e os dedos puxam as agudas.',
    passos:['Slap: o osso do polegar bate na corda E ou A perto do fim do braço e quica de volta.','Pop: o indicador ou médio engancha a corda D ou G e solta.','Comece com oitavas: slap na nota grave, pop na oitava.','Use pouca força: o movimento é de girar o pulso, como abrir uma maçaneta.'],
    erro:'Bater com força e deixar o polegar na corda. Ele precisa quicar para a corda soar.', ex:'oitavas' }
];
function renderTecnicas() {                                                                  // monta os cartões
  $('#tec-grade').innerHTML = TECNICAS.map((t) => `
    <article class="cartao tec">
      <div class="topo-tec"><h3>${t.nome}</h3><span class="chip nv${t.nivel}">${['','Iniciante','Intermediário','Avançado'][t.nivel]}</span></div>
      <p class="texto">${t.para}</p>
      <ol class="lista">${t.passos.map((p) => `<li>${p}</li>`).join('')}</ol>
      <div class="caixa"><b>Erro comum:</b> ${t.erro}</div>
      <button class="botao" data-ir="${t.ex}">Praticar: ${EXERCICIOS.find((e) => e.id === t.ex).nome}</button>
    </article>`).join('');
}

/* =========================================================
   9) ABA: QUIZ
   ========================================================= */
const bQuiz = criarBraco($('#braco-quiz'), $('#num-quiz'));                                  // braço do quiz
const quiz = { alvo:null, pos:null, acertos:0, total:0, seq:0, travado:false, t:null };      // estado do quiz
function placar() {                                                                          // atualiza números
  $('#q-acertos').textContent = quiz.acertos; $('#q-total').textContent = quiz.total; $('#q-seq').textContent = quiz.seq; // contadores
  $('#q-pct').textContent = quiz.total ? Math.round((quiz.acertos / quiz.total) * 100) + '%' : '–'; // aproveitamento
}
function novaPergunta() {                                                                    // sorteia a próxima
  clearTimeout(quiz.t); quiz.travado = false; const area = estado.quizArea, a = afin();      // reset
  bQuiz.marcar(null);                              // limpa o braço
  if (estado.quizModo === 'encontrar') {                                                     // modo "encontre a nota"
    let pc; do { pc = Math.floor(Math.random() * 12); } while (pc === quiz.alvo);            // não repete a anterior
    quiz.alvo = pc; $('#q-respostas').hidden = true;                                         // guarda alvo e esconde botões
    $('#q-pergunta').innerHTML = `Encontre um <b>${NOTAS[pc]}</b> (${SOLFEJO[pc]}) em qualquer corda, entre as casas 0 e ${area}.`; // enunciado
  } else {                                                                                   // modo "que nota é essa?"
    const s = Math.floor(Math.random() * a.length), f = Math.floor(Math.random() * (area + 1)); // casa sorteada
    quiz.pos = { s, f, pc: (a[s].midi + f) % 12 };                                           // guarda a resposta
    bQuiz.pintar(bQuiz.cel(s, f), { tipo:'pergunta', texto:'?' });                           // marca com "?"
    bQuiz.cel(s, f).scrollIntoView({ block:'nearest', inline:'center' });                    // mostra no celular
    $('#q-pergunta').innerHTML = `Que nota é essa? Corda <b>${a[s].n}</b>, casa <b>${f}</b>.`; // enunciado
    $('#q-respostas').hidden = false;                                                        // mostra botões
    $('#q-respostas').innerHTML = NOTAS.map((n, i) => `<button data-pc="${i}">${n}</button>`).join(''); // 12 respostas
  }
}
function mostrarTodas(pc, tipo) {                                                            // pinta todas as ocorrências de uma nota
  const area = estado.quizArea;                                                              // região
  bQuiz.marcar((s, f, midi) => (midi % 12 === pc && f <= area ? { tipo, texto: NOTAS[pc] } : null)); // só dentro da região
}
bQuiz.aoClicar = (s, f, midi, cel) => {                                                      // clique no braço do quiz
  if (estado.quizModo !== 'encontrar' || quiz.travado) return true;                          // fora do modo: só toca
  quiz.total++;                                                                              // conta tentativa
  if (midi % 12 === quiz.alvo && f <= estado.quizArea) {                                     // acertou
    quiz.acertos++; quiz.seq++; quiz.travado = true; mostrarTodas(quiz.alvo, 'certo');       // mostra todas as posições
    $('#q-feedback').textContent = `Isso! ${NOTAS[quiz.alvo]} aparece em todas essas casas. Repare no desenho de oitava entre elas.`; // feedback
    quiz.t = setTimeout(novaPergunta, 1800);                                                 // próxima
  } else {                                                                                   // errou
    quiz.seq = 0; bQuiz.pintar(cel, { tipo:'errado', texto: NOTAS[midi % 12] });             // mostra qual nota foi tocada
    $('#q-feedback').textContent = `Essa é ${NOTAS[midi % 12]} (${SOLFEJO[midi % 12]}). Tente de novo.`; // feedback
    setTimeout(() => { if (!quiz.travado) bQuiz.pintar(cel, null); }, 1000);                 // apaga o erro
  }
  placar(); return true;                                                                     // toca a nota de qualquer jeito
};
$('#q-respostas').addEventListener('click', (ev) => {                                        // resposta no modo "que nota é essa?"
  const b = ev.target.closest('button'); if (!b || quiz.travado) return;                     // ignora fora do botão
  const pc = +b.dataset.pc, certo = pc === quiz.pos.pc; quiz.total++; quiz.travado = true;   // confere
  tocarNota(afin()[quiz.pos.s].midi + quiz.pos.f);                                           // toca a nota perguntada
  if (certo) { quiz.acertos++; quiz.seq++; b.classList.add('ok'); } else { quiz.seq = 0; b.classList.add('no'); $(`#q-respostas [data-pc="${quiz.pos.pc}"]`).classList.add('ok'); } // pinta botões
  bQuiz.pintar(bQuiz.cel(quiz.pos.s, quiz.pos.f), { tipo: certo ? 'certo' : 'errado', texto: NOTAS[quiz.pos.pc] }); // revela no braço
  $('#q-feedback').textContent = certo ? 'Certo!' : `Era ${NOTAS[quiz.pos.pc]} (${SOLFEJO[quiz.pos.pc]}).`; // feedback
  placar(); quiz.t = setTimeout(novaPergunta, 1600);                                         // próxima
});

/* =========================================================
   10) CONTROLES GERAIS E NAVEGAÇÃO
   ========================================================= */
function seg(id, chave, aoMudar, conv = (v) => v) {                                          // liga um grupo de botões segmentados a uma chave do estado
  const el = $(id);                                                                          // grupo
  const sync = () => el.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(conv(b.dataset.v) === estado[chave]))); // marca o ativo
  el.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; estado[chave] = conv(b.dataset.v); sync(); salvar(); aoMudar(); }); // clique
  sync();                                                                                    // estado inicial
}
function alternar(id) {                                                                      // botões liga/desliga (metrônomo, repetir)
  const el = $(id);                                                                          // grupo
  const sync = () => el.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(!!estado[b.dataset.v]))); // marca ligados
  el.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; estado[b.dataset.v] = !estado[b.dataset.v]; sync(); salvar(); }); // inverte
  sync();                                                                                    // inicial
}
function tudo() { pararSeq(); estado.janela = null; renderEscala(); renderEx(); novaPergunta(); } // redesenha todas as abas

$('#tons').innerHTML = NOTAS.map((n, i) => `<button class="tom" data-pc="${i}" aria-pressed="${i === estado.tom}">${n}</button>`).join(''); // 12 botões de tom
$('#tons').addEventListener('click', (ev) => {                                               // troca de tom
  const b = ev.target.closest('button'); if (!b) return;                                     // só botões
  estado.tom = +b.dataset.pc; salvar();                                                      // guarda
  $('#tons').querySelectorAll('.tom').forEach((x) => x.setAttribute('aria-pressed', String(+x.dataset.pc === estado.tom))); // marca
  tocarNota(afin()[off()].midi + casaNa(estado.tom, off())); tudo();                         // toca a tônica e redesenha
});
seg('#seg-cordas', 'cordas', () => { [bEsc, bEx, bQuiz].forEach((b) => b.construir()); tudo(); }, Number); // 4 ou 5 cordas
seg('#seg-rotulo', 'rotulo', () => { renderEscala(); baseEx(); });                           // nome nas bolinhas
seg('#seg-porbatida', 'porBatida', renderEx, Number);                                        // notas por tempo
seg('#seg-pontos', 'pontos', baseEx);                                                        // dedo ou nota
seg('#seg-quizmodo', 'quizModo', () => { quiz.alvo = null; novaPergunta(); });               // modo do quiz
seg('#seg-quizarea', 'quizArea', novaPergunta, Number);                                      // região do quiz
alternar('#seg-opcoes');                                                                     // metrônomo e repetir

$('#sel-escala').innerHTML = Object.entries(ESCALAS).map(([k, e]) => `<option value="${k}">${e.nome}</option>`).join(''); // opções de escala
$('#sel-escala').value = estado.escala;                                                      // valor salvo
$('#sel-escala').addEventListener('change', (ev) => { pararSeq(); estado.escala = ev.target.value; estado.janela = null; salvar(); renderEscala(); }); // troca escala
$('#pos-prox').addEventListener('click', () => { pararSeq(); const ps = posicoes(), i = estado.janela === null ? -1 : ps.indexOf(estado.janela); estado.janela = ps[(i + 1) % ps.length]; renderEscala(); }); // próxima posição
$('#pos-ant').addEventListener('click', () => { pararSeq(); const ps = posicoes(), i = estado.janela === null ? 0 : ps.indexOf(estado.janela); estado.janela = ps[(i - 1 + ps.length) % ps.length]; renderEscala(); }); // anterior
$('#pos-todo').addEventListener('click', () => { pararSeq(); estado.janela = null; renderEscala(); }); // braço todo
$('#tocar-pos').addEventListener('click', tocarPosicao);                                     // tocar posição
$('#caminhar').addEventListener('click', caminhar);                                          // caminhar
$('#parar-esc').addEventListener('click', pararSeq);                                         // parar
$('#graus').addEventListener('click', (ev) => { const b = ev.target.closest('.grau'); if (b) tocarNota(afin()[off()].midi + casaNa(+b.dataset.pc, off()) + (casaNa(+b.dataset.pc, off()) < casaNa(estado.tom, off()) ? 12 : 0)); }); // ouvir grau

const vel = $('#vel-escala'); vel.value = estado.velEscala; $('#vel-escala-v').textContent = estado.velEscala + ' bpm'; // slider da escala
vel.addEventListener('input', () => { estado.velEscala = +vel.value; $('#vel-escala-v').textContent = vel.value + ' bpm'; salvar(); }); // muda ao vivo
const bpm = $('#bpm'); bpm.value = estado.bpm; $('#bpm-v').textContent = estado.bpm + ' bpm';  // slider do exercício
bpm.addEventListener('input', () => { estado.bpm = +bpm.value; $('#bpm-v').textContent = bpm.value + ' bpm'; salvar(); }); // muda ao vivo

$('#sel-casa').innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">Casa ${i + 1}</option>`).join(''); // casas 1–12
$('#sel-casa').value = estado.casa; $('#sel-casa').addEventListener('change', (ev) => { estado.casa = +ev.target.value; salvar(); renderEx(); }); // casa inicial
$('#sel-perm').innerHTML = PERMUTACOES.map((p) => `<option value="${p}">${p.split('').join('-')}</option>`).join(''); // ordens de dedo
$('#sel-perm').value = estado.perm; $('#sel-perm').addEventListener('change', (ev) => { estado.perm = ev.target.value; salvar(); renderEx(); }); // permutação
$('#ex-lista').addEventListener('click', (ev) => { const b = ev.target.closest('.ex-item'); if (!b) return; estado.ex = b.dataset.id; salvar(); renderEx(); }); // escolhe exercício
$('#ex-tocar').addEventListener('click', tocarEx);                                           // tocar exercício
$('#ex-parar').addEventListener('click', pararSeq);                                          // parar
$('#quiz-pular').addEventListener('click', () => { quiz.seq = 0; placar(); novaPergunta(); }); // pular pergunta
$('#tec-grade').addEventListener('click', (ev) => { const b = ev.target.closest('[data-ir]'); if (!b) return; estado.ex = b.dataset.ir; salvar(); renderEx(); location.hash = 'exercicios'; }); // "Praticar" leva ao exercício

const VISTAS = ['escalas', 'exercicios', 'tecnicas', 'quiz'];                                // abas válidas
function mostrarVista() {                                                                    // mostra a aba do endereço (#escalas etc.)
  const v = VISTAS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'escalas';    // padrão: escalas
  pararSeq();                                                                                // para o som ao trocar de aba
  VISTAS.forEach((x) => { $('#v-' + x).hidden = x !== v; });                                 // esconde as outras
  document.querySelectorAll('.aba').forEach((a) => a.setAttribute('aria-selected', String(a.dataset.vista === v))); // marca a aba
}
document.querySelector('.abas').addEventListener('click', (ev) => { const b = ev.target.closest('.aba'); if (b) location.hash = b.dataset.vista; }); // clique na aba
window.addEventListener('hashchange', mostrarVista);                                         // botão voltar do navegador

/* ---------- Início ---------- */
[bEsc, bEx, bQuiz].forEach((b) => b.construir());                                            // desenha os 3 braços
renderTecnicas(); renderEscala(); renderEx(); novaPergunta(); placar(); mostrarVista();       // monta tudo

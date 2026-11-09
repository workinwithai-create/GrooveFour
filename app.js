const CDN = "https://cdn.jsdelivr.net/gh/workinwithai-create/PreEight@d58301e4a494555f411a2afbc448b724136eee76/public/samples";
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;
const BARS = 4;
const STEPS_PER_BAR = 16;
const TOTAL_STEPS = BARS * STEPS_PER_BAR;

const recipes = [
  { id: "straight", name: "Straight pocket", blurb: "Kick on 1 and 3, snare on 2 and 4, hats on eighths." },
  { id: "offbeat", name: "Offbeat hats", blurb: "Hats on the ands. Upright walks roots." },
  { id: "sparse", name: "Sparse", blurb: "Kick sparse, piano stabs, nylon answers." },
  { id: "busy", name: "Busy", blurb: "More hats, walking bass, piano chords." }
];

const state = {
  bpm: 98,
  key: "A minor",
  recipe: "straight",
  mutes: { kit: false, bass: false, piano: false, nylon: false },
  playing: false,
  bars: BARS
};

let ctx, master, compressor, buffers = {}, rawBuffers = {}, activeSources = [], nextStepTime = 0, step = 0, timerId = null, playheadRAF = null;

function saveState() {
  localStorage.setItem("groovefour", JSON.stringify({ bpm: state.bpm, key: state.key, recipe: state.recipe, mutes: state.mutes }));
}
function loadState() {
  const s = localStorage.getItem("groovefour");
  if (s) Object.assign(state, JSON.parse(s));
  document.getElementById("bpm").value = state.bpm;
  document.getElementById("key").value = state.key;
  document.getElementById("recipe").value = state.recipe;
  document.getElementById("mute-kit").checked = !state.mutes.kit;
  document.getElementById("mute-bass").checked = !state.mutes.bass;
  document.getElementById("mute-piano").checked = !state.mutes.piano;
  document.getElementById("mute-nylon").checked = !state.mutes.nylon;
}

async function initAudio() {
  if (ctx) return;
  ctx = new AudioContext({ sampleRate: 48000 });
  compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -1;
  compressor.knee.value = 0;
  compressor.ratio.value = 20;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.1;
  master = ctx.createGain();
  master.gain.value = 0.7;
  master.connect(compressor);
  compressor.connect(ctx.destination);
  document.getElementById("status").textContent = "Loading samples...";
  const files = [
    ["kick", `${CDN}/drums/kick.mp3`],
    ["snare", `${CDN}/drums/snare.mp3`],
    ["hat", `${CDN}/drums/hihat.mp3`],
    ["crash", `${CDN}/drums/crash.mp3`],
    ["pC3", `${CDN}/piano/C3.mp3`],
    ["pC4", `${CDN}/piano/C4.mp3`],
    ["pA3", `${CDN}/piano/A3.mp3`],
    ["bE1", `${CDN}/bass/E1.mp3`],
    ["bA1", `${CDN}/bass/A1.mp3`],
    ["bC2", `${CDN}/bass/C2.mp3`],
    ["gE2", `${CDN}/guitar/E2.mp3`],
    ["gA2", `${CDN}/guitar/A2.mp3`],
    ["gE3", `${CDN}/guitar/E3.mp3`]
  ];
  let loaded = 0;
  for (const [name, url] of files) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      const ab = await res.arrayBuffer();
      rawBuffers[name] = ab;
      buffers[name] = await ctx.decodeAudioData(ab.slice(0));
      loaded++;
      document.getElementById("status").textContent = `Seating chairs ${loaded}/${files.length}`;
    } catch (e) {
      document.getElementById("status").textContent = `Missing: ${name}`;
      console.error(name, e);
      return;
    }
  }
  document.getElementById("status").textContent = "Ready. Tap play.";
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function pickSample(namePrefix, midi) {
  const map = {
    p: [["pC3", 48], ["pC4", 60], ["pA3", 57]],
    b: [["bE1", 28], ["bA1", 33], ["bC2", 36]],
    g: [["gE2", 40], ["gA2", 45], ["gE3", 52]]
  };
  const list = map[namePrefix] || [];
  let best = list[0], bestDiff = 99;
  for (const [n, m] of list) {
    const d = Math.abs(m - midi);
    if (d < bestDiff) { best = [n, m]; bestDiff = d; }
  }
  const rate = Math.pow(2, (midi - best[1]) / 12);
  if (Math.abs(midi - best[1]) > 4) return null;
  return { name: best[0], rate };
}

function scheduleNote(when, name, rate = 1, gain = 0.6, duration = 0.1) {
  if (!buffers[name]) return;
  const src = ctx.createBufferSource();
  src.buffer = buffers[name];
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(gain, when + 0.01);
  g.gain.setValueAtTime(gain, when + Math.max(0, duration - 0.02));
  g.gain.linearRampToValueAtTime(0, when + duration);
  src.connect(g);
  g.connect(master);
  src.start(when);
  src.stop(when + duration + 0.05);
  activeSources.push(src);
}

function getChordNotes(key, bar) {
  const progs = {
    "A minor": [[57,60,64], [53,57,60], [60,64,67], [55,59,62]],
    "C major": [[60,64,67], [55,59,62], [57,60,64], [53,57,60]],
    "D minor": [[62,65,69], [57,60,64], [60,64,67], [55,59,62]],
    "E major": [[64,68,71], [59,63,66], [66,69,73], [61,65,68]],
    "G major": [[67,71,74], [62,66,69], [64,67,71], [59,62,66]]
  };
  return progs[key][bar % 4] || [60,64,67];
}

function scheduleStep(s, when) {
  const bar = Math.floor(s / STEPS_PER_BAR);
  const stepInBar = s % STEPS_PER_BAR;
  const recipe = state.recipe;
  const stepDur = 60 / state.bpm / 4;

  if (!state.mutes.kit) {
    if (recipe === "straight" || recipe === "busy") {
      if (stepInBar === 0 || stepInBar === 8) scheduleNote(when, "kick", 1, 0.8, 0.15);
      if (stepInBar === 4 || stepInBar === 12) scheduleNote(when, "snare", 1, 0.6, 0.15);
      if (stepInBar % 2 === 0) scheduleNote(when, "hat", 1, 0.3, 0.08);
    } else if (recipe === "offbeat") {
      if (stepInBar === 0 || stepInBar === 8) scheduleNote(when, "kick", 1, 0.7, 0.15);
      if (stepInBar === 4 || stepInBar === 12) scheduleNote(when, "snare", 1, 0.5, 0.15);
      if (stepInBar % 2 === 1) scheduleNote(when, "hat", 1, 0.25, 0.08);
    } else {
      if (stepInBar === 0) scheduleNote(when, "kick", 1, 0.7, 0.15);
      if (stepInBar === 8) scheduleNote(when, "snare", 1, 0.4, 0.15);
    }
  }

  if (!state.mutes.bass && (stepInBar === 0 || stepInBar === 8)) {
    const root = getChordNotes(state.key, bar)[0] - 24;
    const sm = pickSample("b", root);
    if (sm) scheduleNote(when, sm.name, sm.rate, 0.5, stepDur * 4);
  }

  if (stepInBar === 0 || (recipe === "busy" && stepInBar === 8)) {
    const notes = getChordNotes(state.key, bar);
    if (!state.mutes.piano) {
      notes.forEach((n, i) => {
        const sm = pickSample("p", n);
        if (sm) scheduleNote(when + i * 0.01, sm.name, sm.rate, 0.25, stepDur * 8);
      });
    }
    if (!state.mutes.nylon && recipe !== "sparse") {
      notes.forEach((n, i) => {
        const sm = pickSample("g", n - 12);
        if (sm) scheduleNote(when + 0.05 + i * 0.01, sm.name, sm.rate, 0.2, stepDur * 4);
      });
    }
  }
}

function scheduler() {
  while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD) {
    scheduleStep(step, nextStepTime);
    const stepDur = 60 / state.bpm / 4;
    nextStepTime += stepDur;
    step = (step + 1) % TOTAL_STEPS;
  }
}

function start() {
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  stop();
  state.playing = true;
  nextStepTime = ctx.currentTime + 0.1;
  step = 0;
  timerId = setInterval(scheduler, LOOKAHEAD_MS);
  playheadRAF = requestAnimationFrame(updatePlayhead);
  document.getElementById("status").textContent = "Playing";
}

function stop() {
  if (timerId) clearInterval(timerId);
  timerId = null;
  state.playing = false;
  activeSources.forEach(s => { try { s.stop(); } catch(e){} });
  activeSources = [];
  if (playheadRAF) cancelAnimationFrame(playheadRAF);
  document.getElementById("playhead-bar").style.width = "0%";
  document.getElementById("status").textContent = "Stopped";
}

function updatePlayhead() {
  if (!state.playing || !ctx) return;
  const pos = ((step / TOTAL_STEPS) * 100) % 100;
  document.getElementById("playhead-bar").style.width = pos + "%";
  playheadRAF = requestAnimationFrame(updatePlayhead);
}

async function exportWAV() {
  document.getElementById("status").textContent = "Rendering...";
  const sampleRate = 48000;
  const duration = BARS * 4 * 60 / state.bpm;
  const length = Math.round(duration * sampleRate);
  const offline = new OfflineAudioContext(2, length + sampleRate, sampleRate);
  const offBuffers = {};
  for (const [name, ab] of Object.entries(rawBuffers)) {
    offBuffers[name] = await offline.decodeAudioData(ab.slice(0));
  }
  let t = 0;
  const stepDur = 60 / state.bpm / 4;
  for (let s = 0; s < TOTAL_STEPS; s++) {
    t += stepDur;
  }
  const src = offline.createBufferSource();
  src.buffer = offBuffers.kick;
  src.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();
  const wav = audioBufferToWav(rendered, length);
  const blob = new Blob([wav], { type: "audio/wav" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `groovefour-recipe-${state.bpm}bpm-${state.key.replace(" ","")}.wav`;
  a.click();
  document.getElementById("status").textContent = "WAV exported";
}

function audioBufferToWav(buffer, exactLength) {
  const numChannels = 2;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const samples = exactLength || buffer.length;
  const dataLength = samples * numChannels * (bitDepth / 8);
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, bufferLength - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);
  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i] || 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }
  return arrayBuffer;
}

function exportMIDI() {
  const a = document.createElement("a");
  a.href = "data:text/plain,MIDI export placeholder - implement full SMF in production";
  a.download = `groovefour-recipe-${state.bpm}bpm-${state.key.replace(" ","")}.mid`;
  a.click();
  document.getElementById("status").textContent = "MIDI exported (stub)";
}

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  recipes.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.id; opt.textContent = r.name;
    document.getElementById("recipe").appendChild(opt);
  });
  document.getElementById("recipe").value = state.recipe;
  document.body.addEventListener("click", initAudio, { once: true });
  document.getElementById("play").addEventListener("click", start);
  document.getElementById("stop").addEventListener("click", stop);
  document.getElementById("export-wav").addEventListener("click", exportWAV);
  document.getElementById("export-mid").addEventListener("click", exportMIDI);
  ["bpm","key","recipe"].forEach(id => document.getElementById(id).addEventListener("change", e => {
    state[id] = id === "bpm" ? +e.target.value : e.target.value;
    saveState();
  }));
  ["kit","bass","piano","nylon"].forEach(ch => {
    document.getElementById("mute-"+ch).addEventListener("change", e => {
      state.mutes[ch] = !e.target.checked;
      saveState();
    });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });
});
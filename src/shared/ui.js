// Shared browser pieces for both acts: settings, analytics, sound, the ending card and its share buttons,
// the endings gallery and the challenge banner. Vanilla DOM, like the two games.
import { ENDINGS, ENDING_BY_ID, parseEndingParam } from "./endings.js";
import { KEYS, foundEndings, store } from "./storage.js";

// ---- Settings (embedded in each page by the build) and analytics ----

export function readConfig() {
  try {
    return JSON.parse(document.getElementById("site-config")?.textContent || "{}");
  } catch {
    return {};
  }
}

export const CONFIG = typeof document !== "undefined" ? readConfig() : {};

// Counts an event only when the owner has switched analytics on, and never for automated browsers.
export function track(event) {
  try {
    if (navigator.webdriver) return;
    window.goatcounter?.count?.({ path: `event/${event}`, title: event, event: true });
  } catch {
    // analytics must never break the game
  }
}

// ---- Sound: short WebAudio blips. Off until the player turns it on. ----

let audio = null;
export function soundOn() {
  return store.get(KEYS.sound) === "on";
}
export function setSound(on) {
  store.set(KEYS.sound, on ? "on" : "off");
}
const TONES = {
  click: [[660, 0.04, "square", 0.035]],
  buy: [[520, 0.06, "triangle", 0.06], [780, 0.08, "triangle", 0.05]],
  good: [[523, 0.09, "sine", 0.07], [659, 0.09, "sine", 0.07], [784, 0.14, "sine", 0.07]],
  bad: [[220, 0.16, "sawtooth", 0.05], [165, 0.22, "sawtooth", 0.05]],
  ending: [[392, 0.18, "sine", 0.08], [494, 0.18, "sine", 0.08], [587, 0.32, "sine", 0.08]],
};
export function sfx(name) {
  if (!soundOn()) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    let at = audio.currentTime;
    for (const [frequency, duration, type, volume] of TONES[name] || []) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(at);
      oscillator.stop(at + duration + 0.02);
      at += duration * 0.8;
    }
  } catch {
    // no audio available
  }
}

// A small toggle button; `className` matches each act's own icon or button style.
export function mountSoundToggle(container, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.dataset.testid = "sound-toggle";
  const paint = () => {
    const on = soundOn();
    button.textContent = on ? "♪ ON" : "♪ OFF";
    button.title = on ? "Sound on (click to mute)" : "Sound off (click to turn on)";
    button.setAttribute("aria-pressed", String(on));
  };
  button.addEventListener("click", () => {
    setSound(!soundOn());
    paint();
    sfx("buy");
  });
  paint();
  container.appendChild(button);
  return button;
}

// ---- Clipboard and image helpers ----

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const done = document.execCommand("copy");
      area.remove();
      return done;
    } catch {
      return false;
    }
  }
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    } catch {
      resolve(null);
    }
  });
}

// ---- The ending card (1200x630, drawn on the player's device) ----

const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

function fitFont(context, text, weight, size, maxWidth) {
  let current = size;
  context.font = `${weight} ${current}px ${MONO}`;
  while (context.measureText(text).width > maxWidth && current > 12) {
    current -= 2;
    context.font = `${weight} ${current}px ${MONO}`;
  }
  return current;
}

export function drawEndingCard(canvas, { ending, stats, foundCount, siteLabel }) {
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext("2d");
  if (!context) return false;
  const act2 = ending.act === 2;
  const accent = ending.good ? (act2 ? "#35e0a1" : "#3ad8cc") : act2 ? "#ff5c47" : "#f0a83c";
  const background = context.createLinearGradient(0, 0, 0, 630);
  background.addColorStop(0, act2 ? "#11151c" : "#12121a");
  background.addColorStop(1, act2 ? "#080a0e" : "#08080b");
  context.fillStyle = background;
  context.fillRect(0, 0, 1200, 630);
  const glow = context.createRadialGradient(600, -40, 10, 600, -40, 700);
  glow.addColorStop(0, ending.good ? "rgba(53,224,161,0.18)" : "rgba(240,168,60,0.16)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 1200, 630);
  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.strokeRect(28.5, 28.5, 1143, 573);

  context.fillStyle = "#71718a";
  context.font = `700 20px ${MONO}`;
  context.fillText(act2 ? "COHERENCE CORP  vs  COAGULATION CORP  ·  ACT II" : "COAGULATION CORP  ·  ACT I", 64, 86);
  context.fillStyle = accent;
  context.font = `700 22px ${MONO}`;
  const index = ENDINGS.findIndex((candidate) => candidate.id === ending.id) + 1;
  context.fillText(`ENDING ${index} OF ${ENDINGS.length}`, 64, 168);
  const size = fitFont(context, ending.title, 800, 96, 1070);
  context.shadowColor = accent;
  context.shadowBlur = 28;
  context.fillText(ending.title, 60, 168 + 22 + size);
  context.shadowBlur = 0;
  context.fillStyle = "#c3cfda";
  context.font = `400 28px ${MONO}`;
  context.fillText(ending.subtitle, 64, 168 + 22 + size + 54);

  context.fillStyle = "#24242f";
  context.fillRect(64, 440, 1072, 2);
  context.fillStyle = "#d6d6e0";
  const statLine = stats.filter(Boolean).join("   ·   ");
  fitFont(context, statLine, 600, 24, 1072);
  context.fillText(statLine, 64, 486);

  context.fillStyle = accent;
  context.font = `700 22px ${MONO}`;
  context.fillText(`${foundCount} OF ${ENDINGS.length} ENDINGS FOUND`, 64, 548);
  context.fillStyle = "#8b98a8";
  const site = `${siteLabel}`;
  fitFont(context, site, 600, 20, 560);
  context.textAlign = "right";
  context.fillText(site, 1136, 548);
  context.textAlign = "left";
  context.fillStyle = "#4a4a5c";
  context.font = `600 15px ${MONO}`;
  context.fillText("A SATIRICAL INCREMENTAL GAME · A WORK OF FICTION · EVERY COMPANY AND PERSON IS INVENTED", 64, 584);
  return true;
}

// Card, share buttons and the gallery, mounted inside an act's ending modal.
export function mountEndingShare(container, { ending, stats, onNotice }) {
  const config = CONFIG;
  const siteUrl = config.siteUrl || location.origin;
  const found = foundEndings();
  const foundCount = ENDINGS.filter((candidate) => found[candidate.id]).length;
  const link = `${siteUrl}/?ending=${ending.id}`;
  const text = `I reached the ${ending.title} ending (${foundCount} of ${ENDINGS.length} found) in Coagulation Corp, a free satirical incremental game about attention, capital and the race to superintelligence. Can you find the others?`;

  const wrap = document.createElement("div");
  wrap.className = "ending-share";
  wrap.dataset.testid = "ending-share";
  const canvas = document.createElement("canvas");
  canvas.className = "ending-card";
  canvas.dataset.testid = "ending-card";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", `Ending card: ${ending.title}, ${ending.subtitle}`);
  const drawn = drawEndingCard(canvas, { ending, stats, foundCount, siteLabel: siteUrl.replace(/^https?:\/\//, "") });
  canvas.dataset.drawn = drawn ? "yes" : "no";
  const buttons = document.createElement("div");
  buttons.className = "ending-buttons";
  const make = (label, testid, handler) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.testid = testid;
    button.addEventListener("click", handler);
    buttons.appendChild(button);
    return button;
  };
  const notice = (message) => (onNotice ? onNotice(message) : null);
  make("SHARE", "share-native", async () => {
    const blob = await canvasToBlob(canvas);
    try {
      if (blob && typeof File === "function" && navigator.canShare) {
        const file = new File([blob], `coagulation-corp-${ending.id}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: `${text} ${link}` });
          track("share_native");
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({ title: "Coagulation Corp", text, url: link });
        track("share_native");
        return;
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
    const copied = await copyText(`${text} ${link}`);
    track("share_copy");
    notice(copied ? "Link copied." : `Copy this link: ${link}`);
  });
  make("SAVE CARD", "share-download", async () => {
    const blob = await canvasToBlob(canvas);
    if (!blob) return notice("This browser could not make the image. Take a screenshot instead.");
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `coagulation-corp-${ending.id}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    track("share_download");
  });
  make("COPY LINK", "share-copy", async () => {
    const copied = await copyText(`${text} ${link}`);
    track("share_copy");
    notice(copied ? "Link copied. Whoever opens it sees which ending you reached." : `Copy this link: ${link}`);
  });
  const anchor = document.createElement("a");
  anchor.className = "ending-link";
  anchor.href = link;
  anchor.dataset.testid = "share-link";
  anchor.textContent = link.replace(/^https?:\/\//, "");
  wrap.append(canvas, buttons, anchor, galleryElement(ending.id));
  container.appendChild(wrap);
  return wrap;
}

// The ten endings, found ones named, the rest hidden.
export function galleryElement(currentId) {
  const found = foundEndings();
  const box = document.createElement("div");
  box.className = "ending-gallery";
  box.dataset.testid = "ending-gallery";
  const count = ENDINGS.filter((ending) => found[ending.id]).length;
  const head = document.createElement("div");
  head.className = "ending-gallery-head";
  head.textContent = `ENDINGS FOUND · ${count}/${ENDINGS.length}`;
  box.appendChild(head);
  const list = document.createElement("ol");
  for (const ending of ENDINGS) {
    const item = document.createElement("li");
    const known = Boolean(found[ending.id]);
    item.className = `${known ? "found" : "hidden"}${ending.id === currentId ? " current" : ""}${ending.good ? " good" : ""}`;
    item.textContent = known ? `${ending.title}` : `ACT ${ending.act === 1 ? "I" : "II"} · ???`;
    item.title = known ? ending.subtitle : "Not found yet";
    list.appendChild(item);
  }
  box.appendChild(list);
  return box;
}

// A visitor arriving from a shared ending link sees which ending their friend reached.
export function challengeEnding() {
  const fromLink = parseEndingParam(location.search);
  if (fromLink) store.set(KEYS.challenge, fromLink);
  const id = fromLink || store.get(KEYS.challenge);
  return id && ENDING_BY_ID.has(id) ? ENDING_BY_ID.get(id) : null;
}

export function dismissChallenge() {
  store.remove(KEYS.challenge);
}

export function mountChallengeBanner(container, className) {
  const ending = challengeEnding();
  if (!ending) return null;
  const banner = document.createElement("div");
  banner.className = className;
  banner.dataset.testid = "challenge-banner";
  const text = document.createElement("span");
  text.textContent = `A friend reached the ${ending.title} ending. There are ${ENDINGS.length} endings in all. Can you find a better one?`;
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "Dismiss");
  close.addEventListener("click", () => {
    dismissChallenge();
    banner.remove();
  });
  banner.append(text, close);
  container.prepend(banner);
  return banner;
}

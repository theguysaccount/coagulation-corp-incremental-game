// localStorage can be missing or blocked (private windows, embedded frames). The game still plays without it.

export const KEYS = {
  act1: "coagulation-corp-act1-save-v1",
  act2: "coagulation-corp-act2-save-v1",
  defection: "coagulation-corp-defection-v1",
  endings: "coagulation-corp-endings-v1",
  sound: "coagulation-corp-sound-v1",
  challenge: "coagulation-corp-challenge-v1",
};

export const store = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // nothing to remove
    }
  },
  getJson(key) {
    try {
      const raw = this.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setJson(key, value) {
    return this.set(key, JSON.stringify(value));
  },
};

// Endings found on this device, across every run: { "<ending id>": { at, time } }.
export function foundEndings() {
  const found = store.getJson(KEYS.endings);
  return found && typeof found === "object" && !Array.isArray(found) ? found : {};
}

export function recordEnding(id, details) {
  const found = foundEndings();
  const first = !found[id];
  if (first) found[id] = { at: new Date().toISOString().slice(0, 10), ...details };
  store.setJson(KEYS.endings, found);
  return { found, first };
}

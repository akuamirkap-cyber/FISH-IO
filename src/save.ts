import type { Upgrades } from "./game/engine";
import { SKINS } from "./game/species";

// every fish is unlocked from the start
const ALL_SKINS = () => SKINS.map((s) => s.id);

export interface SaveData {
  coins: number;
  upgrades: Upgrades;
  owned: string[];
  skin: string;
  name: string;
  best: number;
  speedPref: number;
}

const KEY = "ffio-save-v1";

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      const owned = ALL_SKINS();
      return {
        coins: d.coins ?? 0,
        upgrades: { suck: 0, speed: 0, size: 0, ...(d.upgrades || {}) },
        owned,
        skin: owned.includes(d.skin) ? d.skin : "andy",
        name: d.name ?? "",
        best: d.best ?? 0,
        speedPref: typeof d.speedPref === "number" ? Math.max(0.7, Math.min(1.8, d.speedPref)) : 1.0,
      };
    }
  } catch {
    /* ignore */
  }
  return { coins: 0, upgrades: { suck: 0, speed: 0, size: 0 }, owned: ALL_SKINS(), skin: "andy", name: "", best: 0, speedPref: 1.0 };
}

export function writeSave(d: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

export const UPGRADE_COSTS = [40, 100, 220, 450, 800];
export const MAX_UPGRADE = UPGRADE_COSTS.length;

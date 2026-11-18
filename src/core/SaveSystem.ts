import { DryingSlotState, InventorySlot, SaveData, TilePlotState } from '../data/types';

const SAVE_KEY = 'tra_quan_tren_may_save_v1';

export const FARM_ORIGIN_X = -10;
export const FARM_ORIGIN_Z = 0;
export const FARM_BASE_COLS = 8;
export const FARM_MAX_COLS = 10;
export const FARM_ROWS = 6;

export function createInitialPlots(): TilePlotState[] {
  const plots: TilePlotState[] = [];
  for (let gy = 0; gy < FARM_ROWS; gy++) {
    for (let gx = 0; gx < FARM_MAX_COLS; gx++) {
      // Tạo sẵn 2 ô đất đã cuốc + trồng sẵn trà non ở đầu game để người chơi dễ làm quen
      const isStarter = gy === 1 && (gx === 1 || gx === 2);
      plots.push({
        gx,
        gy,
        tilled: isStarter,
        watered: false,
        cropId: isStarter ? 'green_tea' : null,
        stage: isStarter ? 1 : 0,
        daysGrown: isStarter ? 1 : 0,
      });
    }
  }
  return plots;
}

export function createInitialDryingRack(): DryingSlotState[] {
  return [
    { id: 0, inputItemId: null, outputItemId: null, quality: 1, daysRemaining: 0 },
    { id: 1, inputItemId: null, outputItemId: null, quality: 1, daysRemaining: 0 },
    { id: 2, inputItemId: null, outputItemId: null, quality: 1, daysRemaining: 0 },
  ];
}

export function createDefaultSave(): SaveData {
  const inventory: (InventorySlot | null)[] = new Array(24).fill(null);
  inventory[0] = { itemId: 'hoe', count: 1, quality: 1 };
  inventory[1] = { itemId: 'watering_can', count: 1, quality: 1 };
  inventory[2] = { itemId: 'basket', count: 1, quality: 1 };
  inventory[3] = { itemId: 'seed_green_tea', count: 6, quality: 1 };
  inventory[4] = { itemId: 'seed_chrysanthemum', count: 3, quality: 1 };
  inventory[5] = { itemId: 'seed_mint', count: 3, quality: 1 };
  inventory[6] = { itemId: 'leaf_green_tea_fresh', count: 2, quality: 1 };
  inventory[7] = { itemId: 'honey', count: 2, quality: 1 };

  return {
    version: 1,
    day: 1,
    season: 'Xuân',
    timeMinutes: 360, // 06:00
    weather: 'sunny',
    money: 150,
    playerPos: { x: -2, z: -2 },
    selectedHotbarIndex: 0,
    inventory,
    plots: createInitialPlots(),
    dryingRack: createInitialDryingRack(),
    unlockedRecipes: ['recipe_green_pure'],
    relations: {
      may: { points: 0, talkedToday: false, giftedToday: false, seenMemories: [] },
      co_lu: { points: 0, talkedToday: false, giftedToday: false, seenMemories: [] },
      ong_dang: { points: 0, talkedToday: false, giftedToday: false, seenMemories: [] },
      be_suong: { points: 0, talkedToday: false, giftedToday: false, seenMemories: [] },
    },
    upgrades: {
      wateringCanLevel: 1,
      extraTableUnlocked: false,
      expandedFarmUnlocked: false,
      decorLanterns: false,
      decorWindChime: false,
      decorPottedPlants: false,
    },
    introRead: false,
  };
}

export class SaveSystem {
  public save(data: SaveData): boolean {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  public load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SaveData;
      if (!parsed || parsed.version !== 1) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  public clear(): void {
    localStorage.removeItem(SAVE_KEY);
  }
}

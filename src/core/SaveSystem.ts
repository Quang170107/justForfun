import { CROPS, ITEMS } from '../data/crops';
import { isDecorItemId } from '../data/economy';
import { CLEANUP_SPOTS, createDefaultStoryState } from '../data/story';
import {
  CropId,
  DryingSlotState,
  InventorySlot,
  ItemId,
  NpcRelationState,
  PlacedDecorState,
  SaveData,
  TilePlotState,
  WeatherType,
} from '../data/types';
import { rollRandomWeather, WEATHER_CONFIG } from '../data/weather';

const SAVE_KEY = 'tra_quan_tren_may_save_v1';
export const CURRENT_SAVE_VERSION = 4;

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
  inventory[6] = { itemId: 'leaf_green_tea_fresh', count: 4, quality: 1 };
  inventory[7] = { itemId: 'honey', count: 2, quality: 1 };

  return {
    saveVersion: CURRENT_SAVE_VERSION,
    version: CURRENT_SAVE_VERSION,
    day: 1,
    season: 'Xuân',
    timeMinutes: 360, // 06:00
    weather: 'sunny',
    tomorrowWeather: rollRandomWeather(),
    money: 150,
    playerPos: { x: -2, z: -2 },
    selectedHotbarIndex: 0,
    inventory,
    plots: createInitialPlots(),
    dryingRack: createInitialDryingRack(),
    unlockedRecipes: [],
    relations: {
      may: { points: 0, talkedToday: false, giftedToday: false, seenMemories: [] },
      co_lu: { points: 0, talkedToday: false, giftedToday: false, seenMemories: [] },
      ong_dang: { points: 0, talkedToday: false, giftedToday: false, seenMemories: [] },
      be_suong: { points: 0, talkedToday: false, giftedToday: false, seenMemories: [] },
    },
    upgrades: {
      wateringCanLevel: 1,
      tableCount: 3,
      extraTableUnlocked: false,
      expandedFarmUnlocked: false,
      decorLanterns: false,
      decorWindChime: false,
      decorPottedPlants: false,
    },
    shippingBin: [],
    placedDecors: [],
    introRead: false,
    story: createDefaultStoryState(),
  };
}

function isValidItemId(id: unknown): id is ItemId {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(ITEMS, id);
}

function isValidCropId(id: unknown): id is CropId {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(CROPS, id);
}

function isValidWeather(w: unknown): w is WeatherType {
  return typeof w === 'string' && Object.prototype.hasOwnProperty.call(WEATHER_CONFIG, w);
}

function sanitizeQuality(q: unknown): 1 | 2 | 3 {
  return q === 3 || q === 2 ? q : 1;
}

function sanitizeSlot(raw: unknown): InventorySlot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Partial<InventorySlot>;
  if (!isValidItemId(r.itemId)) return null;
  if (typeof r.count !== 'number' || !Number.isFinite(r.count) || r.count < 1) return null;
  return {
    itemId: r.itemId,
    count: Math.floor(r.count),
    quality: sanitizeQuality(r.quality),
  };
}

function sanitizeRelation(
  raw: Partial<NpcRelationState> | undefined,
  fallback: NpcRelationState
): NpcRelationState {
  if (!raw || typeof raw !== 'object') {
    return { ...fallback, seenMemories: [...fallback.seenMemories] };
  }
  const pts =
    typeof raw.points === 'number' && Number.isFinite(raw.points)
      ? Math.max(0, Math.min(1000, Math.floor(raw.points)))
      : fallback.points;
  const memories = Array.isArray(raw.seenMemories)
    ? raw.seenMemories.filter((m): m is number => typeof m === 'number' && Number.isFinite(m))
    : [...fallback.seenMemories];
  return {
    points: pts,
    talkedToday: Boolean(raw.talkedToday),
    giftedToday: Boolean(raw.giftedToday),
    seenMemories: memories,
  };
}

export class SaveSystem {
  public hasSave(): boolean {
    return this.load() !== null;
  }

  public getSaveMeta(): { day: number; season: string; money: number; saveVersion: number } | null {
    const data = this.load();
    if (!data) return null;
    return {
      day: data.day,
      season: data.season,
      money: data.money,
      saveVersion: data.saveVersion,
    };
  }

  public save(data: SaveData): boolean {
    try {
      const payload: SaveData = {
        ...data,
        saveVersion: CURRENT_SAVE_VERSION,
        version: CURRENT_SAVE_VERSION,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  public load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

      const ver = parsed.saveVersion ?? parsed.version ?? 0;
      if (typeof ver !== 'number' || !Number.isFinite(ver) || ver < 1 || ver > CURRENT_SAVE_VERSION) {
        return null;
      }

      const defaults = createDefaultSave();
      const mergedUpgrades = { ...defaults.upgrades, ...parsed.upgrades };
      if (
        parsed.upgrades?.tableCount !== 3 &&
        parsed.upgrades?.tableCount !== 4 &&
        parsed.upgrades?.tableCount !== 5
      ) {
        mergedUpgrades.tableCount = mergedUpgrades.extraTableUnlocked ? 4 : 3;
      }
      mergedUpgrades.extraTableUnlocked = mergedUpgrades.tableCount >= 4;
      mergedUpgrades.wateringCanLevel = mergedUpgrades.wateringCanLevel === 2 ? 2 : 1;
      mergedUpgrades.expandedFarmUnlocked = Boolean(mergedUpgrades.expandedFarmUnlocked);

      const defaultStory = createDefaultStoryState();
      const legacyProgress = !parsed.story && ((parsed.day ?? 1) > 1 || Boolean(parsed.introRead));
      const strArr = (v: unknown, fb: string[]) =>
        Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : fb;
      const nonNegInt = (v: unknown, fb: number) =>
        typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fb;

      const mergedStory =
        parsed.story && typeof parsed.story === 'object'
          ? {
              ...defaultStory,
              ...parsed.story,
              introCompleted: Boolean(parsed.story.introCompleted),
              teahouseCleaned: Boolean(parsed.story.teahouseCleaned),
              lanternFestivalDone: Boolean(parsed.story.lanternFestivalDone),
              springCompleted: Boolean(parsed.story.springCompleted),
              totalTeasBrewed: nonNegInt(parsed.story.totalTeasBrewed, defaultStory.totalTeasBrewed),
              totalCustomersServed: nonNegInt(
                parsed.story.totalCustomersServed,
                defaultStory.totalCustomersServed
              ),
              totalMoneyEarned: nonNegInt(parsed.story.totalMoneyEarned, defaultStory.totalMoneyEarned),
              cleanedSpots: strArr(parsed.story.cleanedSpots, defaultStory.cleanedSpots),
              unlockedLetters:
                strArr(parsed.story.unlockedLetters, []).length > 0
                  ? strArr(parsed.story.unlockedLetters, defaultStory.unlockedLetters)
                  : defaultStory.unlockedLetters,
              seenEvents: strArr(parsed.story.seenEvents, defaultStory.seenEvents),
            }
          : legacyProgress
            ? {
                ...defaultStory,
                introCompleted: true,
                teahouseCleaned: true,
                cleanedSpots: CLEANUP_SPOTS.map((s) => s.id),
                unlockedLetters: ['letter_1_welcome', 'letter_2_brewing'],
              }
            : defaultStory;

      const day =
        typeof parsed.day === 'number' && Number.isFinite(parsed.day)
          ? Math.min(28, Math.max(1, Math.floor(parsed.day)))
          : defaults.day;
      const money =
        typeof parsed.money === 'number' && Number.isFinite(parsed.money)
          ? Math.max(0, Math.floor(parsed.money))
          : defaults.money;
      const timeMinutes =
        typeof parsed.timeMinutes === 'number' && Number.isFinite(parsed.timeMinutes)
          ? Math.min(1430, Math.max(360, parsed.timeMinutes))
          : defaults.timeMinutes;
      const selectedHotbarIndex =
        typeof parsed.selectedHotbarIndex === 'number' && Number.isFinite(parsed.selectedHotbarIndex)
          ? Math.min(8, Math.max(0, Math.floor(parsed.selectedHotbarIndex)))
          : defaults.selectedHotbarIndex;

      const playerPos =
        parsed.playerPos &&
        typeof parsed.playerPos === 'object' &&
        typeof parsed.playerPos.x === 'number' &&
        Number.isFinite(parsed.playerPos.x) &&
        typeof parsed.playerPos.z === 'number' &&
        Number.isFinite(parsed.playerPos.z)
          ? { x: parsed.playerPos.x, z: parsed.playerPos.z }
          : defaults.playerPos;

      const inventory =
        Array.isArray(parsed.inventory) && parsed.inventory.length === 24
          ? parsed.inventory.map(sanitizeSlot)
          : defaults.inventory;

      const plots = createInitialPlots();
      if (Array.isArray(parsed.plots) && parsed.plots.length > 0) {
        const plotMap = new Map<string, TilePlotState>();
        for (const bp of plots) {
          plotMap.set(`${bp.gx},${bp.gy}`, bp);
        }
        for (const rawP of parsed.plots) {
          if (!rawP || typeof rawP !== 'object') continue;
          const gx = Number(rawP.gx);
          const gy = Number(rawP.gy);
          const target = plotMap.get(`${gx},${gy}`);
          if (!target) continue;
          const cropId = isValidCropId(rawP.cropId) ? rawP.cropId : null;
          const rawStage = typeof rawP.stage === 'number' && Number.isFinite(rawP.stage) ? Math.floor(rawP.stage) : 0;
          const stage = (cropId ? Math.min(3, Math.max(0, rawStage)) : 0) as 0 | 1 | 2 | 3;
          target.tilled = Boolean(rawP.tilled || cropId);
          target.watered = Boolean(rawP.watered) && target.tilled;
          target.cropId = cropId;
          target.stage = stage;
          target.daysGrown =
            cropId && typeof rawP.daysGrown === 'number' && Number.isFinite(rawP.daysGrown)
              ? Math.max(0, Math.floor(rawP.daysGrown))
              : 0;
        }
      }

      const dryingRack = createInitialDryingRack();
      if (Array.isArray(parsed.dryingRack)) {
        for (let i = 0; i < dryingRack.length && i < parsed.dryingRack.length; i++) {
          const r = parsed.dryingRack[i];
          if (!r || typeof r !== 'object') continue;
          dryingRack[i] = {
            id: i,
            inputItemId: isValidItemId(r.inputItemId) ? r.inputItemId : null,
            outputItemId: isValidItemId(r.outputItemId) ? r.outputItemId : null,
            quality: sanitizeQuality(r.quality),
            daysRemaining:
              typeof r.daysRemaining === 'number' && Number.isFinite(r.daysRemaining)
                ? Math.max(0, Math.floor(r.daysRemaining))
                : 0,
          };
        }
      }

      const shippingBin: InventorySlot[] = Array.isArray(parsed.shippingBin)
        ? parsed.shippingBin.map(sanitizeSlot).filter((s): s is InventorySlot => s !== null)
        : [];

      const placedDecors: PlacedDecorState[] = Array.isArray(parsed.placedDecors)
        ? parsed.placedDecors
            .filter(
              (d): d is PlacedDecorState =>
                Boolean(d) &&
                typeof d === 'object' &&
                isDecorItemId(d.itemId) &&
                typeof d.tileX === 'number' &&
                Number.isFinite(d.tileX) &&
                typeof d.tileZ === 'number' &&
                Number.isFinite(d.tileZ)
            )
            .map((d, idx) => ({
              id: typeof d.id === 'string' && d.id ? d.id : `dec_loaded_${idx}`,
              itemId: d.itemId,
              tileX: Math.floor(d.tileX),
              tileZ: Math.floor(d.tileZ),
            }))
        : [];

      return {
        ...defaults,
        saveVersion: CURRENT_SAVE_VERSION,
        version: CURRENT_SAVE_VERSION,
        day,
        season: 'Xuân',
        timeMinutes,
        weather: isValidWeather(parsed.weather) ? parsed.weather : 'sunny',
        tomorrowWeather: isValidWeather(parsed.tomorrowWeather)
          ? parsed.tomorrowWeather
          : defaults.tomorrowWeather,
        money,
        playerPos,
        selectedHotbarIndex,
        inventory,
        plots,
        dryingRack,
        unlockedRecipes: strArr(parsed.unlockedRecipes, defaults.unlockedRecipes),
        relations: {
          may: sanitizeRelation(parsed.relations?.may, defaults.relations.may),
          co_lu: sanitizeRelation(parsed.relations?.co_lu, defaults.relations.co_lu),
          ong_dang: sanitizeRelation(parsed.relations?.ong_dang, defaults.relations.ong_dang),
          be_suong: sanitizeRelation(parsed.relations?.be_suong, defaults.relations.be_suong),
        },
        upgrades: mergedUpgrades,
        shippingBin,
        placedDecors,
        introRead: Boolean(parsed.introRead),
        story: mergedStory,
      };
    } catch {
      return null;
    }
  }

  public clear(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // Ignore storage access errors
    }
  }
}

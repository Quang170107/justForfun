export type Direction = 'down' | 'left' | 'right' | 'up';

export type WeatherType = 'sunny' | 'rainy' | 'foggy';

export type CropId = 'green_tea' | 'chrysanthemum' | 'mint' | 'jasmine' | 'ginger';

export type ToolId = 'hoe' | 'watering_can' | 'basket';

export type TeaWaterTemp = 'warm' | 'hot' | 'boiling';
export type TeaSteepTime = 'short' | 'medium' | 'long';

export type IngredientCategory = 'base' | 'addon' | 'seed' | 'tool' | 'tea' | 'decor';

export type ItemId =
  | ToolId
  | 'seed_green_tea'
  | 'seed_chrysanthemum'
  | 'seed_mint'
  | 'seed_jasmine'
  | 'seed_ginger'
  | 'leaf_green_tea_fresh'
  | 'leaf_green_tea_dried'
  | 'tea_roasted'
  | 'chrysanthemum_fresh'
  | 'chrysanthemum_dried'
  | 'mint_fresh'
  | 'mint_dried'
  | 'jasmine_fresh'
  | 'jasmine_dried'
  | 'ginger_fresh'
  | 'ginger_dried'
  | 'honey'
  | 'cup_green_pure'
  | 'cup_chrysanthemum_honey'
  | 'cup_mint_cool'
  | 'cup_jasmine_night'
  | 'cup_ginger_warm'
  | 'cup_mystery_tea';

export interface ItemDef {
  id: ItemId;
  name: string;
  description: string;
  category: IngredientCategory;
  cropId?: CropId;
  sellPrice: number;
  buyPrice?: number;
  iconKey: string;
  stackable: boolean;
}

export interface InventorySlot {
  itemId: ItemId;
  count: number;
  quality: 1 | 2 | 3; // 1 = ★, 2 = ★★, 3 = ★★★
}

export interface CropDef {
  id: CropId;
  name: string;
  seedId: ItemId;
  harvestId: ItemId;
  driedId: ItemId;
  daysToGrow: number; // Tổng số ngày tưới để đạt giai đoạn 3
  regrowDays?: number; // Số ngày mọc lại sau khi thu hoạch (nếu thu nhiều lần)
  seedPrice: number;
  description: string;
}

export interface TilePlotState {
  gx: number;
  gy: number;
  tilled: boolean;
  watered: boolean;
  cropId: CropId | null;
  stage: 0 | 1 | 2 | 3; // 4 giai đoạn
  daysGrown: number;
}

export interface DryingSlotState {
  id: number;
  inputItemId: ItemId | null;
  outputItemId: ItemId | null;
  quality: 1 | 2 | 3;
  daysRemaining: number;
}

export interface RecipeDef {
  id: string;
  resultItemId: ItemId;
  name: string;
  baseIngredient: ItemId;
  addons: ItemId[]; // 0-2 món (hỗ trợ khớp linh hoạt tươi/khô nếu có)
  waterTemp: TeaWaterTemp;
  steepTime: TeaSteepTime;
  price: number;
  liquidColor: string;
  liquidHighlight: string;
  description: string;
  hints: string[];
}

export type NpcId = 'may' | 'co_lu' | 'ong_dang' | 'be_suong';
export type GuestAppearanceId = 'guest_traveler' | 'guest_poet' | 'guest_painter' | 'guest_merchant';
export type CharacterSpriteId = NpcId | GuestAppearanceId;
export type PortraitId = CharacterSpriteId;
export type PortraitExpression = 'normal' | 'happy' | 'sad';

export interface MemoryCutscene {
  heartsRequired: 2 | 5 | 8 | 10;
  title: string;
  lines: { speaker: string; expression: PortraitExpression; text: string }[];
  rewardMoney?: number;
  rewardItem?: { itemId: ItemId; count: number; quality: 1 | 2 | 3 };
}

export type NpcTimeSlot = 'morning' | 'afternoon' | 'evening';
export type NpcScheduleKey = NpcTimeSlot | 'rainy';
export type GiftReactionTier = 'loved' | 'liked' | 'neutral' | 'disliked';

export interface NpcScheduleEntry {
  label: string;
  points: { x: number; z: number }[];
}

export interface NpcSchedule {
  morning: NpcScheduleEntry;
  afternoon: NpcScheduleEntry;
  evening: NpcScheduleEntry;
  rainy: NpcScheduleEntry;
}

export interface NpcDef {
  id: NpcId;
  name: string;
  role: string;
  favoriteTea: ItemId;
  likedItems: ItemId[];
  dislikedItems: ItemId[];
  giftReactions: Record<GiftReactionTier, string>;
  homePos: { x: number; z: number };
  patrolPoints: { x: number; z: number }[];
  schedule: NpcSchedule;
  dailyLines: string[];
  orderHints: string[];
  memories: MemoryCutscene[];
}

export interface NpcRelationState {
  points: number; // 100 điểm = 1 tim (tối đa 1000 = 10 tim)
  talkedToday: boolean;
  giftedToday: boolean;
  seenMemories: number[]; // các mốc 2, 5, 8, 10 đã xem
}

export interface ActiveCustomer {
  uid: string;
  npcId: NpcId | null;
  appearanceId: CharacterSpriteId;
  displayName: string;
  roleLabel: string;
  reaction: 'none' | 'happy' | 'sad';
  seatIndex: number;
  wantedRecipeId: string;
  hintText: string;
  patience: number; // 0..100
  maxPatience: number;
  state: 'walking_in' | 'seated' | 'served' | 'leaving';
  x: number;
  z: number;
  waitTimer: number;
}

export interface UpgradesState {
  wateringCanLevel: 1 | 2; // 1 = 1 ô, 2 = 3 ô ngang
  extraTableUnlocked: boolean; // mở thêm bàn thứ 4
  expandedFarmUnlocked: boolean; // mở rộng đồi trà 8x6 -> 10x6
  decorLanterns: boolean;
  decorWindChime: boolean;
  decorPottedPlants: boolean;
}

export interface DailySummaryStats {
  dayFinished: number;
  nextDay: number;
  season: 'Xuân';
  passedOut: boolean;
  penaltyMoney: number;
  teaIncome: number;
  salesIncome: number;
  newRecipes: string[];
  heartGains: { name: string; gained: number; total: number }[];
  nextWeather: WeatherType;
}

export interface SaveData {
  saveVersion: number;
  version?: number;
  day: number;
  season: 'Xuân';
  timeMinutes: number; // 360 (6:00) -> 1440 (24:00)
  weather: WeatherType;
  money: number; // Xu Mây
  playerPos: { x: number; z: number };
  selectedHotbarIndex: number;
  inventory: (InventorySlot | null)[];
  plots: TilePlotState[];
  dryingRack: DryingSlotState[];
  unlockedRecipes: string[];
  relations: Record<NpcId, NpcRelationState>;
  upgrades: UpgradesState;
  introRead: boolean;
}

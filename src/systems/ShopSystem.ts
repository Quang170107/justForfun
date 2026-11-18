import { ITEMS } from '../data/crops';
import { NPCS } from '../data/npcs';
import { RECIPES } from '../data/recipes';
import { ActiveCustomer, ItemId, MemoryCutscene, NpcId, UpgradesState } from '../data/types';
import { RelationshipSystem } from './RelationshipSystem';

export interface ShopUpgradeItem {
  id: keyof UpgradesState;
  name: string;
  price: number;
  description: string;
}

export const SHOP_SEEDS: ItemId[] = [
  'seed_green_tea',
  'seed_chrysanthemum',
  'seed_mint',
  'seed_jasmine',
  'seed_ginger',
  'honey',
];

export const SHOP_UPGRADES: ShopUpgradeItem[] = [
  {
    id: 'wateringCanLevel',
    name: 'Nâng cấp Bình Tưới Đồng (3 ô)',
    price: 180,
    description: 'Tưới một lúc 3 ô đất liền kề nhau.',
  },
  {
    id: 'extraTableUnlocked',
    name: 'Thêm Bàn Trà Gỗ Thứ 4',
    price: 220,
    description: 'Đón nhiều khách hơn cùng lúc trong quán buổi chiều.',
  },
  {
    id: 'expandedFarmUnlocked',
    name: 'Mở Rộng Đồi Trà (10×6 ô)',
    price: 260,
    description: 'Mở khóa thêm 12 ô đất trồng trà ở phía đông đồi.',
  },
  {
    id: 'decorLanterns',
    name: 'Đèn Lồng Hiên Quán',
    price: 110,
    description: 'Trang trí thêm cặp đèn lồng đỏ tỏa sáng ấm áp về đêm.',
  },
  {
    id: 'decorWindChime',
    name: 'Chuông Gió Gốm Mây',
    price: 90,
    description: 'Treo chuông gió trước hiên quán mang lại cảm giác thư thái.',
  },
  {
    id: 'decorPottedPlants',
    name: 'Chậu Hoa Nhỏ Quán Trà',
    price: 100,
    description: 'Hai chậu hoa nhỏ xinh trang trí hai bên quầy pha trà.',
  },
];

export class ShopSystem {
  public customersSpawnedToday = 0;
  private maxCustomersToday = 4;
  private spawnCooldown = 2;

  constructor(private relations: RelationshipSystem) {}

  public onNewDay(): void {
    this.customersSpawnedToday = 0;
    this.maxCustomersToday = 3 + Math.floor(Math.random() * 4); // 3-6 khách mỗi buổi chiều
    this.spawnCooldown = 1.5;
  }

  public trySpawnCustomer(
    dt: number,
    isOpen: boolean,
    activeCustomers: ActiveCustomer[],
    extraTableUnlocked: boolean
  ): ActiveCustomer | null {
    if (!isOpen) return null;
    if (this.customersSpawnedToday >= this.maxCustomersToday) return null;

    const maxSeats = extraTableUnlocked ? 4 : 3;
    const occupiedSeats = new Set(activeCustomers.map((c) => c.seatIndex));
    const freeSeat = [0, 1, 2, 3].slice(0, maxSeats).find((idx) => !occupiedSeats.has(idx));
    if (freeSeat === undefined) return null;

    this.spawnCooldown -= dt;
    if (this.spawnCooldown > 0) return null;

    this.spawnCooldown = 8 + Math.random() * 6;
    const npcPool: NpcId[] = ['may', 'co_lu', 'ong_dang', 'be_suong'];
    const activeNpcs = new Set(activeCustomers.map((c) => c.npcId));
    const availableNpcs = npcPool.filter((id) => !activeNpcs.has(id));
    if (availableNpcs.length === 0) return null;

    const npcId = availableNpcs[Math.floor(Math.random() * availableNpcs.length)];
    const npcDef = NPCS[npcId];

    // 70% thích gọi đúng món tủ của mình, 30% gọi trà ngẫu nhiên
    const favRecipe = RECIPES.find((r) => r.resultItemId === npcDef.favoriteTea);
    const chosenRecipe =
      favRecipe && Math.random() < 0.72
        ? favRecipe
        : RECIPES[Math.floor(Math.random() * RECIPES.length)];

    const hintList =
      chosenRecipe.resultItemId === npcDef.favoriteTea ? npcDef.orderHints : chosenRecipe.hints;
    const hintText = hintList[Math.floor(Math.random() * hintList.length)];

    this.customersSpawnedToday += 1;
    return {
      uid: `cust_${Date.now()}_${Math.random()}`,
      npcId,
      seatIndex: freeSeat,
      wantedRecipeId: chosenRecipe.id,
      hintText,
      patience: 100,
      maxPatience: 100,
      state: 'walking_in',
      x: 1.2,
      z: 4.4,
      waitTimer: 0,
    };
  }

  public serveCustomer(
    customer: ActiveCustomer,
    teaItemId: ItemId,
    quality: 1 | 2 | 3
  ): {
    moneyEarned: number;
    exactMatch: boolean;
    message: string;
    memory: MemoryCutscene | null;
    bonusGiftSeed: ItemId | null;
  } {
    const wantedRecipe = RECIPES.find((r) => r.id === customer.wantedRecipeId)!;
    const npcDef = NPCS[customer.npcId];
    const exactMatch = wantedRecipe.resultItemId === teaItemId;

    const qualityMult = quality === 3 ? 1.35 : quality === 2 ? 1.15 : 1.0;
    const baseMoney = exactMatch ? wantedRecipe.price : ITEMS[teaItemId].sellPrice;
    const moneyEarned = Math.round(baseMoney * qualityMult);

    const heartPts = exactMatch ? 65 + (quality - 1) * 15 : 20;
    const memory = this.relations.addPoints(customer.npcId, heartPts);

    let bonusGiftSeed: ItemId | null = null;
    if (exactMatch && Math.random() < 0.35) {
      const seeds: ItemId[] = ['seed_green_tea', 'seed_chrysanthemum', 'seed_mint', 'seed_jasmine', 'seed_ginger'];
      bonusGiftSeed = seeds[Math.floor(Math.random() * seeds.length)];
    }

    customer.state = 'served';
    customer.waitTimer = 0;

    const message = exactMatch
      ? `${npcDef.name} mỉm cười mãn nguyện: "Đúng hương vị tôi mong chờ rồi! (+${moneyEarned} Xu Mây)"`
      : `${npcDef.name} nhấp một ngụm: "Tuy không phải vị quen, nhưng tách trà vẫn rất ấm áp. (+${moneyEarned} Xu Mây)"`;

    return { moneyEarned, exactMatch, message, memory, bonusGiftSeed };
  }
}

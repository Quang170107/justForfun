import { getQualityPriceMultiplier, ITEMS } from '../data/crops';
import { GUEST_APPEARANCE_POOL, GUEST_PROFILES, pickVagueOrderHint } from '../data/customers';
import { NPCS } from '../data/npcs';
import { RECIPES } from '../data/recipes';
import {
  ActiveCustomer,
  CharacterSpriteId,
  GuestAppearanceId,
  ItemId,
  MemoryCutscene,
  NpcId,
} from '../data/types';
import { RelationshipSystem } from './RelationshipSystem';

export class ShopSystem {
  public customersSpawnedToday = 0;
  public maxCustomersToday = 4;
  public isManuallyOpen = false;
  public afternoonFinishedAnnounced = false;
  private spawnCooldown = 1.5;

  constructor(private relations: RelationshipSystem) {}

  public onNewDay(): void {
    this.customersSpawnedToday = 0;
    this.maxCustomersToday = 4 + Math.floor(Math.random() * 3); // 4-6 khách (trong khoảng 3-6 khách/buổi)
    this.spawnCooldown = 1.2;
    this.isManuallyOpen = false;
    this.afternoonFinishedAnnounced = false;
  }

  public toggleOpen(withinHours: boolean): { ok: boolean; isOpen: boolean; message: string } {
    if (this.isManuallyOpen) {
      this.isManuallyOpen = false;
      return {
        ok: true,
        isOpen: false,
        message: '🚪 Đã lật biển ĐÓNG CỬA quán trà.',
      };
    }
    if (!withinHours) {
      return {
        ok: false,
        isOpen: false,
        message: '⏰ Quán hoạt động từ 14:00 đến 20:00 (dùng F5 để tua giờ nếu muốn thử nhanh)!',
      };
    }
    this.isManuallyOpen = true;
    this.spawnCooldown = Math.min(this.spawnCooldown, 0.6);
    return {
      ok: true,
      isOpen: true,
      message: '🏮 Đã lật biển MỞ CỬA! Khách từ Bến Mây sắp ghé quán!',
    };
  }

  public forceClose(): void {
    this.isManuallyOpen = false;
  }

  public trySpawnCustomer(
    dt: number,
    isActivelyOpen: boolean,
    activeCustomers: ActiveCustomer[],
    tableCount: number
  ): ActiveCustomer | null {
    if (!isActivelyOpen) return null;
    if (this.customersSpawnedToday >= this.maxCustomersToday) return null;

    const maxSeats = Math.max(3, Math.min(5, tableCount));
    const occupiedSeats = new Set(activeCustomers.map((c) => c.seatIndex));
    const freeSeat = [0, 1, 2, 3, 4].slice(0, maxSeats).find((idx) => !occupiedSeats.has(idx));
    if (freeSeat === undefined) return null;

    this.spawnCooldown -= dt;
    if (this.spawnCooldown > 0) return null;

    this.spawnCooldown = 6 + Math.random() * 5;
    const npcPool: NpcId[] = ['may', 'co_lu', 'ong_dang', 'be_suong'];
    const activeNpcs = new Set(
      activeCustomers.map((c) => c.npcId).filter((id): id is NpcId => id !== null)
    );
    const activeAppearances = new Set(activeCustomers.map((c) => c.appearanceId));
    const availableNpcs = npcPool.filter((id) => !activeNpcs.has(id));
    const availableGuests = GUEST_APPEARANCE_POOL.filter((g) => !activeAppearances.has(g));

    let npcId: NpcId | null = null;
    let appearanceId: CharacterSpriteId = 'guest_traveler';
    let displayName = 'Khách Lữ Hành';
    let roleLabel = 'Khách vãng lai ghé đảo';

    const chooseGuest =
      availableGuests.length > 0 && (availableNpcs.length === 0 || Math.random() < 0.6);

    if (chooseGuest) {
      const gId = availableGuests[Math.floor(Math.random() * availableGuests.length)];
      const profile = GUEST_PROFILES[gId];
      appearanceId = gId;
      displayName = profile.name;
      roleLabel = profile.role;
    } else if (availableNpcs.length > 0) {
      npcId = availableNpcs[Math.floor(Math.random() * availableNpcs.length)];
      const npcDef = NPCS[npcId];
      appearanceId = npcId;
      displayName = npcDef.name;
      roleLabel = npcDef.role;
    } else if (GUEST_APPEARANCE_POOL.length > 0) {
      const gId = GUEST_APPEARANCE_POOL[Math.floor(Math.random() * GUEST_APPEARANCE_POOL.length)];
      const profile = GUEST_PROFILES[gId];
      appearanceId = gId;
      displayName = profile.name;
      roleLabel = profile.role;
    }

    // NPC chính có 72% gọi đúng trà yêu thích; khách vãng lai gọi ngẫu nhiên trong 5 công thức
    const favRecipe = npcId ? RECIPES.find((r) => r.resultItemId === NPCS[npcId].favoriteTea) : undefined;
    const chosenRecipe =
      favRecipe && Math.random() < 0.72
        ? favRecipe
        : RECIPES[Math.floor(Math.random() * RECIPES.length)];

    const hintText = pickVagueOrderHint(chosenRecipe.id, npcId);

    this.customersSpawnedToday += 1;
    return {
      uid: `cust_${Date.now()}_${Math.random()}`,
      npcId,
      appearanceId,
      displayName,
      roleLabel,
      reaction: 'none',
      seatIndex: freeSeat,
      wantedRecipeId: chosenRecipe.id,
      hintText,
      patience: 100,
      maxPatience: 100,
      state: 'walking_in',
      x: 5.3,
      z: 7.3,
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
    reaction: 'happy' | 'sad';
    dialogueText: string;
    message: string;
    memory: MemoryCutscene | null;
    bonusGiftSeed: ItemId | null;
    heartGained: number;
  } {
    const wantedRecipe = RECIPES.find((r) => r.id === customer.wantedRecipeId)!;
    const exactMatch = wantedRecipe.resultItemId === teaItemId;
    const reaction: 'happy' | 'sad' = exactMatch ? 'happy' : 'sad';

    const qualityMult = getQualityPriceMultiplier(quality);
    const moneyEarned = exactMatch
      ? Math.round(wantedRecipe.price * qualityMult)
      : Math.max(10, Math.round(ITEMS[teaItemId].sellPrice * 0.7 * qualityMult));

    let memory: MemoryCutscene | null = null;
    let bonusGiftSeed: ItemId | null = null;
    let heartGained = 0;
    let dialogueText = '';

    if (customer.npcId) {
      const heartPts = exactMatch ? 65 + (quality - 1) * 15 : 15 + (quality - 1) * 5;
      heartGained = heartPts;
      memory = this.relations.addPoints(customer.npcId, heartPts);

      if (exactMatch && Math.random() < 0.35) {
        const seeds: ItemId[] = [
          'seed_green_tea',
          'seed_chrysanthemum',
          'seed_mint',
          'seed_jasmine',
          'seed_ginger',
        ];
        bonusGiftSeed = seeds[Math.floor(Math.random() * seeds.length)];
      }

      dialogueText = exactMatch
        ? `Đúng hương vị tôi mong chờ rồi! Uống một ngụm mà thấy cả tâm hồn dịu lại!`
        : `Hmm... tách trà này hơi khác hương vị tôi tưởng một chút, nhưng vẫn rất ấm áp.`;
    } else {
      const guestProfile = GUEST_PROFILES[customer.appearanceId as GuestAppearanceId];
      dialogueText = exactMatch ? guestProfile.happyLine : guestProfile.sadLine;
    }

    customer.reaction = reaction;
    customer.state = 'served';
    customer.waitTimer = 0;

    const qualityPraise =
      quality === 3 ? ' Hương vị thượng hạng ★★★!' : quality === 2 ? ' Rất thơm ngon ★★!' : '';
    const message = exactMatch
      ? `${customer.displayName} mỉm cười vui vẻ:${qualityPraise} (+${moneyEarned} Xu Mây)`
      : `${customer.displayName} hơi tiếc vì chưa đúng món, nhưng vẫn gửi công pha trà (+${moneyEarned} Xu Mây)`;

    return {
      moneyEarned,
      exactMatch,
      reaction,
      dialogueText,
      message,
      memory,
      bonusGiftSeed,
      heartGained,
    };
  }
}

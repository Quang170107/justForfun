import { NPC_CONTEXT_DIALOGUES } from '../data/dialogues';
import { NPCS } from '../data/npcs';
import {
  GiftReactionTier,
  ItemId,
  MemoryCutscene,
  NpcId,
  NpcRelationState,
  PortraitExpression,
  WeatherType,
} from '../data/types';

export interface TalkResult {
  line: string;
  expression: PortraitExpression;
  pointsAdded: number;
  memory: MemoryCutscene | null;
}

export interface GiftResult {
  tier: GiftReactionTier;
  pointsDelta: number;
  expression: PortraitExpression;
  line: string;
  memory: MemoryCutscene | null;
}

export class RelationshipSystem {
  public relations: Record<NpcId, NpcRelationState>;
  private recentLines: Record<NpcId, string[]> = {
    may: [],
    co_lu: [],
    ong_dang: [],
    be_suong: [],
  };
  private talkCounter = 0;

  constructor(initial: Record<NpcId, NpcRelationState>) {
    this.relations = {
      may: { ...initial.may, seenMemories: [...initial.may.seenMemories] },
      co_lu: { ...initial.co_lu, seenMemories: [...initial.co_lu.seenMemories] },
      ong_dang: { ...initial.ong_dang, seenMemories: [...initial.ong_dang.seenMemories] },
      be_suong: { ...initial.be_suong, seenMemories: [...initial.be_suong.seenMemories] },
    };
  }

  public getHearts(npcId: NpcId): number {
    return Math.min(10, Math.floor(this.relations[npcId].points / 100));
  }

  public getPoints(npcId: NpcId): number {
    return this.relations[npcId].points;
  }

  public addPoints(npcId: NpcId, pts: number): MemoryCutscene | null {
    const rel = this.relations[npcId];
    rel.points = Math.max(0, Math.min(1000, rel.points + pts));
    return this.checkUnseenMemory(npcId);
  }

  public addDebugPoints(npcId: NpcId, pts: number): number {
    const rel = this.relations[npcId];
    rel.points = Math.max(0, Math.min(1000, rel.points + pts));
    return this.getHearts(npcId);
  }

  public talkToNpc(
    npcId: NpcId,
    ctx: { day: number; weather: WeatherType; timeMinutes: number } = {
      day: 1,
      weather: 'sunny',
      timeMinutes: 480,
    }
  ): TalkResult {
    const rel = this.relations[npcId];
    const pool = NPC_CONTEXT_DIALOGUES[npcId];

    let pointsAdded = 0;
    let memory: MemoryCutscene | null = null;
    if (!rel.talkedToday) {
      rel.talkedToday = true;
      pointsAdded = 35;
      memory = this.addPoints(npcId, pointsAdded);
    } else {
      memory = this.checkUnseenMemory(npcId);
    }

    const hearts = this.getHearts(npcId);
    const heartLines =
      hearts >= 7 ? pool.highHeart : hearts >= 3 ? pool.midHeart : pool.lowHeart;

    let primaryPool: string[];
    if (ctx.weather === 'rainy') {
      primaryPool = pool.rainy;
    } else if (ctx.weather === 'foggy') {
      primaryPool = pool.foggy;
    } else if (ctx.timeMinutes >= 1080) {
      primaryPool = pool.evening;
    } else {
      primaryPool = heartLines;
    }

    const recent = this.recentLines[npcId];
    const freshPrimary = primaryPool.filter((line) => !recent.includes(line));
    const fallbackAll = [...primaryPool, ...heartLines].filter(
      (line) => line !== recent[recent.length - 1]
    );
    const list =
      freshPrimary.length > 0
        ? freshPrimary
        : fallbackAll.length > 0
          ? fallbackAll
          : primaryPool;

    this.talkCounter += 1;
    const idx = (ctx.day * 7 + this.talkCounter + Math.floor(rel.points / 35)) % list.length;
    const chosenLine = list[idx];

    recent.push(chosenLine);
    if (recent.length > 2) recent.shift();

    const expression: PortraitExpression =
      hearts >= 7 || (ctx.weather === 'sunny' && hearts >= 3 && idx % 2 === 0) ? 'happy' : 'normal';

    return { line: chosenLine, expression, pointsAdded, memory };
  }

  public giveGift(npcId: NpcId, itemId: ItemId, quality: 1 | 2 | 3): GiftResult {
    const rel = this.relations[npcId];
    const def = NPCS[npcId];

    let tier: GiftReactionTier;
    let pointsDelta: number;
    let expression: PortraitExpression;

    if (def.favoriteTea === itemId) {
      tier = 'loved';
      pointsDelta = 120 + (quality - 1) * 20;
      expression = 'happy';
    } else if (def.likedItems.includes(itemId)) {
      tier = 'liked';
      pointsDelta = 65 + (quality - 1) * 15;
      expression = 'happy';
    } else if (def.dislikedItems.includes(itemId)) {
      tier = 'disliked';
      pointsDelta = -25;
      expression = 'sad';
    } else {
      tier = 'neutral';
      pointsDelta = 30 + (quality - 1) * 10;
      expression = 'normal';
    }

    rel.giftedToday = true;
    const memory = this.addPoints(npcId, pointsDelta);

    return {
      tier,
      pointsDelta,
      expression,
      line: def.giftReactions[tier],
      memory,
    };
  }

  public checkUnseenMemory(npcId: NpcId): MemoryCutscene | null {
    const hearts = this.getHearts(npcId);
    const rel = this.relations[npcId];
    const def = NPCS[npcId];
    for (const mem of def.memories) {
      if (hearts >= mem.heartsRequired && !rel.seenMemories.includes(mem.heartsRequired)) {
        rel.seenMemories.push(mem.heartsRequired);
        return mem;
      }
    }
    return null;
  }

  public markMemorySeen(npcId: NpcId, heartsRequired: number): boolean {
    const rel = this.relations[npcId];
    if (rel.seenMemories.includes(heartsRequired)) {
      return false;
    }
    rel.seenMemories.push(heartsRequired);
    return true;
  }

  public onNewDay(): void {
    (Object.keys(this.relations) as NpcId[]).forEach((id) => {
      this.relations[id].talkedToday = false;
      this.relations[id].giftedToday = false;
    });
  }
}

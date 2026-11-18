import { NPCS } from '../data/npcs';
import { ItemId, MemoryCutscene, NpcId, NpcRelationState } from '../data/types';

export class RelationshipSystem {
  public relations: Record<NpcId, NpcRelationState>;

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

  public addPoints(npcId: NpcId, pts: number): MemoryCutscene | null {
    const rel = this.relations[npcId];
    rel.points = Math.min(1000, rel.points + pts);
    return this.checkUnseenMemory(npcId);
  }

  public talkToNpc(npcId: NpcId): { line: string; memory: MemoryCutscene | null } {
    const rel = this.relations[npcId];
    const def = NPCS[npcId];
    let memory: MemoryCutscene | null = null;
    if (!rel.talkedToday) {
      rel.talkedToday = true;
      memory = this.addPoints(npcId, 35);
    } else {
      memory = this.checkUnseenMemory(npcId);
    }
    const line = def.dailyLines[Math.floor(Math.random() * def.dailyLines.length)];
    return { line, memory };
  }

  public giveGift(npcId: NpcId, itemId: ItemId, quality: 1 | 2 | 3): { loved: boolean; memory: MemoryCutscene | null } {
    const rel = this.relations[npcId];
    const def = NPCS[npcId];
    const loved = def.favoriteTea === itemId;
    const basePts = loved ? 110 : 45;
    const bonus = (quality - 1) * 15;
    rel.giftedToday = true;
    const memory = this.addPoints(npcId, basePts + bonus);
    return { loved, memory };
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

  public onNewDay(): void {
    (Object.keys(this.relations) as NpcId[]).forEach((id) => {
      this.relations[id].talkedToday = false;
      this.relations[id].giftedToday = false;
    });
  }
}

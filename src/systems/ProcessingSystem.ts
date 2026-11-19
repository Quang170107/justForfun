import { DRYING_OUTPUT_MAP, ITEMS, ROASTABLE_ITEMS } from '../data/crops';
import { DryingSlotState, ItemId } from '../data/types';

export type DryingRackVisualState = 'empty' | 'drying' | 'ready';

export class ProcessingSystem {
  public rack: DryingSlotState[];

  constructor(initialRack: DryingSlotState[]) {
    this.rack = initialRack.map((s) => ({ ...s }));
  }

  public hasActiveItems(): boolean {
    return this.rack.some((s) => s.inputItemId !== null || s.outputItemId !== null);
  }

  public getReadyCount(): number {
    return this.rack.filter((s) => s.outputItemId !== null && s.daysRemaining <= 0).length;
  }

  public getDryingCount(): number {
    return this.rack.filter((s) => s.outputItemId !== null && s.daysRemaining > 0).length;
  }

  public hasEmptySlot(): boolean {
    return this.rack.some((s) => s.inputItemId === null && s.outputItemId === null);
  }

  public getVisualState(): DryingRackVisualState {
    if (this.getReadyCount() > 0) return 'ready';
    if (this.getDryingCount() > 0) return 'drying';
    return 'empty';
  }

  public putOnDryingRack(itemId: ItemId, quality: 1 | 2 | 3): boolean {
    const outId = DRYING_OUTPUT_MAP[itemId];
    if (!outId) return false;
    const emptySlot = this.rack.find((s) => s.inputItemId === null && s.outputItemId === null);
    if (!emptySlot) return false;

    emptySlot.inputItemId = itemId;
    emptySlot.outputItemId = outId;
    emptySlot.quality = quality;
    emptySlot.daysRemaining = 1;
    return true;
  }

  public collectReadyFromRack(
    tryAdd?: (itemId: ItemId, quality: 1 | 2 | 3) => boolean
  ): { itemId: ItemId; quality: 1 | 2 | 3 }[] {
    const collected: { itemId: ItemId; quality: 1 | 2 | 3 }[] = [];
    for (const slot of this.rack) {
      if (slot.outputItemId && slot.daysRemaining <= 0) {
        if (tryAdd && !tryAdd(slot.outputItemId, slot.quality)) {
          continue;
        }
        collected.push({ itemId: slot.outputItemId, quality: slot.quality });
        slot.inputItemId = null;
        slot.outputItemId = null;
        slot.daysRemaining = 0;
      }
    }
    return collected;
  }

  public onNewDay(): void {
    for (const slot of this.rack) {
      if (slot.inputItemId && slot.daysRemaining > 0) {
        slot.daysRemaining -= 1;
      }
    }
  }

  public canRoast(itemId: ItemId): boolean {
    return ROASTABLE_ITEMS.includes(itemId);
  }

  public getRackStatusText(): string {
    const readyCount = this.getReadyCount();
    const dryingSlots = this.rack.filter((s) => s.outputItemId && s.daysRemaining > 0);
    if (readyCount > 0) return `Có ${readyCount} mẻ lá đã phơi khô xong — nhấn E để thu!`;
    if (dryingSlots.length > 0) {
      const names = dryingSlots.map((s) => ITEMS[s.inputItemId!].name).join(', ');
      return `Nong tre đang phơi ${dryingSlots.length}/3 mẻ (${names}) — xong vào sáng mai.`;
    }
    return 'Nong tre đang trống (0/3). Cầm lá/hoa tươi trên hotbar rồi nhấn E để phơi!';
  }

  public getRoastResultQuality(accuracyScore: number): 1 | 2 | 3 {
    if (accuracyScore >= 0.7) return 3;
    if (accuracyScore >= 0.35) return 2;
    return 1;
  }

  public getItemName(id: ItemId): string {
    return ITEMS[id].name;
  }
}

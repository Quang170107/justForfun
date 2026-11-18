import { DRYING_OUTPUT_MAP, ITEMS, ROASTABLE_ITEMS } from '../data/crops';
import { DryingSlotState, ItemId } from '../data/types';

export class ProcessingSystem {
  public rack: DryingSlotState[];

  constructor(initialRack: DryingSlotState[]) {
    this.rack = initialRack.map((s) => ({ ...s }));
  }

  public hasActiveItems(): boolean {
    return this.rack.some((s) => s.inputItemId !== null || s.outputItemId !== null);
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

  public collectReadyFromRack(): { itemId: ItemId; quality: 1 | 2 | 3 }[] {
    const collected: { itemId: ItemId; quality: 1 | 2 | 3 }[] = [];
    for (const slot of this.rack) {
      if (slot.outputItemId && slot.daysRemaining <= 0) {
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
    const readyCount = this.rack.filter((s) => s.outputItemId && s.daysRemaining <= 0).length;
    const dryingCount = this.rack.filter((s) => s.outputItemId && s.daysRemaining > 0).length;
    if (readyCount > 0) return `Có ${readyCount} mẻ lá đã phơi khô xong!`;
    if (dryingCount > 0) return `Đang phơi ${dryingCount} mẻ lá (xong vào sáng mai).`;
    return 'Nong tre đang trống. Hãy chọn lá tươi trên hotbar để phơi!';
  }

  public getRoastResultQuality(accuracyScore: number): 1 | 2 | 3 {
    if (accuracyScore >= 0.72) return 3;
    if (accuracyScore >= 0.4) return 2;
    return 1;
  }

  public getItemName(id: ItemId): string {
    return ITEMS[id].name;
  }
}

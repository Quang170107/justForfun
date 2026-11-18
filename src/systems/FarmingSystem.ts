import { PALETTE } from '../art/palette';
import { AudioSystem } from '../core/AudioSystem';
import { FARM_ORIGIN_X, FARM_ORIGIN_Z } from '../core/SaveSystem';
import { CROPS, getCropBySeed } from '../data/crops';
import { ItemId } from '../data/types';
import { Tiles } from '../world/Tiles';
import { WeatherSystem } from './WeatherSystem';

export interface InventoryOps {
  addItem: (itemId: ItemId, count: number, quality?: 1 | 2 | 3) => boolean;
  consumeAtSlot: (slotIndex: number, count: number) => boolean;
}

export class FarmingSystem {
  constructor(
    private tiles: Tiles,
    private weather: WeatherSystem,
    private audio: AudioSystem
  ) {}

  public tryFarmAction(
    targetX: number,
    targetZ: number,
    heldItemId: ItemId | null,
    heldSlotIndex: number,
    wateringLevel: 1 | 2,
    invOps: InventoryOps,
    notify: (msg: string) => void
  ): boolean {
    const { gx, gy } = this.tiles.worldToGrid(targetX, targetZ);
    if (!this.tiles.isPlotAccessible(gx, gy)) return false;

    const plot = this.tiles.getPlot(gx, gy);
    if (!plot) return false;

    const wx = FARM_ORIGIN_X + gx + 0.5;
    const wz = FARM_ORIGIN_Z + gy + 0.5;

    // Nếu cây đã chín (giai đoạn 3), cho phép thu hoạch bằng giỏ hoặc bất kỳ tay nào không phải cuốc/bình
    if (plot.cropId && plot.stage === 3 && heldItemId !== 'hoe' && heldItemId !== 'watering_can') {
      const crop = CROPS[plot.cropId];
      const roll = Math.random();
      const quality: 1 | 2 | 3 = roll > 0.8 ? 3 : roll > 0.4 ? 2 : 1;
      const yieldCount = crop.id === 'green_tea' ? 2 : 1;
      if (invOps.addItem(crop.harvestId, yieldCount, quality)) {
        this.audio.playHarvest();
        this.weather.spawnBurst(wx, 0.4, wz, PALETTE.amberGold, 8);
        plot.cropId = null;
        plot.stage = 0;
        plot.daysGrown = 0;
        this.tiles.refreshPlotVisual(gx, gy);
        notify(`Thu hoạch ${yieldCount} ${crop.name} (${'★'.repeat(quality)})!`);
        return true;
      } else {
        notify('Túi đồ đã đầy!');
        return false;
      }
    }

    if (heldItemId === 'hoe') {
      if (plot.tilled) return false;
      plot.tilled = true;
      if (this.weather.currentWeather === 'rainy') {
        plot.watered = true;
      }
      this.tiles.refreshPlotVisual(gx, gy);
      this.audio.playHoe();
      this.weather.spawnBurst(wx, 0.15, wz, PALETTE.soilLight, 6);
      return true;
    }

    if (heldItemId === 'watering_can') {
      const offsets = wateringLevel === 2 ? [-1, 0, 1] : [0];
      let wateredAny = false;
      for (const ox of offsets) {
        if (!this.tiles.isPlotAccessible(gx + ox, gy)) continue;
        const p = this.tiles.getPlot(gx + ox, gy);
        if (p && p.tilled) {
          p.watered = true;
          this.tiles.refreshPlotVisual(gx + ox, gy);
          this.weather.spawnBurst(FARM_ORIGIN_X + gx + ox + 0.5, 0.25, wz, PALETTE.waterLight, 5);
          wateredAny = true;
        }
      }
      if (wateredAny) {
        this.audio.playWater();
        return true;
      }
      return false;
    }

    if (heldItemId && heldItemId.startsWith('seed_')) {
      const cropDef = getCropBySeed(heldItemId);
      if (!cropDef) return false;
      if (!plot.tilled) {
        notify('Cần cuốc đất trước khi gieo hạt!');
        return false;
      }
      if (plot.cropId) {
        notify('Ô đất này đã có cây trồng rồi.');
        return false;
      }
      if (invOps.consumeAtSlot(heldSlotIndex, 1)) {
        this.tiles.setCrop(gx, gy, cropDef.id);
        this.audio.playHoe();
        this.weather.spawnBurst(wx, 0.2, wz, PALETTE.grassBright, 5);
        notify(`Đã gieo ${cropDef.name}. Nhớ tưới nước nhé!`);
        return true;
      }
    }

    return false;
  }

  public onNewDay(newWeatherIsRainy: boolean): void {
    for (const plot of this.tiles.getAllPlots()) {
      if (!this.tiles.isPlotAccessible(plot.gx, plot.gy)) continue;

      if (plot.cropId && plot.watered && plot.stage < 3) {
        const crop = CROPS[plot.cropId];
        plot.daysGrown += 1;
        const ratio = plot.daysGrown / crop.daysToGrow;
        if (ratio >= 1) plot.stage = 3;
        else if (ratio >= 0.65) plot.stage = 2;
        else if (ratio >= 0.3) plot.stage = 1;
        else plot.stage = 0;
      }

      // Ngày mới đất khô đi, trừ khi trời mưa tự tưới
      plot.watered = newWeatherIsRainy && plot.tilled;
      this.tiles.refreshPlotVisual(plot.gx, plot.gy);
    }
  }
}

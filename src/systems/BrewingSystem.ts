import { ITEMS } from '../data/crops';
import { matchBrewRecipe, RECIPES } from '../data/recipes';
import { ItemId, RecipeDef, TeaSteepTime, TeaWaterTemp } from '../data/types';

export interface BrewResult {
  itemId: ItemId;
  quality: 1 | 2 | 3;
  matchedRecipe: RecipeDef | null;
  newlyUnlocked: boolean;
}

export class BrewingSystem {
  public unlockedRecipes: Set<string>;

  constructor(initialUnlocked: string[]) {
    this.unlockedRecipes = new Set(initialUnlocked);
  }

  public previewBrew(
    baseItem: ItemId,
    baseQuality: 1 | 2 | 3,
    addons: { itemId: ItemId; quality: 1 | 2 | 3 }[],
    waterTemp: TeaWaterTemp,
    steepTime: TeaSteepTime
  ): BrewResult {
    const matched = matchBrewRecipe(
      baseItem,
      addons.map((a) => a.itemId),
      waterTemp,
      steepTime
    );

    const qualities = [baseQuality, ...addons.map((a) => a.quality)];
    const avgQuality = Math.round(qualities.reduce((s, q) => s + q, 0) / qualities.length);
    const quality = Math.max(1, Math.min(3, avgQuality)) as 1 | 2 | 3;

    if (matched) {
      return {
        itemId: matched.resultItemId,
        quality,
        matchedRecipe: matched,
        newlyUnlocked: !this.unlockedRecipes.has(matched.id),
      };
    }

    return {
      itemId: 'cup_mystery_tea',
      quality,
      matchedRecipe: null,
      newlyUnlocked: false,
    };
  }

  public brew(
    baseItem: ItemId,
    baseQuality: 1 | 2 | 3,
    addons: { itemId: ItemId; quality: 1 | 2 | 3 }[],
    waterTemp: TeaWaterTemp,
    steepTime: TeaSteepTime
  ): BrewResult {
    const res = this.previewBrew(baseItem, baseQuality, addons, waterTemp, steepTime);
    if (res.matchedRecipe) {
      this.unlockedRecipes.add(res.matchedRecipe.id);
    }
    return res;
  }

  public getAllRecipes(): RecipeDef[] {
    return RECIPES;
  }

  public getItemLabel(id: ItemId): string {
    return ITEMS[id].name;
  }
}

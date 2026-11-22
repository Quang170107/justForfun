import { PALETTE } from '../art/palette';
import { ItemId, RecipeDef, TeaSteepTime, TeaWaterTemp } from './types';

export const MYSTERY_TEA_VISUAL = {
  liquidColor: PALETTE.skyMid,
  liquidHighlight: PALETTE.sakuraPink,
};

export const RECIPES: RecipeDef[] = [
  {
    id: 'recipe_green_pure',
    resultItemId: 'cup_green_pure',
    name: 'Trà Xanh Thanh',
    baseIngredient: 'leaf_green_tea_fresh',
    addons: [],
    waterTemp: 'warm',
    steepTime: 'short',
    price: 55,
    liquidColor: PALETTE.grassLight,
    liquidHighlight: PALETTE.grassBright,
    description: 'Trà xanh pha nước ấm, ủ ngắn để giữ vị thanh khiết tự nhiên.',
    hints: [
      'Một tách trà mộc mạc, nhẹ nhàng, không thêm hương vị cầu kỳ...',
      'Tôi chỉ muốn uống chút trà xanh thanh dịu cho nhẹ lòng.',
    ],
  },
  {
    id: 'recipe_chrysanthemum_honey',
    resultItemId: 'cup_chrysanthemum_honey',
    name: 'Trà Cúc Mật Ong',
    baseIngredient: 'chrysanthemum_fresh',
    addons: ['honey'],
    waterTemp: 'hot',
    steepTime: 'medium',
    price: 85,
    liquidColor: PALETTE.amberGold,
    liquidHighlight: PALETTE.whiteWarm,
    description: 'Hoa cúc và mật ong hãm nước nóng vừa phải, ngọt thơm rạng rỡ.',
    hints: [
      'Cháu thèm một ly trà vàng ươm ngọt lịm hương hoa ngoài vườn!',
      'Hôm nay trời nắng đẹp, uống gì có vị hoa và mật ong thật thích.',
    ],
  },
  {
    id: 'recipe_mint_cool',
    resultItemId: 'cup_mint_cool',
    name: 'Trà Bạc Hà Mát',
    baseIngredient: 'leaf_green_tea_fresh',
    addons: ['mint_fresh'],
    waterTemp: 'warm',
    steepTime: 'medium',
    price: 75,
    liquidColor: PALETTE.tealLight,
    liquidHighlight: PALETTE.waterLight,
    description: 'Trà xanh kết hợp lá bạc hà, nước ấm ủ vừa tạo cảm giác sảng khoái.',
    hints: [
      'Bay suốt từ dãy núi xa tới đây cổ họng khô quá, cần vị gì thật mát lành...',
      'Có tách trà nào thoang thoảng mùi gió xanh mát rượi không nhỉ?',
    ],
  },
  {
    id: 'recipe_jasmine_night',
    resultItemId: 'cup_jasmine_night',
    name: 'Trà Nhài Đêm',
    baseIngredient: 'tea_roasted',
    addons: ['jasmine_fresh'],
    waterTemp: 'hot',
    steepTime: 'long',
    price: 115,
    liquidColor: PALETTE.amberWarm,
    liquidHighlight: PALETTE.cloudPink,
    description: 'Trà sao thơm ủ lâu cùng hoa nhài trong nước nóng, hương đêm sâu lắng.',
    hints: [
      'Mùi hương hoa trắng và lá trà sao thơm... hình như gắn với một cái tên...',
      'Cho tôi tách trà thật êm, có hương hoa nở về đêm và vị trà sao đậm...',
    ],
  },
  {
    id: 'recipe_ginger_warm',
    resultItemId: 'cup_ginger_warm',
    name: 'Trà Gừng Ấm',
    baseIngredient: 'ginger_fresh',
    addons: ['honey'],
    waterTemp: 'boiling',
    steepTime: 'long',
    price: 105,
    liquidColor: PALETTE.roofMid,
    liquidHighlight: PALETTE.amberGold,
    description: 'Gừng và mật ong đun nước sôi ủ lâu, cay ấm lan tỏa khắp lồng ngực.',
    hints: [
      'Hôm nay tôi thấy lạnh lẽo quá, gió biển mây cứ thổi buốt cả tay...',
      'Trên ngọn hải đăng sương xuống dày lắm, giá mà có tách trà cay nóng ngọt dịu.',
    ],
  },
];

/** Cho phép dùng cả nguyên liệu tươi hoặc khô tương ứng khi pha trà */
function normalizeIngredient(itemId: ItemId): ItemId {
  switch (itemId) {
    case 'leaf_green_tea_dried':
      return 'leaf_green_tea_fresh';
    case 'chrysanthemum_dried':
      return 'chrysanthemum_fresh';
    case 'mint_dried':
      return 'mint_fresh';
    case 'jasmine_dried':
      return 'jasmine_fresh';
    case 'ginger_dried':
      return 'ginger_fresh';
    default:
      return itemId;
  }
}

export function matchBrewRecipe(
  baseItem: ItemId,
  addons: ItemId[],
  waterTemp: TeaWaterTemp,
  steepTime: TeaSteepTime
): RecipeDef | null {
  const normBase = normalizeIngredient(baseItem);
  const normAddons = addons.map(normalizeIngredient).sort();

  for (const recipe of RECIPES) {
    if (normalizeIngredient(recipe.baseIngredient) !== normBase) continue;
    if (recipe.waterTemp !== waterTemp || recipe.steepTime !== steepTime) continue;

    const targetAddons = recipe.addons.map(normalizeIngredient).sort();
    if (targetAddons.length !== normAddons.length) continue;
    if (targetAddons.every((a, idx) => a === normAddons[idx])) {
      return recipe;
    }
  }
  return null;
}

export function getTempLabel(temp: TeaWaterTemp): string {
  return temp === 'warm' ? 'Ấm (75°C)' : temp === 'hot' ? 'Nóng (90°C)' : 'Sôi (100°C)';
}

export function getSteepLabel(steep: TeaSteepTime): string {
  return steep === 'short' ? 'Ngắn' : steep === 'medium' ? 'Vừa' : 'Lâu';
}

export function getTeaLiquidColors(itemId: ItemId): { liquidColor: string; liquidHighlight: string } {
  const rec = RECIPES.find((r) => r.resultItemId === itemId);
  if (rec) {
    return {
      liquidColor: rec.liquidColor,
      liquidHighlight: rec.liquidHighlight,
    };
  }
  return MYSTERY_TEA_VISUAL;
}

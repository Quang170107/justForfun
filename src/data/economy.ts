import { getItemSellValue } from './crops';
import { DecorItemId, InventorySlot, ItemId, UpgradesState } from './types';

export const SEED_SHOP_OPEN_MINUTES = 480; // 08:00
export const SEED_SHOP_CLOSE_MINUTES = 1080; // 18:00

export function isSeedShopOpen(timeMinutes: number): boolean {
  return timeMinutes >= SEED_SHOP_OPEN_MINUTES && timeMinutes < SEED_SHOP_CLOSE_MINUTES;
}

export const SHOP_SEEDS: ItemId[] = [
  'seed_green_tea',
  'seed_chrysanthemum',
  'seed_mint',
  'seed_jasmine',
  'seed_ginger',
  'honey',
];

export const SHOP_DECORS: DecorItemId[] = [
  'decor_lantern',
  'decor_potted_plant',
  'decor_wind_chime',
];

export type ShopUpgradeId = 'wateringCanLevel' | 'table4' | 'table5' | 'expandedFarmUnlocked';

export interface ShopUpgradeDef {
  id: ShopUpgradeId;
  name: string;
  price: number;
  description: string;
  requires?: ShopUpgradeId;
}

export const SHOP_UPGRADES: ShopUpgradeDef[] = [
  {
    id: 'wateringCanLevel',
    name: 'Bình Tưới Đồng (Tưới 3 Ô)',
    price: 180,
    description: 'Tưới cùng lúc 3 ô đất ngang liền kề nhau trên đồi trà.',
  },
  {
    id: 'table4',
    name: 'Mở Rộng Quán: Bàn Thứ 4',
    price: 220,
    description: 'Đặt thêm bàn trà gỗ thứ 4 trên hiên, tăng sức chứa phục vụ buổi chiều.',
  },
  {
    id: 'table5',
    name: 'Mở Rộng Quán: Bàn Thứ 5',
    price: 340,
    description: 'Mở khóa bàn trà thứ 5 sang trọng để đón tối đa 5 bàn khách.',
    requires: 'table4',
  },
  {
    id: 'expandedFarmUnlocked',
    name: 'Mở Rộng Đồi Trà (10×6 Ô)',
    price: 260,
    description: 'Khai khẩn thêm 12 ô đất màu mỡ ở phía đông đồi trà (từ 8×6 lên 10×6).',
  },
];

export function isUpgradePurchased(id: ShopUpgradeId, upgrades: UpgradesState): boolean {
  switch (id) {
    case 'wateringCanLevel':
      return upgrades.wateringCanLevel >= 2;
    case 'table4':
      return upgrades.tableCount >= 4;
    case 'table5':
      return upgrades.tableCount >= 5;
    case 'expandedFarmUnlocked':
      return upgrades.expandedFarmUnlocked;
  }
}

export function isDecorItemId(itemId: ItemId | null | undefined): itemId is DecorItemId {
  return itemId === 'decor_lantern' || itemId === 'decor_potted_plant' || itemId === 'decor_wind_chime';
}

export function getShippingBinTotal(slots: InventorySlot[]): number {
  let total = 0;
  for (const s of slots) {
    total += getItemSellValue(s.itemId, s.quality) * s.count;
  }
  return total;
}

/**
 * Kiểm tra ô (tileX, tileZ) có thuộc khu vực cho phép đặt đồ trang trí ngoài sân / hiên quán.
 * Tránh mép vực đảo, đồi trà 10x6, và mái/tường bên trong nhà & sạp & hải đăng.
 */
export function isDecorTileInAllowedZone(tileX: number, tileZ: number): boolean {
  // Giới hạn bên trong đảo (tránh hàng rào mép)
  if (tileX < -11 || tileX > 10 || tileZ < -6 || tileZ > 5) {
    return false;
  }

  // Không đặt đè lên 60 ô đất đồi trà (-10..-1, 0..5)
  if (tileX >= -10 && tileX <= -1 && tileZ >= 0 && tileZ <= 5) {
    return false;
  }

  // Không đặt trong lòng Nhà Ở (-4..0, -7..-4)
  if (tileX >= -4 && tileX <= -1 && tileZ <= -4) {
    return false;
  }

  // Không đặt trong lòng Quán Trà phần tường bắc (1..8, -7..-4)
  if (tileX >= 1 && tileX <= 8 && tileZ <= -4) {
    return false;
  }

  // Không đặt đè lên Sạp Bé Sương (-10..-8, -6..-4)
  if (tileX >= -10 && tileX <= -8 && tileZ <= -4) {
    return false;
  }

  // Không đặt sát chân Hải Đăng (9..11, 2..6)
  if (tileX >= 9 && tileZ >= 2) {
    return false;
  }

  // Giữ thông thoáng lối trước cửa Nhà (-3..-2, -4..-3) và cửa Quán (4..6, -4..-3)
  if (tileZ === -4 && ((tileX >= -3 && tileX <= -2) || (tileX >= 4 && tileX <= 6))) {
    return false;
  }

  return true;
}

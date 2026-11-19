export interface TreePlacement {
  x: number;
  z: number;
  kind: 'pine' | 'sakura';
}

export interface PropPlacement {
  x: number;
  z: number;
}

export const ISLAND_WIDTH = 26;
export const ISLAND_DEPTH = 16;
export const ISLAND_MIN_X = -13;
export const ISLAND_MIN_Z = -8;

/**
 * Bản đồ 26×16 ô cho hòn đảo nổi (x từ -13 đến 12, z từ -8 đến 7).
 * Ký hiệu:
 *  '.' = Cỏ
 *  'S' = Lối đi lát đá (auto-tile với cỏ)
 *  'W' = Sàn gỗ hiên quán & nội thất (auto-tile viền)
 *  'F' = Vùng đồi trà (cỏ gốc, do Tiles.ts quản lý ô đất trồng)
 */
export const ISLAND_TERRAIN_GRID: string[] = [
  '..........................', // z = -8
  '.........WWWW..WWWWWWW....', // z = -7 (nội thất Nhà ở & Quán trà)
  '.........WWWW..WWWWWWW....', // z = -6
  '.........WWWW..WWWWWWW....', // z = -5
  '....SS.....S......S.......', // z = -4 (lối trước Sạp, cửa Nhà ở, cửa Quán trà)
  '....SSSSSSSSSSSWWWWWWW....', // z = -3 (đường trục + hiên quán)
  '..............SWWWWWWW....', // z = -2
  '..............SWWWWWWW....', // z = -1
  '...FFFFFFFFFF.SWWWWWWW....', // z = 0  (đồi trà F + hiên quán W)
  '...FFFFFFFFFF.SWWWWWWW....', // z = 1
  '...FFFFFFFFFF.SWWWWWWW....', // z = 2
  '...FFFFFFFFFF.S...........', // z = 3
  '...FFFFFFFFFF.SSSSSSSSSS..', // z = 4  (đường sang Hải đăng)
  '...FFFFFFFFFF.............', // z = 5
  '..........................', // z = 6
  '..........................', // z = 7
];

export const ISLAND_TREES: TreePlacement[] = [
  { x: -11.5, z: -6.3, kind: 'sakura' },
  { x: -11.8, z: -1.5, kind: 'pine' },
  { x: -11.6, z: 6.4, kind: 'pine' },
  { x: -5.4, z: -6.5, kind: 'pine' },
  { x: 0.9, z: -6.4, kind: 'sakura' },
  { x: 10.6, z: -6.2, kind: 'sakura' },
  { x: 11.4, z: -1.2, kind: 'pine' },
  { x: 2.0, z: 6.6, kind: 'sakura' },
  { x: 7.2, z: 6.6, kind: 'pine' },
];

export const ISLAND_BUSHES: PropPlacement[] = [
  { x: -10.5, z: -3.6 },
  { x: -5.2, z: -3.2 },
  { x: -0.6, z: 6.2 },
  { x: -5.8, z: 6.8 },
  { x: 9.8, z: 2.2 },
  { x: 11.8, z: 2.4 },
];

export const ISLAND_ROCKS: PropPlacement[] = [
  { x: -11.7, z: 2.6 },
  { x: -10.9, z: 5.8 },
  { x: 11.6, z: -3.5 },
  { x: 9.2, z: 6.7 },
  { x: -2.4, z: 6.6 },
];

export const ISLAND_FLOWER_POTS: PropPlacement[] = [
  { x: -3.8, z: -3.7 },
  { x: -0.6, z: -3.7 },
  { x: 2.6, z: -3.1 },
  { x: 8.4, z: -3.1 },
];

export const ISLAND_STONE_LANTERNS: PropPlacement[] = [
  { x: -6.4, z: -2.6 },
  { x: 1.5, z: -3.4 },
  { x: 9.4, z: 3.4 },
  { x: 2.2, z: 4.8 },
];

/** Tọa độ ô lưới (gx, gz) của hàng rào gỗ tự nối 4 hướng quanh đồi trà */
export const ISLAND_FENCE_CELLS: [number, number][] = [
  [-11, -1],
  [-10, -1],
  [-9, -1],
  [-8, -1],
  [-7, -1],
  // Cổng mở vào đồi trà tại x = -6, -5
  [-4, -1],
  [-3, -1],
  [-2, -1],
  [-1, -1],
  // Cạnh phía Tây tạo góc L nối dọc
  [-11, 0],
  [-11, 1],
  [-11, 2],
  [-11, 3],
];

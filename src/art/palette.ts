/**
 * Bảng màu giới hạn (~42 màu) phong cách Stardew Valley — ấm áp, rực rỡ, thống nhất toàn bộ asset.
 * Quy tắc: tuyệt đối không dùng đen tuyền (#000) hay xám lạnh.
 */
export const PALETTE = {
  // Viền tối & bóng đổ (nâu đậm / tím đậm)
  outlineDark: '#2b1d14',
  outlinePlum: '#3a2a3e',
  shadowSoil: '#3d2516',

  // Cỏ (4 sắc độ)
  grassDark: '#3f7d3a',
  grassMid: '#5a9c3a',
  grassLight: '#7cc142',
  grassBright: '#a8d85a',

  // Đất & Vách đá
  soilWet: '#4a2e1a',
  soilDark: '#5c3a21',
  soilMid: '#7a4e2d',
  soilLight: '#9c6b3f',
  rockDark: '#5d5364',
  rockMid: '#7d7082',
  rockLight: '#a699a8',

  // Gỗ (4 sắc độ)
  woodDark: '#6b3e26',
  woodMid: '#8f5a34',
  woodLight: '#b57a45',
  woodBright: '#d9a066',

  // Mái ngói Á Đông
  roofDark: '#8e2f2f',
  roofMid: '#b8433a',
  roofLight: '#d9634a',

  // Giấy da & kem (UI, tường, áo)
  creamDark: '#d8be98',
  creamMid: '#eed9b7',
  creamLight: '#fbf0d9',
  whiteWarm: '#fff8ec',

  // Mây & Trời
  cloudWhite: '#f4e9e1',
  cloudPink: '#e8d5e8',
  skyLight: '#b7c9f0',
  skyMid: '#8fa8e0',
  skyDeep: '#5b6fa8',

  // Da & Tóc nhân vật
  skinShadow: '#d99873',
  skinBase: '#f3be96',
  skinLight: '#ffd9b8',
  hairBrown: '#4f3021',
  hairSilver: '#d8d4de',

  // Trang phục & điểm nhấn
  navyDark: '#313d5a',
  navyLight: '#4e638c',
  tealDark: '#2f6e6d',
  tealLight: '#56a39a',
  amberGold: '#f2c14e',
  amberWarm: '#e08e36',
  coralRed: '#f28b82',
  sakuraPink: '#e86fa0',
  teaGreen: '#4f9d53',
  waterBlue: '#76b9e8',
  waterLight: '#b8e4f9',
} as const;

export type PaletteKey = keyof typeof PALETTE;
export type PaletteColor = (typeof PALETTE)[PaletteKey];

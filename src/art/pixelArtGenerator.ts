import * as THREE from 'three';
import { PALETTE } from './palette';
import { CropId, Direction, NpcId, PortraitExpression } from '../data/types';

export interface CharacterSheetMeta {
  texture: THREE.CanvasTexture;
  cols: number;
  rows: number;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, w = 1, h = 1): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

function makePixelTexture(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeatX > 1 || repeatY > 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

class PixelArtRegistry {
  private textures = new Map<string, THREE.CanvasTexture>();
  private iconUrls = new Map<string, string>();
  private portraitUrls = new Map<string, string>();
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.buildTiles();
    this.buildArchitecture();
    this.buildPropsAndEffects();
    this.buildCrops();
    this.buildCharacters();
    this.buildPortraits();
    this.buildItemIcons();
  }

  getTexture(key: string): THREE.CanvasTexture {
    this.init();
    const tex = this.textures.get(key);
    if (!tex) {
      throw new Error(`Missing pixel texture: ${key}`);
    }
    return tex;
  }

  getClonedTexture(key: string): THREE.CanvasTexture {
    const src = this.getTexture(key);
    const clone = src.clone();
    clone.magFilter = THREE.NearestFilter;
    clone.minFilter = THREE.NearestFilter;
    clone.generateMipmaps = false;
    clone.colorSpace = THREE.SRGBColorSpace;
    clone.needsUpdate = true;
    return clone;
  }

  getIconUrl(iconKey: string): string {
    this.init();
    return this.iconUrls.get(iconKey) ?? this.iconUrls.get('cup_mystery')!;
  }

  getPortraitUrl(npcId: NpcId, expr: PortraitExpression): string {
    this.init();
    return this.portraitUrls.get(`${npcId}_${expr}`) ?? '';
  }

  private buildTiles(): void {
    // 4 grass variants (16x16)
    for (let v = 0; v < 4; v++) {
      const [c, ctx] = makeCanvas(16, 16);
      px(ctx, 0, 0, PALETTE.grassMid, 16, 16);
      // Warm patches
      const patches = [
        [1, 2, 4, 3],
        [9, 1, 5, 2],
        [4, 9, 5, 4],
        [11, 11, 4, 3],
      ];
      for (const [x, y, w, h] of patches) {
        px(ctx, (x + v * 3) % 13, (y + v * 2) % 13, PALETTE.grassLight, w, h);
      }
      // Blades of grass (top-left lighting)
      for (let i = 0; i < 7; i++) {
        const bx = (i * 5 + v * 3) % 14 + 1;
        const by = (i * 7 + v * 4) % 13 + 2;
        px(ctx, bx, by, PALETTE.grassDark, 1, 2);
        px(ctx, bx + 1, by - 1, PALETTE.grassBright, 1, 1);
      }
      // Variant 3 has meadow flowers
      if (v === 3) {
        const flowers = [
          [3, 4, PALETTE.amberGold],
          [11, 6, PALETTE.whiteWarm],
          [7, 12, PALETTE.sakuraPink],
        ] as const;
        for (const [fx, fy, col] of flowers) {
          px(ctx, fx, fy + 1, PALETTE.grassDark, 1, 1);
          px(ctx, fx - 1, fy, col, 3, 1);
          px(ctx, fx, fy - 1, col, 1, 3);
          px(ctx, fx, fy, PALETTE.amberWarm, 1, 1);
        }
      }
      this.textures.set(`tile_grass_${v}`, makePixelTexture(c));
    }

    // Soil tilled (dry)
    {
      const [c, ctx] = makeCanvas(16, 16);
      px(ctx, 0, 0, PALETTE.grassDark, 16, 16);
      px(ctx, 1, 1, PALETTE.outlineDark, 14, 14);
      px(ctx, 2, 2, PALETTE.soilMid, 12, 12);
      for (let row = 3; row <= 11; row += 3) {
        px(ctx, 2, row, PALETTE.soilLight, 12, 1);
        px(ctx, 2, row + 1, PALETTE.soilDark, 12, 1);
      }
      px(ctx, 4, 4, PALETTE.soilLight, 2, 1);
      px(ctx, 10, 10, PALETTE.soilLight, 2, 1);
      this.textures.set('tile_soil_tilled', makePixelTexture(c));
    }

    // Soil watered (darker moist earth)
    {
      const [c, ctx] = makeCanvas(16, 16);
      px(ctx, 0, 0, PALETTE.grassDark, 16, 16);
      px(ctx, 1, 1, PALETTE.outlineDark, 14, 14);
      px(ctx, 2, 2, PALETTE.soilWet, 12, 12);
      for (let row = 3; row <= 11; row += 3) {
        px(ctx, 2, row, PALETTE.soilDark, 12, 1);
        px(ctx, 2, row + 1, PALETTE.shadowSoil, 12, 1);
      }
      px(ctx, 5, 4, PALETTE.waterBlue, 1, 1);
      px(ctx, 11, 9, PALETTE.waterBlue, 1, 1);
      this.textures.set('tile_soil_watered', makePixelTexture(c));
    }

    // Stone path
    {
      const [c, ctx] = makeCanvas(16, 16);
      px(ctx, 0, 0, PALETTE.grassMid, 16, 16);
      const stones = [
        [1, 1, 6, 5],
        [8, 2, 7, 5],
        [2, 8, 7, 6],
        [10, 9, 5, 5],
      ];
      for (const [x, y, w, h] of stones) {
        px(ctx, x, y, PALETTE.outlinePlum, w, h);
        px(ctx, x + 1, y + 1, PALETTE.rockMid, w - 2, h - 2);
        px(ctx, x + 1, y + 1, PALETTE.rockLight, w - 3, 1);
        px(ctx, x + 1, y + h - 2, PALETTE.rockDark, w - 2, 1);
      }
      this.textures.set('tile_stone_path', makePixelTexture(c));
    }

    // Wood deck floor
    {
      const [c, ctx] = makeCanvas(16, 16);
      px(ctx, 0, 0, PALETTE.woodMid, 16, 16);
      for (let y = 0; y < 16; y += 4) {
        px(ctx, 0, y, PALETTE.woodBright, 16, 1);
        px(ctx, 0, y + 3, PALETTE.woodDark, 16, 1);
        const splitX = y % 8 === 0 ? 7 : 12;
        px(ctx, splitX, y, PALETTE.outlineDark, 1, 4);
        px(ctx, splitX - 1, y + 1, PALETTE.woodDark, 1, 1);
        px(ctx, splitX + 1, y + 2, PALETTE.woodDark, 1, 1);
      }
      this.textures.set('tile_wood_floor', makePixelTexture(c));
    }

    // Island cliff side (16x16 tileable)
    {
      const [c, ctx] = makeCanvas(16, 16);
      // Grass cap overhanging
      px(ctx, 0, 0, PALETTE.grassMid, 16, 3);
      px(ctx, 0, 0, PALETTE.grassBright, 16, 1);
      px(ctx, 2, 3, PALETTE.grassDark, 3, 2);
      px(ctx, 9, 3, PALETTE.grassDark, 4, 2);
      px(ctx, 13, 3, PALETTE.grassMid, 2, 1);
      // Soil strata
      px(ctx, 0, 4, PALETTE.soilMid, 16, 5);
      px(ctx, 0, 4, PALETTE.outlineDark, 16, 1);
      px(ctx, 3, 6, PALETTE.soilLight, 4, 1);
      px(ctx, 10, 7, PALETTE.soilDark, 5, 2);
      // Deep rock base
      px(ctx, 0, 9, PALETTE.rockMid, 16, 7);
      px(ctx, 0, 9, PALETTE.soilDark, 16, 1);
      px(ctx, 1, 11, PALETTE.rockLight, 5, 2);
      px(ctx, 8, 12, PALETTE.rockDark, 6, 3);
      px(ctx, 0, 15, PALETTE.outlinePlum, 16, 1);
      // Hanging vine
      px(ctx, 6, 3, PALETTE.grassDark, 1, 6);
      px(ctx, 5, 7, PALETTE.grassLight, 1, 2);
      this.textures.set('tile_cliff', makePixelTexture(c));
    }

    // Fence sprite (16x16)
    {
      const [c, ctx] = makeCanvas(16, 16);
      // Left & right posts
      for (const pxX of [1, 12]) {
        px(ctx, pxX, 3, PALETTE.outlineDark, 3, 12);
        px(ctx, pxX + 1, 4, PALETTE.woodLight, 1, 10);
        px(ctx, pxX + 1, 4, PALETTE.woodBright, 1, 2);
      }
      // Horizontal rails
      for (const ry of [6, 11]) {
        px(ctx, 0, ry, PALETTE.outlineDark, 16, 3);
        px(ctx, 0, ry + 1, PALETTE.woodMid, 16, 1);
        px(ctx, 0, ry + 1, PALETTE.woodBright, 6, 1);
      }
      this.textures.set('prop_fence', makePixelTexture(c));
    }
  }

  private buildArchitecture(): void {
    // Timber & cream cottage wall (32x32)
    {
      const [c, ctx] = makeCanvas(32, 32);
      px(ctx, 0, 0, PALETTE.creamMid, 32, 32);
      px(ctx, 0, 0, PALETTE.creamLight, 32, 4);
      // Timber beams
      px(ctx, 0, 0, PALETTE.woodDark, 3, 32);
      px(ctx, 29, 0, PALETTE.woodDark, 3, 32);
      px(ctx, 0, 0, PALETTE.woodMid, 32, 3);
      px(ctx, 0, 27, PALETTE.woodDark, 32, 5);
      px(ctx, 1, 28, PALETTE.woodLight, 30, 1);
      // Warm window in center
      px(ctx, 9, 8, PALETTE.outlineDark, 14, 13);
      px(ctx, 10, 9, PALETTE.woodLight, 12, 11);
      px(ctx, 11, 10, PALETTE.skyLight, 10, 9);
      px(ctx, 15, 10, PALETTE.woodDark, 2, 9);
      px(ctx, 11, 14, PALETTE.woodDark, 10, 1);
      // Flower box under window
      px(ctx, 8, 21, PALETTE.woodDark, 16, 4);
      px(ctx, 9, 22, PALETTE.woodMid, 14, 2);
      px(ctx, 10, 19, PALETTE.grassMid, 12, 2);
      px(ctx, 11, 18, PALETTE.amberGold, 2, 2);
      px(ctx, 18, 18, PALETTE.sakuraPink, 2, 2);
      this.textures.set('wall_home', makePixelTexture(c));
    }

    // Lit night window wall variant (32x32)
    {
      const [c, ctx] = makeCanvas(32, 32);
      px(ctx, 0, 0, PALETTE.creamMid, 32, 32);
      px(ctx, 0, 0, PALETTE.woodDark, 3, 32);
      px(ctx, 29, 0, PALETTE.woodDark, 3, 32);
      px(ctx, 0, 27, PALETTE.woodDark, 32, 5);
      px(ctx, 9, 8, PALETTE.outlineDark, 14, 13);
      px(ctx, 10, 9, PALETTE.woodLight, 12, 11);
      px(ctx, 11, 10, PALETTE.amberGold, 10, 9);
      px(ctx, 12, 11, PALETTE.creamLight, 5, 4);
      px(ctx, 15, 10, PALETTE.woodDark, 2, 9);
      px(ctx, 11, 14, PALETTE.woodDark, 10, 1);
      this.textures.set('wall_home_lit', makePixelTexture(c));
    }

    // Teahouse bamboo & shoji wall (48x32)
    {
      const [c, ctx] = makeCanvas(48, 32);
      px(ctx, 0, 0, PALETTE.woodMid, 48, 32);
      // Vertical wood pillars
      for (const x of [0, 15, 31, 45]) {
        px(ctx, x, 0, PALETTE.woodDark, 3, 32);
        px(ctx, x + 1, 1, PALETTE.woodLight, 1, 30);
      }
      // Shoji sliding doors
      for (const sx of [3, 18, 34]) {
        px(ctx, sx, 4, PALETTE.creamLight, 11, 22);
        px(ctx, sx, 16, PALETTE.woodLight, 11, 10);
        for (let y = 7; y <= 14; y += 3) {
          px(ctx, sx, y, PALETTE.woodMid, 11, 1);
        }
        px(ctx, sx + 5, 4, PALETTE.woodMid, 1, 12);
        // Bamboo curtain roll on top
        px(ctx, sx, 2, PALETTE.amberWarm, 11, 3);
        px(ctx, sx, 3, PALETTE.woodLight, 11, 1);
      }
      // Base skirt
      px(ctx, 0, 27, PALETTE.woodDark, 48, 5);
      this.textures.set('wall_teahouse', makePixelTexture(c));
    }

    // Curved tile roof (32x32)
    {
      const [c, ctx] = makeCanvas(32, 32);
      px(ctx, 0, 0, PALETTE.roofDark, 32, 32);
      for (let y = 0; y < 32; y += 4) {
        px(ctx, 0, y, PALETTE.roofLight, 32, 1);
        px(ctx, 0, y + 1, PALETTE.roofMid, 32, 2);
        px(ctx, 0, y + 3, PALETTE.outlineDark, 32, 1);
        for (let x = 0; x < 32; x += 4) {
          px(ctx, x, y, PALETTE.outlineDark, 1, 4);
        }
      }
      this.textures.set('roof_tiles', makePixelTexture(c));
    }

    // Lighthouse stone wall (32x32)
    {
      const [c, ctx] = makeCanvas(32, 32);
      px(ctx, 0, 0, PALETTE.creamMid, 32, 32);
      for (let y = 0; y < 32; y += 8) {
        px(ctx, 0, y, PALETTE.rockLight, 32, 1);
        px(ctx, 0, y + 7, PALETTE.rockMid, 32, 1);
        const offset = (y / 8) % 2 === 0 ? 0 : 8;
        for (let x = offset; x < 32; x += 16) {
          px(ctx, x, y, PALETTE.rockMid, 1, 8);
        }
      }
      // Red decorative stripe
      px(ctx, 0, 10, PALETTE.roofMid, 32, 6);
      px(ctx, 0, 10, PALETTE.roofLight, 32, 1);
      px(ctx, 0, 15, PALETTE.roofDark, 32, 1);
      this.textures.set('wall_lighthouse', makePixelTexture(c));
    }

    // Teahouse sign "TRÀ QUÁN" (32x16)
    {
      const [c, ctx] = makeCanvas(32, 16);
      px(ctx, 0, 0, PALETTE.outlineDark, 32, 16);
      px(ctx, 1, 1, PALETTE.woodLight, 30, 14);
      px(ctx, 2, 2, PALETTE.creamLight, 28, 12);
      // Teacup pixel emblem on left
      px(ctx, 4, 7, PALETTE.tealDark, 5, 4);
      px(ctx, 9, 8, PALETTE.tealDark, 1, 2);
      px(ctx, 6, 4, PALETTE.cloudWhite, 1, 2);
      // Pixel glyph blocks representing "TRÀ"
      px(ctx, 12, 5, PALETTE.roofDark, 15, 2);
      px(ctx, 13, 8, PALETTE.woodDark, 13, 2);
      px(ctx, 15, 11, PALETTE.roofMid, 9, 1);
      this.textures.set('sign_tra_quan', makePixelTexture(c));
    }

    // Market stall awning (32x16)
    {
      const [c, ctx] = makeCanvas(32, 16);
      for (let x = 0; x < 32; x += 4) {
        const col = (x / 4) % 2 === 0 ? PALETTE.roofMid : PALETTE.creamLight;
        const hi = (x / 4) % 2 === 0 ? PALETTE.roofLight : PALETTE.whiteWarm;
        px(ctx, x, 0, col, 4, 15);
        px(ctx, x, 0, hi, 4, 3);
        px(ctx, x, 14, PALETTE.outlineDark, 4, 2);
      }
      this.textures.set('stall_awning', makePixelTexture(c));
    }
  }

  private buildPropsAndEffects(): void {
    // Pine Tree (32x48)
    {
      const [c, ctx] = makeCanvas(32, 48);
      // Trunk
      px(ctx, 13, 30, PALETTE.outlineDark, 6, 17);
      px(ctx, 14, 31, PALETTE.woodMid, 4, 15);
      px(ctx, 14, 31, PALETTE.woodLight, 1, 15);
      // 3 foliage tiers
      const tiers = [
        { y: 20, w: 26, h: 13 },
        { y: 11, w: 20, h: 12 },
        { y: 3, w: 12, h: 10 },
      ];
      for (const t of tiers) {
        const x0 = Math.floor((32 - t.w) / 2);
        for (let row = 0; row < t.h; row++) {
          const span = Math.max(2, Math.floor(((row + 2) / t.h) * t.w));
          const sx = Math.floor(16 - span / 2);
          px(ctx, sx - 1, t.y + row, PALETTE.outlineDark, span + 2, 1);
          px(ctx, sx, t.y + row, PALETTE.grassDark, span, 1);
          px(ctx, sx, t.y + row, PALETTE.grassMid, Math.max(1, span - 3), 1);
          if (row < t.h - 2) {
            px(ctx, sx + 1, t.y + row, PALETTE.grassLight, Math.max(1, Math.floor(span * 0.45)), 1);
          }
        }
        px(ctx, x0 + 2, t.y + t.h - 2, PALETTE.grassBright, 3, 1);
      }
      this.textures.set('prop_tree_pine', makePixelTexture(c));
    }

    // Sakura Tree (32x48)
    {
      const [c, ctx] = makeCanvas(32, 48);
      px(ctx, 13, 28, PALETTE.outlineDark, 6, 19);
      px(ctx, 14, 29, PALETTE.woodMid, 4, 17);
      px(ctx, 11, 24, PALETTE.woodDark, 4, 5);
      px(ctx, 17, 23, PALETTE.woodDark, 4, 5);
      // Rounded blossom canopy
      const blobs = [
        [16, 15, 11],
        [9, 19, 8],
        [23, 19, 8],
        [16, 10, 8],
      ];
      for (const [cx, cy, r] of blobs) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const d = dx * dx + dy * dy;
            if (d <= r * r) {
              const isEdge = d > (r - 1.3) * (r - 1.3);
              const col = isEdge
                ? PALETTE.outlinePlum
                : dx + dy < -r * 0.4
                  ? PALETTE.cloudPink
                  : dx + dy > r * 0.3
                    ? PALETTE.roofLight
                    : PALETTE.sakuraPink;
              px(ctx, cx + dx, cy + dy, col);
            }
          }
        }
      }
      // White blossoms highlight
      px(ctx, 12, 9, PALETTE.whiteWarm, 2, 1);
      px(ctx, 8, 17, PALETTE.whiteWarm, 2, 1);
      px(ctx, 20, 14, PALETTE.coralRed, 2, 2);
      this.textures.set('prop_tree_sakura', makePixelTexture(c));
    }

    // Flowering bush (16x16)
    {
      const [c, ctx] = makeCanvas(16, 16);
      for (let dy = -6; dy <= 5; dy++) {
        for (let dx = -6; dx <= 6; dx++) {
          const d = dx * dx + dy * dy;
          if (d <= 36) {
            const edge = d > 25;
            const col = edge
              ? PALETTE.outlineDark
              : dy < -1
                ? PALETTE.grassLight
                : PALETTE.grassMid;
            px(ctx, 8 + dx, 9 + dy, col);
          }
        }
      }
      px(ctx, 5, 6, PALETTE.amberGold, 2, 2);
      px(ctx, 10, 8, PALETTE.sakuraPink, 2, 2);
      px(ctx, 7, 11, PALETTE.whiteWarm, 2, 1);
      this.textures.set('prop_bush_flower', makePixelTexture(c));
    }

    // Red Lantern (16x24)
    {
      const [c, ctx] = makeCanvas(16, 24);
      px(ctx, 7, 0, PALETTE.outlineDark, 2, 4);
      px(ctx, 5, 4, PALETTE.outlineDark, 6, 2);
      px(ctx, 6, 4, PALETTE.amberGold, 4, 2);
      px(ctx, 3, 6, PALETTE.outlineDark, 10, 10);
      px(ctx, 4, 7, PALETTE.roofMid, 8, 8);
      px(ctx, 5, 8, PALETTE.roofLight, 5, 6);
      px(ctx, 6, 9, PALETTE.amberGold, 2, 3);
      px(ctx, 5, 16, PALETTE.outlineDark, 6, 2);
      px(ctx, 6, 16, PALETTE.amberGold, 4, 2);
      px(ctx, 7, 18, PALETTE.roofMid, 2, 5);
      this.textures.set('prop_lantern', makePixelTexture(c));
    }

    // Tea Table (24x24)
    {
      const [c, ctx] = makeCanvas(24, 24);
      // Table legs
      px(ctx, 5, 13, PALETTE.outlineDark, 3, 9);
      px(ctx, 6, 14, PALETTE.woodDark, 1, 7);
      px(ctx, 16, 13, PALETTE.outlineDark, 3, 9);
      px(ctx, 17, 14, PALETTE.woodDark, 1, 7);
      // Table top
      px(ctx, 2, 8, PALETTE.outlineDark, 20, 7);
      px(ctx, 3, 9, PALETTE.woodBright, 18, 3);
      px(ctx, 3, 12, PALETTE.woodMid, 18, 2);
      // Teapot & cup
      px(ctx, 7, 5, PALETTE.outlineDark, 6, 5);
      px(ctx, 8, 6, PALETTE.tealLight, 4, 3);
      px(ctx, 9, 4, PALETTE.amberGold, 2, 1);
      px(ctx, 15, 7, PALETTE.whiteWarm, 3, 3);
      px(ctx, 15, 8, PALETTE.teaGreen, 2, 1);
      this.textures.set('prop_table', makePixelTexture(c));
    }

    // Bamboo Drying Rack (24x24) - empty & full
    for (const hasLeaves of [false, true]) {
      const [c, ctx] = makeCanvas(24, 24);
      px(ctx, 4, 14, PALETTE.outlineDark, 2, 8);
      px(ctx, 18, 14, PALETTE.outlineDark, 2, 8);
      px(ctx, 2, 8, PALETTE.outlineDark, 20, 8);
      px(ctx, 3, 9, PALETTE.woodBright, 18, 6);
      for (let x = 4; x < 20; x += 2) {
        px(ctx, x, 10, PALETTE.woodMid, 1, 4);
      }
      if (hasLeaves) {
        px(ctx, 5, 9, PALETTE.grassMid, 4, 3);
        px(ctx, 10, 10, PALETTE.teaGreen, 5, 3);
        px(ctx, 15, 9, PALETTE.amberGold, 3, 2);
      }
      this.textures.set(hasLeaves ? 'prop_drying_full' : 'prop_drying_empty', makePixelTexture(c));
    }

    // Roasting Wok Stove (24x24)
    {
      const [c, ctx] = makeCanvas(24, 24);
      px(ctx, 4, 9, PALETTE.outlinePlum, 16, 13);
      px(ctx, 5, 10, PALETTE.rockMid, 14, 11);
      px(ctx, 8, 16, PALETTE.outlineDark, 8, 5);
      px(ctx, 9, 17, PALETTE.roofLight, 6, 3);
      px(ctx, 10, 18, PALETTE.amberGold, 4, 2);
      // Iron wok on top
      px(ctx, 3, 5, PALETTE.outlineDark, 18, 6);
      px(ctx, 5, 6, PALETTE.navyDark, 14, 4);
      px(ctx, 7, 7, PALETTE.teaGreen, 9, 2);
      this.textures.set('prop_roast_wok', makePixelTexture(c));
    }

    // Tea Counter (32x24)
    {
      const [c, ctx] = makeCanvas(32, 24);
      px(ctx, 1, 8, PALETTE.outlineDark, 30, 15);
      px(ctx, 2, 9, PALETTE.woodBright, 28, 3);
      px(ctx, 2, 12, PALETTE.woodMid, 28, 10);
      px(ctx, 4, 14, PALETTE.woodDark, 24, 6);
      // Jars & teapot on counter
      px(ctx, 5, 3, PALETTE.outlineDark, 5, 6);
      px(ctx, 6, 4, PALETTE.tealLight, 3, 4);
      px(ctx, 13, 4, PALETTE.outlineDark, 6, 5);
      px(ctx, 14, 5, PALETTE.roofMid, 4, 3);
      px(ctx, 23, 5, PALETTE.amberGold, 4, 4);
      this.textures.set('prop_tea_counter', makePixelTexture(c));
    }

    // Wind chime (16x24)
    {
      const [c, ctx] = makeCanvas(16, 24);
      px(ctx, 7, 0, PALETTE.woodDark, 2, 5);
      px(ctx, 5, 5, PALETTE.outlineDark, 6, 6);
      px(ctx, 6, 6, PALETTE.tealLight, 4, 4);
      px(ctx, 7, 11, PALETTE.amberGold, 2, 8);
      px(ctx, 6, 15, PALETTE.coralRed, 4, 5);
      this.textures.set('prop_wind_chime', makePixelTexture(c));
    }

    // Potted plant (16x20)
    {
      const [c, ctx] = makeCanvas(16, 20);
      px(ctx, 4, 12, PALETTE.outlineDark, 8, 7);
      px(ctx, 5, 13, PALETTE.roofLight, 6, 5);
      px(ctx, 3, 11, PALETTE.woodBright, 10, 2);
      px(ctx, 5, 5, PALETTE.grassMid, 6, 6);
      px(ctx, 4, 6, PALETTE.grassLight, 3, 4);
      px(ctx, 9, 4, PALETTE.sakuraPink, 2, 2);
      this.textures.set('prop_potted_plant', makePixelTexture(c));
    }

    // Elliptical pixel shadow (16x8)
    {
      const [c, ctx] = makeCanvas(16, 8);
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 16; x++) {
          const nx = (x - 7.5) / 7;
          const ny = (y - 3.5) / 3.2;
          const d = nx * nx + ny * ny;
          if (d <= 1) {
            ctx.fillStyle = d < 0.55 ? 'rgba(43,29,20,0.45)' : 'rgba(43,29,20,0.22)';
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      this.textures.set('shadow_ellipse', makePixelTexture(c));
    }

    // Stepped pixel glow (32x32) - no smooth blur!
    {
      const [c, ctx] = makeCanvas(32, 32);
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          const dx = x - 15.5;
          const dy = y - 15.5;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 4) {
            ctx.fillStyle = 'rgba(255,248,200,0.9)';
            ctx.fillRect(x, y, 1, 1);
          } else if (dist < 8) {
            ctx.fillStyle = 'rgba(242,193,78,0.55)';
            ctx.fillRect(x, y, 1, 1);
          } else if (dist < 13 && (x + y) % 2 === 0) {
            ctx.fillStyle = 'rgba(224,142,54,0.28)';
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      this.textures.set('glow_pixel', makePixelTexture(c));
    }

    // Cloud tuft sprite for multi-layer cloud sea (48x24)
    {
      const [c, ctx] = makeCanvas(48, 24);
      const puffs = [
        [14, 14, 8],
        [24, 11, 10],
        [34, 14, 8],
      ];
      for (const [cx, cy, r] of puffs) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy <= r * r) {
              const col = dy < -2 ? PALETTE.whiteWarm : dy < 3 ? PALETTE.cloudWhite : PALETTE.cloudPink;
              px(ctx, cx + dx, cy + dy, col);
            }
          }
        }
      }
      this.textures.set('cloud_tuft', makePixelTexture(c));
    }
  }

  private buildCrops(): void {
    const crops: CropId[] = ['green_tea', 'chrysanthemum', 'mint', 'jasmine', 'ginger'];
    const leafColors: Record<CropId, [string, string, string]> = {
      green_tea: [PALETTE.grassDark, PALETTE.teaGreen, PALETTE.grassBright],
      chrysanthemum: [PALETTE.grassDark, PALETTE.grassMid, PALETTE.amberGold],
      mint: [PALETTE.tealDark, PALETTE.tealLight, PALETTE.grassBright],
      jasmine: [PALETTE.grassDark, PALETTE.grassMid, PALETTE.whiteWarm],
      ginger: [PALETTE.grassDark, PALETTE.grassLight, PALETTE.amberWarm],
    };

    for (const crop of crops) {
      const [dark, mid, accent] = leafColors[crop];
      for (let stage = 0; stage < 4; stage++) {
        const [c, ctx] = makeCanvas(16, 24);
        if (stage === 0) {
          // Tiny sprout
          px(ctx, 7, 19, PALETTE.outlineDark, 2, 3);
          px(ctx, 6, 18, PALETTE.grassLight, 2, 2);
          px(ctx, 8, 17, PALETTE.grassBright, 2, 2);
        } else if (stage === 1) {
          // Small sapling
          px(ctx, 7, 16, PALETTE.outlineDark, 2, 6);
          px(ctx, 5, 14, dark, 6, 4);
          px(ctx, 4, 13, mid, 3, 2);
          px(ctx, 9, 13, mid, 3, 2);
        } else if (stage === 2) {
          // Leafy bush
          px(ctx, 4, 11, PALETTE.outlineDark, 8, 10);
          px(ctx, 5, 12, dark, 6, 8);
          px(ctx, 4, 10, mid, 5, 6);
          px(ctx, 8, 11, mid, 4, 5);
          px(ctx, 6, 9, PALETTE.grassBright, 3, 2);
        } else {
          // Stage 3: Ready to harvest (distinctive silhouette + bright signifier!)
          px(ctx, 3, 9, PALETTE.outlineDark, 10, 12);
          px(ctx, 4, 10, dark, 8, 10);
          px(ctx, 3, 8, mid, 9, 8);
          if (crop === 'green_tea') {
            px(ctx, 5, 6, PALETTE.grassBright, 2, 3);
            px(ctx, 9, 7, PALETTE.grassBright, 2, 3);
            px(ctx, 7, 5, PALETTE.whiteWarm, 1, 1);
          } else if (crop === 'chrysanthemum') {
            px(ctx, 4, 6, accent, 4, 4);
            px(ctx, 9, 8, accent, 4, 4);
            px(ctx, 5, 7, PALETTE.amberWarm, 2, 2);
            px(ctx, 10, 9, PALETTE.amberWarm, 2, 2);
          } else if (crop === 'mint') {
            px(ctx, 4, 6, PALETTE.tealLight, 3, 4);
            px(ctx, 9, 6, PALETTE.grassBright, 3, 4);
            px(ctx, 7, 4, PALETTE.whiteWarm, 2, 2);
          } else if (crop === 'jasmine') {
            px(ctx, 4, 7, PALETTE.whiteWarm, 3, 3);
            px(ctx, 9, 6, PALETTE.whiteWarm, 3, 3);
            px(ctx, 6, 10, PALETTE.cloudPink, 3, 2);
          } else if (crop === 'ginger') {
            // Long stalks + golden ginger root peeking from base
            px(ctx, 6, 4, PALETTE.grassLight, 2, 8);
            px(ctx, 9, 5, PALETTE.grassMid, 2, 7);
            px(ctx, 4, 17, PALETTE.amberGold, 8, 4);
            px(ctx, 5, 18, PALETTE.amberWarm, 6, 2);
          }
        }
        this.textures.set(`crop_${crop}_${stage}`, makePixelTexture(c));
      }
    }
  }

  private drawCharacterFrame(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    dir: Direction,
    frameIdx: number,
    style: 'player' | NpcId
  ): void {
    // Frame 0..3 = walk, 4..5 = idle breath, 6..7 = tool action
    const bobY =
      frameIdx === 1 || frameIdx === 3
        ? -1
        : frameIdx === 5
          ? 1
          : 0;
    const legSwing = frameIdx === 1 ? -1 : frameIdx === 3 ? 1 : 0;
    const armReach = frameIdx >= 6 ? 2 : 0;

    if (style === 'may') {
      // Mây: Floating misty white spirit (translucent wispy tail + floating sparkles)
      const fy = oy + 6 + bobY;
      // Wispy floating base
      px(ctx, ox + 5, fy + 16, PALETTE.cloudPink, 6, 5);
      px(ctx, ox + 6, fy + 21, PALETTE.skyLight, 4, 2);
      px(ctx, ox + 7, fy + 23, PALETTE.cloudWhite, 2, 2);
      // Cloak body
      px(ctx, ox + 3, fy + 8, PALETTE.outlinePlum, 10, 10);
      px(ctx, ox + 4, fy + 9, PALETTE.cloudWhite, 8, 8);
      px(ctx, ox + 5, fy + 10, PALETTE.whiteWarm, 5, 5);
      // Chibi Spirit Head
      px(ctx, ox + 3, fy, PALETTE.outlinePlum, 10, 9);
      px(ctx, ox + 4, fy + 1, PALETTE.whiteWarm, 8, 7);
      px(ctx, ox + 5, fy + 2, PALETTE.cloudWhite, 6, 2);
      if (dir !== 'up') {
        const ex = dir === 'left' ? 4 : dir === 'right' ? 7 : 5;
        px(ctx, ox + ex, fy + 4, PALETTE.navyDark, 2, 2);
        px(ctx, ox + ex + 4, fy + 4, PALETTE.navyDark, 2, 2);
      }
      // Golden spark motes floating
      px(ctx, ox + 1 + (frameIdx % 2), fy + 2, PALETTE.amberGold, 2, 2);
      px(ctx, ox + 13 - (frameIdx % 2), fy + 13, PALETTE.amberGold, 1, 1);
      return;
    }

    if (style === 'co_lu') {
      // Cò Lữ: Tall slender migrating crane, red scarf, traveler satchel
      const fy = oy + 2 + bobY;
      // Slender legs
      px(ctx, ox + 6, fy + 21, PALETTE.amberWarm, 1, 8 + Math.max(0, legSwing));
      px(ctx, ox + 9, fy + 21, PALETTE.amberWarm, 1, 8 - Math.min(0, legSwing));
      // Tall white body
      px(ctx, ox + 4, fy + 12, PALETTE.outlinePlum, 8, 10);
      px(ctx, ox + 5, fy + 13, PALETTE.whiteWarm, 6, 8);
      // Traveler satchel
      px(ctx, ox + 8, fy + 15, PALETTE.woodDark, 4, 5);
      px(ctx, ox + 9, fy + 16, PALETTE.woodLight, 2, 3);
      // Red scarf
      px(ctx, ox + 4, fy + 10, PALETTE.roofMid, 8, 3);
      px(ctx, ox + 10, fy + 12, PALETTE.roofLight, 2, 4);
      // Long neck & crane head
      px(ctx, ox + 6, fy + 5, PALETTE.outlinePlum, 4, 6);
      px(ctx, ox + 7, fy + 5, PALETTE.whiteWarm, 2, 5);
      px(ctx, ox + 5, fy + 1, PALETTE.outlinePlum, 6, 5);
      px(ctx, ox + 6, fy + 2, PALETTE.whiteWarm, 4, 3);
      // Beak
      if (dir === 'left') {
        px(ctx, ox + 1, fy + 3, PALETTE.amberGold, 4, 2);
      } else if (dir === 'right') {
        px(ctx, ox + 11, fy + 3, PALETTE.amberGold, 4, 2);
      } else if (dir === 'down') {
        px(ctx, ox + 7, fy + 4, PALETTE.amberGold, 2, 3);
      }
      if (dir !== 'up') {
        px(ctx, ox + 7, fy + 3, PALETTE.navyDark, 1, 1);
      }
      return;
    }

    // Standard Stardew chibi 16x32 proportion for player, ong_dang, be_suong
    const fy = oy + 5 + bobY;
    const outfitMain =
      style === 'ong_dang'
        ? PALETTE.navyDark
        : style === 'be_suong'
          ? PALETTE.grassMid
          : PALETTE.tealDark;
    const outfitHi =
      style === 'ong_dang'
        ? PALETTE.navyLight
        : style === 'be_suong'
          ? PALETTE.grassLight
          : PALETTE.tealLight;
    const hairCol =
      style === 'ong_dang'
        ? PALETTE.hairSilver
        : style === 'be_suong'
          ? PALETTE.hairBrown
          : PALETTE.woodDark;

    // Legs & boots
    px(ctx, ox + 5, fy + 21 + legSwing, PALETTE.outlineDark, 3, 5);
    px(ctx, ox + 8, fy + 21 - legSwing, PALETTE.outlineDark, 3, 5);
    px(ctx, ox + 5, fy + 22 + legSwing, PALETTE.woodDark, 2, 3);
    px(ctx, ox + 9, fy + 22 - legSwing, PALETTE.woodDark, 2, 3);

    // Torso
    px(ctx, ox + 4, fy + 13, PALETTE.outlineDark, 8, 9);
    px(ctx, ox + 5, fy + 14, outfitMain, 6, 7);
    px(ctx, ox + 5, fy + 14, outfitHi, 3, 4);
    // Apron / Belt
    px(ctx, ox + 5, fy + 18, PALETTE.creamMid, 6, 2);

    // Arms
    px(ctx, ox + 2, fy + 14 + armReach, PALETTE.outlineDark, 2, 6);
    px(ctx, ox + 3, fy + 15 + armReach, PALETTE.skinBase, 1, 4);
    px(ctx, ox + 12, fy + 14 - Math.floor(armReach / 2), PALETTE.outlineDark, 2, 6);
    px(ctx, ox + 12, fy + 15 - Math.floor(armReach / 2), PALETTE.skinBase, 1, 4);

    // Chibi Head (large head 10x10)
    px(ctx, ox + 3, fy + 2, PALETTE.outlineDark, 10, 11);
    px(ctx, ox + 4, fy + 3, PALETTE.skinBase, 8, 9);
    px(ctx, ox + 4, fy + 3, PALETTE.skinLight, 4, 4);

    // Hair / Hat silhouettes
    if (style === 'be_suong') {
      // Conical leaf hat (nón lá) + twin braids
      px(ctx, ox + 1, fy + 2, PALETTE.outlineDark, 14, 3);
      px(ctx, ox + 3, fy, PALETTE.outlineDark, 10, 3);
      px(ctx, ox + 2, fy + 2, PALETTE.creamMid, 12, 2);
      px(ctx, ox + 5, fy + 1, PALETTE.creamLight, 6, 2);
      px(ctx, ox + 2, fy + 7, hairCol, 2, 6);
      px(ctx, ox + 12, fy + 7, hairCol, 2, 6);
      // Seed basket on back/side
      px(ctx, ox + 12, fy + 15, PALETTE.woodLight, 3, 5);
    } else if (style === 'ong_dang') {
      // Sailor cap & big silver beard + storm lantern!
      px(ctx, ox + 3, fy + 1, PALETTE.navyDark, 10, 4);
      px(ctx, ox + 4, fy + 2, PALETTE.navyLight, 7, 2);
      px(ctx, ox + 4, fy + 9, PALETTE.hairSilver, 8, 6);
      px(ctx, ox + 5, fy + 10, PALETTE.whiteWarm, 6, 3);
      // Glowing lantern held in hand
      px(ctx, ox + 13, fy + 17, PALETTE.outlineDark, 3, 5);
      px(ctx, ox + 14, fy + 18, PALETTE.amberGold, 1, 3);
    } else {
      // Player cozy straw/tea cap + warm hair
      px(ctx, ox + 3, fy + 2, hairCol, 10, 4);
      px(ctx, ox + 4, fy + 1, PALETTE.woodLight, 8, 3);
      px(ctx, ox + 5, fy + 1, PALETTE.creamMid, 5, 1);
      if (dir === 'up') {
        px(ctx, ox + 4, fy + 4, hairCol, 8, 8);
      }
    }

    // Face eyes & cheeks
    if (dir === 'down') {
      px(ctx, ox + 5, fy + 7, PALETTE.outlineDark, 1, 2);
      px(ctx, ox + 10, fy + 7, PALETTE.outlineDark, 1, 2);
      px(ctx, ox + 4, fy + 9, PALETTE.coralRed, 1, 1);
      px(ctx, ox + 11, fy + 9, PALETTE.coralRed, 1, 1);
    } else if (dir === 'left') {
      px(ctx, ox + 4, fy + 7, PALETTE.outlineDark, 1, 2);
      px(ctx, ox + 5, fy + 9, PALETTE.coralRed, 1, 1);
    } else if (dir === 'right') {
      px(ctx, ox + 11, fy + 7, PALETTE.outlineDark, 1, 2);
      px(ctx, ox + 10, fy + 9, PALETTE.coralRed, 1, 1);
    }

    // Tool swing spark on action frames 6..7
    if (frameIdx >= 6 && style === 'player') {
      const tx = dir === 'left' ? 0 : dir === 'right' ? 13 : 6;
      const ty = dir === 'up' ? fy + 4 : fy + 20;
      px(ctx, ox + tx, ty, PALETTE.woodBright, 3, 3);
      px(ctx, ox + tx + 1, ty + 1, PALETTE.whiteWarm, 1, 1);
    }
  }

  private buildCharacters(): void {
    const dirs: Direction[] = ['down', 'left', 'right', 'up'];
    const styles: ('player' | NpcId)[] = ['player', 'may', 'co_lu', 'ong_dang', 'be_suong'];

    for (const style of styles) {
      const cols = 8;
      const rows = 4;
      const [c, ctx] = makeCanvas(cols * 16, rows * 32);
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          this.drawCharacterFrame(ctx, col * 16, r * 32, dirs[r], col, style);
        }
      }
      this.textures.set(`char_${style}`, makePixelTexture(c));
    }
  }

  private buildPortraits(): void {
    const npcs: NpcId[] = ['may', 'co_lu', 'ong_dang', 'be_suong'];
    const exprs: PortraitExpression[] = ['normal', 'happy', 'sad'];

    for (const npc of npcs) {
      for (const expr of exprs) {
        const [c, ctx] = makeCanvas(64, 64);
        // Warm parchment portrait frame background
        px(ctx, 0, 0, PALETTE.skyLight, 64, 64);
        px(ctx, 0, 46, PALETTE.cloudWhite, 64, 18);
        px(ctx, 4, 4, PALETTE.creamLight, 56, 56);
        px(ctx, 6, 6, npc === 'ong_dang' ? PALETTE.skyMid : PALETTE.skyLight, 52, 52);

        if (npc === 'may') {
          px(ctx, 18, 36, PALETTE.outlinePlum, 28, 22);
          px(ctx, 20, 38, PALETTE.cloudWhite, 24, 20);
          px(ctx, 16, 12, PALETTE.outlinePlum, 32, 28);
          px(ctx, 18, 14, PALETTE.whiteWarm, 28, 24);
          px(ctx, 19, 15, PALETTE.cloudPink, 26, 6);
          px(ctx, 12, 16, PALETTE.amberGold, 4, 4);
          px(ctx, 48, 26, PALETTE.amberGold, 3, 3);
        } else if (npc === 'co_lu') {
          px(ctx, 24, 34, PALETTE.outlinePlum, 16, 24);
          px(ctx, 26, 36, PALETTE.whiteWarm, 12, 22);
          px(ctx, 20, 42, PALETTE.roofMid, 24, 10);
          px(ctx, 18, 12, PALETTE.outlinePlum, 26, 24);
          px(ctx, 20, 14, PALETTE.whiteWarm, 22, 20);
          // Beak
          px(ctx, 40, 22, PALETTE.outlineDark, 14, 7);
          px(ctx, 41, 23, PALETTE.amberGold, 12, 5);
        } else if (npc === 'ong_dang') {
          px(ctx, 14, 38, PALETTE.outlineDark, 36, 20);
          px(ctx, 16, 40, PALETTE.navyDark, 32, 18);
          px(ctx, 16, 14, PALETTE.outlineDark, 32, 28);
          px(ctx, 18, 16, PALETTE.skinBase, 28, 24);
          // Sailor hat
          px(ctx, 14, 8, PALETTE.navyDark, 36, 10);
          px(ctx, 18, 10, PALETTE.navyLight, 28, 6);
          // Silver beard
          px(ctx, 18, 32, PALETTE.hairSilver, 28, 18);
          px(ctx, 22, 34, PALETTE.whiteWarm, 20, 12);
        } else {
          // Be Suong
          px(ctx, 16, 40, PALETTE.outlineDark, 32, 18);
          px(ctx, 18, 42, PALETTE.grassMid, 28, 16);
          // Pigtails
          px(ctx, 10, 24, PALETTE.hairBrown, 8, 20);
          px(ctx, 46, 24, PALETTE.hairBrown, 8, 20);
          px(ctx, 16, 16, PALETTE.outlineDark, 32, 26);
          px(ctx, 18, 18, PALETTE.skinLight, 28, 22);
          // Conical hat
          px(ctx, 8, 12, PALETTE.outlineDark, 48, 8);
          px(ctx, 18, 5, PALETTE.creamMid, 28, 11);
          px(ctx, 24, 6, PALETTE.creamLight, 16, 6);
        }

        // Eyes & Mouth expression
        const eyeY = npc === 'be_suong' ? 26 : 24;
        if (expr === 'happy') {
          px(ctx, 22, eyeY, PALETTE.outlineDark, 5, 2);
          px(ctx, 37, eyeY, PALETTE.outlineDark, 5, 2);
          px(ctx, 27, eyeY + 7, PALETTE.roofMid, 10, 3);
        } else if (expr === 'sad') {
          px(ctx, 22, eyeY + 1, PALETTE.outlineDark, 4, 3);
          px(ctx, 38, eyeY + 1, PALETTE.outlineDark, 4, 3);
          px(ctx, 28, eyeY + 9, PALETTE.outlineDark, 8, 2);
          px(ctx, 22, eyeY + 5, PALETTE.waterBlue, 2, 2);
        } else {
          px(ctx, 22, eyeY, PALETTE.outlineDark, 4, 4);
          px(ctx, 38, eyeY, PALETTE.outlineDark, 4, 4);
          px(ctx, 23, eyeY + 1, PALETTE.whiteWarm, 1, 1);
          px(ctx, 39, eyeY + 1, PALETTE.whiteWarm, 1, 1);
          px(ctx, 28, eyeY + 8, PALETTE.outlineDark, 8, 2);
        }

        this.portraitUrls.set(`${npc}_${expr}`, c.toDataURL());
      }
    }
  }

  private buildItemIcons(): void {
    const drawIcon = (key: string, fn: (ctx: CanvasRenderingContext2D) => void) => {
      const [c, ctx] = makeCanvas(16, 16);
      fn(ctx);
      this.iconUrls.set(key, c.toDataURL());
    };

    drawIcon('tool_hoe', (ctx) => {
      for (let i = 3; i < 13; i++) {
        px(ctx, i, 15 - i, PALETTE.outlineDark, 2, 2);
        px(ctx, i, 14 - i, PALETTE.woodLight, 1, 2);
      }
      px(ctx, 9, 2, PALETTE.outlinePlum, 5, 4);
      px(ctx, 10, 3, PALETTE.rockLight, 3, 2);
    });

    drawIcon('tool_watering', (ctx) => {
      px(ctx, 5, 6, PALETTE.outlinePlum, 7, 7);
      px(ctx, 6, 7, PALETTE.waterBlue, 5, 5);
      px(ctx, 2, 7, PALETTE.waterLight, 3, 2);
      px(ctx, 7, 3, PALETTE.navyLight, 4, 3);
    });

    drawIcon('tool_basket', (ctx) => {
      px(ctx, 3, 7, PALETTE.outlineDark, 10, 6);
      px(ctx, 4, 8, PALETTE.woodBright, 8, 4);
      px(ctx, 5, 4, PALETTE.woodMid, 6, 3);
    });

    const seedColors: Record<string, string> = {
      seed_green_tea: PALETTE.teaGreen,
      seed_chrysanthemum: PALETTE.amberGold,
      seed_mint: PALETTE.tealLight,
      seed_jasmine: PALETTE.whiteWarm,
      seed_ginger: PALETTE.amberWarm,
    };
    for (const [k, badge] of Object.entries(seedColors)) {
      drawIcon(k, (ctx) => {
        px(ctx, 3, 3, PALETTE.outlineDark, 10, 11);
        px(ctx, 4, 4, PALETTE.creamMid, 8, 9);
        px(ctx, 5, 7, badge, 6, 4);
        px(ctx, 6, 5, PALETTE.woodLight, 4, 1);
      });
    }

    drawIcon('leaf_green_tea', (ctx) => {
      px(ctx, 4, 5, PALETTE.outlineDark, 8, 7);
      px(ctx, 5, 6, PALETTE.teaGreen, 6, 5);
      px(ctx, 6, 7, PALETTE.grassBright, 3, 2);
    });
    drawIcon('tea_dried', (ctx) => {
      px(ctx, 3, 6, PALETTE.outlineDark, 10, 6);
      px(ctx, 4, 7, PALETTE.grassDark, 8, 4);
      px(ctx, 6, 8, PALETTE.woodBright, 4, 2);
    });
    drawIcon('tea_roasted', (ctx) => {
      px(ctx, 3, 5, PALETTE.outlineDark, 10, 7);
      px(ctx, 4, 6, PALETTE.woodDark, 8, 5);
      px(ctx, 5, 7, PALETTE.amberWarm, 5, 2);
    });
    drawIcon('chrysanthemum', (ctx) => {
      px(ctx, 4, 4, PALETTE.outlineDark, 8, 8);
      px(ctx, 5, 5, PALETTE.amberGold, 6, 6);
      px(ctx, 7, 7, PALETTE.amberWarm, 2, 2);
    });
    drawIcon('chrysanthemum_dried', (ctx) => {
      px(ctx, 4, 5, PALETTE.outlineDark, 8, 7);
      px(ctx, 5, 6, PALETTE.amberWarm, 6, 5);
      px(ctx, 7, 7, PALETTE.woodMid, 2, 2);
    });
    drawIcon('mint', (ctx) => {
      px(ctx, 3, 5, PALETTE.outlineDark, 10, 7);
      px(ctx, 4, 6, PALETTE.tealLight, 5, 4);
      px(ctx, 8, 7, PALETTE.grassBright, 4, 4);
    });
    drawIcon('mint_dried', (ctx) => {
      px(ctx, 3, 6, PALETTE.outlineDark, 10, 6);
      px(ctx, 4, 7, PALETTE.tealDark, 8, 4);
    });
    drawIcon('jasmine', (ctx) => {
      px(ctx, 4, 4, PALETTE.outlinePlum, 8, 8);
      px(ctx, 5, 5, PALETTE.whiteWarm, 6, 6);
      px(ctx, 7, 7, PALETTE.amberGold, 2, 2);
    });
    drawIcon('jasmine_dried', (ctx) => {
      px(ctx, 4, 5, PALETTE.outlinePlum, 8, 7);
      px(ctx, 5, 6, PALETTE.creamMid, 6, 5);
    });
    drawIcon('ginger', (ctx) => {
      px(ctx, 3, 6, PALETTE.outlineDark, 10, 6);
      px(ctx, 4, 7, PALETTE.amberWarm, 8, 4);
      px(ctx, 5, 7, PALETTE.amberGold, 5, 2);
    });
    drawIcon('ginger_dried', (ctx) => {
      px(ctx, 4, 6, PALETTE.outlineDark, 8, 6);
      px(ctx, 5, 7, PALETTE.woodBright, 6, 4);
    });
    drawIcon('honey', (ctx) => {
      px(ctx, 4, 4, PALETTE.outlineDark, 8, 9);
      px(ctx, 5, 3, PALETTE.woodLight, 6, 2);
      px(ctx, 5, 5, PALETTE.amberGold, 6, 7);
      px(ctx, 6, 6, PALETTE.whiteWarm, 2, 3);
    });

    const cupLiquids: Record<string, string> = {
      cup_green: PALETTE.grassLight,
      cup_gold: PALETTE.amberGold,
      cup_mint: PALETTE.tealLight,
      cup_jasmine: PALETTE.cloudPink,
      cup_ginger: PALETTE.amberWarm,
      cup_mystery: PALETTE.skyMid,
    };
    for (const [k, liq] of Object.entries(cupLiquids)) {
      drawIcon(k, (ctx) => {
        px(ctx, 4, 6, PALETTE.outlineDark, 8, 7);
        px(ctx, 5, 7, PALETTE.creamLight, 6, 5);
        px(ctx, 5, 7, liq, 6, 2);
        px(ctx, 12, 8, PALETTE.outlineDark, 2, 3);
        px(ctx, 6, 3, PALETTE.cloudWhite, 1, 2);
        px(ctx, 9, 2, PALETTE.cloudWhite, 1, 3);
      });
    }
  }
}

export const pixelArt = new PixelArtRegistry();

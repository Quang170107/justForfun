import * as THREE from 'three';
import { PALETTE } from './palette';

export type PainterlyTextureKey =
  | 'meadowGrass'
  | 'stonePath'
  | 'woodDeck'
  | 'roofTiles'
  | 'plasterWall'
  | 'shojiLit'
  | 'cliffRock'
  | 'soilTilled'
  | 'soilWatered'
  | 'waterPond'
  | 'bambooWeave'
  | 'woodFence';

export interface ToonMaterialOptions {
  color?: THREE.ColorRepresentation;
  map?: THREE.Texture | null;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
  depthWrite?: boolean;
}

class ToonMaterialRegistry {
  private initialized = false;
  private gradientMap!: THREE.DataTexture;
  private textures = new Map<PainterlyTextureKey, THREE.CanvasTexture>();
  private solidMatCache = new Map<string, THREE.MeshToonMaterial>();

  public init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // 4-dải cel-shading mềm phong cách Ghibli (vùng tối ấm/tím nhạt -> trung tính -> sáng nắng -> highlight)
    const steps = new Uint8Array([
      138, 138, 150, 255,
      188, 188, 194, 255,
      234, 234, 232, 255,
      255, 252, 245, 255,
    ]);
    this.gradientMap = new THREE.DataTexture(steps, 4, 1, THREE.RGBAFormat);
    this.gradientMap.minFilter = THREE.LinearFilter;
    this.gradientMap.magFilter = THREE.LinearFilter;
    this.gradientMap.generateMipmaps = false;
    this.gradientMap.needsUpdate = true;

    this.buildAllPainterlyTextures();
  }

  public getGradientMap(): THREE.DataTexture {
    this.init();
    return this.gradientMap;
  }

  public getTexture(key: PainterlyTextureKey): THREE.CanvasTexture {
    this.init();
    const tex = this.textures.get(key);
    if (!tex) {
      throw new Error(`Missing painterly texture: ${key}`);
    }
    return tex;
  }

  public getClonedTexture(key: PainterlyTextureKey, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
    const cloned = this.getTexture(key).clone();
    cloned.wrapS = THREE.RepeatWrapping;
    cloned.wrapT = THREE.RepeatWrapping;
    cloned.repeat.set(repeatX, repeatY);
    cloned.needsUpdate = true;
    return cloned;
  }

  public createToonMaterial(opts: ToonMaterialOptions = {}): THREE.MeshToonMaterial {
    this.init();
    return new THREE.MeshToonMaterial({
      color: opts.color ?? PALETTE.whiteWarm,
      gradientMap: this.gradientMap,
      map: opts.map ?? null,
      emissive: opts.emissive ?? PALETTE.outlineDark,
      emissiveIntensity: opts.emissive ? (opts.emissiveIntensity ?? 1) : 0,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
      side: opts.side ?? THREE.FrontSide,
      depthWrite: opts.depthWrite ?? true,
    });
  }

  /** Cache MeshToonMaterial thuần sắc theo hex để tiết kiệm GPU draw-state */
  public getSolidToon(colorHex: string): THREE.MeshToonMaterial {
    this.init();
    let mat = this.solidMatCache.get(colorHex);
    if (!mat) {
      mat = this.createToonMaterial({ color: colorHex });
      this.solidMatCache.set(colorHex, mat);
    }
    return mat;
  }

  private makeCanvasTex(
    size: number,
    repeatX: number,
    repeatY: number,
    painter: (ctx: CanvasRenderingContext2D, s: number) => void
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    painter(ctx, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  private rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  private buildAllPainterlyTextures(): void {
    // 1. Cỏ đồi Ghibli mềm mịn với nét cọ và hoa nhỏ
    this.textures.set(
      'meadowGrass',
      this.makeCanvasTex(256, 1, 1, (ctx, s) => {
        ctx.fillStyle = PALETTE.grassMid;
        ctx.fillRect(0, 0, s, s);
        const r = this.rng(101);
        for (let i = 0; i < 420; i++) {
          const x = r() * s;
          const y = r() * s;
          const w = 10 + r() * 22;
          const h = 4 + r() * 8;
          ctx.fillStyle = r() > 0.52 ? PALETTE.grassLight : PALETTE.grassDark;
          ctx.globalAlpha = 0.25 + r() * 0.25;
          ctx.beginPath();
          ctx.ellipse(x, y, w * 0.5, h * 0.5, r() * 0.4 - 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        // Từng cụm cỏ lá
        ctx.globalAlpha = 0.72;
        for (let i = 0; i < 90; i++) {
          const x = r() * s;
          const y = r() * s;
          ctx.strokeStyle = r() > 0.4 ? PALETTE.grassBright : PALETTE.grassDark;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x - 3, y - 6, x - 5, y - 9);
          ctx.moveTo(x + 2, y);
          ctx.quadraticCurveTo(x + 4, y - 6, x + 6, y - 8);
          ctx.stroke();
        }
        // Chấm hoa dại li ti
        ctx.globalAlpha = 0.85;
        for (let i = 0; i < 24; i++) {
          const x = r() * s;
          const y = r() * s;
          ctx.fillStyle = i % 3 === 0 ? PALETTE.whiteWarm : i % 3 === 1 ? PALETTE.amberGold : PALETTE.sakuraPink;
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      })
    );

    // 2. Đường đá cuội bo tròn viền rêu
    this.textures.set(
      'stonePath',
      this.makeCanvasTex(256, 1, 1, (ctx, s) => {
        ctx.fillStyle = PALETTE.grassMid;
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = PALETTE.grassDark;
        ctx.globalAlpha = 0.38;
        ctx.fillRect(10, 10, s - 20, s - 20);
        ctx.globalAlpha = 1;

        const stones = [
          { x: 64, y: 60, rx: 46, ry: 34, c: PALETTE.rockLight },
          { x: 184, y: 66, rx: 48, ry: 36, c: PALETTE.rockMid },
          { x: 74, y: 182, rx: 50, ry: 38, c: PALETTE.rockMid },
          { x: 188, y: 186, rx: 44, ry: 32, c: PALETTE.rockLight },
          { x: 128, y: 124, rx: 34, ry: 26, c: PALETTE.creamDark },
        ];
        for (const st of stones) {
          ctx.fillStyle = PALETTE.rockDark;
          ctx.beginPath();
          ctx.ellipse(st.x + 3, st.y + 4, st.rx, st.ry, 0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = st.c;
          ctx.beginPath();
          ctx.ellipse(st.x, st.y, st.rx, st.ry, 0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = PALETTE.whiteWarm;
          ctx.globalAlpha = 0.22;
          ctx.beginPath();
          ctx.ellipse(st.x - 8, st.y - 8, st.rx * 0.55, st.ry * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      })
    );

    // 3. Sàn gỗ hiên ấm áp
    this.textures.set(
      'woodDeck',
      this.makeCanvasTex(256, 1, 1, (ctx, s) => {
        ctx.fillStyle = PALETTE.woodLight;
        ctx.fillRect(0, 0, s, s);
        const plankH = 64;
        const r = this.rng(202);
        for (let row = 0; row < 4; row++) {
          const y = row * plankH;
          ctx.fillStyle = row % 2 === 0 ? PALETTE.woodLight : PALETTE.woodBright;
          ctx.globalAlpha = row % 2 === 0 ? 1 : 0.38;
          ctx.fillRect(0, y, s, plankH - 3);
          ctx.globalAlpha = 0.25;
          ctx.strokeStyle = PALETTE.woodDark;
          ctx.lineWidth = 2;
          for (let g = 0; g < 6; g++) {
            const gy = y + 10 + g * 8;
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.bezierCurveTo(s * 0.3, gy + (r() - 0.5) * 4, s * 0.7, gy + (r() - 0.5) * 4, s, gy);
            ctx.stroke();
          }
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = PALETTE.woodDark;
          ctx.fillRect(0, y + plankH - 3, s, 3);
          const seamX = row % 2 === 0 ? 128 : 48;
          ctx.fillRect(seamX, y, 3, plankH);
          ctx.fillStyle = PALETTE.outlineDark;
          ctx.beginPath();
          ctx.arc(seamX + 12, y + 14, 2.5, 0, Math.PI * 2);
          ctx.arc(seamX + 12, y + plankH - 14, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      })
    );

    // 4. Mái ngói Á Đông xếp lớp cong
    this.textures.set(
      'roofTiles',
      this.makeCanvasTex(256, 1, 1, (ctx, s) => {
        ctx.fillStyle = PALETTE.roofDark;
        ctx.fillRect(0, 0, s, s);
        const rows = 4;
        const cols = 4;
        const rh = s / rows;
        const cw = s / cols;
        for (let row = 0; row < rows; row++) {
          const y = row * rh;
          for (let col = 0; col < cols; col++) {
            const x = col * cw;
            ctx.fillStyle = row % 2 === 0 ? PALETTE.roofMid : PALETTE.roofDark;
            ctx.fillRect(x + 2, y + 2, cw - 4, rh - 6);
            ctx.fillStyle = PALETTE.roofLight;
            ctx.globalAlpha = 0.42;
            ctx.beginPath();
            ctx.arc(x + cw * 0.5, y + rh - 8, cw * 0.44, 0, Math.PI);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = PALETTE.outlineDark;
            ctx.fillRect(x, y + rh - 4, cw, 3);
          }
        }
      })
    );

    // 5. Tường vôi kem ấm & khung gỗ
    this.textures.set(
      'plasterWall',
      this.makeCanvasTex(256, 1, 1, (ctx, s) => {
        ctx.fillStyle = PALETTE.creamLight;
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = PALETTE.creamMid;
        const r = this.rng(303);
        for (let i = 0; i < 160; i++) {
          ctx.globalAlpha = 0.25;
          ctx.beginPath();
          ctx.arc(r() * s, r() * s, 6 + r() * 14, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = PALETTE.woodMid;
        ctx.fillRect(0, 0, 16, s);
        ctx.fillRect(s - 16, 0, 16, s);
        ctx.fillRect(0, s - 22, s, 22);
      })
    );

    // 6. Cửa shoji sáng vàng ban đêm
    this.textures.set(
      'shojiLit',
      this.makeCanvasTex(256, 1, 1, (ctx, s) => {
        ctx.fillStyle = PALETTE.amberGold;
        ctx.fillRect(0, 0, s, s);
        const grad = ctx.createRadialGradient(s / 2, s / 2, 12, s / 2, s / 2, s * 0.55);
        grad.addColorStop(0, PALETTE.whiteWarm);
        grad.addColorStop(1, PALETTE.amberWarm);
        ctx.fillStyle = grad;
        ctx.fillRect(10, 10, s - 20, s - 20);
        ctx.fillStyle = PALETTE.woodDark;
        for (let i = 0; i <= 3; i++) {
          const p = (i * (s - 12)) / 3;
          ctx.fillRect(p, 0, 10, s);
          ctx.fillRect(0, p, s, 10);
        }
      })
    );

    // 7. Vách đá đất tầng mây
    this.textures.set(
      'cliffRock',
      this.makeCanvasTex(256, 1, 1, (ctx, s) => {
        ctx.fillStyle = PALETTE.soilDark;
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = PALETTE.grassMid;
        ctx.fillRect(0, 0, s, 26);
        ctx.fillStyle = PALETTE.grassDark;
        for (let x = 0; x < s; x += 32) {
          ctx.beginPath();
          ctx.arc(x + 16, 26, 16, 0, Math.PI);
          ctx.fill();
        }
        const bands = [
          { y: 40, h: 72, c: PALETTE.soilMid },
          { y: 112, h: 74, c: PALETTE.rockMid },
          { y: 186, h: 70, c: PALETTE.rockDark },
        ];
        const r = this.rng(404);
        for (const b of bands) {
          ctx.fillStyle = b.c;
          ctx.fillRect(0, b.y, s, b.h);
          for (let i = 0; i < 24; i++) {
            ctx.fillStyle = i % 2 === 0 ? PALETTE.soilLight : PALETTE.outlinePlum;
            ctx.globalAlpha = 0.22;
            ctx.beginPath();
            ctx.ellipse(r() * s, b.y + r() * b.h, 18 + r() * 24, 9 + r() * 14, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      })
    );

    // 8. Đất cuốc tơi & Đất tưới ẩm
    const buildSoil = (base: string, ridge: string, moist: boolean) =>
      this.makeCanvasTex(256, 1, 1, (ctx, s) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, s, s);
        for (let y = 18; y < s; y += 44) {
          ctx.fillStyle = ridge;
          ctx.beginPath();
          ctx.roundRect(14, y, s - 28, 26, 12);
          ctx.fill();
          if (moist) {
            ctx.fillStyle = PALETTE.waterBlue;
            ctx.globalAlpha = 0.16;
            ctx.fillRect(24, y + 6, s - 48, 6);
            ctx.globalAlpha = 1;
          }
        }
      });
    this.textures.set('soilTilled', buildSoil(PALETTE.soilDark, PALETTE.soilMid, false));
    this.textures.set('soilWatered', buildSoil(PALETTE.shadowSoil, PALETTE.soilWet, true));

    // 9. Mặt nước Hồ Sương Mây
    this.textures.set(
      'waterPond',
      this.makeCanvasTex(256, 1, 1, (ctx, s) => {
        const grad = ctx.createRadialGradient(s / 2, s / 2, 16, s / 2, s / 2, s * 0.6);
        grad.addColorStop(0, PALETTE.waterLight);
        grad.addColorStop(0.55, PALETTE.waterBlue);
        grad.addColorStop(1, PALETTE.tealDark);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, s, s);
        ctx.strokeStyle = PALETTE.whiteWarm;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(s * 0.38, s * 0.42, 42, 16, 0.2, 0, Math.PI * 2);
        ctx.ellipse(s * 0.62, s * 0.66, 30, 12, -0.15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      })
    );

    // 10. Nong tre đan
    this.textures.set(
      'bambooWeave',
      this.makeCanvasTex(128, 1, 1, (ctx, s) => {
        ctx.fillStyle = PALETTE.woodBright;
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = PALETTE.woodMid;
        for (let y = 0; y < s; y += 16) {
          for (let x = 0; x < s; x += 16) {
            if (((x + y) / 16) % 2 === 0) {
              ctx.fillRect(x + 2, y + 2, 12, 12);
            }
          }
        }
      })
    );

    // 11. Hàng rào gỗ
    this.textures.set(
      'woodFence',
      this.makeCanvasTex(128, 1, 1, (ctx, s) => {
        ctx.fillStyle = PALETTE.woodMid;
        ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = PALETTE.woodBright;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(8, 8, s - 16, 20);
        ctx.fillRect(14, 52, s - 28, 18);
        ctx.globalAlpha = 1;
      })
    );
  }
}

export function enableShadows(obj: THREE.Object3D, cast = true, receive = true): void {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
    }
  });
}

export const toonMaterials = new ToonMaterialRegistry();

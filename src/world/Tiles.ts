import * as THREE from 'three';
import { pixelArt } from '../art/pixelArtGenerator';
import { FARM_BASE_COLS, FARM_MAX_COLS, FARM_ORIGIN_X, FARM_ORIGIN_Z, FARM_ROWS } from '../core/SaveSystem';
import { CropId, TilePlotState } from '../data/types';

interface PlotVisual {
  groundMesh: THREE.Mesh;
  cropGroup: THREE.Group;
  cropMat: THREE.MeshBasicMaterial;
  sparkleSprite: THREE.Sprite;
  puddleMesh: THREE.Mesh;
  rippleMesh: THREE.Mesh;
  rippleMat: THREE.MeshBasicMaterial;
}

export class Tiles {
  public readonly group = new THREE.Group();
  private plotMap = new Map<string, TilePlotState>();
  private visuals = new Map<string, PlotVisual>();
  private expandedUnlocked = false;
  private tileGeo = new THREE.PlaneGeometry(1, 1);

  constructor(initialPlots: TilePlotState[], expandedUnlocked: boolean) {
    this.expandedUnlocked = expandedUnlocked;
    this.tileGeo.rotateX(-Math.PI / 2);
    this.initFarmPlots(initialPlots);
  }

  private key(gx: number, gy: number): string {
    return `${gx},${gy}`;
  }

  private initFarmPlots(plots: TilePlotState[]): void {
    for (const p of plots) {
      this.plotMap.set(this.key(p.gx, p.gy), { ...p });

      const mat = new THREE.MeshLambertMaterial({
        map: pixelArt.getTexture('tile_grass_0'),
      });
      const groundMesh = new THREE.Mesh(this.tileGeo, mat);
      const wx = FARM_ORIGIN_X + p.gx + 0.5;
      const wz = FARM_ORIGIN_Z + p.gy + 0.5;
      groundMesh.position.set(wx, 0.02, wz);
      this.group.add(groundMesh);

      const cropHandle = pixelArt.createYBillboard({
        textureKey: 'crop_green_tea_0',
        widthPx: 16,
        heightPx: 24,
        shadowScale: 0.65,
        shadowYOffset: 0.032,
        baseYOffset: 0.025,
      });
      cropHandle.group.position.set(wx, 0, wz);
      cropHandle.group.visible = false;
      this.group.add(cropHandle.group);

      const sparkleSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: pixelArt.getTexture('sparkle_pixel'),
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
        })
      );
      sparkleSprite.position.set(wx + 0.15, 1.5, wz + 0.1);
      sparkleSprite.scale.set(0.45, 0.45, 1);
      sparkleSprite.visible = false;
      this.group.add(sparkleSprite);

      // Vũng nước pixel có gợn sóng khi trời mưa
      const puddleGeo = new THREE.PlaneGeometry(0.62, 0.44);
      puddleGeo.rotateX(-Math.PI / 2);
      const puddleMat = new THREE.MeshBasicMaterial({
        map: pixelArt.getTexture('prop_puddle'),
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
      });
      const puddleMesh = new THREE.Mesh(puddleGeo, puddleMat);
      puddleMesh.position.set(wx, 0.025, wz);
      puddleMesh.visible = false;
      this.group.add(puddleMesh);

      const rippleMat = new THREE.MeshBasicMaterial({
        map: pixelArt.getTexture('prop_puddle_ripple'),
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      const rippleMesh = new THREE.Mesh(puddleGeo, rippleMat);
      rippleMesh.position.set(0, 0.004, 0);
      puddleMesh.add(rippleMesh);

      this.visuals.set(this.key(p.gx, p.gy), {
        groundMesh,
        cropGroup: cropHandle.group,
        cropMat: cropHandle.material,
        sparkleSprite,
        puddleMesh,
        rippleMesh,
        rippleMat,
      });
    }

    for (const p of plots) {
      this.refreshPlotSingle(p.gx, p.gy);
    }
  }

  public loadPlots(plots: TilePlotState[], expandedUnlocked: boolean): void {
    this.expandedUnlocked = expandedUnlocked;
    for (const p of plots) {
      this.plotMap.set(this.key(p.gx, p.gy), { ...p });
    }
    for (let gy = 0; gy < FARM_ROWS; gy++) {
      for (let gx = 0; gx < FARM_MAX_COLS; gx++) {
        this.refreshPlotSingle(gx, gy);
      }
    }
  }

  public setExpandedUnlocked(val: boolean): void {
    this.expandedUnlocked = val;
    for (let gy = 0; gy < FARM_ROWS; gy++) {
      for (let gx = 0; gx < FARM_MAX_COLS; gx++) {
        this.refreshPlotSingle(gx, gy);
      }
    }
  }

  public isPlotAccessible(gx: number, gy: number): boolean {
    if (gy < 0 || gy >= FARM_ROWS) return false;
    const maxCols = this.expandedUnlocked ? FARM_MAX_COLS : FARM_BASE_COLS;
    return gx >= 0 && gx < maxCols;
  }

  public worldToGrid(wx: number, wz: number): { gx: number; gy: number } {
    return {
      gx: Math.floor(wx - FARM_ORIGIN_X),
      gy: Math.floor(wz - FARM_ORIGIN_Z),
    };
  }

  public getPlot(gx: number, gy: number): TilePlotState | undefined {
    return this.plotMap.get(this.key(gx, gy));
  }

  public getAllPlots(): TilePlotState[] {
    return Array.from(this.plotMap.values());
  }

  private getSoilMask(gx: number, gy: number): number {
    const isTilled = (nx: number, ny: number) => {
      if (!this.isPlotAccessible(nx, ny)) return false;
      return Boolean(this.getPlot(nx, ny)?.tilled);
    };
    let mask = 0;
    if (isTilled(gx, gy - 1)) mask |= 1; // North
    if (isTilled(gx + 1, gy)) mask |= 2; // East
    if (isTilled(gx, gy + 1)) mask |= 4; // South
    if (isTilled(gx - 1, gy)) mask |= 8; // West
    return mask;
  }

  private refreshPlotSingle(gx: number, gy: number): void {
    const k = this.key(gx, gy);
    const p = this.plotMap.get(k);
    const v = this.visuals.get(k);
    if (!p || !v) return;

    const unlocked = this.isPlotAccessible(gx, gy);
    const groundMat = v.groundMesh.material as THREE.MeshLambertMaterial;

    if (!unlocked) {
      groundMat.map = pixelArt.getTexture(`tile_grass_${(gx + gy) % 4}`);
      groundMat.needsUpdate = true;
      v.cropGroup.visible = false;
      v.sparkleSprite.visible = false;
      return;
    }

    if (p.tilled) {
      const mask = this.getSoilMask(gx, gy);
      groundMat.map = pixelArt.getAutoTileTexture(p.watered ? 'soil_watered' : 'soil_tilled', mask);
    } else {
      groundMat.map = pixelArt.getTexture(`tile_grass_${(gx + gy) % 3}`);
    }
    groundMat.needsUpdate = true;

    if (p.cropId) {
      v.cropMat.map = pixelArt.getTexture(`crop_${p.cropId}_${p.stage}`);
      v.cropMat.needsUpdate = true;
      v.cropGroup.visible = true;
      v.sparkleSprite.visible = p.stage === 3;
    } else {
      v.cropGroup.visible = false;
      v.sparkleSprite.visible = false;
    }
  }

  public refreshPlotVisual(gx: number, gy: number): void {
    this.refreshPlotSingle(gx, gy);
    this.refreshPlotSingle(gx, gy - 1);
    this.refreshPlotSingle(gx + 1, gy);
    this.refreshPlotSingle(gx, gy + 1);
    this.refreshPlotSingle(gx - 1, gy);
  }

  public updateWindAndRain(elapsed: number, isRaining: boolean): void {
    for (let gy = 0; gy < FARM_ROWS; gy++) {
      for (let gx = 0; gx < FARM_MAX_COLS; gx++) {
        const k = this.key(gx, gy);
        const p = this.plotMap.get(k);
        const v = this.visuals.get(k);
        if (!p || !v) continue;

        if (v.cropGroup.visible) {
          const sway = Math.sin(elapsed * 2.4 + gx * 0.7 + gy * 0.5) * 0.04;
          v.cropGroup.position.x = FARM_ORIGIN_X + gx + 0.5 + sway;
          if (p.stage === 3) {
            v.cropGroup.position.y = Math.abs(Math.sin(elapsed * 3 + gx)) * 0.04;
            const pulse = 0.35 + Math.abs(Math.sin(elapsed * 4.2 + gx + gy)) * 0.25;
            v.sparkleSprite.visible = true;
            v.sparkleSprite.scale.set(pulse, pulse, 1);
            v.sparkleSprite.position.set(
              FARM_ORIGIN_X + gx + 0.68,
              1.45 + Math.sin(elapsed * 3.5 + gx) * 0.08,
              FARM_ORIGIN_Z + gy + 0.55
            );
          } else {
            v.cropGroup.position.y = 0;
            v.sparkleSprite.visible = false;
          }
        } else {
          v.sparkleSprite.visible = false;
        }

        const showPuddle = isRaining && (gx + gy) % 5 === 0 && !p.cropId;
        v.puddleMesh.visible = showPuddle;
        if (showPuddle) {
          const rPhase = (elapsed * 0.95 + gx * 0.23 + gy * 0.17) % 1;
          const rScale = 0.45 + rPhase * 0.72;
          v.rippleMesh.scale.set(rScale, rScale, 1);
          v.rippleMat.opacity = (1 - rPhase) * 0.72;
        }
      }
    }
  }

  public setCrop(gx: number, gy: number, cropId: CropId): void {
    const p = this.getPlot(gx, gy);
    if (!p) return;
    p.cropId = cropId;
    p.stage = 0;
    p.daysGrown = 0;
    this.refreshPlotVisual(gx, gy);
  }
}

import * as THREE from 'three';
import { pixelArt } from '../art/pixelArtGenerator';
import { FARM_BASE_COLS, FARM_MAX_COLS, FARM_ORIGIN_X, FARM_ORIGIN_Z, FARM_ROWS } from '../core/SaveSystem';
import { CropId, TilePlotState } from '../data/types';

interface PlotVisual {
  groundMesh: THREE.Mesh;
  cropGroup: THREE.Group;
  cropMat: THREE.MeshBasicMaterial;
  puddleMesh: THREE.Mesh;
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

    this.buildStaticPaths();
    this.initFarmPlots(initialPlots);
  }

  private key(gx: number, gy: number): string {
    return `${gx},${gy}`;
  }

  private buildStaticPaths(): void {
    // Lối đi đá từ Nhà ở (-2, -3) tới Đồi trà, Sạp Bé Sương (-8.5, -3), Quán trà (5.5, -2.5), Hải đăng (10, 4.5)
    const stoneCoords: [number, number][] = [];
    for (let x = -9; x <= 9; x++) stoneCoords.push([x, -2]);
    for (let z = -3; z <= 4; z++) stoneCoords.push([1, z]);
    for (let x = 2; x <= 10; x++) stoneCoords.push([x, 4]);
    stoneCoords.push([-2, -3], [-8, -3], [-9, -3], [5, -3], [6, -3]);

    const stoneTex = pixelArt.getTexture('tile_stone_path');
    for (const [x, z] of stoneCoords) {
      const mat = new THREE.MeshLambertMaterial({ map: stoneTex });
      const m = new THREE.Mesh(this.tileGeo, mat);
      m.position.set(x + 0.5, 0.015, z + 0.5);
      this.group.add(m);
    }

    // Sàn gỗ hiên Quán trà (x = 2..9, z = -2..2)
    const woodTex = pixelArt.getTexture('tile_wood_floor');
    for (let x = 2; x <= 9; x++) {
      for (let z = -3; z <= 2; z++) {
        const mat = new THREE.MeshLambertMaterial({ map: woodTex });
        const m = new THREE.Mesh(this.tileGeo, mat);
        m.position.set(x + 0.5, 0.03, z + 0.5);
        this.group.add(m);
      }
    }
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

      // Vũng nước nhỏ khi trời mưa
      const puddleGeo = new THREE.PlaneGeometry(0.5, 0.35);
      puddleGeo.rotateX(-Math.PI / 2);
      const puddleMat = new THREE.MeshBasicMaterial({
        color: '#76b9e8',
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      });
      const puddleMesh = new THREE.Mesh(puddleGeo, puddleMat);
      puddleMesh.position.set(wx, 0.025, wz);
      puddleMesh.visible = false;
      this.group.add(puddleMesh);

      this.visuals.set(this.key(p.gx, p.gy), {
        groundMesh,
        cropGroup: cropHandle.group,
        cropMat: cropHandle.material,
        puddleMesh,
      });
      this.refreshPlotVisual(p.gx, p.gy);
    }
  }

  public setExpandedUnlocked(val: boolean): void {
    this.expandedUnlocked = val;
    for (let gy = 0; gy < FARM_ROWS; gy++) {
      for (let gx = 0; gx < FARM_MAX_COLS; gx++) {
        this.refreshPlotVisual(gx, gy);
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

  public refreshPlotVisual(gx: number, gy: number): void {
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
      return;
    }

    if (p.tilled) {
      groundMat.map = pixelArt.getTexture(p.watered ? 'tile_soil_watered' : 'tile_soil_tilled');
    } else {
      groundMat.map = pixelArt.getTexture(`tile_grass_${(gx + gy) % 3}`);
    }
    groundMat.needsUpdate = true;

    if (p.cropId) {
      v.cropMat.map = pixelArt.getTexture(`crop_${p.cropId}_${p.stage}`);
      v.cropMat.needsUpdate = true;
      v.cropGroup.visible = true;
    } else {
      v.cropGroup.visible = false;
    }
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
          // Cây giai đoạn 3 nở hoa / nhấp nhô nhẹ báo hiệu thu hoạch được
          if (p.stage === 3) {
            v.cropGroup.position.y = Math.abs(Math.sin(elapsed * 3 + gx)) * 0.04;
          } else {
            v.cropGroup.position.y = 0;
          }
        }

        v.puddleMesh.visible = isRaining && (gx + gy) % 5 === 0 && !p.cropId;
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

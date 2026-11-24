import * as THREE from 'three';
import { PALETTE } from '../art/palette';
import { pixelArt } from '../art/pixelArtGenerator';
import { enableShadows, toonMaterials } from '../art/toonMaterials';
import { FARM_BASE_COLS, FARM_MAX_COLS, FARM_ORIGIN_X, FARM_ORIGIN_Z, FARM_ROWS } from '../core/SaveSystem';
import { CropId, TilePlotState } from '../data/types';

interface PlotVisual {
  soilMesh: THREE.Mesh;
  cropGroup: THREE.Group;
  sparkleSprite: THREE.Sprite;
  puddleMesh: THREE.Mesh;
  rippleMesh: THREE.Mesh;
  rippleMat: THREE.MeshBasicMaterial;
  lastCropKey: string;
}

export class Tiles {
  public readonly group = new THREE.Group();
  private plotMap = new Map<string, TilePlotState>();
  private visuals = new Map<string, PlotVisual>();
  private expandedUnlocked = false;

  private soilDryMat: THREE.MeshToonMaterial;
  private soilWetMat: THREE.MeshToonMaterial;
  private soilGeo = new THREE.BoxGeometry(0.9, 0.07, 0.9);
  private sharedCropGeos: Set<THREE.BufferGeometry>;
  private sharedCropMats: Set<THREE.Material>;

  constructor(initialPlots: TilePlotState[], expandedUnlocked: boolean) {
    this.expandedUnlocked = expandedUnlocked;
    this.soilDryMat = toonMaterials.createToonMaterial({
      map: toonMaterials.getTexture('soilTilled'),
    });
    this.soilWetMat = toonMaterials.createToonMaterial({
      map: toonMaterials.getTexture('soilWatered'),
    });
    this.sharedCropGeos = new Set<THREE.BufferGeometry>();
    this.sharedCropMats = new Set<THREE.Material>();
    this.initFarmPlots(initialPlots);
  }

  private key(gx: number, gy: number): string {
    return `${gx},${gy}`;
  }

  private initFarmPlots(plots: TilePlotState[]): void {
    const puddleGeo = new THREE.CircleGeometry(0.32, 12);
    puddleGeo.rotateX(-Math.PI / 2);
    const puddleMat = toonMaterials.createToonMaterial({
      color: PALETTE.waterBlue,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const rippleGeo = new THREE.RingGeometry(0.18, 0.24, 14);
    rippleGeo.rotateX(-Math.PI / 2);

    for (const p of plots) {
      this.plotMap.set(this.key(p.gx, p.gy), { ...p });

      const wx = FARM_ORIGIN_X + p.gx + 0.5;
      const wz = FARM_ORIGIN_Z + p.gy + 0.5;

      const soilMesh = new THREE.Mesh(this.soilGeo, this.soilDryMat);
      soilMesh.position.set(wx, 0.035, wz);
      soilMesh.receiveShadow = true;
      soilMesh.castShadow = false;
      soilMesh.visible = false;
      this.group.add(soilMesh);

      const cropGroup = new THREE.Group();
      cropGroup.position.set(wx, 0.06, wz);
      cropGroup.visible = false;
      this.group.add(cropGroup);

      const sparkleSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: pixelArt.getTexture('sparkle_pixel'),
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
        })
      );
      sparkleSprite.position.set(wx + 0.15, 1.15, wz + 0.1);
      sparkleSprite.scale.set(0.42, 0.42, 1);
      sparkleSprite.visible = false;
      this.group.add(sparkleSprite);

      const puddleMesh = new THREE.Mesh(puddleGeo, puddleMat);
      puddleMesh.scale.set(1.15, 1, 0.85);
      puddleMesh.position.set(wx, 0.025, wz);
      puddleMesh.visible = false;
      this.group.add(puddleMesh);

      const rippleMat = new THREE.MeshBasicMaterial({
        color: PALETTE.waterLight,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      });
      const rippleMesh = new THREE.Mesh(rippleGeo, rippleMat);
      rippleMesh.position.set(0, 0.008, 0);
      puddleMesh.add(rippleMesh);

      this.visuals.set(this.key(p.gx, p.gy), {
        soilMesh,
        cropGroup,
        sparkleSprite,
        puddleMesh,
        rippleMesh,
        rippleMat,
        lastCropKey: '',
      });
    }

    for (const p of plots) {
      this.refreshPlotSingle(p.gx, p.gy);
    }
  }

  private rebuildCropMesh(group: THREE.Group, cropId: CropId, stage: 0 | 1 | 2 | 3): void {
    group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry && !this.sharedCropGeos.has(m.geometry)) m.geometry.dispose();
      if (m.material && !Array.isArray(m.material) && !this.sharedCropMats.has(m.material)) {
        // shared toon materials live in toonMaterials cache; only dispose non-cached
      }
    });
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const leafDark = toonMaterials.getSolidToon(PALETTE.grassDark);
    const leafMid = toonMaterials.getSolidToon(PALETTE.grassMid);
    const leafBright = toonMaterials.getSolidToon(PALETTE.grassLight);
    const teaLeaf = toonMaterials.getSolidToon(PALETTE.teaGreen);
    const soilMound = toonMaterials.getSolidToon(PALETTE.soilMid);

    if (stage === 0) {
      const seed = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), soilMound);
      seed.scale.set(1.3, 0.65, 1.3);
      seed.position.y = 0.03;
      group.add(seed);
      enableShadows(group, true, true);
      return;
    }

    if (stage === 1) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.18, 5), leafMid);
      stem.position.y = 0.09;
      group.add(stem);
      for (const s of [-1, 1]) {
        const lf = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5), leafBright);
        lf.scale.set(1.3, 0.42, 0.85);
        lf.position.set(s * 0.08, 0.16, 0);
        lf.rotation.z = -s * 0.35;
        group.add(lf);
      }
      enableShadows(group, true, true);
      return;
    }

    // Giai đoạn 2 & 3 theo từng loại cây
    const sc = stage === 3 ? 1.15 : 0.82;
    if (cropId === 'green_tea') {
      const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24 * sc, 1), leafDark);
      bush.scale.set(1.15, 0.85, 1.1);
      bush.position.y = 0.22 * sc;
      group.add(bush);
      for (let i = 0; i < 3; i++) {
        const bud = new THREE.Mesh(new THREE.SphereGeometry(0.11 * sc, 6, 5), stage === 3 ? teaLeaf : leafMid);
        bud.position.set((i - 1) * 0.14, (0.34 + (i % 2) * 0.07) * sc, (i % 2 === 0 ? 0.08 : -0.06));
        group.add(bud);
      }
    } else if (cropId === 'chrysanthemum') {
      const bush = new THREE.Mesh(new THREE.ConeGeometry(0.2 * sc, 0.34 * sc, 6), leafMid);
      bush.position.y = 0.17 * sc;
      group.add(bush);
      if (stage === 3) {
        const gold = toonMaterials.getSolidToon(PALETTE.amberGold);
        for (const [fx, fy, fz] of [
          [-0.12, 0.36, 0.08],
          [0.12, 0.38, -0.06],
          [0, 0.44, 0.04],
        ]) {
          const fl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 5), gold);
          fl.scale.set(1, 0.6, 1);
          fl.position.set(fx, fy, fz);
          group.add(fl);
        }
      }
    } else if (cropId === 'mint') {
      const mintMat = toonMaterials.getSolidToon(PALETTE.tealLight);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        const lf = new THREE.Mesh(new THREE.SphereGeometry(0.14 * sc, 6, 5), i % 2 === 0 ? mintMat : leafBright);
        lf.scale.set(1.3, 0.4, 0.85);
        lf.position.set(Math.cos(a) * 0.14, 0.18 * sc, Math.sin(a) * 0.14);
        lf.rotation.y = -a;
        group.add(lf);
      }
      if (stage === 3) {
        const top = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), mintMat);
        top.position.y = 0.34;
        group.add(top);
      }
    } else if (cropId === 'jasmine') {
      const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22 * sc, 1), leafDark);
      bush.position.y = 0.24 * sc;
      group.add(bush);
      if (stage === 3) {
        const white = toonMaterials.getSolidToon(PALETTE.whiteWarm);
        for (const [fx, fy, fz] of [
          [-0.14, 0.38, 0.12],
          [0.15, 0.35, -0.1],
          [0, 0.46, 0],
          [0.05, 0.32, 0.18],
        ]) {
          const fl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), white);
          fl.position.set(fx, fy, fz);
          group.add(fl);
        }
      }
    } else {
      // ginger
      const warmTip = toonMaterials.getSolidToon(PALETTE.amberWarm);
      for (let i = -1; i <= 1; i++) {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.42 * sc, 5), leafMid);
        stalk.position.set(i * 0.1, 0.21 * sc, (i % 2) * 0.06);
        stalk.rotation.z = -i * 0.14;
        group.add(stalk);
      }
      if (stage === 3) {
        const root = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), warmTip);
        root.scale.set(1.35, 0.75, 0.9);
        root.position.set(0, 0.08, 0.08);
        group.add(root);
      }
    }

    enableShadows(group, true, true);
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

  private refreshPlotSingle(gx: number, gy: number): void {
    const k = this.key(gx, gy);
    const p = this.plotMap.get(k);
    const v = this.visuals.get(k);
    if (!p || !v) return;

    const unlocked = this.isPlotAccessible(gx, gy);
    if (!unlocked) {
      v.soilMesh.visible = false;
      v.cropGroup.visible = false;
      v.sparkleSprite.visible = false;
      return;
    }

    v.soilMesh.visible = p.tilled;
    if (p.tilled) {
      v.soilMesh.material = p.watered ? this.soilWetMat : this.soilDryMat;
    }

    if (p.cropId) {
      const ck = `${p.cropId}_${p.stage}`;
      if (v.lastCropKey !== ck) {
        v.lastCropKey = ck;
        this.rebuildCropMesh(v.cropGroup, p.cropId, p.stage);
      }
      v.cropGroup.visible = true;
      v.sparkleSprite.visible = p.stage === 3;
    } else {
      v.cropGroup.visible = false;
      v.sparkleSprite.visible = false;
    }
  }

  public refreshPlotVisual(gx: number, gy: number): void {
    this.refreshPlotSingle(gx, gy);
  }

  public updateWindAndRain(elapsed: number, isRaining: boolean): void {
    for (let gy = 0; gy < FARM_ROWS; gy++) {
      for (let gx = 0; gx < FARM_MAX_COLS; gx++) {
        const k = this.key(gx, gy);
        const p = this.plotMap.get(k);
        const v = this.visuals.get(k);
        if (!p || !v) continue;

        if (v.cropGroup.visible) {
          v.cropGroup.rotation.z = Math.sin(elapsed * 2.5 + gx * 0.7 + gy * 0.5) * 0.06;
          if (p.stage === 3) {
            v.cropGroup.scale.y = 1 + Math.sin(elapsed * 3.1 + gx) * 0.03;
            const pulse = 0.3 + Math.abs(Math.sin(elapsed * 4.2 + gx + gy)) * 0.22;
            v.sparkleSprite.visible = true;
            v.sparkleSprite.scale.set(pulse, pulse, 1);
            v.sparkleSprite.position.set(
              FARM_ORIGIN_X + gx + 0.68,
              0.72 + Math.sin(elapsed * 3.5 + gx) * 0.07,
              FARM_ORIGIN_Z + gy + 0.55
            );
          } else {
            v.cropGroup.scale.y = 1;
            v.sparkleSprite.visible = false;
          }
        } else {
          v.sparkleSprite.visible = false;
        }

        const showPuddle = isRaining && (gx + gy) % 5 === 0 && !p.cropId;
        v.puddleMesh.visible = showPuddle;
        if (showPuddle) {
          const rPhase = (elapsed * 0.95 + gx * 0.23 + gy * 0.17) % 1;
          const rScale = 0.45 + rPhase * 0.85;
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

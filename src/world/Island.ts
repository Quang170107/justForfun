import * as THREE from 'three';
import { PALETTE } from '../art/palette';
import { enableShadows, toonMaterials } from '../art/toonMaterials';
import { FootstepSurface } from '../core/AudioSystem';
import {
  ISLAND_BUSHES,
  ISLAND_DEPTH,
  ISLAND_FENCE_CELLS,
  ISLAND_FLOWER_POTS,
  ISLAND_MIN_X,
  ISLAND_MIN_Z,
  ISLAND_ROCKS,
  ISLAND_STONE_LANTERNS,
  ISLAND_TERRAIN_GRID,
  ISLAND_TREES,
  ISLAND_WIDTH,
} from '../data/islandMap';

export interface ColliderBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export class Island {
  public readonly group = new THREE.Group();
  public readonly colliders: ColliderBox[] = [];
  private swayProps: { obj: THREE.Object3D; baseRotZ: number; phase: number; amp: number }[] = [];
  private lanternEmissives: THREE.MeshToonMaterial[] = [];
  private koiFish: { mesh: THREE.Object3D; cx: number; cz: number; phase: number }[] = [];
  private pinwheelBlades: THREE.Object3D | null = null;

  public readonly halfWidth = ISLAND_WIDTH / 2;
  public readonly halfDepth = ISLAND_DEPTH / 2;

  constructor() {
    this.buildTerrainFromData();
    this.buildCliffAndRoots();
    this.buildTreesAndDecor();
    this.buildAutoConnectedFences();
    this.buildWildflowerCarpet();
    this.buildLandmarks();
  }

  private getGridChar(col: number, row: number): string {
    if (row < 0 || row >= ISLAND_DEPTH || col < 0 || col >= ISLAND_WIDTH) return '.';
    return ISLAND_TERRAIN_GRID[row]?.[col] ?? '.';
  }

  private buildTerrainFromData(): void {
    // Nền cỏ đồng nhất toàn đảo (không chia lưới vuông cứng, nhận bóng mềm)
    const grassTex = toonMaterials.getClonedTexture('meadowGrass', 11, 7);
    const grassMat = toonMaterials.createToonMaterial({ map: grassTex });
    const baseGrassGeo = new THREE.BoxGeometry(ISLAND_WIDTH, 0.4, ISLAND_DEPTH);
    const baseGrass = new THREE.Mesh(baseGrassGeo, grassMat);
    baseGrass.position.set(0, -0.2, 0);
    enableShadows(baseGrass, false, true);
    this.group.add(baseGrass);

    // Gờ cỏ bo nhẹ quanh 4 mép đảo tạo cảm giác 3D mềm mại
    const rimMat = toonMaterials.getSolidToon(PALETTE.grassMid);
    const frontRim = new THREE.Mesh(new THREE.BoxGeometry(ISLAND_WIDTH + 0.16, 0.16, 0.24), rimMat);
    frontRim.position.set(0, -0.02, this.halfDepth + 0.04);
    const backRim = new THREE.Mesh(new THREE.BoxGeometry(ISLAND_WIDTH + 0.16, 0.16, 0.24), rimMat);
    backRim.position.set(0, -0.02, -this.halfDepth - 0.04);
    const leftRim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, ISLAND_DEPTH + 0.16), rimMat);
    leftRim.position.set(-this.halfWidth - 0.04, -0.02, 0);
    const rightRim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, ISLAND_DEPTH + 0.16), rimMat);
    rightRim.position.set(this.halfWidth + 0.04, -0.02, 0);
    this.group.add(frontRim, backRim, leftRim, rightRim);

    // Lát đường đá & sàn gỗ theo lưới bản đồ (dùng shared geometry/material)
    const stoneMat = toonMaterials.createToonMaterial({
      map: toonMaterials.getTexture('stonePath'),
    });
    const woodMat = toonMaterials.createToonMaterial({
      map: toonMaterials.getTexture('woodDeck'),
    });
    const pathGeo = new THREE.BoxGeometry(1, 0.035, 1);
    const woodGeo = new THREE.BoxGeometry(1, 0.055, 1);

    for (let row = 0; row < ISLAND_DEPTH; row++) {
      for (let col = 0; col < ISLAND_WIDTH; col++) {
        const ch = this.getGridChar(col, row);
        if (ch !== 'S' && ch !== 'W') continue;
        const x = ISLAND_MIN_X + col + 0.5;
        const z = ISLAND_MIN_Z + row + 0.5;
        const mesh = new THREE.Mesh(ch === 'W' ? woodGeo : pathGeo, ch === 'W' ? woodMat : stoneMat);
        mesh.position.set(x, ch === 'W' ? 0.028 : 0.015, z);
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        this.group.add(mesh);
      }
    }
  }

  private buildCliffAndRoots(): void {
    const cliffTexH = toonMaterials.getClonedTexture('cliffRock', 7, 1);
    const cliffTexV = toonMaterials.getClonedTexture('cliffRock', 4, 1);
    const cliffMatH = toonMaterials.createToonMaterial({ map: cliffTexH });
    const cliffMatV = toonMaterials.createToonMaterial({ map: cliffTexV });

    const cliffHeight = 2.9;
    const front = new THREE.Mesh(new THREE.PlaneGeometry(ISLAND_WIDTH, cliffHeight), cliffMatH);
    front.position.set(0, -cliffHeight / 2 - 0.1, this.halfDepth);
    this.group.add(front);

    const back = new THREE.Mesh(new THREE.PlaneGeometry(ISLAND_WIDTH, cliffHeight), cliffMatH);
    back.rotation.y = Math.PI;
    back.position.set(0, -cliffHeight / 2 - 0.1, -this.halfDepth);
    this.group.add(back);

    const right = new THREE.Mesh(new THREE.PlaneGeometry(ISLAND_DEPTH, cliffHeight), cliffMatV);
    right.rotation.y = Math.PI / 2;
    right.position.set(this.halfWidth, -cliffHeight / 2 - 0.1, 0);
    this.group.add(right);

    const left = new THREE.Mesh(new THREE.PlaneGeometry(ISLAND_DEPTH, cliffHeight), cliffMatV);
    left.rotation.y = -Math.PI / 2;
    left.position.set(-this.halfWidth, -cliffHeight / 2 - 0.1, 0);
    this.group.add(left);

    // Khối đáy đá 3D vát côn lơ lửng giữa mây
    const rockDarkMat = toonMaterials.getSolidToon(PALETTE.rockDark);
    const soilDarkMat = toonMaterials.getSolidToon(PALETTE.soilDark);
    const underMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(11.5, 5.2, 2.8, 8),
      soilDarkMat
    );
    underMesh.scale.set(1.12, 1, 0.72);
    underMesh.position.set(0, -3.4, 0);
    this.group.add(underMesh);

    const spirePositions: [number, number, number, number][] = [
      [-8.5, -2.9, 5.2, 1.8],
      [7.8, -3.1, 4.9, 2.0],
      [-5.2, -3.3, -4.6, 1.9],
      [5.5, -3.0, -4.5, 1.7],
      [0.2, -3.8, 1.2, 2.4],
    ];
    for (const [sx, sy, sz, rad] of spirePositions) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, rad * 1.9, 6), rockDarkMat);
      cone.rotation.x = Math.PI;
      cone.position.set(sx, sy, sz);
      this.group.add(cone);
    }

    // Dây leo & rễ cây 3D rủ dọc vách đảo
    const vineMat = toonMaterials.getSolidToon(PALETTE.grassDark);
    const rootMat = toonMaterials.getSolidToon(PALETTE.woodDark);
    const vineGeo = new THREE.CylinderGeometry(0.06, 0.03, 1.35, 5);
    const leafGeo = new THREE.DodecahedronGeometry(0.14, 0);

    const addHanging = (x: number, z: number, isRoot: boolean, idx: number) => {
      const g = new THREE.Group();
      const stem = new THREE.Mesh(vineGeo, isRoot ? rootMat : vineMat);
      stem.position.y = -0.65;
      g.add(stem);
      if (!isRoot) {
        for (let k = 0; k < 3; k++) {
          const lf = new THREE.Mesh(leafGeo, vineMat);
          lf.position.set(k % 2 === 0 ? 0.1 : -0.1, -0.35 - k * 0.35, 0.05);
          g.add(lf);
        }
      }
      g.position.set(x, -0.12, z);
      this.group.add(g);
      this.swayProps.push({ obj: g, baseRotZ: 0, phase: idx * 0.85, amp: 0.05 });
    };

    for (let x = -11; x <= 11; x += 3) {
      addHanging(x + 0.3, this.halfDepth + 0.08, Math.abs(x) % 2 === 1, x);
      addHanging(x - 0.3, -this.halfDepth - 0.08, Math.abs(x) % 2 === 0, x + 20);
    }
    for (let z = -6; z <= 6; z += 3) {
      addHanging(this.halfWidth + 0.08, z, Math.abs(z) % 2 === 1, z + 40);
      addHanging(-this.halfWidth - 0.08, z, Math.abs(z) % 2 === 0, z + 60);
    }
  }

  private buildSakuraTree(x: number, z: number): THREE.Group {
    const g = new THREE.Group();
    const trunkMat = toonMaterials.getSolidToon(PALETTE.woodDark);
    const pinkMain = toonMaterials.getSolidToon(PALETTE.sakuraPink);
    const pinkLight = toonMaterials.getSolidToon('#f6b0c8');

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 1.55, 7), trunkMat);
    trunk.position.y = 0.78;
    trunk.rotation.z = 0.05;
    g.add(trunk);

    const branch1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 0.85, 6), trunkMat);
    branch1.position.set(-0.34, 1.38, 0.08);
    branch1.rotation.z = 0.65;
    g.add(branch1);

    const branch2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 0.8, 6), trunkMat);
    branch2.position.set(0.32, 1.42, -0.1);
    branch2.rotation.z = -0.6;
    g.add(branch2);

    const canopy = new THREE.Group();
    const puffs: [number, number, number, number, boolean][] = [
      [0, 2.08, 0, 0.92, false],
      [-0.65, 1.78, 0.18, 0.68, true],
      [0.64, 1.82, -0.14, 0.65, false],
      [0.12, 1.88, 0.56, 0.58, true],
      [-0.15, 1.92, -0.52, 0.56, false],
      [0.05, 2.48, 0.05, 0.55, true],
    ];
    for (const [px, py, pz, r, light] of puffs) {
      const sph = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), light ? pinkLight : pinkMain);
      sph.scale.set(1.1, 0.82, 1.05);
      sph.position.set(px, py, pz);
      canopy.add(sph);
    }
    g.add(canopy);
    enableShadows(g, true, true);
    g.position.set(x, 0, z);
    this.swayProps.push({ obj: canopy, baseRotZ: 0, phase: x + z, amp: 0.025 });
    return g;
  }

  private buildPineTree(x: number, z: number): THREE.Group {
    const g = new THREE.Group();
    const trunkMat = toonMaterials.getSolidToon(PALETTE.woodDark);
    const darkGreen = toonMaterials.getSolidToon(PALETTE.grassDark);
    const midGreen = toonMaterials.getSolidToon(PALETTE.grassMid);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 1.0, 6), trunkMat);
    trunk.position.y = 0.5;
    g.add(trunk);

    const canopy = new THREE.Group();
    const tiers: [number, number, number, boolean][] = [
      [1.2, 1.05, 1.25, false],
      [1.82, 0.82, 1.08, true],
      [2.38, 0.56, 0.92, false],
    ];
    for (const [cy, rad, h, lighter] of tiers) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 8), lighter ? midGreen : darkGreen);
      cone.position.y = cy;
      canopy.add(cone);
    }
    g.add(canopy);
    enableShadows(g, true, true);
    g.position.set(x, 0, z);
    this.swayProps.push({ obj: canopy, baseRotZ: 0, phase: x * 1.1 + z, amp: 0.02 });
    return g;
  }

  private buildTreesAndDecor(): void {
    // Cây thông & anh đào 3D
    for (const t of ISLAND_TREES) {
      const tree = t.kind === 'pine' ? this.buildPineTree(t.x, t.z) : this.buildSakuraTree(t.x, t.z);
      this.group.add(tree);

      this.colliders.push({
        minX: t.x - 0.55,
        maxX: t.x + 0.55,
        minZ: t.z - 0.5,
        maxZ: t.z + 0.5,
      });
    }

    // Bụi hoa 3D đung đưa
    const bushGreen = toonMaterials.getSolidToon(PALETTE.grassLight);
    const flowerPink = toonMaterials.getSolidToon(PALETTE.sakuraPink);
    const flowerGold = toonMaterials.getSolidToon(PALETTE.amberGold);
    const bushGeo = new THREE.IcosahedronGeometry(0.38, 1);
    const blossomGeo = new THREE.SphereGeometry(0.08, 6, 5);

    for (const b of ISLAND_BUSHES) {
      const bg = new THREE.Group();
      const main = new THREE.Mesh(bushGeo, bushGreen);
      main.scale.set(1.2, 0.85, 1.05);
      main.position.y = 0.28;
      bg.add(main);
      const side = new THREE.Mesh(bushGeo, toonMaterials.getSolidToon(PALETTE.grassMid));
      side.scale.set(0.75, 0.65, 0.75);
      side.position.set(0.24, 0.22, 0.12);
      bg.add(side);
      for (let f = 0; f < 3; f++) {
        const fl = new THREE.Mesh(blossomGeo, f % 2 === 0 ? flowerPink : flowerGold);
        fl.position.set((f - 1) * 0.22, 0.48 + (f % 2) * 0.08, 0.16);
        bg.add(fl);
      }
      enableShadows(bg, true, true);
      bg.position.set(b.x, 0, b.z);
      this.group.add(bg);
      this.swayProps.push({ obj: bg, baseRotZ: 0, phase: b.x * 1.3, amp: 0.03 });
    }

    // Tảng đá rêu 3D
    const rockMidMat = toonMaterials.getSolidToon(PALETTE.rockMid);
    const rockDarkMat = toonMaterials.getSolidToon(PALETTE.rockDark);
    const mossMat = toonMaterials.getSolidToon(PALETTE.grassMid);
    for (const r of ISLAND_ROCKS) {
      const rg = new THREE.Group();
      const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), rockMidMat);
      base.scale.set(1.2, 0.75, 1.0);
      base.position.y = 0.24;
      rg.add(base);
      const sub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), rockDarkMat);
      sub.position.set(0.26, 0.16, 0.14);
      rg.add(sub);
      const moss = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), mossMat);
      moss.scale.set(1.1, 0.35, 1.0);
      moss.position.set(-0.08, 0.42, 0.02);
      rg.add(moss);
      enableShadows(rg, true, true);
      rg.position.set(r.x, 0, r.z);
      this.group.add(rg);
      this.colliders.push({
        minX: r.x - 0.45,
        maxX: r.x + 0.45,
        minZ: r.z - 0.35,
        maxZ: r.z + 0.35,
      });
    }

    // Chậu hoa 3D quanh hiên & lối đi
    const potMat = toonMaterials.getSolidToon(PALETTE.roofMid);
    for (const p of ISLAND_FLOWER_POTS) {
      const pg = new THREE.Group();
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.34, 8), potMat);
      pot.position.y = 0.17;
      pg.add(pot);
      const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 1), bushGreen);
      foliage.position.y = 0.44;
      pg.add(foliage);
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), flowerGold);
      fl.position.set(0.06, 0.62, 0.08);
      pg.add(fl);
      enableShadows(pg, true, true);
      pg.position.set(p.x, 0, p.z);
      this.group.add(pg);
      this.colliders.push({
        minX: p.x - 0.35,
        maxX: p.x + 0.35,
        minZ: p.z - 0.3,
        maxZ: p.z + 0.3,
      });
    }

    // Đèn đá vườn Á Đông 3D (có lõi emissive kích hoạt Bloom ban đêm)
    const stoneLight = toonMaterials.getSolidToon(PALETTE.rockLight);
    const stoneDark = toonMaterials.getSolidToon(PALETTE.rockDark);
    for (const l of ISLAND_STONE_LANTERNS) {
      const lg = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), stoneDark);
      base.position.y = 0.09;
      lg.add(base);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.48, 6), stoneLight);
      pillar.position.y = 0.42;
      lg.add(pillar);

      const coreMat = toonMaterials.createToonMaterial({
        color: PALETTE.creamLight,
        emissive: PALETTE.amberGold,
        emissiveIntensity: 0.15,
      });
      this.lanternEmissives.push(coreMat);
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.3), coreMat);
      core.position.y = 0.78;
      lg.add(core);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.28, 4), stoneDark);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 1.04;
      lg.add(roof);

      enableShadows(lg, true, true);
      lg.position.set(l.x, 0, l.z);
      this.group.add(lg);

      this.colliders.push({
        minX: l.x - 0.38,
        maxX: l.x + 0.38,
        minZ: l.z - 0.35,
        maxZ: l.z + 0.35,
      });
    }
  }

  /** Hàng rào gỗ 3D tự nối 4 hướng (N/E/S/W) */
  private buildAutoConnectedFences(): void {
    const fenceSet = new Set(ISLAND_FENCE_CELLS.map(([fx, fz]) => `${fx},${fz}`));
    const railMat = toonMaterials.createToonMaterial({
      map: toonMaterials.getTexture('woodFence'),
    });
    const capMat = toonMaterials.getSolidToon(PALETTE.woodBright);
    const postGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.82, 6);
    const capGeo = new THREE.BoxGeometry(0.26, 0.08, 0.26);
    const railHGeo = new THREE.BoxGeometry(0.5, 0.13, 0.1);
    const railVGeo = new THREE.BoxGeometry(0.1, 0.13, 0.5);

    for (const [fx, fz] of ISLAND_FENCE_CELLS) {
      const cx = fx + 0.5;
      const cz = fz + 0.5;

      const post = new THREE.Mesh(postGeo, railMat);
      post.position.set(cx, 0.41, cz);
      post.castShadow = true;
      post.receiveShadow = true;
      this.group.add(post);

      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(cx, 0.84, cz);
      cap.castShadow = true;
      this.group.add(cap);

      const hasN = fenceSet.has(`${fx},${fz - 1}`);
      const hasE = fenceSet.has(`${fx + 1},${fz}`);
      const hasS = fenceSet.has(`${fx},${fz + 1}`);
      const hasW = fenceSet.has(`${fx - 1},${fz}`);

      for (const ry of [0.3, 0.58]) {
        if (hasE) {
          const r = new THREE.Mesh(railHGeo, railMat);
          r.position.set(cx + 0.25, ry, cz);
          r.castShadow = true;
          this.group.add(r);
        }
        if (hasW) {
          const r = new THREE.Mesh(railHGeo, railMat);
          r.position.set(cx - 0.25, ry, cz);
          r.castShadow = true;
          this.group.add(r);
        }
        if (hasS) {
          const r = new THREE.Mesh(railVGeo, railMat);
          r.position.set(cx, ry, cz + 0.25);
          r.castShadow = true;
          this.group.add(r);
        }
        if (hasN) {
          const r = new THREE.Mesh(railVGeo, railMat);
          r.position.set(cx, ry, cz - 0.25);
          r.castShadow = true;
          this.group.add(r);
        }
      }

      this.colliders.push({
        minX: fx + 0.15,
        maxX: fx + 0.85,
        minZ: fz + 0.15,
        maxZ: fz + 0.85,
      });
    }
  }

  /** Thảm cỏ & hoa dại 3D (InstancedMesh gọn nhẹ) quanh mép cỏ đảo */
  private buildWildflowerCarpet(): void {
    const stemGeo = new THREE.ConeGeometry(0.06, 0.24, 4);
    const flowerGeo = new THREE.SphereGeometry(0.065, 5, 4);
    const stemMat = toonMaterials.getSolidToon(PALETTE.grassBright);
    const flowerMat = toonMaterials.createToonMaterial({ color: PALETTE.whiteWarm });

    const spots: { x: number; z: number; rot: number; sc: number; col: THREE.Color }[] = [];
    const colors = [
      new THREE.Color(PALETTE.whiteWarm),
      new THREE.Color(PALETTE.amberGold),
      new THREE.Color(PALETTE.sakuraPink),
    ];

    for (let i = 0; i < 160; i++) {
      const col = (i * 17 + 5) % ISLAND_WIDTH;
      const row = (i * 11 + 3) % ISLAND_DEPTH;
      const ch = this.getGridChar(col, row);
      if (ch !== '.') continue;
      const x = ISLAND_MIN_X + col + 0.2 + ((i * 37) % 60) / 100;
      const z = ISLAND_MIN_Z + row + 0.2 + ((i * 53) % 60) / 100;
      // Tránh vùng công trình phía bắc và 3 địa danh mới
      if (z < -3.2 && x > -9.8 && x < 9.2) continue;
      if (z > 5.3 && x > -9.6 && x < -2.6) continue;
      spots.push({
        x,
        z,
        rot: (i * 0.7) % (Math.PI * 2),
        sc: 0.75 + (i % 4) * 0.16,
        col: colors[i % colors.length],
      });
    }

    if (spots.length === 0) return;
    const stems = new THREE.InstancedMesh(stemGeo, stemMat, spots.length);
    const blooms = new THREE.InstancedMesh(flowerGeo, flowerMat, spots.length);
    const dummy = new THREE.Object3D();

    spots.forEach((s, idx) => {
      dummy.position.set(s.x, 0.1, s.z);
      dummy.rotation.set(0, s.rot, 0);
      dummy.scale.setScalar(s.sc);
      dummy.updateMatrix();
      stems.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(s.x, 0.22 * s.sc, s.z);
      dummy.updateMatrix();
      blooms.setMatrixAt(idx, dummy.matrix);
      blooms.setColorAt(idx, s.col);
    });
    stems.instanceMatrix.needsUpdate = true;
    blooms.instanceMatrix.needsUpdate = true;
    if (blooms.instanceColor) blooms.instanceColor.needsUpdate = true;
    this.group.add(stems, blooms);
  }

  /** 3 Địa danh môi trường 3D: Hồ Sương Mây, Miếu Trà Cổ, Ghế Ngắm Biển Mây */
  private buildLandmarks(): void {
    // 1. Hồ Sương Mây (Tây Nam: x = -8.2, z = 6.35)
    const pondX = -8.2;
    const pondZ = 6.35;
    const pondGroup = new THREE.Group();
    const waterMat = toonMaterials.createToonMaterial({
      map: toonMaterials.getTexture('waterPond'),
      emissive: PALETTE.tealLight,
      emissiveIntensity: 0.12,
    });
    const waterMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.06, 18), waterMat);
    waterMesh.scale.set(1.2, 1, 0.68);
    waterMesh.position.y = 0.035;
    waterMesh.receiveShadow = true;
    pondGroup.add(waterMesh);

    const rimRock = toonMaterials.getSolidToon(PALETTE.rockMid);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + (i % 3) * 0.05, 0), rimRock);
      st.scale.set(1.1, 0.58, 0.9);
      st.position.set(Math.cos(a) * 1.38, 0.07, Math.sin(a) * 0.8);
      pondGroup.add(st);
    }

    // Lá sen & cá chép nhỏ bơi vòng tròn
    const padMat = toonMaterials.getSolidToon(PALETTE.teaGreen);
    const pad1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 10), padMat);
    pad1.position.set(-0.42, 0.075, -0.15);
    const pad2 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 10), padMat);
    pad2.position.set(0.45, 0.075, 0.18);
    pondGroup.add(pad1, pad2);

    const koiMat = toonMaterials.getSolidToon(PALETTE.coralRed);
    for (let k = 0; k < 2; k++) {
      const fish = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.14, 4, 6), koiMat);
      fish.rotation.z = Math.PI / 2;
      fish.position.set(pondX, 0.075, pondZ);
      this.group.add(fish);
      this.koiFish.push({ mesh: fish, cx: pondX, cz: pondZ, phase: k * Math.PI });
    }

    enableShadows(pondGroup, true, true);
    pondGroup.position.set(pondX, 0, pondZ);
    this.group.add(pondGroup);
    this.colliders.push({
      minX: pondX - 1.35,
      maxX: pondX + 1.35,
      minZ: pondZ - 0.75,
      maxZ: pondZ + 0.75,
    });

    // 2. Miếu Trà Cổ & Cổng Torii Đỏ (Đông: x = 10.6, z = 0.35)
    const sx = 10.6;
    const sz = 0.35;
    const shrineGroup = new THREE.Group();
    const stoneMat = toonMaterials.getSolidToon(PALETTE.rockLight);
    const redWoodMat = toonMaterials.getSolidToon(PALETTE.roofMid);
    const darkWoodMat = toonMaterials.getSolidToon(PALETTE.outlineDark);

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 1.3), stoneMat);
    plinth.position.y = 0.11;
    shrineGroup.add(plinth);

    // Cổng Torii nhỏ ở mặt trước hướng Tây (-x)
    for (const pz of [-0.45, 0.45]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.45, 7), redWoodMat);
      col.position.set(-0.48, 0.82, pz);
      shrineGroup.add(col);
    }
    const kasagi = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.13, 1.35), darkWoodMat);
    kasagi.position.set(-0.48, 1.56, 0);
    const nuki = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 1.15), redWoodMat);
    nuki.position.set(-0.48, 1.3, 0);
    shrineGroup.add(kasagi, nuki);

    // Điện miếu gỗ nhỏ + đèn lồng ấm phát sáng
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 0.78), toonMaterials.getSolidToon(PALETTE.woodMid));
    body.position.set(0.18, 0.58, 0);
    shrineGroup.add(body);

    const shrineRoof = new THREE.Mesh(
      new THREE.ConeGeometry(0.75, 0.52, 4),
      toonMaterials.getSolidToon(PALETTE.roofDark)
    );
    shrineRoof.rotation.y = Math.PI / 4;
    shrineRoof.position.set(0.18, 1.2, 0);
    const roofFinial = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 7, 5),
      toonMaterials.getSolidToon(PALETTE.amberGold)
    );
    roofFinial.position.set(0.18, 1.5, 0);
    shrineGroup.add(shrineRoof, roofFinial);

    const shrineGlowMat = toonMaterials.createToonMaterial({
      color: PALETTE.whiteWarm,
      emissive: PALETTE.amberGold,
      emissiveIntensity: 0.45,
    });
    this.lanternEmissives.push(shrineGlowMat);
    const offeringOrb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), shrineGlowMat);
    offeringOrb.position.set(-0.18, 0.44, 0);
    shrineGroup.add(offeringOrb);

    enableShadows(shrineGroup, true, true);
    shrineGroup.position.set(sx, 0, sz);
    this.group.add(shrineGroup);
    this.colliders.push({
      minX: sx - 0.75,
      maxX: sx + 0.75,
      minZ: sz - 0.65,
      maxZ: sz + 0.65,
    });

    // 3. Ghế Gỗ & Chong Chóng Ngắm Biển Mây (Nam: x = -4.0, z = 6.45)
    const bx = -4.0;
    const bz = 6.45;
    const overlookGroup = new THREE.Group();
    const woodSeatMat = toonMaterials.getSolidToon(PALETTE.woodLight);
    const woodLegMat = toonMaterials.getSolidToon(PALETTE.woodDark);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.1, 0.5), woodSeatMat);
    seat.position.y = 0.42;
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.42, 0.1), woodSeatMat);
    backrest.position.set(0, 0.68, -0.2);
    backrest.rotation.x = -0.15;
    overlookGroup.add(seat, backrest);
    for (const lx of [-0.55, 0.55]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.45), woodLegMat);
      leg.position.set(lx, 0.21, 0);
      overlookGroup.add(leg);
    }

    // Cột chong chóng xoay bên cạnh ghế
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.45, 6), woodLegMat);
    pole.position.set(0.95, 0.72, -0.1);
    overlookGroup.add(pole);

    const wheel = new THREE.Group();
    wheel.position.set(0.95, 1.4, -0.02);
    const bladeColors = [PALETTE.coralRed, PALETTE.amberGold, PALETTE.tealLight, PALETTE.sakuraPink];
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.34, 0.04),
        toonMaterials.getSolidToon(bladeColors[i])
      );
      blade.rotation.z = (i * Math.PI) / 2;
      blade.position.set(Math.sin((-i * Math.PI) / 2) * 0.16, Math.cos((-i * Math.PI) / 2) * 0.16, 0);
      wheel.add(blade);
    }
    this.pinwheelBlades = wheel;
    overlookGroup.add(wheel);

    enableShadows(overlookGroup, true, true);
    overlookGroup.position.set(bx, 0, bz);
    this.group.add(overlookGroup);
    this.colliders.push({
      minX: bx - 0.75,
      maxX: bx + 0.85,
      minZ: bz - 0.35,
      maxZ: bz + 0.35,
    });
  }

  public addCollider(box: ColliderBox): void {
    this.colliders.push(box);
  }

  public isBlocked(x: number, z: number, radius = 0.32): boolean {
    if (
      x - radius < -this.halfWidth + 0.3 ||
      x + radius > this.halfWidth - 0.3 ||
      z - radius < -this.halfDepth + 0.3 ||
      z + radius > this.halfDepth - 0.3
    ) {
      return true;
    }

    for (const b of this.colliders) {
      if (x + radius > b.minX && x - radius < b.maxX && z + radius > b.minZ && z - radius < b.maxZ) {
        return true;
      }
    }
    return false;
  }

  public getSurfaceType(x: number, z: number): FootstepSurface {
    if (x >= 4.0 && x <= 7.0 && z >= 5.2) return 'wood';
    const col = Math.floor(x) - ISLAND_MIN_X;
    const row = Math.floor(z) - ISLAND_MIN_Z;
    const ch = this.getGridChar(col, row);
    if (ch === 'W') return 'wood';
    if (ch === 'S') return 'stone';
    return 'grass';
  }

  public update(elapsed: number, nightFactor = 0): void {
    for (const s of this.swayProps) {
      s.obj.rotation.z = s.baseRotZ + Math.sin(elapsed * 1.65 + s.phase) * s.amp;
    }

    const pulse = 0.15 + nightFactor * 1.45 + nightFactor * Math.sin(elapsed * 4.5) * 0.18;
    for (const mat of this.lanternEmissives) {
      mat.emissiveIntensity = pulse;
    }

    for (const f of this.koiFish) {
      const a = elapsed * 0.85 + f.phase;
      const nx = f.cx + Math.cos(a) * 0.68;
      const nz = f.cz + Math.sin(a) * 0.36;
      f.mesh.position.set(nx, 0.075, nz);
      f.mesh.rotation.y = -a + Math.PI / 2;
    }

    if (this.pinwheelBlades) {
      this.pinwheelBlades.rotation.z = elapsed * 2.1;
    }
  }
}

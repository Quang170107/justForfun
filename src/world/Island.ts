import * as THREE from 'three';
import { pixelArt } from '../art/pixelArtGenerator';
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
  private swayProps: { obj: THREE.Object3D; baseX: number; phase: number; amp: number }[] = [];
  private lanternGlows: THREE.Sprite[] = [];

  public readonly halfWidth = ISLAND_WIDTH / 2;
  public readonly halfDepth = ISLAND_DEPTH / 2;

  constructor() {
    this.buildTerrainFromData();
    this.buildCliffAndRoots();
    this.buildTreesAndDecor();
    this.buildAutoConnectedFences();
  }

  private getGridChar(col: number, row: number): string {
    if (row < 0 || row >= ISLAND_DEPTH || col < 0 || col >= ISLAND_WIDTH) return '.';
    return ISLAND_TERRAIN_GRID[row]?.[col] ?? '.';
  }

  private getTileAutoMask(col: number, row: number, targetChar: string): number {
    let mask = 0;
    if (this.getGridChar(col, row - 1) === targetChar) mask |= 1; // North
    if (this.getGridChar(col + 1, row) === targetChar) mask |= 2; // East
    if (this.getGridChar(col, row + 1) === targetChar) mask |= 4; // South
    if (this.getGridChar(col - 1, row) === targetChar) mask |= 8; // West
    return mask;
  }

  private buildTerrainFromData(): void {
    const tileGeo = new THREE.PlaneGeometry(1, 1);
    tileGeo.rotateX(-Math.PI / 2);

    for (let row = 0; row < ISLAND_DEPTH; row++) {
      for (let col = 0; col < ISLAND_WIDTH; col++) {
        const x = ISLAND_MIN_X + col;
        const z = ISLAND_MIN_Z + row;
        const ch = this.getGridChar(col, row);

        let tex: THREE.Texture;
        let yPos = 0;

        if (ch === 'S') {
          const mask = this.getTileAutoMask(col, row, 'S');
          tex = pixelArt.getAutoTileTexture('stone_path', mask);
          yPos = 0.015;
        } else if (ch === 'W') {
          const mask = this.getTileAutoMask(col, row, 'W');
          tex = pixelArt.getAutoTileTexture('wood_floor', mask);
          yPos = 0.025;
        } else {
          const hash = Math.abs((x * 37 + z * 17) % 10);
          const variant = hash === 0 ? 3 : hash % 3;
          tex = pixelArt.getTexture(`tile_grass_${variant}`);
        }

        const tile = new THREE.Mesh(tileGeo, new THREE.MeshLambertMaterial({ map: tex }));
        tile.position.set(x + 0.5, yPos, z + 0.5);
        this.group.add(tile);
      }
    }
  }

  private buildCliffAndRoots(): void {
    const cliffTexH = pixelArt.getClonedTexture('tile_cliff');
    cliffTexH.repeat.set(ISLAND_WIDTH, 1);
    cliffTexH.wrapS = THREE.RepeatWrapping;

    const cliffTexV = pixelArt.getClonedTexture('tile_cliff');
    cliffTexV.repeat.set(ISLAND_DEPTH, 1);
    cliffTexV.wrapS = THREE.RepeatWrapping;

    const cliffHeight = 3.0;
    const cliffMatH = new THREE.MeshLambertMaterial({ map: cliffTexH });
    const cliffMatV = new THREE.MeshLambertMaterial({ map: cliffTexV });

    // 4 vách đất đá 2.5D bao quanh hòn đảo nổi
    const front = new THREE.Mesh(new THREE.PlaneGeometry(ISLAND_WIDTH, cliffHeight), cliffMatH);
    front.position.set(0, -cliffHeight / 2, this.halfDepth);
    this.group.add(front);

    const back = new THREE.Mesh(new THREE.PlaneGeometry(ISLAND_WIDTH, cliffHeight), cliffMatH);
    back.rotation.y = Math.PI;
    back.position.set(0, -cliffHeight / 2, -this.halfDepth);
    this.group.add(back);

    const right = new THREE.Mesh(new THREE.PlaneGeometry(ISLAND_DEPTH, cliffHeight), cliffMatV);
    right.rotation.y = Math.PI / 2;
    right.position.set(this.halfWidth, -cliffHeight / 2, 0);
    this.group.add(right);

    const left = new THREE.Mesh(new THREE.PlaneGeometry(ISLAND_DEPTH, cliffHeight), cliffMatV);
    left.rotation.y = -Math.PI / 2;
    left.position.set(-this.halfWidth, -cliffHeight / 2, 0);
    this.group.add(left);

    // Đáy đá thu hẹp bên dưới hòn đảo nổi
    const underGeo = new THREE.BoxGeometry(ISLAND_WIDTH - 4, 1.4, ISLAND_DEPTH - 4);
    const underMesh = new THREE.Mesh(underGeo, cliffMatH);
    underMesh.position.set(0, -cliffHeight - 0.5, 0);
    this.group.add(underMesh);

    // Dây leo & rễ cây rủ xuống dọc 4 mép vách đảo
    const vineTex = pixelArt.getTexture('prop_hanging_vine');
    const rootTex = pixelArt.getTexture('prop_hanging_root');

    const addHanging = (x: number, z: number, rotY: number, isRoot: boolean, idx: number) => {
      const mat = new THREE.MeshBasicMaterial({
        map: isRoot ? rootTex : vineTex,
        transparent: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.5), mat);
      mesh.position.set(x, -0.78, z);
      mesh.rotation.y = rotY;
      this.group.add(mesh);
      this.swayProps.push({ obj: mesh, baseX: x, phase: idx * 0.9, amp: 0.03 });
    };

    for (let x = -11; x <= 11; x += 3) {
      addHanging(x + 0.3, this.halfDepth + 0.04, 0, Math.abs(x) % 2 === 1, x);
      addHanging(x - 0.3, -this.halfDepth - 0.04, Math.PI, Math.abs(x) % 2 === 0, x + 20);
    }
    for (let z = -6; z <= 6; z += 3) {
      addHanging(this.halfWidth + 0.04, z, Math.PI / 2, Math.abs(z) % 2 === 1, z + 40);
      addHanging(-this.halfWidth - 0.04, z, -Math.PI / 2, Math.abs(z) % 2 === 0, z + 60);
    }
  }

  private buildTreesAndDecor(): void {
    // Cây thông & anh đào
    for (const t of ISLAND_TREES) {
      const handle = pixelArt.createYBillboard({
        textureKey: t.kind === 'pine' ? 'prop_tree_pine' : 'prop_tree_sakura',
        widthPx: 32,
        heightPx: 48,
        shadowScale: 1.75,
        shadowYOffset: 0.032,
      });
      handle.group.position.set(t.x, 0, t.z);
      this.group.add(handle.group);
      this.swayProps.push({ obj: handle.mesh, baseX: 0, phase: t.x + t.z, amp: 0.035 });

      this.colliders.push({
        minX: t.x - 0.55,
        maxX: t.x + 0.55,
        minZ: t.z - 0.5,
        maxZ: t.z + 0.5,
      });
    }

    // Bụi hoa đung đưa
    for (const b of ISLAND_BUSHES) {
      const handle = pixelArt.createYBillboard({
        textureKey: 'prop_bush_flower',
        widthPx: 16,
        heightPx: 16,
        shadowScale: 0.8,
        shadowYOffset: 0.032,
      });
      handle.group.position.set(b.x, 0, b.z);
      this.group.add(handle.group);
      this.swayProps.push({ obj: handle.mesh, baseX: 0, phase: b.x * 1.3, amp: 0.025 });
    }

    // Tảng đá rêu (có va chạm)
    for (const r of ISLAND_ROCKS) {
      const handle = pixelArt.createYBillboard({
        textureKey: 'prop_rock',
        widthPx: 16,
        heightPx: 16,
        shadowScale: 0.9,
        shadowYOffset: 0.032,
      });
      handle.group.position.set(r.x, 0, r.z);
      this.group.add(handle.group);
      this.colliders.push({
        minX: r.x - 0.45,
        maxX: r.x + 0.45,
        minZ: r.z - 0.35,
        maxZ: r.z + 0.35,
      });
    }

    // Chậu hoa quanh hiên & lối đi
    for (const p of ISLAND_FLOWER_POTS) {
      const handle = pixelArt.createYBillboard({
        textureKey: 'prop_potted_plant',
        widthPx: 16,
        heightPx: 20,
        shadowScale: 0.7,
        shadowYOffset: 0.036,
        baseYOffset: 0.025,
      });
      handle.group.position.set(p.x, 0, p.z);
      this.group.add(handle.group);
      this.colliders.push({
        minX: p.x - 0.35,
        maxX: p.x + 0.35,
        minZ: p.z - 0.3,
        maxZ: p.z + 0.3,
      });
    }

    // Đèn đá vườn Á Đông (tự phát sáng ban đêm)
    const glowTex = pixelArt.getTexture('glow_pixel');
    for (const l of ISLAND_STONE_LANTERNS) {
      const handle = pixelArt.createYBillboard({
        textureKey: 'prop_stone_lantern',
        widthPx: 16,
        heightPx: 24,
        shadowScale: 0.8,
        shadowYOffset: 0.032,
      });
      handle.group.position.set(l.x, 0, l.z);
      this.group.add(handle.group);

      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      glow.position.set(l.x, 0.95, l.z);
      glow.scale.set(1.7, 1.7, 1);
      this.group.add(glow);
      this.lanternGlows.push(glow);

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
    const railMat = new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('wood_fence_rail') });
    const postGeo = new THREE.BoxGeometry(0.24, 0.78, 0.24);
    const railHGeo = new THREE.BoxGeometry(0.5, 0.14, 0.12);
    const railVGeo = new THREE.BoxGeometry(0.12, 0.14, 0.5);

    for (const [fx, fz] of ISLAND_FENCE_CELLS) {
      const cx = fx + 0.5;
      const cz = fz + 0.5;

      const post = new THREE.Mesh(postGeo, railMat);
      post.position.set(cx, 0.39, cz);
      this.group.add(post);

      const hasN = fenceSet.has(`${fx},${fz - 1}`);
      const hasE = fenceSet.has(`${fx + 1},${fz}`);
      const hasS = fenceSet.has(`${fx},${fz + 1}`);
      const hasW = fenceSet.has(`${fx - 1},${fz}`);

      for (const ry of [0.28, 0.54]) {
        if (hasE) {
          const r = new THREE.Mesh(railHGeo, railMat);
          r.position.set(cx + 0.25, ry, cz);
          this.group.add(r);
        }
        if (hasW) {
          const r = new THREE.Mesh(railHGeo, railMat);
          r.position.set(cx - 0.25, ry, cz);
          this.group.add(r);
        }
        if (hasS) {
          const r = new THREE.Mesh(railVGeo, railMat);
          r.position.set(cx, ry, cz + 0.25);
          this.group.add(r);
        }
        if (hasN) {
          const r = new THREE.Mesh(railVGeo, railMat);
          r.position.set(cx, ry, cz - 0.25);
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

  public update(elapsed: number, nightFactor = 0): void {
    for (const s of this.swayProps) {
      s.obj.position.x = s.baseX + Math.sin(elapsed * 1.6 + s.phase) * s.amp;
    }

    for (let i = 0; i < this.lanternGlows.length; i++) {
      const sp = this.lanternGlows[i];
      const mat = sp.material as THREE.SpriteMaterial;
      const flicker = 0.9 + Math.sin(elapsed * 4.2 + i) * 0.1;
      mat.opacity = nightFactor * 0.78 * flicker;
    }
  }
}

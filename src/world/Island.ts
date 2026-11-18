import * as THREE from 'three';
import { pixelArt } from '../art/pixelArtGenerator';

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

  public readonly halfWidth = 13;
  public readonly halfDepth = 8;

  constructor() {
    this.buildTerrain();
    this.buildTreesAndDecor();
  }

  private buildTerrain(): void {
    const tileGeo = new THREE.PlaneGeometry(1, 1);
    tileGeo.rotateX(-Math.PI / 2);

    // Mặt cỏ pixel 16x16 toàn hòn đảo (26x16 ô)
    for (let z = -this.halfDepth; z < this.halfDepth; z++) {
      for (let x = -this.halfWidth; x < this.halfWidth; x++) {
        const hash = Math.abs((x * 37 + z * 17) % 10);
        const variant = hash === 0 ? 3 : hash % 3;
        const mat = new THREE.MeshLambertMaterial({
          map: pixelArt.getTexture(`tile_grass_${variant}`),
        });
        const tile = new THREE.Mesh(tileGeo, mat);
        tile.position.set(x + 0.5, 0, z + 0.5);
        this.group.add(tile);
      }
    }

    // Vách đất/đá 2.5D bao quanh hòn đảo tạo độ dày
    const cliffTexH = pixelArt.getClonedTexture('tile_cliff');
    cliffTexH.repeat.set(this.halfWidth * 2, 1);
    cliffTexH.wrapS = THREE.RepeatWrapping;

    const cliffTexV = pixelArt.getClonedTexture('tile_cliff');
    cliffTexV.repeat.set(this.halfDepth * 2, 1);
    cliffTexV.wrapS = THREE.RepeatWrapping;

    const cliffHeight = 2.6;
    const cliffMatH = new THREE.MeshLambertMaterial({ map: cliffTexH });
    const cliffMatV = new THREE.MeshLambertMaterial({ map: cliffTexV });

    // Mặt trước (z = +8)
    const front = new THREE.Mesh(new THREE.PlaneGeometry(this.halfWidth * 2, cliffHeight), cliffMatH);
    front.position.set(0, -cliffHeight / 2, this.halfDepth);
    this.group.add(front);

    // Mặt sau (z = -8)
    const back = new THREE.Mesh(new THREE.PlaneGeometry(this.halfWidth * 2, cliffHeight), cliffMatH);
    back.rotation.y = Math.PI;
    back.position.set(0, -cliffHeight / 2, -this.halfDepth);
    this.group.add(back);

    // Mặt phải (x = +13)
    const right = new THREE.Mesh(new THREE.PlaneGeometry(this.halfDepth * 2, cliffHeight), cliffMatV);
    right.rotation.y = Math.PI / 2;
    right.position.set(this.halfWidth, -cliffHeight / 2, 0);
    this.group.add(right);

    // Mặt trái (x = -13)
    const left = new THREE.Mesh(new THREE.PlaneGeometry(this.halfDepth * 2, cliffHeight), cliffMatV);
    left.rotation.y = -Math.PI / 2;
    left.position.set(-this.halfWidth, -cliffHeight / 2, 0);
    this.group.add(left);
  }

  private buildTreesAndDecor(): void {
    const treePositions: { x: number; z: number; kind: 'pine' | 'sakura' }[] = [
      { x: -11.5, z: -6.2, kind: 'sakura' },
      { x: -11.8, z: -1.5, kind: 'pine' },
      { x: -11.6, z: 6.4, kind: 'pine' },
      { x: -5.5, z: -6.5, kind: 'pine' },
      { x: 1.0, z: -6.4, kind: 'sakura' },
      { x: 10.6, z: -6.2, kind: 'sakura' },
      { x: 11.4, z: -1.2, kind: 'pine' },
      { x: 2.0, z: 6.6, kind: 'sakura' },
      { x: 7.2, z: 6.6, kind: 'pine' },
    ];

    for (const t of treePositions) {
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

    // Bụi hoa đung đưa dọc lối đi và mép đảo
    const bushes: [number, number][] = [
      [-10.5, -3.5],
      [-5.2, -3.2],
      [-0.5, 6.2],
      [-5.8, 6.8],
      [9.8, 2.2],
      [11.8, 2.4],
    ];
    for (const [bx, bz] of bushes) {
      const handle = pixelArt.createYBillboard({
        textureKey: 'prop_bush_flower',
        widthPx: 16,
        heightPx: 16,
        shadowScale: 0.8,
        shadowYOffset: 0.032,
      });
      handle.group.position.set(bx, 0, bz);
      this.group.add(handle.group);
      this.swayProps.push({ obj: handle.mesh, baseX: 0, phase: bx * 1.3, amp: 0.025 });
    }

    // Hàng rào gỗ ở mép Bắc đồi trà & rìa Tây
    for (let fx = -10; fx <= -3; fx++) {
      if (fx === -6 || fx === -5) continue; // Cổng mở vào đồi trà
      const handle = pixelArt.createYBillboard({
        textureKey: 'prop_fence',
        widthPx: 16,
        heightPx: 16,
        shadowScale: 0.7,
        shadowYOffset: 0.032,
      });
      handle.group.position.set(fx + 0.5, 0, -0.15);
      this.group.add(handle.group);
      this.colliders.push({ minX: fx, maxX: fx + 1, minZ: -0.45, maxZ: 0.15 });
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

  public update(elapsed: number): void {
    for (const s of this.swayProps) {
      s.obj.position.x = s.baseX + Math.sin(elapsed * 1.6 + s.phase) * s.amp;
    }
  }
}

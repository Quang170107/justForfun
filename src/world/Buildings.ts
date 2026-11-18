import * as THREE from 'three';
import { pixelArt } from '../art/pixelArtGenerator';
import { UpgradesState } from '../data/types';
import { Island } from './Island';

export interface InteractiveZone {
  id: 'sleep_door' | 'seed_shop' | 'drying_rack' | 'roast_wok' | 'brew_counter' | 'tea_table';
  label: string;
  x: number;
  z: number;
  radius: number;
  tableIndex?: number;
}

export class Buildings {
  public readonly group = new THREE.Group();
  public readonly zones: InteractiveZone[] = [];
  public readonly tableSeats: { x: number; z: number }[] = [
    { x: 3.3, z: 0.2 },
    { x: 5.5, z: 0.7 },
    { x: 7.7, z: 0.2 },
    { x: 7.7, z: 2.0 }, // Bàn thứ 4 khi nâng cấp
  ];

  private nightGlows: THREE.Sprite[] = [];
  private homeWallMat!: THREE.MeshLambertMaterial;
  private beaconBeam!: THREE.Mesh;
  private dryingMat!: THREE.MeshBasicMaterial;
  private extraTableGroup = new THREE.Group();
  private decorGroup = new THREE.Group();
  private smokeParticles: { sprite: THREE.Sprite; originY: number; phase: number }[] = [];

  constructor(island: Island, upgrades: UpgradesState) {
    this.buildHomeCottage(island);
    this.buildSeedStall(island);
    this.buildTeahouse(island);
    this.buildLighthouse(island);
    this.buildProcessingStations(island);
    this.buildSmokeEmitters();

    this.group.add(this.extraTableGroup);
    this.group.add(this.decorGroup);
    this.applyUpgrades(upgrades);
  }

  private addNightGlow(x: number, y: number, z: number, scale = 1.9): void {
    const mat = new THREE.SpriteMaterial({
      map: pixelArt.getTexture('glow_pixel'),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sp = new THREE.Sprite(mat);
    sp.position.set(x, y, z);
    sp.scale.set(scale, scale, 1);
    this.group.add(sp);
    this.nightGlows.push(sp);
  }

  private buildHomeCottage(island: Island): void {
    const cx = -2.2;
    const cz = -5.4;
    const w = 3.2;
    const h = 2.0;
    const d = 2.4;

    this.homeWallMat = new THREE.MeshLambertMaterial({
      map: pixelArt.getTexture('wall_home'),
    });
    const sideMat = new THREE.MeshLambertMaterial({
      map: pixelArt.getTexture('wall_home'),
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [
      sideMat,
      sideMat,
      sideMat,
      sideMat,
      this.homeWallMat,
      sideMat,
    ]);
    body.position.set(cx, h / 2, cz);
    this.group.add(body);

    // Mái ngói nghiêng kiểu 2.5D
    const roofMat = new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('roof_tiles') });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.7, 1.35, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(cx, h + 0.65, cz);
    this.group.add(roof);

    // Ống khói nhỏ trên mái nhà
    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.9, 0.45),
      new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('wall_lighthouse') })
    );
    chimney.position.set(cx + 0.9, h + 0.85, cz - 0.3);
    this.group.add(chimney);

    // Đèn lồng trước cửa nhà
    const lantern = pixelArt.createYBillboard({
      textureKey: 'prop_lantern',
      widthPx: 16,
      heightPx: 24,
      baseYOffset: 0.4,
    });
    lantern.group.position.set(cx - 1.1, 0, cz + d / 2 + 0.2);
    this.group.add(lantern.group);
    this.addNightGlow(cx - 1.1, 1.1, cz + d / 2 + 0.25, 1.8);
    this.addNightGlow(cx, 1.0, cz + d / 2 + 0.15, 1.6);

    island.addCollider({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
    this.zones.push({
      id: 'sleep_door',
      label: 'Ngủ nghỉ & Lưu game (Nhà ở)',
      x: cx,
      z: cz + d / 2 + 0.7,
      radius: 1.4,
    });
  }

  private buildSeedStall(island: Island): void {
    const sx = -8.4;
    const sz = -5.4;

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.0, 1.4),
      new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('tile_wood_floor') })
    );
    base.position.set(sx, 0.5, sz);
    this.group.add(base);

    // Hai trụ gỗ
    const postMat = new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('tile_wood_floor') });
    for (const dx of [-1.1, 1.1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.9, 0.18), postMat);
      post.position.set(sx + dx, 0.95, sz - 0.5);
      this.group.add(post);
    }

    // Mái bạt sọc đỏ kem
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.28, 1.8),
      new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('stall_awning') })
    );
    awning.rotation.x = 0.22;
    awning.position.set(sx, 1.95, sz);
    this.group.add(awning);

    this.addNightGlow(sx, 1.5, sz + 0.6, 1.6);
    island.addCollider({ minX: sx - 1.35, maxX: sx + 1.35, minZ: sz - 0.75, maxZ: sz + 0.75 });
    this.zones.push({
      id: 'seed_shop',
      label: 'Sạp Hạt Giống Bé Sương',
      x: sx,
      z: sz + 1.2,
      radius: 1.5,
    });
  }

  private buildTeahouse(island: Island): void {
    const tx = 5.5;
    const tz = -5.0;
    const w = 5.4;
    const h = 2.3;
    const d = 2.6;

    const wallMat = new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('wall_teahouse') });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    body.position.set(tx, h / 2, tz);
    this.group.add(body);

    // Mái cong 2 tầng kiểu Á Đông
    const roofMat = new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('roof_tiles') });
    const lowerRoof = new THREE.Mesh(new THREE.BoxGeometry(w + 1.1, 0.35, d + 1.1), roofMat);
    lowerRoof.position.set(tx, h + 0.12, tz);
    this.group.add(lowerRoof);

    const upperRoof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.25, 4), roofMat);
    upperRoof.rotation.y = Math.PI / 4;
    upperRoof.scale.set(1.4, 1, 0.9);
    upperRoof.position.set(tx, h + 0.88, tz);
    this.group.add(upperRoof);

    // Biển hiệu "Trà Quán"
    const sign = pixelArt.createYBillboard({
      textureKey: 'sign_tra_quan',
      widthPx: 32,
      heightPx: 16,
      baseYOffset: h - 0.35,
    });
    sign.group.position.set(tx, 0, tz + d / 2 + 0.56);
    this.group.add(sign.group);

    // 2 đèn lồng đỏ hai bên hiên quán
    for (const lx of [tx - 2.3, tx + 2.3]) {
      const lan = pixelArt.createYBillboard({
        textureKey: 'prop_lantern',
        widthPx: 16,
        heightPx: 24,
        baseYOffset: 0.65,
      });
      lan.group.position.set(lx, 0, tz + d / 2 + 0.45);
      this.group.add(lan.group);
      this.addNightGlow(lx, 1.35, tz + d / 2 + 0.5, 2.3);
    }

    island.addCollider({ minX: tx - w / 2, maxX: tx + w / 2, minZ: tz - d / 2, maxZ: tz + d / 2 });

    // Quầy pha trà trên hiên gỗ
    const cx = 5.5;
    const cz = -2.4;
    const counter = pixelArt.createYBillboard({
      textureKey: 'prop_tea_counter',
      widthPx: 32,
      heightPx: 24,
      shadowScale: 1.8,
      shadowYOffset: 0.036,
      baseYOffset: 0.032,
    });
    counter.group.position.set(cx, 0, cz);
    this.group.add(counter.group);
    island.addCollider({ minX: cx - 0.9, maxX: cx + 0.9, minZ: cz - 0.45, maxZ: cz + 0.45 });
    this.zones.push({
      id: 'brew_counter',
      label: 'Quầy Pha Trà',
      x: cx,
      z: cz + 0.8,
      radius: 1.45,
    });

    // 3 bàn trà ban đầu
    for (let i = 0; i < 3; i++) {
      const seat = this.tableSeats[i];
      const tbl = pixelArt.createYBillboard({
        textureKey: 'prop_table',
        widthPx: 24,
        heightPx: 24,
        shadowScale: 1.3,
        shadowYOffset: 0.036,
        baseYOffset: 0.032,
      });
      tbl.group.position.set(seat.x, 0, seat.z);
      this.group.add(tbl.group);
      island.addCollider({ minX: seat.x - 0.55, maxX: seat.x + 0.55, minZ: seat.z - 0.45, maxZ: seat.z + 0.45 });
      this.zones.push({
        id: 'tea_table',
        label: `Bàn Trà #${i + 1}`,
        x: seat.x,
        z: seat.z,
        radius: 1.45,
        tableIndex: i,
      });
    }

    // Bàn thứ 4 (chờ nâng cấp mở khóa)
    const seat4 = this.tableSeats[3];
    const tbl4 = pixelArt.createYBillboard({
      textureKey: 'prop_table',
      widthPx: 24,
      heightPx: 24,
      shadowScale: 1.3,
      shadowYOffset: 0.036,
      baseYOffset: 0.032,
    });
    tbl4.group.position.set(seat4.x, 0, seat4.z);
    this.extraTableGroup.add(tbl4.group);
    this.zones.push({
      id: 'tea_table',
      label: 'Bàn Trà #4',
      x: seat4.x,
      z: seat4.z,
      radius: 1.45,
      tableIndex: 3,
    });
  }

  private buildLighthouse(island: Island): void {
    const lx = 11.2;
    const lz = 5.4;

    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 1.05, 3.6, 8),
      new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('wall_lighthouse') })
    );
    tower.position.set(lx, 1.8, lz);
    this.group.add(tower);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.95, 0.9, 8),
      new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('roof_tiles') })
    );
    roof.position.set(lx, 4.25, lz);
    this.group.add(roof);

    // Buồng đèn hải đăng phát sáng vàng ấm
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.55, 0.75),
      new THREE.MeshBasicMaterial({ color: '#f2c14e' })
    );
    lamp.position.set(lx, 3.7, lz);
    this.group.add(lamp);

    // Tia sáng xoay ban đêm
    const beamGeo = new THREE.ConeGeometry(0.8, 5.5, 6);
    beamGeo.rotateZ(Math.PI / 2);
    beamGeo.translate(-2.75, 0, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#f2c14e',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.beaconBeam = new THREE.Mesh(beamGeo, beamMat);
    this.beaconBeam.position.set(lx, 3.7, lz);
    this.group.add(this.beaconBeam);

    this.addNightGlow(lx, 3.7, lz, 3.0);
    island.addCollider({ minX: lx - 1.0, maxX: lx + 1.0, minZ: lz - 1.0, maxZ: lz + 1.0 });
  }

  private buildProcessingStations(island: Island): void {
    // Nong phơi tre
    const dx = 0.2;
    const dz = -2.4;
    const drying = pixelArt.createYBillboard({
      textureKey: 'prop_drying_empty',
      widthPx: 24,
      heightPx: 24,
      shadowScale: 1.3,
      shadowYOffset: 0.032,
      baseYOffset: 0.025,
    });
    drying.group.position.set(dx, 0, dz);
    this.dryingMat = drying.material;
    this.group.add(drying.group);
    island.addCollider({ minX: dx - 0.55, maxX: dx + 0.55, minZ: dz - 0.45, maxZ: dz + 0.45 });
    this.zones.push({
      id: 'drying_rack',
      label: 'Nong Phơi Lá Tre',
      x: dx,
      z: dz + 0.7,
      radius: 1.35,
    });

    // Chảo sao trà
    const rx = 0.2;
    const rz = -0.3;
    const wok = pixelArt.createYBillboard({
      textureKey: 'prop_roast_wok',
      widthPx: 24,
      heightPx: 24,
      shadowScale: 1.3,
      shadowYOffset: 0.032,
      baseYOffset: 0.025,
    });
    wok.group.position.set(rx, 0, rz);
    this.group.add(wok.group);
    this.addNightGlow(rx, 0.45, rz + 0.2, 1.4);
    island.addCollider({ minX: rx - 0.55, maxX: rx + 0.55, minZ: rz - 0.45, maxZ: rz + 0.45 });
    this.zones.push({
      id: 'roast_wok',
      label: 'Chảo Sao Trà',
      x: rx,
      z: rz + 0.7,
      radius: 1.35,
    });
  }

  private buildSmokeEmitters(): void {
    // Khói từ ống khói nhà ở & ấm trà trên quầy
    const origins: [number, number, number][] = [
      [-1.3, 3.3, -5.7], // Ống khói nhà ở
      [5.5, 1.35, -2.4], // Ấm trà quầy
    ];

    for (let i = 0; i < 6; i++) {
      const [ox, oy, oz] = origins[i % origins.length];
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: pixelArt.getTexture('cloud_tuft'),
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        })
      );
      sp.position.set(ox, oy, oz);
      sp.scale.set(0.55, 0.3, 1);
      this.group.add(sp);
      this.smokeParticles.push({ sprite: sp, originY: oy, phase: i * 0.9 });
    }
  }

  public applyUpgrades(upgrades: UpgradesState): void {
    this.extraTableGroup.visible = upgrades.extraTableUnlocked;

    // Clear & rebuild optional decorations
    while (this.decorGroup.children.length > 0) {
      this.decorGroup.remove(this.decorGroup.children[0]);
    }

    if (upgrades.decorLanterns) {
      for (const [x, z] of [
        [2.2, 2.4],
        [8.8, 2.4],
      ]) {
        const lan = pixelArt.createYBillboard({
          textureKey: 'prop_lantern',
          widthPx: 16,
          heightPx: 24,
          shadowScale: 0.65,
          shadowYOffset: 0.036,
          baseYOffset: 0.032,
        });
        lan.group.position.set(x, 0, z);
        this.decorGroup.add(lan.group);
        this.addNightGlow(x, 0.95, z, 1.9);
      }
    }

    if (upgrades.decorWindChime) {
      const chime = pixelArt.createYBillboard({
        textureKey: 'prop_wind_chime',
        widthPx: 16,
        heightPx: 24,
        baseYOffset: 0.9,
      });
      chime.group.position.set(3.8, 0, -3.5);
      this.decorGroup.add(chime.group);
    }

    if (upgrades.decorPottedPlants) {
      for (const [x, z] of [
        [2.4, -2.6],
        [8.6, -2.6],
      ]) {
        const pot = pixelArt.createYBillboard({
          textureKey: 'prop_potted_plant',
          widthPx: 16,
          heightPx: 20,
          shadowScale: 0.7,
          shadowYOffset: 0.036,
          baseYOffset: 0.032,
        });
        pot.group.position.set(x, 0, z);
        this.decorGroup.add(pot.group);
      }
    }
  }

  public setDryingRackHasLeaves(hasLeaves: boolean): void {
    this.dryingMat.map = pixelArt.getTexture(hasLeaves ? 'prop_drying_full' : 'prop_drying_empty');
    this.dryingMat.needsUpdate = true;
  }

  public getNearestZone(px: number, pz: number, extraTableUnlocked: boolean): InteractiveZone | null {
    let best: InteractiveZone | null = null;
    let bestDist = Infinity;
    for (const z of this.zones) {
      if (z.tableIndex === 3 && !extraTableUnlocked) continue;
      const d = Math.hypot(px - z.x, pz - z.z);
      if (d <= z.radius && d < bestDist) {
        best = z;
        bestDist = d;
      }
    }
    return best;
  }

  public update(elapsed: number, nightFactor: number): void {
    const isLit = nightFactor > 0.45;
    const desiredWall = pixelArt.getTexture(isLit ? 'wall_home_lit' : 'wall_home');
    if (this.homeWallMat.map !== desiredWall) {
      this.homeWallMat.map = desiredWall;
      this.homeWallMat.needsUpdate = true;
    }

    // Quầng sáng đèn lồng, cửa sổ & hải đăng ban đêm
    for (let i = 0; i < this.nightGlows.length; i++) {
      const sp = this.nightGlows[i];
      const mat = sp.material as THREE.SpriteMaterial;
      const flicker = 0.88 + Math.sin(elapsed * 4.5 + i) * 0.12;
      mat.opacity = nightFactor * 0.82 * flicker;
    }

    const beamMat = this.beaconBeam.material as THREE.MeshBasicMaterial;
    beamMat.opacity = nightFactor * 0.28;
    this.beaconBeam.rotation.y = elapsed * 0.75;

    // Khói bốc lên từ ống khói & ấm trà
    for (const s of this.smokeParticles) {
      const cycle = ((elapsed * 0.65 + s.phase) % 2.2) / 2.2;
      s.sprite.position.y = s.originY + cycle * 1.4;
      const mat = s.sprite.material as THREE.SpriteMaterial;
      mat.opacity = (1 - cycle) * 0.5;
    }
  }
}

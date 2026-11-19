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
  private homeWallMats: THREE.MeshLambertMaterial[] = [];
  private homeRoofGroup = new THREE.Group();
  private homeRoofMats: THREE.Material[] = [];
  private teahouseRoofGroup = new THREE.Group();
  private teahouseRoofMats: THREE.Material[] = [];

  private beaconBeam!: THREE.Mesh;
  private dryingMat!: THREE.MeshBasicMaterial;
  private extraTableGroup = new THREE.Group();
  private decorGroup = new THREE.Group();
  private smokeParticles: { sprite: THREE.Sprite; originY: number; phase: number }[] = [];

  private homeRoofOpacity = 1;
  private teahouseRoofOpacity = 1;

  constructor(island: Island, upgrades: UpgradesState) {
    this.buildHomeCottage(island);
    this.buildSeedStall(island);
    this.buildTeahouse(island);
    this.buildLighthouse(island);
    this.buildProcessingStations(island);
    this.buildSmokeEmitters();

    this.group.add(this.homeRoofGroup);
    this.group.add(this.teahouseRoofGroup);
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

  /** Dựng mái ngói Á Đông xếp lớp ngang (không dùng ConeGeometry gây xoáy UV) */
  private buildAsianPitchedRoof(
    targetGroup: THREE.Group,
    matTrack: THREE.Material[],
    cx: number,
    baseY: number,
    cz: number,
    width: number,
    depth: number,
    peakHeight: number,
    eaveCurve = true
  ): void {
    const roofTex = pixelArt.getClonedTexture('roof_tiles');
    roofTex.wrapS = THREE.RepeatWrapping;
    roofTex.wrapT = THREE.RepeatWrapping;
    roofTex.repeat.set(Math.max(1, Math.round(width / 2)), 2);

    const roofMat = new THREE.MeshLambertMaterial({ map: roofTex, transparent: true });
    const ridgeMat = new THREE.MeshLambertMaterial({
      map: pixelArt.getTexture('roof_ridge'),
      transparent: true,
    });
    matTrack.push(roofMat, ridgeMat);

    const halfD = depth / 2 + 0.35;
    const slopeLen = Math.hypot(halfD, peakHeight);
    const tilt = Math.atan2(peakHeight, halfD);

    // Mái dốc trước (Nam) & sau (Bắc)
    const frontSlope = new THREE.Mesh(new THREE.BoxGeometry(width, 0.16, slopeLen), roofMat);
    frontSlope.rotation.x = tilt;
    frontSlope.position.set(cx, baseY + peakHeight / 2, cz + halfD / 2);
    targetGroup.add(frontSlope);

    const backSlope = new THREE.Mesh(new THREE.BoxGeometry(width, 0.16, slopeLen), roofMat);
    backSlope.rotation.x = -tilt;
    backSlope.position.set(cx, baseY + peakHeight / 2, cz - halfD / 2);
    targetGroup.add(backSlope);

    // Đuôi mái cong nhẹ ở 2 đầu hồi kiểu Á Đông
    if (eaveCurve) {
      for (const side of [-1, 1]) {
        const wingF = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, slopeLen * 0.85), roofMat);
        wingF.rotation.x = tilt;
        wingF.rotation.z = side * 0.24;
        wingF.position.set(cx + side * (width / 2 + 0.18), baseY + peakHeight / 2 + 0.08, cz + halfD / 2);
        targetGroup.add(wingF);

        const wingB = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, slopeLen * 0.85), roofMat);
        wingB.rotation.x = -tilt;
        wingB.rotation.z = side * 0.24;
        wingB.position.set(cx + side * (width / 2 + 0.18), baseY + peakHeight / 2 + 0.08, cz - halfD / 2);
        targetGroup.add(wingB);
      }
    }

    // Bờ nóc mái
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.22, 0.28), ridgeMat);
    ridge.position.set(cx, baseY + peakHeight + 0.06, cz);
    targetGroup.add(ridge);
  }

  private buildHomeCottage(island: Island): void {
    const cx = -2.2;
    const cz = -5.4;
    const w = 4.0;
    const h = 1.9;
    const d = 2.8;
    const wallThick = 0.18;

    const frontMat = new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('wall_home') });
    const sideMat = new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('wall_home') });
    this.homeWallMats.push(frontMat, sideMat);

    // Tường sau, trái, phải
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThick), sideMat);
    backWall.position.set(cx, h / 2, cz - d / 2 + wallThick / 2);
    this.group.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), sideMat);
    leftWall.position.set(cx - w / 2 + wallThick / 2, h / 2, cz);
    this.group.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), sideMat);
    rightWall.position.set(cx + w / 2 - wallThick / 2, h / 2, cz);
    this.group.add(rightWall);

    // Tường trước có cửa rộng 1.6 đơn vị (x: -3.0..-1.4)
    const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(1.2, h, wallThick), frontMat);
    frontLeft.position.set(cx - 1.4, h / 2, cz + d / 2 - wallThick / 2);
    this.group.add(frontLeft);

    const frontRight = new THREE.Mesh(new THREE.BoxGeometry(1.2, h, wallThick), frontMat);
    frontRight.position.set(cx + 1.4, h / 2, cz + d / 2 - wallThick / 2);
    this.group.add(frontRight);

    // Đà cửa trên (thuộc roof group để mờ cùng mái khi vào nhà)
    const lintelMat = new THREE.MeshLambertMaterial({
      map: pixelArt.getTexture('tile_wood_floor'),
      transparent: true,
    });
    this.homeRoofMats.push(lintelMat);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.36, wallThick), lintelMat);
    lintel.position.set(cx, h - 0.18, cz + d / 2 - wallThick / 2);
    this.homeRoofGroup.add(lintel);

    // Mái ngói dốc xếp lớp ngang + ống khói
    this.buildAsianPitchedRoof(this.homeRoofGroup, this.homeRoofMats, cx, h, cz, w + 0.6, d, 0.95, false);
    const chimneyMat = new THREE.MeshLambertMaterial({
      map: pixelArt.getTexture('wall_lighthouse'),
      transparent: true,
    });
    this.homeRoofMats.push(chimneyMat);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.9, 0.45), chimneyMat);
    chimney.position.set(cx + 0.95, h + 0.8, cz - 0.35);
    this.homeRoofGroup.add(chimney);

    // Nội thất Nhà ở: Thảm chiếu, Giường ngủ, Chậu hoa
    const rugGeo = new THREE.PlaneGeometry(2.0, 1.5);
    rugGeo.rotateX(-Math.PI / 2);
    const rug = new THREE.Mesh(
      rugGeo,
      new THREE.MeshBasicMaterial({ map: pixelArt.getTexture('prop_rug') })
    );
    rug.position.set(cx + 0.1, 0.036, cz + 0.15);
    this.group.add(rug);

    const bed = pixelArt.createYBillboard({
      textureKey: 'prop_bed',
      widthPx: 24,
      heightPx: 24,
      shadowScale: 1.25,
      shadowYOffset: 0.038,
      baseYOffset: 0.03,
    });
    bed.group.position.set(cx - 1.1, 0, cz - 0.45);
    this.group.add(bed.group);
    island.addCollider({ minX: cx - 1.75, maxX: cx - 0.55, minZ: cz - 1.0, maxZ: cz + 0.05 });

    const pot = pixelArt.createYBillboard({
      textureKey: 'prop_potted_plant',
      widthPx: 16,
      heightPx: 20,
      shadowScale: 0.7,
      shadowYOffset: 0.038,
      baseYOffset: 0.03,
    });
    pot.group.position.set(cx + 1.25, 0, cz - 0.7);
    this.group.add(pot.group);
    island.addCollider({ minX: cx + 0.9, maxX: cx + 1.6, minZ: cz - 1.0, maxZ: cz - 0.4 });

    // Đèn lồng trước cửa nhà
    const lantern = pixelArt.createYBillboard({
      textureKey: 'prop_lantern',
      widthPx: 16,
      heightPx: 24,
      baseYOffset: 0.42,
    });
    lantern.group.position.set(cx - 1.25, 0, cz + d / 2 + 0.25);
    this.group.add(lantern.group);
    this.addNightGlow(cx - 1.25, 1.1, cz + d / 2 + 0.28, 1.8);
    this.addNightGlow(cx, 1.0, cz + d / 2 + 0.15, 1.6);

    // Colliders tường bao Nhà ở (chừa cửa 1.6 ở giữa)
    island.addCollider({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz - d / 2 + 0.25 });
    island.addCollider({ minX: cx - w / 2, maxX: cx - w / 2 + 0.25, minZ: cz - d / 2, maxZ: cz + d / 2 });
    island.addCollider({ minX: cx + w / 2 - 0.25, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
    island.addCollider({ minX: cx - w / 2, maxX: cx - 0.85, minZ: cz + d / 2 - 0.25, maxZ: cz + d / 2 + 0.1 });
    island.addCollider({ minX: cx + 0.85, maxX: cx + w / 2, minZ: cz + d / 2 - 0.25, maxZ: cz + d / 2 + 0.1 });

    this.zones.push({
      id: 'sleep_door',
      label: 'Ngủ nghỉ & Lưu game (Giường ngủ)',
      x: cx - 0.2,
      z: cz + 0.3,
      radius: 1.8,
    });
  }

  private buildSeedStall(island: Island): void {
    const sx = -8.4;
    const sz = -5.4;

    const woodSideMat = new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('tile_wood_floor') });
    const stallFrontMat = new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('wall_seed_stall') });
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.95, 1.3), [
      woodSideMat,
      woodSideMat,
      woodSideMat,
      woodSideMat,
      stallFrontMat,
      woodSideMat,
    ]);
    base.position.set(sx, 0.475, sz);
    this.group.add(base);

    for (const dx of [-1.15, 1.15]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.9, 0.18), woodSideMat);
      post.position.set(sx + dx, 0.95, sz - 0.5);
      this.group.add(post);
    }

    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.24, 1.8),
      new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('stall_awning') })
    );
    awning.rotation.x = 0.22;
    awning.position.set(sx, 1.95, sz);
    this.group.add(awning);

    this.addNightGlow(sx, 1.5, sz + 0.6, 1.6);
    island.addCollider({ minX: sx - 1.35, maxX: sx + 1.35, minZ: sz - 0.7, maxZ: sz + 0.7 });
    this.zones.push({
      id: 'seed_shop',
      label: 'Sạp Hạt Giống Bé Sương',
      x: sx,
      z: sz + 1.25,
      radius: 1.5,
    });
  }

  private buildTeahouse(island: Island): void {
    const tx = 5.5;
    const tz = -5.1;
    const w = 6.6;
    const h = 2.2;
    const d = 3.4;
    const wallThick = 0.18;

    const wallMat = new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('wall_teahouse') });

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThick), wallMat);
    backWall.position.set(tx, h / 2, tz - d / 2 + wallThick / 2);
    this.group.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), wallMat);
    leftWall.position.set(tx - w / 2 + wallThick / 2, h / 2, tz);
    this.group.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), wallMat);
    rightWall.position.set(tx + w / 2 - wallThick / 2, h / 2, tz);
    this.group.add(rightWall);

    // Tường trước mở cửa rộng 2.0 đơn vị (x: 4.5..6.5)
    const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(2.3, h, wallThick), wallMat);
    frontLeft.position.set(tx - 2.15, h / 2, tz + d / 2 - wallThick / 2);
    this.group.add(frontLeft);

    const frontRight = new THREE.Mesh(new THREE.BoxGeometry(2.3, h, wallThick), wallMat);
    frontRight.position.set(tx + 2.15, h / 2, tz + d / 2 - wallThick / 2);
    this.group.add(frontRight);

    // Mái cong Á Đông 2 tầng xếp lớp ngang (thuộc teahouseRoofGroup để mở khi bước vào)
    const lintelMat = new THREE.MeshLambertMaterial({
      map: pixelArt.getTexture('wall_teahouse'),
      transparent: true,
    });
    this.teahouseRoofMats.push(lintelMat);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.36, wallThick), lintelMat);
    lintel.position.set(tx, h - 0.18, tz + d / 2 - wallThick / 2);
    this.teahouseRoofGroup.add(lintel);

    this.buildAsianPitchedRoof(this.teahouseRoofGroup, this.teahouseRoofMats, tx, h - 0.05, tz, w + 0.8, d, 0.75, true);
    this.buildAsianPitchedRoof(this.teahouseRoofGroup, this.teahouseRoofMats, tx, h + 0.65, tz, w * 0.72, d * 0.65, 0.72, true);

    // Biển hiệu "Trà Quán" & 2 đèn lồng đỏ ngoài hiên quán
    const sign = pixelArt.createYBillboard({
      textureKey: 'sign_tra_quan',
      widthPx: 32,
      heightPx: 16,
      baseYOffset: h - 0.3,
    });
    sign.group.position.set(tx, 0, tz + d / 2 + 0.38);
    this.group.add(sign.group);

    for (const lx of [tx - 2.6, tx + 2.6]) {
      const lan = pixelArt.createYBillboard({
        textureKey: 'prop_lantern',
        widthPx: 16,
        heightPx: 24,
        baseYOffset: 0.65,
      });
      lan.group.position.set(lx, 0, tz + d / 2 + 0.35);
      this.group.add(lan.group);
      this.addNightGlow(lx, 1.35, tz + d / 2 + 0.4, 2.5);
    }

    // Quầng sáng ấm hắt qua 2 ô cửa giấy shoji mặt tiền Quán Trà ban đêm
    this.addNightGlow(tx - 2.1, 1.15, tz + d / 2 + 0.12, 1.85);
    this.addNightGlow(tx + 2.1, 1.15, tz + d / 2 + 0.12, 1.85);

    // Colliders tường Quán Trà (chừa cửa 2.0 ở giữa)
    island.addCollider({ minX: tx - w / 2, maxX: tx + w / 2, minZ: tz - d / 2, maxZ: tz - d / 2 + 0.25 });
    island.addCollider({ minX: tx - w / 2, maxX: tx - w / 2 + 0.25, minZ: tz - d / 2, maxZ: tz + d / 2 });
    island.addCollider({ minX: tx + w / 2 - 0.25, maxX: tx + w / 2, minZ: tz - d / 2, maxZ: tz + d / 2 });
    island.addCollider({ minX: tx - w / 2, maxX: tx - 1.0, minZ: tz + d / 2 - 0.25, maxZ: tz + d / 2 + 0.1 });
    island.addCollider({ minX: tx + 1.0, maxX: tx + w / 2, minZ: tz + d / 2 - 0.25, maxZ: tz + d / 2 + 0.1 });

    // Nội thất Quán Trà: Thảm, Kệ hũ trà, Quầy pha trà (ấm trà + hũ trà), Chậu cây
    const rugGeo = new THREE.PlaneGeometry(2.4, 1.6);
    rugGeo.rotateX(-Math.PI / 2);
    const rug = new THREE.Mesh(
      rugGeo,
      new THREE.MeshBasicMaterial({ map: pixelArt.getTexture('prop_rug') })
    );
    rug.position.set(tx, 0.036, tz + 0.55);
    this.group.add(rug);

    for (const sx of [tx - 2.0, tx + 2.0]) {
      const shelf = pixelArt.createYBillboard({
        textureKey: 'prop_tea_shelf',
        widthPx: 32,
        heightPx: 24,
        shadowScale: 1.5,
        shadowYOffset: 0.038,
        baseYOffset: 0.03,
      });
      shelf.group.position.set(sx, 0, tz - 1.0);
      this.group.add(shelf.group);
      island.addCollider({ minX: sx - 0.9, maxX: sx + 0.9, minZ: tz - 1.4, maxZ: tz - 0.65 });
    }

    const cx = tx;
    const cz = tz - 0.7;
    const counter = pixelArt.createYBillboard({
      textureKey: 'prop_tea_counter',
      widthPx: 32,
      heightPx: 24,
      shadowScale: 1.8,
      shadowYOffset: 0.038,
      baseYOffset: 0.03,
    });
    counter.group.position.set(cx, 0, cz);
    this.group.add(counter.group);
    island.addCollider({ minX: cx - 0.9, maxX: cx + 0.9, minZ: cz - 0.45, maxZ: cz + 0.4 });
    this.zones.push({
      id: 'brew_counter',
      label: 'Quầy Pha Trà',
      x: cx,
      z: cz + 0.95,
      radius: 1.55,
    });

    for (const px of [tx - 2.6, tx + 2.6]) {
      const pot = pixelArt.createYBillboard({
        textureKey: 'prop_potted_plant',
        widthPx: 16,
        heightPx: 20,
        shadowScale: 0.7,
        shadowYOffset: 0.038,
        baseYOffset: 0.03,
      });
      pot.group.position.set(px, 0, tz + 0.8);
      this.group.add(pot.group);
    }

    // 3 bàn trà ngoài hiên gỗ
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
    const lx = 11.0;
    const lz = 5.4;

    const stoneMat = new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('wall_lighthouse') });
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.4, 2.1), stoneMat);
    plinth.position.set(lx, 0.2, lz);
    this.group.add(plinth);

    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.1, 1.5), stoneMat);
    tower.position.set(lx, 1.95, lz);
    this.group.add(tower);

    // Buồng đèn kính pixel art (thay khối vàng trơn)
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.72, 1.05),
      new THREE.MeshBasicMaterial({ map: pixelArt.getTexture('wall_lighthouse_lamp') })
    );
    lamp.position.set(lx, 3.85, lz);
    this.group.add(lamp);

    // Mái chóp ngói xếp tầng (không xoáy UV)
    const roofMat = new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('roof_tiles') });
    const cap1 = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.28, 1.45), roofMat);
    cap1.position.set(lx, 4.35, lz);
    this.group.add(cap1);

    const cap2 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.32, 0.85), roofMat);
    cap2.position.set(lx, 4.65, lz);
    this.group.add(cap2);

    const finial = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.26, 0.28),
      new THREE.MeshLambertMaterial({ map: pixelArt.getTexture('roof_ridge') })
    );
    finial.position.set(lx, 4.92, lz);
    this.group.add(finial);

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
    this.beaconBeam.position.set(lx, 3.85, lz);
    this.group.add(this.beaconBeam);

    this.addNightGlow(lx, 3.85, lz, 3.0);
    island.addCollider({ minX: lx - 1.05, maxX: lx + 1.05, minZ: lz - 1.05, maxZ: lz + 1.05 });
  }

  private buildProcessingStations(island: Island): void {
    // Nong phơi tre (bên rìa Đông đồi trà, chừa trọn lối đá x=1)
    const dx = 0.25;
    const dz = -0.6;
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
    island.addCollider({ minX: dx - 0.52, maxX: dx + 0.52, minZ: dz - 0.4, maxZ: dz + 0.4 });
    this.zones.push({
      id: 'drying_rack',
      label: 'Nong Phơi Lá Tre',
      x: dx,
      z: dz + 0.7,
      radius: 1.35,
    });

    // Chảo sao trà
    const rx = 0.25;
    const rz = 1.4;
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
    island.addCollider({ minX: rx - 0.52, maxX: rx + 0.52, minZ: rz - 0.4, maxZ: rz + 0.4 });
    this.zones.push({
      id: 'roast_wok',
      label: 'Chảo Sao Trà',
      x: rx,
      z: rz + 0.7,
      radius: 1.35,
    });
  }

  private buildSmokeEmitters(): void {
    const origins: [number, number, number][] = [
      [-1.25, 3.2, -5.75], // Ống khói nhà ở
      [5.5, 1.45, -5.8], // Ấm trà quầy trong quán
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
        [2.4, -2.5],
        [8.6, -2.5],
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

  public isInsideHome(px: number, pz: number): boolean {
    return px >= -4.15 && px <= -0.25 && pz >= -6.75 && pz <= -3.95;
  }

  public isInsideTeahouse(px: number, pz: number): boolean {
    return px >= 2.25 && px <= 8.75 && pz >= -6.75 && pz <= -3.35;
  }

  public getLocationLabel(px: number, pz: number): string {
    if (this.isInsideHome(px, pz)) return '🏠 Bên Trong Nhà Ở';
    if (this.isInsideTeahouse(px, pz)) return '🍵 Bên Trong Trà Quán';
    if (px >= -10.5 && px <= 0 && pz >= -0.2 && pz <= 6.2) return '🌿 Đồi Trà Trên Mây';
    if (px >= 8.5 && pz >= 3.2) return '🗼 Mũi Hải Đăng Mây';
    if (px >= 2 && px <= 9.2 && pz >= -3.35 && pz <= 3.1) return '☕ Hiên Quán Trà';
    return '🏝️ Đảo Trà Trên Mây';
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

  public update(elapsed: number, nightFactor: number, playerX = 0, playerZ = 0): void {
    const isLit = nightFactor > 0.45;
    const desiredWall = pixelArt.getTexture(isLit ? 'wall_home_lit' : 'wall_home');
    for (const mat of this.homeWallMats) {
      if (mat.map !== desiredWall) {
        mat.map = desiredWall;
        mat.needsUpdate = true;
      }
    }

    // Mái nhà ở & quán trà mờ/ẩn mượt khi người chơi bước qua cửa vào trong
    const targetHomeOp = this.isInsideHome(playerX, playerZ) ? 0.08 : 1;
    this.homeRoofOpacity = THREE.MathUtils.lerp(this.homeRoofOpacity, targetHomeOp, 0.18);
    this.homeRoofGroup.visible = this.homeRoofOpacity > 0.12;
    for (const m of this.homeRoofMats) {
      m.opacity = this.homeRoofOpacity;
    }

    const targetTeaOp = this.isInsideTeahouse(playerX, playerZ) ? 0.08 : 1;
    this.teahouseRoofOpacity = THREE.MathUtils.lerp(this.teahouseRoofOpacity, targetTeaOp, 0.18);
    this.teahouseRoofGroup.visible = this.teahouseRoofOpacity > 0.12;
    for (const m of this.teahouseRoofMats) {
      m.opacity = this.teahouseRoofOpacity;
    }

    for (let i = 0; i < this.nightGlows.length; i++) {
      const sp = this.nightGlows[i];
      const mat = sp.material as THREE.SpriteMaterial;
      const flicker = 0.88 + Math.sin(elapsed * 4.5 + i) * 0.12;
      mat.opacity = nightFactor * 0.92 * flicker;
    }

    const beamMat = this.beaconBeam.material as THREE.MeshBasicMaterial;
    beamMat.opacity = nightFactor * 0.28;
    this.beaconBeam.rotation.y = elapsed * 0.75;

    for (const s of this.smokeParticles) {
      const cycle = ((elapsed * 0.65 + s.phase) % 2.2) / 2.2;
      s.sprite.position.y = s.originY + cycle * 1.4;
      const mat = s.sprite.material as THREE.SpriteMaterial;
      mat.opacity = (1 - cycle) * 0.5;
    }
  }
}

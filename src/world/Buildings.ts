import * as THREE from 'three';
import { pixelArt } from '../art/pixelArtGenerator';
import { CLEANUP_SPOTS } from '../data/story';
import { PlacedDecorState, UpgradesState } from '../data/types';
import { DryingRackVisualState } from '../systems/ProcessingSystem';
import { ColliderBox, Island } from './Island';

export interface InteractiveZone {
  id:
    | 'sleep_door'
    | 'weather_radio'
    | 'shipping_bin'
    | 'seed_shop'
    | 'drying_rack'
    | 'roast_wok'
    | 'brew_counter'
    | 'tea_table'
    | 'open_sign'
    | 'cleanup_spot'
    | 'letter_pickup'
    | 'festival_stand';
  label: string;
  x: number;
  z: number;
  radius: number;
  tableIndex?: number;
  spotId?: string;
  letterId?: string;
}

export class Buildings {
  public readonly group = new THREE.Group();
  public readonly zones: InteractiveZone[] = [];
  public readonly tableSeats: { x: number; z: number }[] = [
    { x: 3.1, z: -0.35 },
    { x: 5.5, z: -0.35 },
    { x: 7.9, z: -0.35 },
    { x: 4.2, z: 1.65 }, // Bàn thứ 4 khi nâng cấp
    { x: 6.8, z: 1.65 }, // Bàn thứ 5 khi nâng cấp
  ];

  private nightGlows: THREE.Sprite[] = [];
  private homeWallMats: THREE.MeshLambertMaterial[] = [];
  private homeRoofGroup = new THREE.Group();
  private homeRoofMats: THREE.Material[] = [];
  private teahouseRoofGroup = new THREE.Group();
  private teahouseRoofMats: THREE.Material[] = [];

  private beaconBeam!: THREE.Mesh;
  private dryingMat!: THREE.MeshBasicMaterial;
  private openSignMat!: THREE.MeshBasicMaterial;
  public readonly cloudPierPos = { x: 5.3, z: 7.3 };
  private dryingRackState: DryingRackVisualState = 'empty';
  private dryingSparkle!: THREE.Sprite;
  public readonly dryingRackPos = { x: 0.25, z: -0.6 };
  public readonly roastWokPos = { x: 0.25, z: 1.4 };
  private islandRef!: Island;
  private table4Group = new THREE.Group();
  private table5Group = new THREE.Group();
  private table4Collider: ColliderBox = { minX: 4.2 - 0.55, maxX: 4.2 + 0.55, minZ: 1.65 - 0.45, maxZ: 1.65 + 0.45 };
  private table5Collider: ColliderBox = { minX: 6.8 - 0.55, maxX: 6.8 + 0.55, minZ: 1.65 - 0.45, maxZ: 1.65 + 0.45 };
  private shippingBinMat!: THREE.MeshBasicMaterial;
  private decorGroup = new THREE.Group();
  private decorNightGlows: THREE.Sprite[] = [];
  private decorSwayProps: { obj: THREE.Object3D; baseZ: number; phase: number }[] = [];
  private storyGroup = new THREE.Group();
  private storyZones: InteractiveZone[] = [];
  private storyGlows: THREE.Sprite[] = [];
  private smokeParticles: { sprite: THREE.Sprite; originY: number; phase: number }[] = [];

  private readonly decorPostMat = new THREE.MeshLambertMaterial({ color: 0x614132 });
  private readonly decorLanternPostGeo = new THREE.BoxGeometry(0.08, 0.96, 0.08);
  private readonly decorChimePostGeo = new THREE.BoxGeometry(0.08, 1.28, 0.08);
  private readonly decorArmGeo = new THREE.BoxGeometry(0.08, 0.07, 0.24);
  private readonly storyFlatGeo: THREE.PlaneGeometry;
  private readonly sharedDynamicGeos: Set<THREE.BufferGeometry>;
  private readonly sharedDynamicMats: Set<THREE.Material>;

  private homeRoofOpacity = 1;
  private teahouseRoofOpacity = 1;

  constructor(island: Island, upgrades: UpgradesState) {
    this.storyFlatGeo = new THREE.PlaneGeometry(0.9, 0.9);
    this.storyFlatGeo.rotateX(-Math.PI / 2);
    this.sharedDynamicGeos = new Set([
      this.decorLanternPostGeo,
      this.decorChimePostGeo,
      this.decorArmGeo,
      this.storyFlatGeo,
    ]);
    this.sharedDynamicMats = new Set([this.decorPostMat]);

    this.islandRef = island;
    this.buildHomeCottage(island);
    this.buildSeedStall(island);
    this.buildTeahouse(island);
    this.buildLighthouse(island);
    this.buildProcessingStations(island);
    this.buildCloudPier(island);
    this.buildSmokeEmitters();

    this.group.add(this.homeRoofGroup);
    this.group.add(this.teahouseRoofGroup);
    this.group.add(this.table4Group);
    this.group.add(this.table5Group);
    this.group.add(this.decorGroup);
    this.group.add(this.storyGroup);
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

    // Đài radio dự báo thời tiết ngày mai trong Nhà Ở
    const radio = pixelArt.createYBillboard({
      textureKey: 'prop_weather_radio',
      widthPx: 16,
      heightPx: 20,
      shadowScale: 0.72,
      shadowYOffset: 0.038,
      baseYOffset: 0.03,
    });
    radio.group.position.set(cx + 1.25, 0, cz + 0.35);
    this.group.add(radio.group);
    island.addCollider({ minX: cx + 0.9, maxX: cx + 1.6, minZ: cz + 0.05, maxZ: cz + 0.65 });
    this.zones.push({
      id: 'weather_radio',
      label: 'Nghe Đài Dự Báo Thời Tiết Ngày Mai',
      x: cx + 0.95,
      z: cz + 0.45,
      radius: 0.95,
    });

    this.zones.push({
      id: 'sleep_door',
      label: 'Ngủ nghỉ & Lưu game (Giường ngủ)',
      x: cx - 1.0,
      z: cz + 0.15,
      radius: 1.15,
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

    // Bàn thứ 4 & Bàn thứ 5 (mở rộng lần lượt 3 -> 4 -> 5)
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
    this.table4Group.add(tbl4.group);
    this.zones.push({
      id: 'tea_table',
      label: 'Bàn Trà #4',
      x: seat4.x,
      z: seat4.z,
      radius: 1.45,
      tableIndex: 3,
    });

    const seat5 = this.tableSeats[4];
    const tbl5 = pixelArt.createYBillboard({
      textureKey: 'prop_table',
      widthPx: 24,
      heightPx: 24,
      shadowScale: 1.3,
      shadowYOffset: 0.036,
      baseYOffset: 0.032,
    });
    tbl5.group.position.set(seat5.x, 0, seat5.z);
    this.table5Group.add(tbl5.group);
    this.zones.push({
      id: 'tea_table',
      label: 'Bàn Trà #5',
      x: seat5.x,
      z: seat5.z,
      radius: 1.45,
      tableIndex: 4,
    });

    // Biển đứng "Mở cửa / Đóng cửa" bên rìa hiên gỗ cạnh lối vào quán
    const sx = 2.5;
    const sz = -1.6;
    const openSign = pixelArt.createYBillboard({
      textureKey: 'prop_shop_sign_closed',
      widthPx: 24,
      heightPx: 24,
      shadowScale: 1.0,
      shadowYOffset: 0.036,
      baseYOffset: 0.032,
    });
    openSign.group.position.set(sx, 0, sz);
    this.openSignMat = openSign.material;
    this.group.add(openSign.group);
    island.addCollider({ minX: sx - 0.35, maxX: sx + 0.35, minZ: sz - 0.3, maxZ: sz + 0.3 });
    this.zones.push({
      id: 'open_sign',
      label: 'Biển Mở/Đóng Quán',
      x: sx - 0.15,
      z: sz + 0.35,
      radius: 1.35,
    });
  }

  private buildCloudPier(island: Island): void {
    const px = this.cloudPierPos.x;
    const pzStart = 5.0;
    const len = 2.8;
    const w = 2.4;

    const pierTex = pixelArt.getClonedTexture('tile_wood_floor');
    pierTex.wrapS = THREE.RepeatWrapping;
    pierTex.wrapT = THREE.RepeatWrapping;
    pierTex.repeat.set(2, 3);
    const pierGeo = new THREE.PlaneGeometry(w, len);
    pierGeo.rotateX(-Math.PI / 2);
    const pierMesh = new THREE.Mesh(
      pierGeo,
      new THREE.MeshLambertMaterial({ map: pierTex })
    );
    pierMesh.position.set(px, 0.028, pzStart + len / 2);
    this.group.add(pierMesh);

    const postOffsets: [number, number][] = [
      [px - 1.05, pzStart + 0.3],
      [px + 1.05, pzStart + 0.3],
      [px - 1.05, pzStart + len - 0.25],
      [px + 1.05, pzStart + len - 0.25],
    ];
    for (const [ox, oz] of postOffsets) {
      const post = pixelArt.createYBillboard({
        textureKey: 'prop_pier_post',
        widthPx: 16,
        heightPx: 24,
        shadowScale: 0.75,
        shadowYOffset: 0.034,
        baseYOffset: 0.032,
      });
      post.group.position.set(ox, 0, oz);
      this.group.add(post.group);
      island.addCollider({ minX: ox - 0.22, maxX: ox + 0.22, minZ: oz - 0.22, maxZ: oz + 0.22 });
    }

    // Đèn lồng bến mây soi lối cho khách lên đảo chiều tối
    const pierLantern = pixelArt.createYBillboard({
      textureKey: 'prop_lantern',
      widthPx: 16,
      heightPx: 24,
      shadowScale: 0.65,
      shadowYOffset: 0.034,
      baseYOffset: 0.032,
    });
    pierLantern.group.position.set(px + 1.08, 0, pzStart + 1.3);
    this.group.add(pierLantern.group);
    this.addNightGlow(px + 1.08, 0.95, pzStart + 1.3, 2.0);
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
    const dx = this.dryingRackPos.x;
    const dz = this.dryingRackPos.z;
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

    this.dryingSparkle = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: pixelArt.getTexture('sparkle_pixel'),
        transparent: true,
        depthWrite: false,
      })
    );
    this.dryingSparkle.position.set(dx + 0.3, 1.52, dz + 0.1);
    this.dryingSparkle.scale.set(0.45, 0.45, 1);
    this.dryingSparkle.visible = false;
    this.group.add(this.dryingSparkle);

    island.addCollider({ minX: dx - 0.52, maxX: dx + 0.52, minZ: dz - 0.4, maxZ: dz + 0.4 });
    this.zones.push({
      id: 'drying_rack',
      label: 'Nong Phơi Lá Tre',
      x: dx,
      z: dz + 0.7,
      radius: 1.35,
    });

    // Hộp bán hàng qua đêm (cạnh hông đông Nhà Ở, gần đường đá)
    const binX = 0.45;
    const binZ = -4.0;
    const shippingBin = pixelArt.createYBillboard({
      textureKey: 'prop_shipping_bin',
      widthPx: 24,
      heightPx: 24,
      shadowScale: 1.25,
      shadowYOffset: 0.032,
      baseYOffset: 0.025,
    });
    shippingBin.group.position.set(binX, 0, binZ);
    this.shippingBinMat = shippingBin.material;
    this.group.add(shippingBin.group);
    island.addCollider({ minX: binX - 0.48, maxX: binX + 0.48, minZ: binZ - 0.38, maxZ: binZ + 0.38 });
    this.zones.push({
      id: 'shipping_bin',
      label: 'Hộp Bán Hàng Qua Đêm',
      x: binX,
      z: binZ + 0.7,
      radius: 1.45,
    });

    // Chảo sao trà
    const rx = this.roastWokPos.x;
    const rz = this.roastWokPos.z;
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
      [5.5, 1.05, -0.35], // Hơi ấm tách trà trên bàn ngoài hiên
    ];

    for (let i = 0; i < 8; i++) {
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
      sp.scale.set(0.5, 0.28, 1);
      this.group.add(sp);
      this.smokeParticles.push({ sprite: sp, originY: oy, phase: i * 0.72 });
    }
  }

  private syncColliderState(box: ColliderBox, enabled: boolean): void {
    const idx = this.islandRef.colliders.indexOf(box);
    if (enabled && idx === -1) {
      this.islandRef.addCollider(box);
    } else if (!enabled && idx !== -1) {
      this.islandRef.colliders.splice(idx, 1);
    }
  }

  public applyUpgrades(upgrades: UpgradesState): void {
    this.table4Group.visible = upgrades.tableCount >= 4;
    this.table5Group.visible = upgrades.tableCount >= 5;
    this.syncColliderState(this.table4Collider, upgrades.tableCount >= 4);
    this.syncColliderState(this.table5Collider, upgrades.tableCount >= 5);
  }

  private clearDynamicGroup(group: THREE.Group): void {
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh | THREE.Sprite;
      if ('geometry' in mesh && mesh.geometry && !this.sharedDynamicGeos.has(mesh.geometry)) {
        mesh.geometry.dispose();
      }
      if ('material' in mesh && mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (!this.sharedDynamicMats.has(m)) {
            m.dispose();
          }
        }
      }
    });
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
  }

  public syncPlacedDecors(decors: PlacedDecorState[]): void {
    this.clearDynamicGroup(this.decorGroup);
    this.decorNightGlows = [];
    this.decorSwayProps = [];

    decors.forEach((dec, idx) => {
      const wx = dec.tileX + 0.5;
      const wz = dec.tileZ + 0.5;

      if (dec.itemId === 'decor_lantern') {
        const post = new THREE.Mesh(this.decorLanternPostGeo, this.decorPostMat);
        post.position.set(wx, 0.48, wz - 0.14);
        this.decorGroup.add(post);

        const arm = new THREE.Mesh(this.decorArmGeo, this.decorPostMat);
        arm.position.set(wx, 0.94, wz - 0.04);
        this.decorGroup.add(arm);

        const lan = pixelArt.createYBillboard({
          textureKey: 'prop_lantern',
          widthPx: 16,
          heightPx: 24,
          shadowScale: 0.7,
          shadowYOffset: 0.036,
          baseYOffset: 0.28,
        });
        lan.group.position.set(wx, 0, wz);
        this.decorGroup.add(lan.group);

        const glowMat = new THREE.SpriteMaterial({
          map: pixelArt.getTexture('glow_pixel'),
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const glow = new THREE.Sprite(glowMat);
        glow.position.set(wx, 0.9, wz + 0.04);
        glow.scale.set(2.0, 2.0, 1);
        this.decorGroup.add(glow);
        this.decorNightGlows.push(glow);
      } else if (dec.itemId === 'decor_wind_chime') {
        const post = new THREE.Mesh(this.decorChimePostGeo, this.decorPostMat);
        post.position.set(wx, 0.64, wz - 0.14);
        this.decorGroup.add(post);

        const arm = new THREE.Mesh(this.decorArmGeo, this.decorPostMat);
        arm.position.set(wx, 1.24, wz - 0.04);
        this.decorGroup.add(arm);

        const chime = pixelArt.createYBillboard({
          textureKey: 'prop_wind_chime',
          widthPx: 16,
          heightPx: 24,
          shadowScale: 0.65,
          shadowYOffset: 0.036,
          baseYOffset: 0.42,
        });
        chime.group.position.set(wx, 0, wz);
        this.decorGroup.add(chime.group);
        this.decorSwayProps.push({ obj: chime.group, baseZ: 0, phase: idx * 1.1 });
      } else if (dec.itemId === 'decor_potted_plant') {
        const pot = pixelArt.createYBillboard({
          textureKey: 'prop_potted_plant',
          widthPx: 16,
          heightPx: 20,
          shadowScale: 0.72,
          shadowYOffset: 0.036,
          baseYOffset: 0.032,
        });
        pot.group.position.set(wx, 0, wz);
        this.decorGroup.add(pot.group);
      }
    });
  }

  public setShippingBinHasItems(hasItems: boolean): void {
    this.shippingBinMat.map = pixelArt.getTexture(
      hasItems ? 'prop_shipping_bin_full' : 'prop_shipping_bin'
    );
    this.shippingBinMat.needsUpdate = true;
  }

  public setShopOpenSign(isOpen: boolean): void {
    this.openSignMat.map = pixelArt.getTexture(
      isOpen ? 'prop_shop_sign_open' : 'prop_shop_sign_closed'
    );
    this.openSignMat.needsUpdate = true;
  }

  public setDryingRackState(state: DryingRackVisualState): void {
    this.dryingRackState = state;
    const texKey =
      state === 'ready'
        ? 'prop_drying_ready'
        : state === 'drying'
          ? 'prop_drying_drying'
          : 'prop_drying_empty';
    this.dryingMat.map = pixelArt.getTexture(texKey);
    this.dryingMat.needsUpdate = true;
    this.dryingSparkle.visible = state === 'ready';
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

  public syncStoryProps(
    cleanedSpots: string[],
    showLighthouseLetter: boolean,
    isFestivalDay: boolean
  ): void {
    this.clearDynamicGroup(this.storyGroup);
    this.storyZones = [];
    this.storyGlows = [];

    const cleanedSet = new Set(cleanedSpots);
    for (const spot of CLEANUP_SPOTS) {
      if (cleanedSet.has(spot.id)) continue;
      const flatMat = new THREE.MeshBasicMaterial({
        map: pixelArt.getTexture(spot.kind === 'leaves' ? 'prop_dust_leaves' : 'prop_dust_spot'),
        transparent: true,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.storyFlatGeo, flatMat);
      mesh.position.set(spot.x, 0.036, spot.z);
      this.storyGroup.add(mesh);

      this.storyZones.push({
        id: 'cleanup_spot',
        label: spot.label,
        x: spot.x,
        z: spot.z,
        radius: 1.3,
        spotId: spot.id,
      });
    }

    if (showLighthouseLetter) {
      const lx = 8.4;
      const lz = 4.0;
      const letterObj = pixelArt.createYBillboard({
        textureKey: 'prop_letter_pickup',
        widthPx: 16,
        heightPx: 16,
        shadowScale: 0.7,
        shadowYOffset: 0.036,
        baseYOffset: 0.05,
      });
      letterObj.group.position.set(lx, 0, lz);
      this.storyGroup.add(letterObj.group);

      const spark = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: pixelArt.getTexture('sparkle_pixel'),
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
        })
      );
      spark.position.set(lx, 0.85, lz);
      spark.scale.set(0.45, 0.45, 1);
      this.storyGroup.add(spark);

      this.storyZones.push({
        id: 'letter_pickup',
        label: 'Nhặt Lá Thư Cũ Của Bà Ngoại',
        x: lx,
        z: lz,
        radius: 1.45,
        letterId: 'letter_4_lanterns',
      });
    }

    if (isFestivalDay) {
      const fx = 5.5;
      const fz = 3.55;
      const stand = pixelArt.createYBillboard({
        textureKey: 'prop_festival_stand',
        widthPx: 24,
        heightPx: 28,
        shadowScale: 1.4,
        shadowYOffset: 0.036,
        baseYOffset: 0.03,
      });
      stand.group.position.set(fx, 0, fz);
      this.storyGroup.add(stand.group);

      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: pixelArt.getTexture('glow_pixel'),
          transparent: true,
          opacity: 0.55,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      glow.position.set(fx, 1.05, fz + 0.05);
      glow.scale.set(2.4, 2.4, 1);
      this.storyGroup.add(glow);
      this.storyGlows.push(glow);

      this.storyZones.push({
        id: 'festival_stand',
        label: '🏮 Tham Gia Lễ Thả Đèn Mây (Ngày 24)',
        x: fx,
        z: fz,
        radius: 1.75,
      });
    }
  }

  public getNearestZone(px: number, pz: number, tableCount: number): InteractiveZone | null {
    let best: InteractiveZone | null = null;
    let bestDist = Infinity;
    for (const z of [...this.storyZones, ...this.zones]) {
      if (typeof z.tableIndex === 'number' && z.tableIndex >= tableCount) continue;
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

    for (let i = 0; i < this.decorNightGlows.length; i++) {
      const sp = this.decorNightGlows[i];
      const mat = sp.material as THREE.SpriteMaterial;
      const flicker = 0.86 + Math.sin(elapsed * 4.8 + i * 1.4) * 0.14;
      mat.opacity = nightFactor * 0.95 * flicker;
    }

    for (let i = 0; i < this.storyGlows.length; i++) {
      const sp = this.storyGlows[i];
      const mat = sp.material as THREE.SpriteMaterial;
      mat.opacity = (0.35 + nightFactor * 0.6) * (0.9 + Math.sin(elapsed * 4 + i) * 0.1);
    }

    for (const sway of this.decorSwayProps) {
      sway.obj.rotation.z = sway.baseZ + Math.sin(elapsed * 2.5 + sway.phase) * 0.08;
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

    if (this.dryingRackState === 'ready') {
      const pulse = 0.36 + Math.abs(Math.sin(elapsed * 4.4)) * 0.24;
      this.dryingSparkle.scale.set(pulse, pulse, 1);
      this.dryingSparkle.position.y = 1.5 + Math.sin(elapsed * 3.6) * 0.08;
    }
  }
}

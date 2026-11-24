import * as THREE from 'three';
import { PALETTE } from '../art/palette';
import { pixelArt } from '../art/pixelArtGenerator';
import { enableShadows, toonMaterials } from '../art/toonMaterials';
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
    | 'festival_stand'
    | 'tea_shrine'
    | 'cloud_pond'
    | 'overlook_bench';
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
    { x: 4.2, z: 1.65 },
    { x: 6.8, z: 1.65 },
  ];

  private warmLanternMats: THREE.MeshToonMaterial[] = [];
  private warmPointLights: { light: THREE.PointLight; maxIntensity: number }[] = [];
  private homeWindowMats: THREE.MeshToonMaterial[] = [];
  private homeRoofGroup = new THREE.Group();
  private homeRoofMats: THREE.Material[] = [];
  private teahouseRoofGroup = new THREE.Group();
  private teahouseRoofMats: THREE.Material[] = [];

  private beaconBeam!: THREE.Mesh;
  private beaconHeadGroup!: THREE.Group;
  private dryingDryingGroup = new THREE.Group();
  private dryingReadyGroup = new THREE.Group();
  private dryingRackState: DryingRackVisualState = 'empty';
  private dryingSparkle!: THREE.Sprite;
  private openSignBoardMat!: THREE.MeshToonMaterial;
  private shippingBinFullGroup = new THREE.Group();
  private mooredBoatGroup!: THREE.Group;

  public readonly cloudPierPos = { x: 5.3, z: 7.3 };
  public readonly dryingRackPos = { x: 0.25, z: -0.6 };
  public readonly roastWokPos = { x: 0.25, z: 1.4 };
  private islandRef!: Island;
  private table4Group = new THREE.Group();
  private table5Group = new THREE.Group();
  private table4Collider: ColliderBox = { minX: 4.2 - 0.55, maxX: 4.2 + 0.55, minZ: 1.65 - 0.45, maxZ: 1.65 + 0.45 };
  private table5Collider: ColliderBox = { minX: 6.8 - 0.55, maxX: 6.8 + 0.55, minZ: 1.65 - 0.45, maxZ: 1.65 + 0.45 };

  private decorGroup = new THREE.Group();
  private decorLanternMats: THREE.MeshToonMaterial[] = [];
  private decorSwayProps: { obj: THREE.Object3D; baseZ: number; phase: number }[] = [];
  private storyGroup = new THREE.Group();
  private storyZones: InteractiveZone[] = [];
  private smokeParticles: { mesh: THREE.Mesh; originY: number; phase: number }[] = [];

  private readonly decorPostMat = toonMaterials.getSolidToon(PALETTE.woodDark);
  private readonly decorLanternPostGeo = new THREE.CylinderGeometry(0.045, 0.055, 1.0, 6);
  private readonly decorChimePostGeo = new THREE.CylinderGeometry(0.045, 0.055, 1.32, 6);
  private readonly decorArmGeo = new THREE.BoxGeometry(0.07, 0.07, 0.28);
  private readonly storyFlatGeo = new THREE.CylinderGeometry(0.42, 0.46, 0.05, 8);
  private readonly sharedDynamicGeos: Set<THREE.BufferGeometry>;
  private readonly sharedDynamicMats: Set<THREE.Material>;

  private homeRoofOpacity = 1;
  private teahouseRoofOpacity = 1;

  constructor(island: Island, upgrades: UpgradesState) {
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
    this.buildLandmarkZones();
    this.buildSmokeEmitters();

    this.group.add(this.homeRoofGroup);
    this.group.add(this.teahouseRoofGroup);
    this.group.add(this.table4Group);
    this.group.add(this.table5Group);
    this.group.add(this.decorGroup);
    this.group.add(this.storyGroup);
    this.applyUpgrades(upgrades);
  }

  private createLanternMesh(x: number, y: number, z: number, withPointLight = false): THREE.Group {
    const g = new THREE.Group();
    const capMat = toonMaterials.getSolidToon(PALETTE.woodDark);
    const bodyMat = toonMaterials.createToonMaterial({
      color: PALETTE.coralRed,
      emissive: PALETTE.amberGold,
      emissiveIntensity: 0.22,
    });
    this.warmLanternMats.push(bodyMat);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.34, 8), bodyMat);
    const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.06, 8), capMat);
    topCap.position.y = 0.2;
    const botCap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.11, 0.06, 8), capMat);
    botCap.position.y = -0.2;
    g.add(body, topCap, botCap);

    if (withPointLight) {
      const pl = new THREE.PointLight(PALETTE.amberGold, 0, 6.5, 1.8);
      pl.position.set(0, -0.05, 0.1);
      g.add(pl);
      this.warmPointLights.push({ light: pl, maxIntensity: 2.2 });
    }

    g.position.set(x, y, z);
    enableShadows(g, true, false);
    this.group.add(g);
    return g;
  }

  /** Mái ngói Á Đông 3D xếp lớp ngang + kèo nóc */
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
    const roofTex = toonMaterials.getClonedTexture('roofTiles', Math.max(1, Math.round(width / 2)), 2);
    const roofMat = toonMaterials.createToonMaterial({
      map: roofTex,
      transparent: true,
    });
    const ridgeMat = toonMaterials.createToonMaterial({
      color: PALETTE.woodDark,
      transparent: true,
    });
    matTrack.push(roofMat, ridgeMat);

    const halfD = depth / 2 + 0.38;
    const slopeLen = Math.hypot(halfD, peakHeight);
    const tilt = Math.atan2(peakHeight, halfD);

    const frontSlope = new THREE.Mesh(new THREE.BoxGeometry(width, 0.16, slopeLen), roofMat);
    frontSlope.rotation.x = tilt;
    frontSlope.position.set(cx, baseY + peakHeight / 2, cz + halfD / 2);
    targetGroup.add(frontSlope);

    const backSlope = new THREE.Mesh(new THREE.BoxGeometry(width, 0.16, slopeLen), roofMat);
    backSlope.rotation.x = -tilt;
    backSlope.position.set(cx, baseY + peakHeight / 2, cz - halfD / 2);
    targetGroup.add(backSlope);

    if (eaveCurve) {
      for (const side of [-1, 1]) {
        const wingF = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, slopeLen * 0.86), roofMat);
        wingF.rotation.x = tilt;
        wingF.rotation.z = side * 0.25;
        wingF.position.set(cx + side * (width / 2 + 0.18), baseY + peakHeight / 2 + 0.08, cz + halfD / 2);
        targetGroup.add(wingF);

        const wingB = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, slopeLen * 0.86), roofMat);
        wingB.rotation.x = -tilt;
        wingB.rotation.z = side * 0.25;
        wingB.position.set(cx + side * (width / 2 + 0.18), baseY + peakHeight / 2 + 0.08, cz - halfD / 2);
        targetGroup.add(wingB);
      }
    }

    const ridge = new THREE.Mesh(new THREE.BoxGeometry(width + 0.44, 0.2, 0.26), ridgeMat);
    ridge.position.set(cx, baseY + peakHeight + 0.06, cz);
    targetGroup.add(ridge);

    for (const side of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 4), ridgeMat);
      cap.position.set(cx + side * (width / 2 + 0.22), baseY + peakHeight + 0.18, cz);
      targetGroup.add(cap);
    }
    enableShadows(targetGroup, true, true);
  }

  private buildHomeCottage(island: Island): void {
    const cx = -2.2;
    const cz = -5.4;
    const w = 4.0;
    const h = 1.9;
    const d = 2.8;
    const wallThick = 0.2;

    const wallMat = toonMaterials.createToonMaterial({
      map: toonMaterials.getTexture('plasterWall'),
    });
    const timberMat = toonMaterials.getSolidToon(PALETTE.woodDark);

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThick), wallMat);
    backWall.position.set(cx, h / 2, cz - d / 2 + wallThick / 2);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), wallMat);
    leftWall.position.set(cx - w / 2 + wallThick / 2, h / 2, cz);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), wallMat);
    rightWall.position.set(cx + w / 2 - wallThick / 2, h / 2, cz);
    const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(1.2, h, wallThick), wallMat);
    frontLeft.position.set(cx - 1.4, h / 2, cz + d / 2 - wallThick / 2);
    const frontRight = new THREE.Mesh(new THREE.BoxGeometry(1.2, h, wallThick), wallMat);
    frontRight.position.set(cx + 1.4, h / 2, cz + d / 2 - wallThick / 2);
    this.group.add(backWall, leftWall, rightWall, frontLeft, frontRight);

    // Trụ gỗ góc & cửa sổ shoji sáng ấm ban đêm
    for (const px of [cx - w / 2 + 0.06, cx + w / 2 - 0.06]) {
      for (const pz of [cz - d / 2 + 0.06, cz + d / 2 - 0.06]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, h + 0.06, 0.16), timberMat);
        post.position.set(px, h / 2, pz);
        this.group.add(post);
      }
    }

    const shojiMat = toonMaterials.createToonMaterial({
      map: toonMaterials.getTexture('shojiLit'),
      emissive: PALETTE.amberGold,
      emissiveIntensity: 0.1,
    });
    this.homeWindowMats.push(shojiMat);
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.72, 0.08), timberMat);
    winFrame.position.set(cx + 1.4, 1.08, cz + d / 2 + 0.02);
    const winPane = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.6, 0.09), shojiMat);
    winPane.position.set(cx + 1.4, 1.08, cz + d / 2 + 0.025);
    this.group.add(winFrame, winPane);

    // Đà cửa & Mái nhà (thuộc homeRoofGroup để ẩn khi bước vào)
    const lintelMat = toonMaterials.createToonMaterial({
      color: PALETTE.woodMid,
      transparent: true,
    });
    this.homeRoofMats.push(lintelMat);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.36, wallThick), lintelMat);
    lintel.position.set(cx, h - 0.18, cz + d / 2 - wallThick / 2);
    this.homeRoofGroup.add(lintel);

    this.buildAsianPitchedRoof(this.homeRoofGroup, this.homeRoofMats, cx, h, cz, w + 0.65, d, 0.95, false);
    const chimneyMat = toonMaterials.createToonMaterial({
      color: PALETTE.rockMid,
      transparent: true,
    });
    this.homeRoofMats.push(chimneyMat);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.92, 0.45), chimneyMat);
    chimney.position.set(cx + 0.95, h + 0.8, cz - 0.35);
    this.homeRoofGroup.add(chimney);

    // Nội thất 3D Nhà Ở: Thảm chiếu, Giường ngủ gỗ + chăn trà, Chậu cây, Đài Radio
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.03, 1.5),
      toonMaterials.getSolidToon(PALETTE.creamDark)
    );
    rug.position.set(cx + 0.1, 0.045, cz + 0.15);
    this.group.add(rug);

    const bedGroup = new THREE.Group();
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.25, 0.85), timberMat);
    bedFrame.position.y = 0.15;
    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 0.12, 0.74),
      toonMaterials.getSolidToon(PALETTE.creamLight)
    );
    mattress.position.y = 0.32;
    const blanket = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.14, 0.76),
      toonMaterials.getSolidToon(PALETTE.tealLight)
    );
    blanket.position.set(0.18, 0.33, 0);
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.1, 0.44),
      toonMaterials.getSolidToon(PALETTE.whiteWarm)
    );
    pillow.position.set(-0.36, 0.4, 0);
    bedGroup.add(bedFrame, mattress, blanket, pillow);
    bedGroup.position.set(cx - 1.1, 0, cz - 0.45);
    this.group.add(bedGroup);
    island.addCollider({ minX: cx - 1.75, maxX: cx - 0.55, minZ: cz - 1.0, maxZ: cz + 0.05 });

    // Chậu cây nội thất
    const potGroup = new THREE.Group();
    const potMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.17, 0.32, 8),
      toonMaterials.getSolidToon(PALETTE.roofMid)
    );
    potMesh.position.set(0, 0.16, 0);
    const folMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.24, 1),
      toonMaterials.getSolidToon(PALETTE.grassLight)
    );
    folMesh.position.set(0, 0.42, 0);
    potGroup.add(potMesh, folMesh);
    potGroup.position.set(cx + 1.25, 0, cz - 0.7);
    this.group.add(potGroup);
    island.addCollider({ minX: cx + 0.9, maxX: cx + 1.6, minZ: cz - 1.0, maxZ: cz - 0.4 });

    // Đài Radio dự báo thời tiết trên kệ gỗ
    const radioGroup = new THREE.Group();
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.36, 0.45), timberMat);
    stand.position.y = 0.18;
    const radioBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.26), toonMaterials.getSolidToon(PALETTE.woodMid));
    radioBody.position.y = 0.5;
    const dial = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.04), toonMaterials.getSolidToon(PALETTE.amberGold));
    dial.position.set(-0.04, 0.52, 0.14);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 4), toonMaterials.getSolidToon(PALETTE.rockLight));
    ant.position.set(0.14, 0.76, 0);
    radioGroup.add(stand, radioBody, dial, ant);
    radioGroup.position.set(cx + 1.25, 0, cz + 0.35);
    this.group.add(radioGroup);
    island.addCollider({ minX: cx + 0.9, maxX: cx + 1.6, minZ: cz + 0.05, maxZ: cz + 0.65 });

    this.createLanternMesh(cx - 1.25, 1.35, cz + d / 2 + 0.24, true);

    enableShadows(this.group, true, true);

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

    const g = new THREE.Group();
    const woodMat = toonMaterials.getSolidToon(PALETTE.woodMid);
    const woodDark = toonMaterials.getSolidToon(PALETTE.woodDark);
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.3), woodMat);
    base.position.y = 0.45;
    g.add(base);

    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.1, 1.42), toonMaterials.getSolidToon(PALETTE.woodBright));
    counterTop.position.y = 0.94;
    g.add(counterTop);

    for (const dx of [-1.18, 1.18]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.0, 6), woodDark);
      post.position.set(dx, 1.0, -0.5);
      g.add(post);
    }

    // Mái bạt sọc đỏ-kem gợn sóng
    const stripeW = 0.48;
    for (let i = 0; i < 6; i++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(stripeW, 0.12, 1.9),
        toonMaterials.getSolidToon(i % 2 === 0 ? PALETTE.roofMid : PALETTE.creamLight)
      );
      stripe.rotation.x = 0.24;
      stripe.position.set((i - 2.5) * stripeW, 1.96, 0.05);
      g.add(stripe);
    }

    // Hũ mật ong & bao hạt giống nhỏ trên sạp
    const sack1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.34, 7), toonMaterials.getSolidToon(PALETTE.creamDark));
    sack1.position.set(-0.7, 1.15, 0.25);
    const honeyJar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.26, 8), toonMaterials.getSolidToon(PALETTE.amberGold));
    honeyJar.position.set(0.65, 1.12, 0.25);
    g.add(sack1, honeyJar);

    enableShadows(g, true, true);
    g.position.set(sx, 0, sz);
    this.group.add(g);
    this.createLanternMesh(sx + 1.1, 1.6, sz + 0.55, false);

    island.addCollider({ minX: sx - 1.35, maxX: sx + 1.35, minZ: sz - 0.7, maxZ: sz + 0.7 });
    this.zones.push({
      id: 'seed_shop',
      label: 'Sạp Hạt Giống Bé Sương',
      x: sx,
      z: sz + 1.25,
      radius: 1.5,
    });
  }

  private buildTeaTable3D(): THREE.Group {
    const tg = new THREE.Group();
    const topMat = toonMaterials.getSolidToon(PALETTE.woodBright);
    const legMat = toonMaterials.getSolidToon(PALETTE.woodDark);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.52, 0.09, 10), topMat);
    top.position.y = 0.56;
    tg.add(top);

    for (const [lx, lz] of [
      [-0.28, -0.24],
      [0.28, -0.24],
      [-0.28, 0.24],
      [0.28, 0.24],
    ]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.54, 6), legMat);
      leg.position.set(lx, 0.27, lz);
      tg.add(leg);
    }

    // Bộ ấm chén gốm nhỏ trên bàn
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), toonMaterials.getSolidToon(PALETTE.tealDark));
    pot.scale.set(1, 0.82, 1);
    pot.position.set(0, 0.67, 0);
    const cup1 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.08, 7), toonMaterials.getSolidToon(PALETTE.whiteWarm));
    cup1.position.set(-0.2, 0.64, 0.14);
    const cup2 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.08, 7), toonMaterials.getSolidToon(PALETTE.whiteWarm));
    cup2.position.set(0.2, 0.64, -0.1);
    tg.add(pot, cup1, cup2);

    enableShadows(tg, true, true);
    return tg;
  }

  private buildTeahouse(island: Island): void {
    const tx = 5.5;
    const tz = -5.1;
    const w = 6.6;
    const h = 2.25;
    const d = 3.4;
    const wallThick = 0.2;

    const wallMat = toonMaterials.createToonMaterial({
      map: toonMaterials.getTexture('plasterWall'),
    });
    const timberMat = toonMaterials.getSolidToon(PALETTE.woodDark);

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallThick), wallMat);
    backWall.position.set(tx, h / 2, tz - d / 2 + wallThick / 2);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), wallMat);
    leftWall.position.set(tx - w / 2 + wallThick / 2, h / 2, tz);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), wallMat);
    rightWall.position.set(tx + w / 2 - wallThick / 2, h / 2, tz);
    const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(2.3, h, wallThick), wallMat);
    frontLeft.position.set(tx - 2.15, h / 2, tz + d / 2 - wallThick / 2);
    const frontRight = new THREE.Mesh(new THREE.BoxGeometry(2.3, h, wallThick), wallMat);
    frontRight.position.set(tx + 2.15, h / 2, tz + d / 2 - wallThick / 2);
    this.group.add(backWall, leftWall, rightWall, frontLeft, frontRight);

    // Ô cửa shoji 2 bên mặt tiền Quán Trà sáng ấm ban đêm
    const shojiMat = toonMaterials.createToonMaterial({
      map: toonMaterials.getTexture('shojiLit'),
      emissive: PALETTE.amberGold,
      emissiveIntensity: 0.12,
    });
    this.homeWindowMats.push(shojiMat);
    for (const wx of [tx - 2.15, tx + 2.15]) {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.08), shojiMat);
      pane.position.set(wx, 1.15, tz + d / 2 + 0.01);
      this.group.add(pane);
    }

    const lintelMat = toonMaterials.createToonMaterial({
      color: PALETTE.woodMid,
      transparent: true,
    });
    this.teahouseRoofMats.push(lintelMat);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.36, wallThick), lintelMat);
    lintel.position.set(tx, h - 0.18, tz + d / 2 - wallThick / 2);
    this.teahouseRoofGroup.add(lintel);

    this.buildAsianPitchedRoof(this.teahouseRoofGroup, this.teahouseRoofMats, tx, h - 0.05, tz, w + 0.85, d, 0.78, true);
    this.buildAsianPitchedRoof(this.teahouseRoofGroup, this.teahouseRoofMats, tx, h + 0.65, tz, w * 0.72, d * 0.65, 0.75, true);

    // Biển gỗ "Trà Quán Trên Mây" + 2 đèn lồng đỏ phát sáng ban đêm
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 0.56, 0.12),
      toonMaterials.getSolidToon(PALETTE.woodDark)
    );
    signBoard.position.set(tx, h - 0.15, tz + d / 2 + 0.25);
    const signInner = new THREE.Mesh(
      new THREE.BoxGeometry(1.62, 0.4, 0.14),
      toonMaterials.getSolidToon(PALETTE.creamLight)
    );
    signInner.position.set(tx, h - 0.15, tz + d / 2 + 0.25);
    this.group.add(signBoard, signInner);

    for (const lx of [tx - 2.65, tx + 2.65]) {
      this.createLanternMesh(lx, 1.65, tz + d / 2 + 0.32, true);
    }

    // Colliders tường Quán Trà (chừa cửa 2.0 ở giữa)
    island.addCollider({ minX: tx - w / 2, maxX: tx + w / 2, minZ: tz - d / 2, maxZ: tz - d / 2 + 0.25 });
    island.addCollider({ minX: tx - w / 2, maxX: tx - w / 2 + 0.25, minZ: tz - d / 2, maxZ: tz + d / 2 });
    island.addCollider({ minX: tx + w / 2 - 0.25, maxX: tx + w / 2, minZ: tz - d / 2, maxZ: tz + d / 2 });
    island.addCollider({ minX: tx - w / 2, maxX: tx - 1.0, minZ: tz + d / 2 - 0.25, maxZ: tz + d / 2 + 0.1 });
    island.addCollider({ minX: tx + 1.0, maxX: tx + w / 2, minZ: tz + d / 2 - 0.25, maxZ: tz + d / 2 + 0.1 });

    // Nội thất 3D Quán Trà: Thảm, Kệ hũ trà, Quầy Pha Trà
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.03, 1.55),
      toonMaterials.getSolidToon(PALETTE.roofMid)
    );
    rug.position.set(tx, 0.045, tz + 0.55);
    this.group.add(rug);

    for (const sx of [tx - 2.05, tx + 2.05]) {
      const shelf = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.35, 0.55), timberMat);
      frame.position.y = 0.68;
      shelf.add(frame);
      for (const jy of [0.55, 1.0]) {
        for (const jx of [-0.4, 0, 0.4]) {
          const jar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.11, 0.13, 0.24, 7),
            toonMaterials.getSolidToon(jx === 0 ? PALETTE.amberGold : PALETTE.tealLight)
          );
          jar.position.set(jx, jy, 0.22);
          shelf.add(jar);
        }
      }
      shelf.position.set(sx, 0, tz - 1.05);
      this.group.add(shelf);
      island.addCollider({ minX: sx - 0.9, maxX: sx + 0.9, minZ: tz - 1.4, maxZ: tz - 0.65 });
    }

    const cx = tx;
    const cz = tz - 0.7;
    const counter = new THREE.Group();
    const cBody = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.85, 0.72), toonMaterials.getSolidToon(PALETTE.woodMid));
    cBody.position.y = 0.425;
    const cTop = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.1, 0.82), toonMaterials.getSolidToon(PALETTE.woodBright));
    cTop.position.y = 0.88;
    const kettle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), toonMaterials.getSolidToon(PALETTE.tealDark));
    kettle.position.set(-0.35, 1.08, 0);
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.38), toonMaterials.getSolidToon(PALETTE.creamLight));
    tray.position.set(0.35, 0.95, 0.05);
    counter.add(cBody, cTop, kettle, tray);
    counter.position.set(cx, 0, cz);
    this.group.add(counter);
    island.addCollider({ minX: cx - 0.9, maxX: cx + 0.9, minZ: cz - 0.45, maxZ: cz + 0.4 });
    this.zones.push({
      id: 'brew_counter',
      label: 'Quầy Pha Trà',
      x: cx,
      z: cz + 0.95,
      radius: 1.55,
    });

    // 3 bàn trà ban đầu + bàn 4 & 5
    for (let i = 0; i < 3; i++) {
      const seat = this.tableSeats[i];
      const tbl = this.buildTeaTable3D();
      tbl.position.set(seat.x, 0, seat.z);
      this.group.add(tbl);
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

    const seat4 = this.tableSeats[3];
    const tbl4 = this.buildTeaTable3D();
    tbl4.position.set(seat4.x, 0, seat4.z);
    this.table4Group.add(tbl4);
    this.zones.push({
      id: 'tea_table',
      label: 'Bàn Trà #4',
      x: seat4.x,
      z: seat4.z,
      radius: 1.45,
      tableIndex: 3,
    });

    const seat5 = this.tableSeats[4];
    const tbl5 = this.buildTeaTable3D();
    tbl5.position.set(seat5.x, 0, seat5.z);
    this.table5Group.add(tbl5);
    this.zones.push({
      id: 'tea_table',
      label: 'Bàn Trà #5',
      x: seat5.x,
      z: seat5.z,
      radius: 1.45,
      tableIndex: 4,
    });

    // Biển đứng "Mở cửa / Đóng cửa" 3D cạnh rìa hiên gỗ
    const sx = 2.5;
    const sz = -1.6;
    const signGroup = new THREE.Group();
    const sPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.05, 6), timberMat);
    sPost.position.y = 0.52;
    this.openSignBoardMat = toonMaterials.createToonMaterial({ color: PALETTE.roofMid });
    const sBoard = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.42, 0.09), this.openSignBoardMat);
    sBoard.position.y = 0.96;
    const sTrim = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.48, 0.06), timberMat);
    sTrim.position.y = 0.96;
    signGroup.add(sPost, sTrim, sBoard);
    signGroup.position.set(sx, 0, sz);
    enableShadows(signGroup, true, true);
    this.group.add(signGroup);
    island.addCollider({ minX: sx - 0.35, maxX: sx + 0.35, minZ: sz - 0.3, maxZ: sz + 0.3 });
    this.zones.push({
      id: 'open_sign',
      label: 'Biển Mở/Đóng Quán',
      x: sx - 0.15,
      z: sz + 0.35,
      radius: 1.35,
    });

    enableShadows(this.group, true, true);
  }

  private buildCloudPier(island: Island): void {
    const px = this.cloudPierPos.x;
    const pzStart = 5.0;
    const len = 2.8;
    const w = 2.4;

    const pierTex = toonMaterials.getClonedTexture('woodDeck', 2, 3);
    const pierMesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.14, len),
      toonMaterials.createToonMaterial({ map: pierTex })
    );
    pierMesh.position.set(px, 0.02, pzStart + len / 2);
    pierMesh.receiveShadow = true;
    this.group.add(pierMesh);

    const postMat = toonMaterials.getSolidToon(PALETTE.woodDark);
    const postOffsets: [number, number][] = [
      [px - 1.05, pzStart + 0.3],
      [px + 1.05, pzStart + 0.3],
      [px - 1.05, pzStart + len - 0.25],
      [px + 1.05, pzStart + len - 0.25],
    ];
    for (const [ox, oz] of postOffsets) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.92, 6), postMat);
      post.position.set(ox, 0.46, oz);
      post.castShadow = true;
      this.group.add(post);
      island.addCollider({ minX: ox - 0.22, maxX: ox + 0.22, minZ: oz - 0.22, maxZ: oz + 0.22 });
    }
    this.createLanternMesh(px + 1.05, 1.05, pzStart + 1.3, false);

    // Thuyền Mây gỗ 3D neo đậu ngay mép Bến Mây
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.42, 2.3, 8),
      toonMaterials.getSolidToon(PALETTE.woodMid)
    );
    hull.rotation.z = Math.PI / 2;
    hull.scale.set(0.6, 1, 0.85);
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.08, 0.85),
      toonMaterials.getSolidToon(PALETTE.woodBright)
    );
    deck.position.y = 0.18;
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 1.65, 6),
      postMat
    );
    mast.position.set(-0.1, 0.95, 0);
    const sail = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 1.15, 0.95),
      toonMaterials.getSolidToon(PALETTE.creamLight)
    );
    sail.rotation.y = 0.35;
    sail.position.set(0.1, 1.08, 0.12);
    const bowLanternMat = toonMaterials.createToonMaterial({
      color: PALETTE.whiteWarm,
      emissive: PALETTE.amberGold,
      emissiveIntensity: 0.4,
    });
    this.warmLanternMats.push(bowLanternMat);
    const bowLamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 6), bowLanternMat);
    bowLamp.position.set(-0.98, 0.45, 0);
    boat.add(hull, deck, mast, sail, bowLamp);
    boat.position.set(px + 2.25, -0.22, pzStart + len + 0.65);
    boat.rotation.y = -0.3;
    enableShadows(boat, true, true);
    this.mooredBoatGroup = boat;
    this.group.add(boat);
  }

  private buildLighthouse(island: Island): void {
    const lx = 11.0;
    const lz = 5.4;

    const g = new THREE.Group();
    const stoneLight = toonMaterials.getSolidToon(PALETTE.rockLight);
    const stoneDark = toonMaterials.getSolidToon(PALETTE.rockDark);
    const roofMat = toonMaterials.getSolidToon(PALETTE.roofMid);

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.35, 0.45, 8), stoneDark);
    plinth.position.y = 0.225;
    const towerLower = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 1.05, 2.1, 8), stoneLight);
    towerLower.position.y = 1.48;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.22, 8), roofMat);
    band.position.y = 2.45;
    const towerUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.8, 1.1, 8), toonMaterials.getSolidToon(PALETTE.creamLight));
    towerUpper.position.y = 3.1;
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.85, 0.18, 8), stoneDark);
    gallery.position.y = 3.68;

    const glassMat = toonMaterials.createToonMaterial({
      color: PALETTE.whiteWarm,
      emissive: PALETTE.amberGold,
      emissiveIntensity: 0.65,
    });
    this.warmLanternMats.push(glassMat);
    const lanternGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.62, 8), glassMat);
    lanternGlass.position.y = 4.05;

    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.72, 8), roofMat);
    roof.position.y = 4.65;
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 6), toonMaterials.getSolidToon(PALETTE.amberGold));
    finial.position.y = 5.05;

    g.add(plinth, towerLower, band, towerUpper, gallery, lanternGlass, roof, finial);
    enableShadows(g, true, true);
    g.position.set(lx, 0, lz);
    this.group.add(g);

    // Chùm sáng hải đăng xoay ban đêm
    this.beaconHeadGroup = new THREE.Group();
    this.beaconHeadGroup.position.set(lx, 4.05, lz);
    const beamGeo = new THREE.ConeGeometry(1.1, 6.2, 10, 1, true);
    beamGeo.rotateZ(Math.PI / 2);
    beamGeo.translate(-3.1, 0, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: PALETTE.amberGold,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.beaconBeam = new THREE.Mesh(beamGeo, beamMat);
    this.beaconHeadGroup.add(this.beaconBeam);
    this.group.add(this.beaconHeadGroup);

    const lhLight = new THREE.PointLight(PALETTE.amberGold, 0, 9.5, 1.6);
    lhLight.position.set(lx, 4.1, lz);
    this.group.add(lhLight);
    this.warmPointLights.push({ light: lhLight, maxIntensity: 2.8 });

    island.addCollider({ minX: lx - 1.05, maxX: lx + 1.05, minZ: lz - 1.05, maxZ: lz + 1.05 });
  }

  private buildProcessingStations(island: Island): void {
    // 1. Nong Phơi Lá Tre 3D
    const dx = this.dryingRackPos.x;
    const dz = this.dryingRackPos.z;
    const rackGroup = new THREE.Group();
    const legMat = toonMaterials.getSolidToon(PALETTE.woodDark);
    const trayMat = toonMaterials.createToonMaterial({ map: toonMaterials.getTexture('bambooWeave') });

    for (const [lx, lz] of [
      [-0.42, -0.32],
      [0.42, -0.32],
      [-0.42, 0.32],
      [0.42, 0.32],
    ]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.62, 5), legMat);
      leg.position.set(lx, 0.31, lz);
      rackGroup.add(leg);
    }
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.52, 0.08, 12), trayMat);
    tray.scale.set(1.1, 1, 0.85);
    tray.position.y = 0.64;
    rackGroup.add(tray);

    // Lá đang phơi (xanh tươi) vs Lá đã khô (vàng rơm/nâu thơm)
    const freshMat = toonMaterials.getSolidToon(PALETTE.teaGreen);
    const driedMat = toonMaterials.getSolidToon(PALETTE.amberWarm);
    for (let i = 0; i < 4; i++) {
      const m1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), freshMat);
      m1.scale.set(1.3, 0.35, 1.0);
      m1.position.set(((i % 2) - 0.5) * 0.38, 0.72, (Math.floor(i / 2) - 0.5) * 0.28);
      this.dryingDryingGroup.add(m1);

      const m2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), driedMat);
      m2.scale.set(1.2, 0.3, 0.9);
      m2.position.copy(m1.position);
      this.dryingReadyGroup.add(m2);
    }
    this.dryingDryingGroup.visible = false;
    this.dryingReadyGroup.visible = false;
    rackGroup.add(this.dryingDryingGroup, this.dryingReadyGroup);
    rackGroup.position.set(dx, 0, dz);
    enableShadows(rackGroup, true, true);
    this.group.add(rackGroup);

    this.dryingSparkle = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: pixelArt.getTexture('sparkle_pixel'),
        transparent: true,
        depthWrite: false,
      })
    );
    this.dryingSparkle.position.set(dx + 0.3, 1.25, dz + 0.1);
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

    // 2. Hộp Bán Hàng Qua Đêm 3D
    const binX = 0.45;
    const binZ = -4.0;
    const binGroup = new THREE.Group();
    const binBox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.65, 0.72), toonMaterials.getSolidToon(PALETTE.woodMid));
    binBox.position.y = 0.325;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.1, 0.78), toonMaterials.getSolidToon(PALETTE.woodDark));
    lid.position.y = 0.68;
    const parcel = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.32), toonMaterials.getSolidToon(PALETTE.amberGold));
    parcel.position.set(0, 0.82, 0);
    this.shippingBinFullGroup.add(parcel);
    this.shippingBinFullGroup.visible = false;
    binGroup.add(binBox, lid, this.shippingBinFullGroup);
    binGroup.position.set(binX, 0, binZ);
    enableShadows(binGroup, true, true);
    this.group.add(binGroup);
    island.addCollider({ minX: binX - 0.48, maxX: binX + 0.48, minZ: binZ - 0.38, maxZ: binZ + 0.38 });
    this.zones.push({
      id: 'shipping_bin',
      label: 'Hộp Bán Hàng Qua Đêm',
      x: binX,
      z: binZ + 0.7,
      radius: 1.45,
    });

    // 3. Chảo Sao Trà 3D (bếp gạch + chảo gang + than hồng)
    const rx = this.roastWokPos.x;
    const rz = this.roastWokPos.z;
    const wokGroup = new THREE.Group();
    const stove = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.56, 8), toonMaterials.getSolidToon(PALETTE.rockDark));
    stove.position.y = 0.28;
    const wok = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.28, 0.2, 10), toonMaterials.getSolidToon(PALETTE.outlineDark));
    wok.position.y = 0.62;
    const emberMat = toonMaterials.createToonMaterial({
      color: PALETTE.roofLight,
      emissive: PALETTE.amberWarm,
      emissiveIntensity: 0.7,
    });
    this.warmLanternMats.push(emberMat);
    const embers = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.12), emberMat);
    embers.position.set(0, 0.2, 0.42);
    wokGroup.add(stove, wok, embers);
    wokGroup.position.set(rx, 0, rz);
    enableShadows(wokGroup, true, true);
    this.group.add(wokGroup);

    island.addCollider({ minX: rx - 0.52, maxX: rx + 0.52, minZ: rz - 0.4, maxZ: rz + 0.4 });
    this.zones.push({
      id: 'roast_wok',
      label: 'Chảo Sao Trà',
      x: rx,
      z: rz + 0.7,
      radius: 1.35,
    });
  }

  private buildLandmarkZones(): void {
    this.zones.push(
      {
        id: 'cloud_pond',
        label: '🌊 Ngắm Hồ Sương Mây',
        x: -8.2,
        z: 5.55,
        radius: 1.5,
      },
      {
        id: 'tea_shrine',
        label: '⛩️ Viếng Miếu Trà Cổ',
        x: 9.7,
        z: 0.45,
        radius: 1.55,
      },
      {
        id: 'overlook_bench',
        label: '🔭 Ngồi Ngắm Biển Mây',
        x: -4.0,
        z: 5.7,
        radius: 1.45,
      }
    );
  }

  private buildSmokeEmitters(): void {
    const origins: [number, number, number][] = [
      [-1.25, 3.2, -5.75],
      [5.5, 1.35, -5.8],
      [5.5, 0.95, -0.35],
    ];
    const smokeGeo = new THREE.SphereGeometry(0.16, 6, 5);
    for (let i = 0; i < 8; i++) {
      const [ox, oy, oz] = origins[i % origins.length];
      const mat = new THREE.MeshBasicMaterial({
        color: PALETTE.cloudWhite,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(smokeGeo, mat);
      mesh.position.set(ox, oy, oz);
      this.group.add(mesh);
      this.smokeParticles.push({ mesh, originY: oy, phase: i * 0.72 });
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
    this.decorLanternMats = [];
    this.decorSwayProps = [];

    decors.forEach((dec, idx) => {
      const wx = dec.tileX + 0.5;
      const wz = dec.tileZ + 0.5;

      if (dec.itemId === 'decor_lantern') {
        const dg = new THREE.Group();
        const post = new THREE.Mesh(this.decorLanternPostGeo, this.decorPostMat);
        post.position.set(0, 0.5, -0.14);
        const arm = new THREE.Mesh(this.decorArmGeo, this.decorPostMat);
        arm.position.set(0, 0.96, -0.02);

        const bodyMat = toonMaterials.createToonMaterial({
          color: PALETTE.coralRed,
          emissive: PALETTE.amberGold,
          emissiveIntensity: 0.25,
        });
        this.decorLanternMats.push(bodyMat);
        const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.34, 8), bodyMat);
        lantern.position.set(0, 0.72, 0.08);
        dg.add(post, arm, lantern);
        enableShadows(dg, true, true);
        dg.position.set(wx, 0, wz);
        this.decorGroup.add(dg);
      } else if (dec.itemId === 'decor_wind_chime') {
        const dg = new THREE.Group();
        const post = new THREE.Mesh(this.decorChimePostGeo, this.decorPostMat);
        post.position.set(0, 0.66, -0.14);
        const arm = new THREE.Mesh(this.decorArmGeo, this.decorPostMat);
        arm.position.set(0, 1.28, -0.02);

        const chimePivot = new THREE.Group();
        chimePivot.position.set(0, 1.24, 0.08);
        const bell = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 8, 6),
          toonMaterials.createToonMaterial({ color: PALETTE.waterLight })
        );
        bell.position.y = -0.18;
        const ribbon = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.3, 0.02),
          toonMaterials.createToonMaterial({ color: PALETTE.coralRed })
        );
        ribbon.position.y = -0.4;
        chimePivot.add(bell, ribbon);

        dg.add(post, arm, chimePivot);
        enableShadows(dg, true, true);
        dg.position.set(wx, 0, wz);
        this.decorGroup.add(dg);
        this.decorSwayProps.push({ obj: chimePivot, baseZ: 0, phase: idx * 1.1 });
      } else if (dec.itemId === 'decor_potted_plant') {
        const dg = new THREE.Group();
        const pot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.17, 0.32, 8),
          toonMaterials.createToonMaterial({ color: PALETTE.roofMid })
        );
        pot.position.y = 0.16;
        const foliage = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.25, 1),
          toonMaterials.createToonMaterial({ color: PALETTE.grassLight })
        );
        foliage.position.y = 0.42;
        const blossom = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 6, 5),
          toonMaterials.createToonMaterial({ color: PALETTE.amberGold })
        );
        blossom.position.set(0.05, 0.6, 0.05);
        dg.add(pot, foliage, blossom);
        enableShadows(dg, true, true);
        dg.position.set(wx, 0, wz);
        this.decorGroup.add(dg);
      }
    });
  }

  public setShippingBinHasItems(hasItems: boolean): void {
    this.shippingBinFullGroup.visible = hasItems;
  }

  public setShopOpenSign(isOpen: boolean): void {
    this.openSignBoardMat.color.set(isOpen ? PALETTE.teaGreen : PALETTE.roofMid);
  }

  public setDryingRackState(state: DryingRackVisualState): void {
    this.dryingRackState = state;
    this.dryingDryingGroup.visible = state === 'drying';
    this.dryingReadyGroup.visible = state === 'ready';
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
    if (px >= -10.5 && px <= 0 && pz >= -0.2 && pz <= 6.0) return '🌿 Đồi Trà Trên Mây';
    if (px <= -6.2 && pz >= 4.8) return '🌊 Hồ Sương Mây';
    if (px >= 8.8 && pz >= -1.0 && pz <= 1.8) return '⛩️ Miếu Trà Cổ';
    if (px >= -5.6 && px <= -2.4 && pz >= 5.0) return '🔭 Bờ Mây Ngắm Cảnh';
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

    const cleanedSet = new Set(cleanedSpots);
    for (const spot of CLEANUP_SPOTS) {
      if (cleanedSet.has(spot.id)) continue;
      const cluster = new THREE.Group();
      const baseColor = spot.kind === 'leaves' ? PALETTE.amberWarm : PALETTE.creamDark;
      const altColor = spot.kind === 'leaves' ? PALETTE.roofLight : PALETTE.creamMid;
      for (let i = 0; i < 4; i++) {
        const piece = new THREE.Mesh(
          new THREE.DodecahedronGeometry(spot.kind === 'leaves' ? 0.14 : 0.12, 0),
          toonMaterials.createToonMaterial({ color: i % 2 === 0 ? baseColor : altColor })
        );
        const angle = (i / 4) * Math.PI * 2 + spot.x;
        piece.scale.set(1.35, 0.32, 0.95);
        piece.rotation.y = angle;
        piece.position.set(Math.cos(angle) * 0.16, 0.08, Math.sin(angle) * 0.14);
        cluster.add(piece);
      }
      cluster.position.set(spot.x, 0, spot.z);
      this.storyGroup.add(cluster);

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
      const env = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.08, 0.32),
        toonMaterials.createToonMaterial({
          color: PALETTE.creamLight,
          emissive: PALETTE.amberGold,
          emissiveIntensity: 0.45,
        })
      );
      env.position.set(lx, 0.14, lz);
      env.rotation.y = 0.4;
      this.storyGroup.add(env);

      const spark = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: pixelArt.getTexture('sparkle_pixel'),
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
        })
      );
      spark.position.set(lx, 0.65, lz);
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
      const stand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.58, 0.85, 8),
        toonMaterials.createToonMaterial({ color: PALETTE.woodMid })
      );
      stand.position.set(fx, 0.425, fz);
      const festLantern = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.48, 8),
        toonMaterials.createToonMaterial({
          color: PALETTE.coralRed,
          emissive: PALETTE.amberGold,
          emissiveIntensity: 0.9,
        })
      );
      festLantern.position.set(fx, 1.15, fz);
      this.storyGroup.add(stand, festLantern);

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
    // Đèn cửa sổ & đèn lồng ấm bừng sáng + kích hoạt bloom ban đêm
    const winEmissive = 0.08 + nightFactor * 1.45;
    for (const mat of this.homeWindowMats) {
      mat.emissiveIntensity = winEmissive;
    }

    const lanternEmissive = 0.18 + nightFactor * 1.65 + nightFactor * Math.sin(elapsed * 4.5) * 0.2;
    for (const mat of this.warmLanternMats) {
      mat.emissiveIntensity = lanternEmissive;
    }
    for (const mat of this.decorLanternMats) {
      mat.emissiveIntensity = lanternEmissive;
    }
    for (const pl of this.warmPointLights) {
      pl.light.intensity = nightFactor * pl.maxIntensity;
    }

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

    for (const sway of this.decorSwayProps) {
      sway.obj.rotation.z = sway.baseZ + Math.sin(elapsed * 2.5 + sway.phase) * 0.1;
    }

    const beamMat = this.beaconBeam.material as THREE.MeshBasicMaterial;
    beamMat.opacity = nightFactor * 0.3;
    this.beaconHeadGroup.rotation.y = elapsed * 0.75;

    if (this.mooredBoatGroup) {
      this.mooredBoatGroup.position.y = -0.18 + Math.sin(elapsed * 1.35) * 0.08;
      this.mooredBoatGroup.rotation.z = Math.sin(elapsed * 1.1) * 0.035;
    }

    for (const s of this.smokeParticles) {
      const cycle = ((elapsed * 0.65 + s.phase) % 2.2) / 2.2;
      s.mesh.position.y = s.originY + cycle * 1.45;
      s.mesh.scale.setScalar(0.6 + cycle * 0.9);
      const mat = s.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - cycle) * 0.42;
    }

    if (this.dryingRackState === 'ready') {
      const pulse = 0.34 + Math.abs(Math.sin(elapsed * 4.4)) * 0.22;
      this.dryingSparkle.scale.set(pulse, pulse, 1);
      this.dryingSparkle.position.y = 1.2 + Math.sin(elapsed * 3.6) * 0.08;
    }
  }
}

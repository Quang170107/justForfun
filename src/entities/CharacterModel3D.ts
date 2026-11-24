import * as THREE from 'three';
import { PALETTE } from '../art/palette';
import { enableShadows, toonMaterials } from '../art/toonMaterials';
import { Direction, ToolId } from '../data/types';

export type CharacterModelId =
  | 'char_player'
  | 'char_may'
  | 'char_co_lu'
  | 'char_ong_dang'
  | 'char_be_suong'
  | 'char_guest_traveler'
  | 'char_guest_poet'
  | 'char_guest_painter'
  | 'char_guest_merchant';

const DIR_ANGLE: Record<Direction, number> = {
  down: 0,
  right: Math.PI / 2,
  up: Math.PI,
  left: -Math.PI / 2,
};

export class CharacterModel3D {
  public readonly root = new THREE.Group();
  private bodyPivot = new THREE.Group();
  private headGroup = new THREE.Group();
  private leftArm = new THREE.Group();
  private rightArm = new THREE.Group();
  private leftLeg = new THREE.Group();
  private rightLeg = new THREE.Group();
  private scarfOrTail: THREE.Object3D | null = null;
  private lanternCoreMat: THREE.MeshToonMaterial | null = null;
  private heldToolGroup = new THREE.Group();
  private hoeMesh!: THREE.Group;
  private canMesh!: THREE.Group;
  private basketMesh!: THREE.Group;

  private targetYaw = 0;
  private currentYaw = 0;
  private isSpirit = false;
  private isCrane = false;

  constructor(modelId: string) {
    this.isSpirit = modelId === 'char_may';
    this.isCrane = modelId === 'char_co_lu';
    this.buildModel(modelId);
    enableShadows(this.root, true, true);
  }

  private addEyesAndCheeks(parent: THREE.Group, zFront: number, yEye: number, rosy = true): void {
    const eyeMat = toonMaterials.getSolidToon(PALETTE.outlineDark);
    const glintMat = toonMaterials.getSolidToon(PALETTE.whiteWarm);
    const cheekMat = toonMaterials.getSolidToon(PALETTE.coralRed);

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 6, 5), eyeMat);
      eye.position.set(side * 0.095, yEye, zFront);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.014, 5, 4), glintMat);
      glint.position.set(side * 0.088, yEye + 0.012, zFront + 0.025);
      parent.add(eye, glint);

      if (rosy) {
        const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 4), cheekMat);
        cheek.scale.set(1.25, 0.7, 0.5);
        cheek.position.set(side * 0.145, yEye - 0.045, zFront - 0.015);
        parent.add(cheek);
      }
    }
  }

  private buildModel(modelId: string): void {
    // Bóng tròn mềm dưới chân
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 14),
      new THREE.MeshBasicMaterial({
        color: PALETTE.outlinePlum,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    this.root.add(shadow);

    this.root.add(this.bodyPivot);

    if (this.isSpirit) {
      this.buildMaySpirit();
      return;
    }
    if (this.isCrane) {
      this.buildCraneCourier();
      return;
    }

    // Bảng phối màu theo nhân vật
    let shirtColor: string = PALETTE.creamLight;
    let accentColor: string = PALETTE.teaGreen;
    let hairColor: string = PALETTE.hairBrown;
    let skinColor: string = PALETTE.skinBase;
    let hatKind: 'straw' | 'keeper' | 'sunhat' | 'beret' | 'cap' | 'merchant' | 'none' = 'straw';

    switch (modelId) {
      case 'char_player':
        shirtColor = PALETTE.creamLight;
        accentColor = PALETTE.teaGreen;
        hairColor = PALETTE.hairBrown;
        hatKind = 'straw';
        break;
      case 'char_ong_dang':
        shirtColor = PALETTE.navyDark;
        accentColor = PALETTE.navyLight;
        hairColor = PALETTE.hairSilver;
        skinColor = PALETTE.skinShadow;
        hatKind = 'keeper';
        break;
      case 'char_be_suong':
        shirtColor = PALETTE.creamMid;
        accentColor = PALETTE.grassMid;
        hairColor = PALETTE.hairBrown;
        hatKind = 'sunhat';
        break;
      case 'char_guest_traveler':
        shirtColor = PALETTE.tealLight;
        accentColor = PALETTE.woodMid;
        hatKind = 'cap';
        break;
      case 'char_guest_poet':
        shirtColor = PALETTE.cloudPink;
        accentColor = PALETTE.skyDeep;
        hairColor = PALETTE.outlinePlum;
        hatKind = 'none';
        break;
      case 'char_guest_painter':
        shirtColor = PALETTE.creamLight;
        accentColor = PALETTE.roofMid;
        hatKind = 'beret';
        break;
      case 'char_guest_merchant':
        shirtColor = PALETTE.amberWarm;
        accentColor = PALETTE.woodDark;
        hatKind = 'merchant';
        break;
    }

    const shirtMat = toonMaterials.getSolidToon(shirtColor);
    const accentMat = toonMaterials.getSolidToon(accentColor);
    const skinMat = toonMaterials.getSolidToon(skinColor);
    const hairMat = toonMaterials.getSolidToon(hairColor);
    const bootMat = toonMaterials.getSolidToon(PALETTE.woodDark);

    // Hai chân bo tròn thuôn nhẹ
    const legGeo = new THREE.CapsuleGeometry(0.075, 0.2, 4, 6);
    const bootGeo = new THREE.SphereGeometry(0.085, 6, 5);
    for (const [grp, sx] of [
      [this.leftLeg, -0.11],
      [this.rightLeg, 0.11],
    ] as [THREE.Group, number][]) {
      grp.position.set(sx, 0.34, 0);
      const legMesh = new THREE.Mesh(legGeo, bootMat);
      legMesh.position.y = -0.14;
      const boot = new THREE.Mesh(bootGeo, bootMat);
      boot.scale.set(0.95, 0.72, 1.3);
      boot.position.set(0, -0.27, 0.03);
      grp.add(legMesh, boot);
      this.bodyPivot.add(grp);
    }

    // Thân áo + tạp dề / khăn
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.44, 10), shirtMat);
    torso.position.y = 0.56;
    this.bodyPivot.add(torso);

    const apron = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.32, 10), accentMat);
    apron.position.y = 0.49;
    this.bodyPivot.add(apron);

    // Khăn quàng nhỏ ở cổ
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 6, 12), accentMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.78;
    this.bodyPivot.add(collar);

    // Hai tay linh hoạt (tay phải mang được công cụ 3D)
    const armGeo = new THREE.CapsuleGeometry(0.06, 0.2, 4, 6);
    const handGeo = new THREE.SphereGeometry(0.065, 6, 5);
    for (const [grp, sx] of [
      [this.leftArm, -0.25],
      [this.rightArm, 0.25],
    ] as [THREE.Group, number][]) {
      grp.position.set(sx, 0.72, 0);
      const aMesh = new THREE.Mesh(armGeo, shirtMat);
      aMesh.position.y = -0.13;
      const hMesh = new THREE.Mesh(handGeo, skinMat);
      hMesh.position.y = -0.25;
      grp.add(aMesh, hMesh);
      this.bodyPivot.add(grp);
    }

    // Đầu tỷ lệ chibi Ghibli (to, tròn dịu)
    this.headGroup.position.set(0, 1.0, 0);
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), skinMat);
    this.headGroup.add(headMesh);
    this.addEyesAndCheeks(this.headGroup, 0.225, -0.02, true);

    // Mái tóc ôm đầu phía sau & hai bên
    const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.275, 10, 8), hairMat);
    hairBack.position.set(0, 0.04, -0.04);
    hairBack.scale.set(1.02, 1.0, 0.96);
    this.headGroup.add(hairBack);

    if (modelId === 'char_be_suong') {
      // Hai bím tóc dễ thương
      for (const s of [-1, 1]) {
        const braid = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), hairMat);
        braid.position.set(s * 0.25, -0.1, -0.04);
        this.headGroup.add(braid);
      }
    }

    if (modelId === 'char_ong_dang') {
      // Râu bạc dài + đèn bão cầm tay
      const beard = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 7), hairMat);
      beard.rotation.x = Math.PI;
      beard.position.set(0, -0.24, 0.16);
      this.headGroup.add(beard);

      const lBodyMat = toonMaterials.createToonMaterial({
        color: PALETTE.amberGold,
        emissive: PALETTE.amberGold,
        emissiveIntensity: 0.25,
      });
      this.lanternCoreMat = lBodyMat;
      const lantern = new THREE.Group();
      lantern.position.set(0, -0.32, 0.08);
      const lCap = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.08, 7), bootMat);
      lCap.position.set(0, 0.12, 0);
      lantern.add(
        new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.18, 7), lBodyMat),
        lCap
      );
      this.leftArm.add(lantern);
    }

    if (modelId === 'char_guest_traveler') {
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.18), toonMaterials.getSolidToon(PALETTE.woodMid));
      pack.position.set(0, 0.56, -0.24);
      this.bodyPivot.add(pack);
    }

    // Mũ theo nhân vật
    this.buildHat(hatKind, accentMat, bootMat);
    this.bodyPivot.add(this.headGroup);

    // Công cụ 3D gắn vào tay phải (chỉ hiện khi Player thao tác)
    this.buildHeldTools();
    this.rightArm.add(this.heldToolGroup);
    this.heldToolGroup.visible = false;
  }

  private buildHat(
    kind: 'straw' | 'keeper' | 'sunhat' | 'beret' | 'cap' | 'merchant' | 'none',
    accentMat: THREE.Material,
    darkMat: THREE.Material
  ): void {
    if (kind === 'none') return;
    if (kind === 'straw' || kind === 'sunhat') {
      const strawMat = toonMaterials.getSolidToon(PALETTE.amberGold);
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(kind === 'straw' ? 0.42 : 0.46, 0.46, 0.05, 14),
        strawMat
      );
      brim.position.y = 0.21;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.18, 12), strawMat);
      crown.position.y = 0.31;
      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.05, 12), accentMat);
      ribbon.position.y = 0.25;
      this.headGroup.add(brim, crown, ribbon);
    } else if (kind === 'keeper' || kind === 'cap') {
      const capMat = toonMaterials.getSolidToon(PALETTE.navyDark);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.55), capMat);
      dome.position.y = 0.08;
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.2), darkMat);
      visor.position.set(0, 0.12, 0.24);
      this.headGroup.add(dome, visor);
    } else if (kind === 'beret') {
      const beret = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 6), toonMaterials.getSolidToon(PALETTE.roofMid));
      beret.scale.set(1.1, 0.45, 1.1);
      beret.position.set(0.06, 0.26, 0);
      beret.rotation.z = -0.2;
      this.headGroup.add(beret);
    } else if (kind === 'merchant') {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 12), darkMat);
      brim.position.y = 0.21;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.22, 0.24, 10), darkMat);
      top.position.y = 0.34;
      this.headGroup.add(brim, top);
    }
  }

  private buildMaySpirit(): void {
    const auraMat = toonMaterials.createToonMaterial({
      color: PALETTE.whiteWarm,
      emissive: PALETTE.cloudPink,
      emissiveIntensity: 0.35,
    });
    this.lanternCoreMat = auraMat;

    const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.72, 12), auraMat);
    cloak.position.y = 0.58;
    this.bodyPivot.add(cloak);

    this.headGroup.position.set(0, 1.0, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), auraMat);
    const starPin = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), toonMaterials.getSolidToon(PALETTE.amberGold));
    starPin.position.set(0.21, 0.16, 0.08);
    this.headGroup.add(head, starPin);
    this.addEyesAndCheeks(this.headGroup, 0.22, -0.02, true);
    this.bodyPivot.add(this.headGroup);

    const ribbon = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.36, 0.05),
      toonMaterials.getSolidToon(PALETTE.sakuraPink)
    );
    ribbon.position.set(0, 0.65, -0.22);
    ribbon.rotation.x = 0.35;
    this.scarfOrTail = ribbon;
    this.bodyPivot.add(ribbon);
  }

  private buildCraneCourier(): void {
    const whiteMat = toonMaterials.getSolidToon(PALETTE.whiteWarm);
    const orangeMat = toonMaterials.getSolidToon(PALETTE.amberWarm);
    const redMat = toonMaterials.getSolidToon(PALETTE.roofMid);
    const bagMat = toonMaterials.getSolidToon(PALETTE.woodMid);

    // Chân cò dài thanh thoát
    const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.52, 5);
    for (const [grp, sx] of [
      [this.leftLeg, -0.09],
      [this.rightLeg, 0.09],
    ] as [THREE.Group, number][]) {
      grp.position.set(sx, 0.52, 0);
      const l = new THREE.Mesh(legGeo, orangeMat);
      l.position.y = -0.26;
      grp.add(l);
      this.bodyPivot.add(grp);
    }

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), whiteMat);
    body.scale.set(0.92, 1.25, 1.15);
    body.position.y = 0.74;
    this.bodyPivot.add(body);

    const satchel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.26), bagMat);
    satchel.position.set(0.22, 0.72, 0);
    this.bodyPivot.add(satchel);

    // Đôi cánh thay cho 2 tay
    for (const [grp, sx] of [
      [this.leftArm, -0.21],
      [this.rightArm, 0.21],
    ] as [THREE.Group, number][]) {
      grp.position.set(sx, 0.82, 0);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.36, 0.24), whiteMat);
      wing.position.set(sx > 0 ? 0.04 : -0.04, -0.14, -0.02);
      grp.add(wing);
      this.bodyPivot.add(grp);
    }

    // Cổ & đầu + mỏ dài cam
    this.headGroup.position.set(0, 1.18, 0.08);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.32, 7), whiteMat);
    neck.position.set(0, -0.14, -0.02);
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.035, 5, 10), redMat);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.set(0, -0.24, -0.02);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), whiteMat);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.26, 6), orangeMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, -0.02, 0.22);
    this.headGroup.add(neck, scarf, head, beak);
    this.addEyesAndCheeks(this.headGroup, 0.12, 0.03, false);
    this.bodyPivot.add(this.headGroup);
  }

  private buildHeldTools(): void {
    const woodMat = toonMaterials.getSolidToon(PALETTE.woodMid);
    const metalMat = toonMaterials.getSolidToon(PALETTE.rockLight);
    const waterCanMat = toonMaterials.getSolidToon(PALETTE.waterBlue);
    const basketMat = toonMaterials.getSolidToon(PALETTE.woodBright);

    this.heldToolGroup.position.set(0, -0.25, 0.08);

    // 1. Cuốc Gỗ
    this.hoeMesh = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 5), woodMat);
    handle.rotation.x = Math.PI / 2;
    handle.position.z = 0.24;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.1), metalMat);
    blade.position.set(0, -0.08, 0.54);
    this.hoeMesh.add(handle, blade);

    // 2. Bình Tưới
    this.canMesh = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.2, 8), waterCanMat);
    body.position.set(0, -0.04, 0.14);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.22, 6), waterCanMat);
    spout.rotation.x = Math.PI / 3;
    spout.position.set(0, 0.02, 0.28);
    this.canMesh.add(body, spout);

    // 3. Giỏ Thu Hoạch
    this.basketMesh = new THREE.Group();
    const bsk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.16, 8), basketMat);
    bsk.position.set(0, -0.05, 0.18);
    this.basketMesh.add(bsk);

    this.heldToolGroup.add(this.hoeMesh, this.canMesh, this.basketMesh);
  }

  public showTool(toolKind: ToolId | null, swingProgress = 0): void {
    if (!toolKind) {
      this.heldToolGroup.visible = false;
      this.rightArm.rotation.x = 0;
      return;
    }
    this.heldToolGroup.visible = true;
    this.hoeMesh.visible = toolKind === 'hoe';
    this.canMesh.visible = toolKind === 'watering_can';
    this.basketMesh.visible = toolKind === 'basket';

    // Vung tay hình vòng cung
    const swingAngle =
      swingProgress < 0.35
        ? -1.4 * (swingProgress / 0.35)
        : -1.4 + 2.2 * ((swingProgress - 0.35) / 0.65);
    this.rightArm.rotation.x = swingAngle;
    this.leftArm.rotation.x = -swingAngle * 0.25;
  }

  public setLanternGlow(nightFactor: number): void {
    if (this.lanternCoreMat) {
      this.lanternCoreMat.emissiveIntensity = this.isSpirit
        ? 0.28 + nightFactor * 0.65
        : 0.15 + nightFactor * 1.5;
    }
  }

  public setPose(dir: Direction, colIndex: number, extraY = 0): void {
    this.targetYaw = DIR_ANGLE[dir];
    // Nội suy góc xoay ngắn nhất
    let diff = this.targetYaw - this.currentYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.currentYaw += diff * 0.35;
    this.bodyPivot.rotation.y = this.currentYaw;

    if (colIndex <= 3) {
      // Đang đi bộ: đánh tay chân nhịp nhàng
      const swing = Math.sin((colIndex / 4) * Math.PI * 2) * 0.55;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = this.isCrane ? Math.abs(swing) * 0.4 : -swing * 0.85;
      if (!this.heldToolGroup.visible) {
        this.rightArm.rotation.x = this.isCrane ? -Math.abs(swing) * 0.4 : swing * 0.85;
      }
      this.bodyPivot.position.y = extraY + Math.abs(Math.sin((colIndex / 4) * Math.PI * 2)) * 0.045;
    } else if (colIndex <= 5) {
      // Đứng nghỉ: thở nhẹ nhàng
      const breath = colIndex === 5 ? 0.025 : 0;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0;
      if (!this.heldToolGroup.visible) {
        this.rightArm.rotation.x = 0;
      }
      this.bodyPivot.position.y = extraY + breath;
    }

    if (this.scarfOrTail) {
      this.scarfOrTail.rotation.x = 0.32 + Math.sin(performance.now() * 0.004) * 0.12;
    }
  }
}

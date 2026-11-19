import * as THREE from 'three';
import { pixelArt } from '../art/pixelArtGenerator';
import { AudioSystem } from '../core/AudioSystem';
import { Direction, ToolId } from '../data/types';
import { Island } from '../world/Island';
import { BillboardSprite } from './BillboardSprite';

export class Player extends BillboardSprite {
  private animTimer = 0;
  private actionTimer = 0;
  private readonly actionDuration = 0.33;
  private stepDist = 0;
  private readonly speed = 4.2;

  private toolOverlayGroup: THREE.Group;
  private toolOverlayMat: THREE.MeshBasicMaterial;

  constructor(startX: number, startZ: number) {
    super('char_player', 16, 32, 0.85);
    this.x = startX;
    this.z = startZ;

    const toolHandle = pixelArt.createYBillboard({
      textureKey: 'swing_hoe',
      widthPx: 16,
      heightPx: 16,
      baseYOffset: 0.25,
      alphaTest: 0.4,
    });
    this.toolOverlayGroup = toolHandle.group;
    this.toolOverlayMat = toolHandle.material;
    this.toolOverlayGroup.visible = false;
    this.group.add(this.toolOverlayGroup);

    this.syncSnappedPosition();
  }

  public isPerformingAction(): boolean {
    return this.actionTimer > 0;
  }

  public triggerToolAction(toolKind: ToolId = 'hoe', dir?: Direction): void {
    if (dir) this.direction = dir;
    this.actionTimer = this.actionDuration;

    const texKey =
      toolKind === 'watering_can'
        ? 'swing_watering'
        : toolKind === 'basket'
          ? 'swing_basket'
          : 'swing_hoe';
    this.toolOverlayMat.map = pixelArt.getTexture(texKey);
    this.toolOverlayMat.needsUpdate = true;
    this.toolOverlayGroup.visible = true;
    this.updateToolOverlayVisual(0);
  }

  public faceTowards(targetX: number, targetZ: number): void {
    const dx = targetX - this.x;
    const dz = targetZ - this.z;
    if (Math.hypot(dx, dz) < 0.05) return;
    if (Math.abs(dx) > Math.abs(dz)) {
      this.direction = dx > 0 ? 'right' : 'left';
    } else {
      this.direction = dz > 0 ? 'down' : 'up';
    }
  }

  public getFacingPos(distance = 0.9): { x: number; z: number } {
    switch (this.direction) {
      case 'down':
        return { x: this.x, z: this.z + distance };
      case 'up':
        return { x: this.x, z: this.z - distance };
      case 'left':
        return { x: this.x - distance, z: this.z };
      case 'right':
        return { x: this.x + distance, z: this.z };
    }
  }

  private updateToolOverlayVisual(progress: number): void {
    const offset = 0.55;
    let ox = 0;
    let oz = 0;
    if (this.direction === 'down') oz = offset;
    else if (this.direction === 'up') oz = -offset;
    else if (this.direction === 'left') ox = -offset;
    else ox = offset;

    // 3 giai đoạn động tác: vươn cao -> tác động thấp -> thu về
    const arcY = progress < 0.33 ? 0.35 : progress < 0.68 ? 0.02 : 0.16;
    this.toolOverlayGroup.position.set(ox, arcY, oz);
  }

  public update(
    dt: number,
    moveAxis: { x: number; y: number },
    cameraYawStep: number,
    island: Island,
    audio: AudioSystem
  ): void {
    if (this.actionTimer > 0) {
      this.actionTimer = Math.max(0, this.actionTimer - dt);
      const progress = 1 - this.actionTimer / this.actionDuration;
      // 3 frame animation công cụ (6 -> 7 -> 6)
      const frame = progress < 0.33 ? 6 : progress < 0.68 ? 7 : 6;
      this.setFrame(this.direction, frame);
      this.updateToolOverlayVisual(progress);
      if (this.actionTimer <= 0) {
        this.toolOverlayGroup.visible = false;
      }
      this.syncSnappedPosition();
      return;
    }

    // Chuyển hướng input theo góc xoay camera 90° (0..3)
    const yawAngle = ((cameraYawStep % 4) + 4) % 4;
    const rad = yawAngle * (Math.PI / 2);
    const rightX = Math.cos(rad);
    const rightZ = -Math.sin(rad);
    const fwdX = -Math.sin(rad);
    const fwdZ = -Math.cos(rad);

    // Input y = -1 là tiến lên trên màn hình
    const worldDx = moveAxis.x * rightX + -moveAxis.y * fwdX;
    const worldDz = moveAxis.x * rightZ + -moveAxis.y * fwdZ;
    const moving = Math.hypot(moveAxis.x, moveAxis.y) > 0.05;

    if (moving) {
      const prevX = this.x;
      const prevZ = this.z;
      const stepX = worldDx * this.speed * dt;
      const stepZ = worldDz * this.speed * dt;
      const nextX = this.x + stepX;
      const nextZ = this.z + stepZ;

      if (!island.isBlocked(nextX, this.z)) this.x = nextX;
      if (!island.isBlocked(this.x, nextZ)) this.z = nextZ;

      // Trượt mép góc cửa/vật cản khi đi thẳng bị cạ nhẹ góc
      if (Math.abs(worldDx) > 0.7 && this.x === prevX && Math.abs(worldDz) < 0.25) {
        const nudge = Math.min(0.28, this.speed * dt * 0.65);
        if (!island.isBlocked(nextX, this.z + 0.28) && !island.isBlocked(this.x, this.z + nudge)) {
          this.z += nudge;
        } else if (!island.isBlocked(nextX, this.z - 0.28) && !island.isBlocked(this.x, this.z - nudge)) {
          this.z -= nudge;
        }
      } else if (Math.abs(worldDz) > 0.7 && this.z === prevZ && Math.abs(worldDx) < 0.25) {
        const nudge = Math.min(0.28, this.speed * dt * 0.65);
        if (!island.isBlocked(this.x + 0.28, nextZ) && !island.isBlocked(this.x + nudge, this.z)) {
          this.x += nudge;
        } else if (!island.isBlocked(this.x - 0.28, nextZ) && !island.isBlocked(this.x - nudge, this.z)) {
          this.x -= nudge;
        }
      }

      if (Math.abs(worldDx) > Math.abs(worldDz)) {
        this.direction = worldDx > 0 ? 'right' : 'left';
      } else {
        this.direction = worldDz > 0 ? 'down' : 'up';
      }

      const movedDist = Math.hypot(this.x - prevX, this.z - prevZ);
      if (movedDist > 0.002) {
        // Tốc độ animation & tiếng bước chân khớp theo quãng đường di chuyển thực
        this.animTimer += movedDist * 2.3;
        const walkFrame = Math.floor(this.animTimer) % 4;
        this.setFrame(this.direction, walkFrame);

        this.stepDist += movedDist;
        if (this.stepDist >= 1.15) {
          audio.playStep();
          this.stepDist = 0;
        }
      } else {
        // Bị chặn hoàn toàn -> chuyển về frame đứng nghỉ, tránh chạy tại chỗ
        this.animTimer += dt * 2.2;
        this.setFrame(this.direction, 4 + (Math.floor(this.animTimer) % 2));
      }
    } else {
      this.animTimer += dt * 2.2;
      const idleFrame = 4 + (Math.floor(this.animTimer) % 2);
      this.setFrame(this.direction, idleFrame);
    }

    this.syncSnappedPosition();
  }
}

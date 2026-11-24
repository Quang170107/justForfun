import { AudioSystem } from '../core/AudioSystem';
import { Direction, ToolId } from '../data/types';
import { Island } from '../world/Island';
import { BillboardSprite } from './BillboardSprite';

export class Player extends BillboardSprite {
  private animTimer = 0;
  private actionTimer = 0;
  private readonly actionDuration = 0.33;
  private activeToolKind: ToolId = 'hoe';
  private stepDist = 0;
  private readonly speed = 4.2;

  constructor(startX: number, startZ: number) {
    super('char_player', 16, 32, 0.85);
    this.x = startX;
    this.z = startZ;
    this.syncSnappedPosition();
  }

  public isPerformingAction(): boolean {
    return this.actionTimer > 0;
  }

  public triggerToolAction(toolKind: ToolId = 'hoe', dir?: Direction): void {
    if (dir) this.direction = dir;
    this.activeToolKind = toolKind;
    this.actionTimer = this.actionDuration;
    this.model.showTool(this.activeToolKind, 0);
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
      const frame = progress < 0.33 ? 6 : progress < 0.68 ? 7 : 6;
      this.model.showTool(this.activeToolKind, progress);
      this.setFrame(this.direction, frame);
      if (this.actionTimer <= 0) {
        this.model.showTool(null, 0);
      }
      this.syncSnappedPosition();
      return;
    }

    const yawAngle = ((cameraYawStep % 4) + 4) % 4;
    const rad = yawAngle * (Math.PI / 2);
    const rightX = Math.cos(rad);
    const rightZ = -Math.sin(rad);
    const fwdX = -Math.sin(rad);
    const fwdZ = -Math.cos(rad);

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
        this.animTimer += movedDist * 2.3;
        const walkFrame = Math.floor(this.animTimer) % 4;
        this.setFrame(this.direction, walkFrame);

        this.stepDist += movedDist;
        if (this.stepDist >= 1.15) {
          audio.playStep(island.getSurfaceType(this.x, this.z));
          this.stepDist = 0;
        }
      } else {
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

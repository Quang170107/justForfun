import { AudioSystem } from '../core/AudioSystem';
import { Direction } from '../data/types';
import { Island } from '../world/Island';
import { BillboardSprite } from './BillboardSprite';

export class Player extends BillboardSprite {
  private animTimer = 0;
  private actionTimer = 0;
  private stepCooldown = 0;
  private readonly speed = 4.2;

  constructor(startX: number, startZ: number) {
    super('char_player', 1, 2, 0.85);
    this.x = startX;
    this.z = startZ;
    this.syncSnappedPosition();
  }

  public triggerToolAction(dir?: Direction): void {
    if (dir) this.direction = dir;
    this.actionTimer = 0.28;
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
      this.actionTimer -= dt;
      const frame = this.actionTimer > 0.14 ? 6 : 7;
      this.setFrame(this.direction, frame);
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
      const nextX = this.x + worldDx * this.speed * dt;
      const nextZ = this.z + worldDz * this.speed * dt;

      if (!island.isBlocked(nextX, this.z)) this.x = nextX;
      if (!island.isBlocked(this.x, nextZ)) this.z = nextZ;

      if (Math.abs(worldDx) > Math.abs(worldDz)) {
        this.direction = worldDx > 0 ? 'right' : 'left';
      } else {
        this.direction = worldDz > 0 ? 'down' : 'up';
      }

      this.animTimer += dt * 8;
      const walkFrame = Math.floor(this.animTimer) % 4;
      this.setFrame(this.direction, walkFrame);

      this.stepCooldown -= dt;
      if (this.stepCooldown <= 0) {
        audio.playStep();
        this.stepCooldown = 0.28;
      }
    } else {
      this.animTimer += dt * 2.2;
      const idleFrame = 4 + (Math.floor(this.animTimer) % 2);
      this.setFrame(this.direction, idleFrame);
    }

    this.syncSnappedPosition();
  }
}

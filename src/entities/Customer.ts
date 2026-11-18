import * as THREE from 'three';
import { pixelArt } from '../art/pixelArtGenerator';
import { ActiveCustomer } from '../data/types';
import { BillboardSprite } from './BillboardSprite';

export class CustomerEntity extends BillboardSprite {
  public data: ActiveCustomer;
  private targetSeat: { x: number; z: number };
  private animTimer = 0;
  private bubbleSprite: THREE.Sprite;

  constructor(data: ActiveCustomer, seatPos: { x: number; z: number }) {
    super(`char_${data.npcId}`, 1, 2, 0.85);
    this.data = data;
    this.targetSeat = seatPos;
    this.x = data.x;
    this.z = data.z;

    // Biểu tượng tách trà nhỏ nhấp nhô trên đầu khi đang chờ order
    const bubbleMat = new THREE.SpriteMaterial({
      map: pixelArt.getTexture('glow_pixel'),
      color: '#f2c14e',
      transparent: true,
      opacity: 0.9,
    });
    this.bubbleSprite = new THREE.Sprite(bubbleMat);
    this.bubbleSprite.position.set(0, 2.3, 0);
    this.bubbleSprite.scale.set(0.65, 0.65, 1);
    this.bubbleSprite.visible = false;
    this.group.add(this.bubbleSprite);

    this.syncSnappedPosition();
  }

  public update(dt: number, elapsed: number): boolean {
    if (this.data.state === 'walking_in') {
      const tx = this.targetSeat.x;
      const tz = this.targetSeat.z + 0.55;
      const dx = tx - this.x;
      const dz = tz - this.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.12) {
        this.x = tx;
        this.z = tz;
        this.data.state = 'seated';
        this.setFrame('up', 4);
      } else {
        const speed = 2.0;
        this.x += (dx / dist) * speed * dt;
        this.z += (dz / dist) * speed * dt;
        this.animTimer += dt * 7;
        const dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : dz > 0 ? 'down' : 'up';
        this.setFrame(dir, Math.floor(this.animTimer) % 4);
      }
      this.bubbleSprite.visible = false;
    } else if (this.data.state === 'seated') {
      this.data.waitTimer += dt;
      // Khách kiên nhẫn rất cao (~90s mới buồn nhẹ, không bỏ về ngang)
      this.data.patience = Math.max(15, 100 - this.data.waitTimer * 0.9);
      this.animTimer += dt * 2;
      this.setFrame('up', 4 + (Math.floor(this.animTimer) % 2));
      this.bubbleSprite.visible = true;
      this.bubbleSprite.position.y = 2.25 + Math.sin(elapsed * 4) * 0.08;
    } else if (this.data.state === 'served') {
      this.data.waitTimer += dt;
      this.bubbleSprite.visible = false;
      this.setFrame('up', 4);
      if (this.data.waitTimer > 3.0) {
        this.data.state = 'leaving';
      }
    } else if (this.data.state === 'leaving') {
      const ex = 1.2;
      const ez = 4.5;
      const dx = ex - this.x;
      const dz = ez - this.z;
      const dist = Math.hypot(dx, dz);
      this.bubbleSprite.visible = false;
      if (dist < 0.25) {
        return true; // Đã rời quán
      }
      const speed = 2.1;
      this.x += (dx / dist) * speed * dt;
      this.z += (dz / dist) * speed * dt;
      this.animTimer += dt * 7;
      const dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : dz > 0 ? 'down' : 'up';
      this.setFrame(dir, Math.floor(this.animTimer) % 4);
    }

    this.data.x = this.x;
    this.data.z = this.z;
    const floatY = this.data.npcId === 'may' ? Math.sin(elapsed * 2.8) * 0.1 + 0.1 : 0;
    this.syncSnappedPosition(floatY);
    return false;
  }
}

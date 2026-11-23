import * as THREE from 'three';
import { pixelArt } from '../art/pixelArtGenerator';
import { ActiveCustomer } from '../data/types';
import { BillboardSprite } from './BillboardSprite';

const PIER_ENTRY_X = 5.3;
const PIER_ENTRY_Z = 7.3;
const AISLE_Z = 3.0;

export class CustomerEntity extends BillboardSprite {
  public data: ActiveCustomer;
  private targetSeat: { x: number; z: number };
  private animTimer = 0;
  private bubbleSprite: THREE.Sprite;
  private currentBubbleKey = 'bubble_order';
  private walkWaypoints: { x: number; z: number }[] = [];
  private waypointIdx = 0;
  private leaveInitialized = false;

  constructor(data: ActiveCustomer, seatPos: { x: number; z: number }) {
    super(`char_${data.appearanceId}`, 16, 32, 0.85);
    this.data = data;
    this.targetSeat = seatPos;
    this.x = data.x;
    this.z = data.z;

    // Lộ trình đi từ Bến Mây -> lối trước hiên -> thẳng vào bàn (không cắt xuyên bàn khác)
    this.walkWaypoints = [
      { x: PIER_ENTRY_X, z: AISLE_Z },
      { x: seatPos.x, z: AISLE_Z },
      { x: seatPos.x, z: seatPos.z + 0.65 },
    ];

    const bubbleMat = new THREE.SpriteMaterial({
      map: pixelArt.getTexture('bubble_order'),
      transparent: true,
      depthWrite: false,
    });
    this.bubbleSprite = new THREE.Sprite(bubbleMat);
    this.bubbleSprite.position.set(0, 2.65, 0);
    this.bubbleSprite.scale.set(0.95, 0.95, 1);
    this.bubbleSprite.visible = false;
    this.group.add(this.bubbleSprite);

    this.syncSnappedPosition();
  }

  private setBubbleTexture(key: string): void {
    if (this.currentBubbleKey === key) return;
    this.currentBubbleKey = key;
    const mat = this.bubbleSprite.material as THREE.SpriteMaterial;
    mat.map = pixelArt.getTexture(key);
    mat.needsUpdate = true;
  }

  private moveAlongWaypoints(dt: number, speed: number): boolean {
    if (this.waypointIdx >= this.walkWaypoints.length) {
      return true;
    }
    const target = this.walkWaypoints[this.waypointIdx];
    const dx = target.x - this.x;
    const dz = target.z - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= 0.12) {
      this.x = target.x;
      this.z = target.z;
      this.waypointIdx += 1;
      return this.waypointIdx >= this.walkWaypoints.length;
    }

    const step = Math.min(dist, speed * dt);
    this.x += (dx / dist) * step;
    this.z += (dz / dist) * step;
    this.animTimer += dt * 7;
    const dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : dz > 0 ? 'down' : 'up';
    this.setFrame(dir, Math.floor(this.animTimer) % 4);
    return false;
  }

  public update(dt: number, elapsed: number): boolean {
    if (this.data.state === 'walking_in') {
      const arrived = this.moveAlongWaypoints(dt, 2.1);
      if (arrived) {
        this.data.state = 'seated';
        this.setFrame('up', 4);
      }
      this.bubbleSprite.visible = false;
    } else if (this.data.state === 'seated') {
      this.data.waitTimer += dt;
      // Khách kiên nhẫn rất cao (~90s mới hơi buồn nhẹ, tuyệt đối không bỏ về ngang)
      this.data.patience = Math.max(15, 100 - this.data.waitTimer * 0.9);
      this.animTimer += dt * 2;
      this.setFrame('up', 4 + (Math.floor(this.animTimer) % 2));

      this.setBubbleTexture(this.data.patience < 45 ? 'bubble_waiting' : 'bubble_order');
      this.bubbleSprite.visible = true;
      this.bubbleSprite.position.y = 2.65 + Math.sin(elapsed * 4) * 0.06;
    } else if (this.data.state === 'served') {
      this.data.waitTimer += dt;
      this.setBubbleTexture(this.data.reaction === 'sad' ? 'bubble_sad' : 'bubble_happy');
      this.bubbleSprite.visible = true;
      this.bubbleSprite.position.y = 2.7 + Math.sin(elapsed * 5) * 0.06;
      this.setFrame('up', 4 + (Math.floor(elapsed * 3) % 2));
      if (this.data.waitTimer > 3.0) {
        this.data.state = 'leaving';
        this.leaveInitialized = false;
      }
    } else if (this.data.state === 'leaving') {
      if (!this.leaveInitialized) {
        this.leaveInitialized = true;
        this.walkWaypoints = [
          { x: this.targetSeat.x, z: AISLE_Z },
          { x: PIER_ENTRY_X, z: AISLE_Z },
          { x: PIER_ENTRY_X, z: PIER_ENTRY_Z },
        ];
        this.waypointIdx = 0;
      }
      this.bubbleSprite.visible = false;
      const exited = this.moveAlongWaypoints(dt, 2.2);
      if (exited) {
        return true; // Đã rời khỏi bến mây
      }
    }

    this.data.x = this.x;
    this.data.z = this.z;
    const floatY = this.data.appearanceId === 'may' ? Math.sin(elapsed * 2.8) * 0.1 + 0.1 : 0;
    this.syncSnappedPosition(floatY);
    return false;
  }
}

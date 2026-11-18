import * as THREE from 'three';
import { pixelArt } from '../art/pixelArtGenerator';
import { NpcDef } from '../data/types';
import { Island } from '../world/Island';
import { BillboardSprite } from './BillboardSprite';

export class NPCEntity extends BillboardSprite {
  public readonly def: NpcDef;
  private patrolIdx = 0;
  private waitTimer = 1.5;
  private animTimer = 0;
  private nightLanternGlow: THREE.Sprite | null = null;
  public hiddenDuringCafe = false;

  constructor(def: NpcDef) {
    super(`char_${def.id}`, 1, 2, 0.85);
    this.def = def;
    this.x = def.homePos.x;
    this.z = def.homePos.z;
    this.syncSnappedPosition();

    // Đèn bão trên tay Ông Đăng phát sáng ban đêm
    if (def.id === 'ong_dang' || def.id === 'may') {
      const mat = new THREE.SpriteMaterial({
        map: pixelArt.getTexture('glow_pixel'),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.nightLanternGlow = new THREE.Sprite(mat);
      this.nightLanternGlow.position.set(0.35, 1.0, 0.1);
      this.nightLanternGlow.scale.set(1.5, 1.5, 1);
      this.group.add(this.nightLanternGlow);
    }
  }

  public update(dt: number, elapsed: number, nightFactor: number, island: Island, frozen: boolean): void {
    this.group.visible = !this.hiddenDuringCafe;
    if (this.hiddenDuringCafe) return;

    if (this.nightLanternGlow) {
      const mat = this.nightLanternGlow.material as THREE.SpriteMaterial;
      mat.opacity = this.def.id === 'may' ? 0.25 + nightFactor * 0.5 : nightFactor * 0.75;
    }

    const floatY = this.def.id === 'may' ? Math.sin(elapsed * 2.8) * 0.12 + 0.12 : 0;

    if (frozen) {
      this.setFrame('down', 4);
      this.syncSnappedPosition(floatY);
      return;
    }

    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      this.animTimer += dt * 2.0;
      this.setFrame(this.direction, 4 + (Math.floor(this.animTimer) % 2));
      this.syncSnappedPosition(floatY);
      return;
    }

    const target = this.def.patrolPoints[this.patrolIdx % this.def.patrolPoints.length];
    const dx = target.x - this.x;
    const dz = target.z - this.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.15) {
      this.patrolIdx = (this.patrolIdx + 1) % this.def.patrolPoints.length;
      this.waitTimer = 2.0 + Math.random() * 2.0;
    } else {
      const speed = 1.25;
      const nx = this.x + (dx / dist) * speed * dt;
      const nz = this.z + (dz / dist) * speed * dt;
      if (!island.isBlocked(nx, nz, 0.28)) {
        this.x = nx;
        this.z = nz;
      } else {
        this.patrolIdx = (this.patrolIdx + 1) % this.def.patrolPoints.length;
        this.waitTimer = 1.2;
      }

      if (Math.abs(dx) > Math.abs(dz)) {
        this.direction = dx > 0 ? 'right' : 'left';
      } else {
        this.direction = dz > 0 ? 'down' : 'up';
      }
      this.animTimer += dt * 6;
      this.setFrame(this.direction, Math.floor(this.animTimer) % 4);
    }

    this.syncSnappedPosition(floatY);
  }
}

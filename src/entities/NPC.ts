import * as THREE from 'three';
import { pixelArt } from '../art/pixelArtGenerator';
import { NpcDef, NpcScheduleKey, WeatherType } from '../data/types';
import { Island } from '../world/Island';
import { BillboardSprite } from './BillboardSprite';

export class NPCEntity extends BillboardSprite {
  public readonly def: NpcDef;
  private patrolIdx = 0;
  private waitTimer = 1.2;
  private animTimer = 0;
  private stuckTimer = 0;
  private currentScheduleKey: NpcScheduleKey = 'morning';
  private isTransitioningSchedule = false;
  private nightLanternGlow: THREE.Sprite | null = null;
  public hiddenDuringCafe = false;

  constructor(def: NpcDef) {
    super(`char_${def.id}`, 16, 32, 0.85);
    this.def = def;
    this.x = def.homePos.x;
    this.z = def.homePos.z;
    this.syncSnappedPosition();

    // Đèn bão trên tay Ông Đăng & ánh sáng nhỏ của Mây phát sáng ban đêm
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

  public static resolveScheduleKey(timeMinutes: number, weather: WeatherType): NpcScheduleKey {
    if (weather === 'rainy') return 'rainy';
    if (timeMinutes < 720) return 'morning'; // 06:00 - 11:59
    if (timeMinutes < 1080) return 'afternoon'; // 12:00 - 17:59
    return 'evening'; // 18:00 - 24:00
  }

  public getCurrentScheduleLabel(): string {
    return this.def.schedule[this.currentScheduleKey].label;
  }

  public syncToSchedule(timeMinutes: number, weather: WeatherType): void {
    const key = NPCEntity.resolveScheduleKey(timeMinutes, weather);
    this.currentScheduleKey = key;
    this.isTransitioningSchedule = false;
    this.patrolIdx = 0;
    this.waitTimer = 1.0;
    this.stuckTimer = 0;
    const pts = this.def.schedule[key].points;
    if (pts.length > 0) {
      this.x = pts[0].x;
      this.z = pts[0].z;
      this.direction = 'down';
      const floatY = this.def.id === 'may' ? 0.12 : 0;
      this.syncSnappedPosition(floatY);
    }
  }

  public update(
    dt: number,
    elapsed: number,
    nightFactor: number,
    island: Island,
    frozen: boolean,
    timeMinutes = 480,
    weather: WeatherType = 'sunny'
  ): void {
    const targetSchedule = NPCEntity.resolveScheduleKey(timeMinutes, weather);
    if (targetSchedule !== this.currentScheduleKey) {
      this.currentScheduleKey = targetSchedule;
      this.patrolIdx = 0;
      this.waitTimer = 0;
      this.stuckTimer = 0;
      this.isTransitioningSchedule = true;
    }

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

    const points = this.def.schedule[this.currentScheduleKey].points;
    const target = points[this.patrolIdx % points.length];
    const dx = target.x - this.x;
    const dz = target.z - this.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.16) {
      this.isTransitioningSchedule = false;
      this.stuckTimer = 0;
      this.patrolIdx = (this.patrolIdx + 1) % points.length;
      this.waitTimer = 2.0 + Math.random() * 2.0;
    } else {
      const speed = this.isTransitioningSchedule ? 1.65 : 1.15;
      const nx = this.x + (dx / dist) * speed * dt;
      const nz = this.z + (dz / dist) * speed * dt;
      let moved = false;

      if (!island.isBlocked(nx, this.z, 0.26)) {
        this.x = nx;
        moved = true;
      }
      if (!island.isBlocked(this.x, nz, 0.26)) {
        this.z = nz;
        moved = true;
      }

      if (!moved) {
        this.stuckTimer += dt;
        if (this.stuckTimer > 0.8) {
          this.stuckTimer = 0;
          this.patrolIdx = (this.patrolIdx + 1) % points.length;
          this.waitTimer = 0.6;
        }
      } else {
        this.stuckTimer = 0;
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

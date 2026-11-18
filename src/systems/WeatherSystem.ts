import * as THREE from 'three';
import { PALETTE } from '../art/palette';
import { WeatherType } from '../data/types';

interface BurstParticle {
  mesh: THREE.Sprite;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export class WeatherSystem {
  public readonly group = new THREE.Group();
  public currentWeather: WeatherType = 'sunny';

  private rainGroup = new THREE.Group();
  private rainDrops: THREE.Mesh[] = [];

  private fireflyGroup = new THREE.Group();
  private fireflies: { mesh: THREE.Mesh; baseX: number; baseY: number; baseZ: number; phase: number }[] = [];

  private petalGroup = new THREE.Group();
  private petals: { mesh: THREE.Mesh; baseX: number; phase: number }[] = [];

  private butterflies: { mesh: THREE.Mesh; cx: number; cz: number; phase: number }[] = [];
  private bursts: BurstParticle[] = [];

  constructor(initialWeather: WeatherType) {
    this.currentWeather = initialWeather;
    this.buildRain();
    this.buildFireflies();
    this.buildPetalsAndButterflies();
  }

  private buildRain(): void {
    const geo = new THREE.PlaneGeometry(0.05, 0.32);
    const mat = new THREE.MeshBasicMaterial({
      color: PALETTE.waterLight,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 95; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set((Math.random() - 0.5) * 26, Math.random() * 10 + 1, (Math.random() - 0.5) * 18);
      m.rotation.z = -0.22; // Hạt mưa xiên pixel
      this.rainDrops.push(m);
      this.rainGroup.add(m);
    }
    this.group.add(this.rainGroup);
  }

  private buildFireflies(): void {
    const geo = new THREE.PlaneGeometry(0.11, 0.11);
    for (let i = 0; i < 22; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: PALETTE.amberGold,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(geo, mat);
      const bx = (Math.random() - 0.5) * 22;
      const by = 0.5 + Math.random() * 1.4;
      const bz = (Math.random() - 0.5) * 13;
      m.position.set(bx, by, bz);
      this.fireflies.push({ mesh: m, baseX: bx, baseY: by, baseZ: bz, phase: i * 0.8 });
      this.fireflyGroup.add(m);
    }
    this.group.add(this.fireflyGroup);
  }

  private buildPetalsAndButterflies(): void {
    const petalGeo = new THREE.PlaneGeometry(0.1, 0.1);
    const petalMat = new THREE.MeshBasicMaterial({ color: PALETTE.sakuraPink, side: THREE.DoubleSide });
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(petalGeo, petalMat);
      const bx = (Math.random() - 0.5) * 22;
      m.position.set(bx, 1 + Math.random() * 4, (Math.random() - 0.5) * 14);
      this.petals.push({ mesh: m, baseX: bx, phase: i * 1.1 });
      this.petalGroup.add(m);
    }
    this.group.add(this.petalGroup);

    const bfGeo = new THREE.PlaneGeometry(0.14, 0.1);
    for (let i = 0; i < 5; i++) {
      const bfMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? PALETTE.amberGold : PALETTE.whiteWarm,
        side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(bfGeo, bfMat);
      const cx = -8 + i * 3.8;
      const cz = -2 + (i % 3) * 2.5;
      m.position.set(cx, 0.9, cz);
      this.butterflies.push({ mesh: m, cx, cz, phase: i * 1.7 });
      this.group.add(m);
    }
  }

  public rollWeatherForNewDay(): WeatherType {
    const r = Math.random();
    if (r < 0.56) this.currentWeather = 'sunny';
    else if (r < 0.8) this.currentWeather = 'rainy';
    else this.currentWeather = 'foggy';
    return this.currentWeather;
  }

  public getWeatherLabel(): string {
    switch (this.currentWeather) {
      case 'sunny':
        return 'Nắng ấm';
      case 'rainy':
        return 'Mưa nhẹ';
      case 'foggy':
        return 'Sương mù';
    }
  }

  public spawnBurst(x: number, y: number, z: number, color: string, count = 6): void {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({ color, transparent: true, opacity: 1 });
      const sp = new THREE.Sprite(mat);
      sp.position.set(x, y, z);
      sp.scale.set(0.14, 0.14, 1);
      this.group.add(sp);
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      this.bursts.push({
        mesh: sp,
        vx: Math.cos(angle) * (1.2 + Math.random() * 0.9),
        vy: 1.8 + Math.random() * 1.4,
        vz: Math.sin(angle) * (1.2 + Math.random() * 0.9),
        life: 0,
        maxLife: 0.45 + Math.random() * 0.2,
      });
    }
  }

  public update(dt: number, elapsed: number, nightFactor: number): void {
    const isRain = this.currentWeather === 'rainy';
    this.rainGroup.visible = isRain;
    if (isRain) {
      for (const drop of this.rainDrops) {
        drop.position.y -= dt * 11.5;
        drop.position.x -= dt * 2.5;
        if (drop.position.y < 0.1) {
          drop.position.y = 9.5;
          drop.position.x = (Math.random() - 0.5) * 26;
        }
      }
    }

    // Đom đóm chỉ hiện từ hoàng hôn -> đêm
    this.fireflyGroup.visible = nightFactor > 0.35 && !isRain;
    if (this.fireflyGroup.visible) {
      for (const f of this.fireflies) {
        f.mesh.position.x = f.baseX + Math.sin(elapsed * 1.4 + f.phase) * 0.65;
        f.mesh.position.y = f.baseY + Math.sin(elapsed * 2.1 + f.phase) * 0.25;
        f.mesh.position.z = f.baseZ + Math.cos(elapsed * 1.2 + f.phase) * 0.55;
        const m = f.mesh.material as THREE.MeshBasicMaterial;
        m.opacity = (0.4 + 0.6 * Math.abs(Math.sin(elapsed * 3.5 + f.phase))) * nightFactor;
      }
    }

    // Cánh hoa rơi & bướm ban ngày
    this.petalGroup.visible = !isRain;
    if (!isRain) {
      for (const p of this.petals) {
        p.mesh.position.y -= dt * 0.65;
        p.mesh.position.x = p.baseX + Math.sin(elapsed * 1.5 + p.phase) * 0.55;
        if (p.mesh.position.y < 0.05) {
          p.mesh.position.y = 4.6;
        }
      }
    }

    for (const bf of this.butterflies) {
      bf.mesh.visible = !isRain && nightFactor < 0.5;
      if (bf.mesh.visible) {
        bf.mesh.position.x = bf.cx + Math.cos(elapsed * 1.1 + bf.phase) * 1.2;
        bf.mesh.position.z = bf.cz + Math.sin(elapsed * 1.6 + bf.phase) * 0.9;
        bf.mesh.position.y = 0.85 + Math.sin(elapsed * 5 + bf.phase) * 0.15;
        bf.mesh.scale.x = 0.7 + Math.abs(Math.sin(elapsed * 14 + bf.phase)) * 0.7;
      }
    }

    // Burst hạt khi cuốc / tưới / thu hoạch
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life += dt;
      if (b.life >= b.maxLife) {
        this.group.remove(b.mesh);
        b.mesh.material.dispose();
        this.bursts.splice(i, 1);
        continue;
      }
      b.vy -= dt * 6.5;
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.y = Math.max(0.05, b.mesh.position.y + b.vy * dt);
      b.mesh.position.z += b.vz * dt;
      b.mesh.material.opacity = 1 - b.life / b.maxLife;
    }
  }
}

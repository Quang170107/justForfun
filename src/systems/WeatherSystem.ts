import * as THREE from 'three';
import { PALETTE } from '../art/palette';
import { pixelArt } from '../art/pixelArtGenerator';
import { rollRandomWeather, WEATHER_CONFIG } from '../data/weather';
import { WeatherType } from '../data/types';

interface BurstParticle {
  mesh: THREE.Sprite;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  life: number;
  maxLife: number;
}

interface RippleParticle {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  phase: number;
}

interface ScenicPuddle {
  puddle: THREE.Mesh;
  ripple: THREE.Mesh;
  rippleMat: THREE.MeshBasicMaterial;
  phase: number;
}

interface SkyBird {
  sprite: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  phase: number;
}

const MAX_BURST_PARTICLES = 60;

export class WeatherSystem {
  public readonly group = new THREE.Group();
  public currentWeather: WeatherType = 'sunny';
  public tomorrowWeather: WeatherType = 'sunny';

  private rainGroup = new THREE.Group();
  private rainDrops: THREE.Mesh[] = [];
  private rainRipples: RippleParticle[] = [];
  private scenicPuddles: ScenicPuddle[] = [];

  private fogWispGroup = new THREE.Group();
  private fogWisps: { sprite: THREE.Sprite; mat: THREE.SpriteMaterial; baseX: number; baseY: number; baseZ: number; speed: number; phase: number }[] = [];

  private fireflyGroup = new THREE.Group();
  private fireflies: { mesh: THREE.Mesh; baseX: number; baseY: number; baseZ: number; phase: number }[] = [];

  private petalGroup = new THREE.Group();
  private petals: { mesh: THREE.Mesh; baseX: number; phase: number }[] = [];

  private butterflies: { mesh: THREE.Mesh; cx: number; cz: number; phase: number }[] = [];
  private birds: SkyBird[] = [];
  private bursts: BurstParticle[] = [];
  private skyLanterns: { sprite: THREE.Sprite; vy: number; baseX: number; phase: number }[] = [];

  constructor(initialWeather: WeatherType, initialTomorrowWeather?: WeatherType) {
    this.currentWeather = initialWeather;
    this.tomorrowWeather = initialTomorrowWeather ?? rollRandomWeather();
    this.buildRainAndPuddles();
    this.buildFogWisps();
    this.buildFireflies();
    this.buildPetalsAndButterflies();
    this.buildBirds();
  }

  private buildRainAndPuddles(): void {
    const geo = new THREE.PlaneGeometry(0.05, 0.34);
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

    // Gợn sóng giọt mưa chạm đất (tái sử dụng pool, không cấp phát trong update)
    const rippleGeo = new THREE.PlaneGeometry(0.45, 0.34);
    rippleGeo.rotateX(-Math.PI / 2);
    const rippleTex = pixelArt.getTexture('prop_puddle_ripple');
    for (let i = 0; i < 14; i++) {
      const rMat = new THREE.MeshBasicMaterial({
        map: rippleTex,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      });
      const rMesh = new THREE.Mesh(rippleGeo, rMat);
      rMesh.position.set(-9.5 + ((i * 3.7) % 19), 0.032, -3.5 + ((i * 2.9) % 9.5));
      this.rainRipples.push({ mesh: rMesh, mat: rMat, phase: (i * 0.27) % 1 });
      this.rainGroup.add(rMesh);
    }

    // 4 vũng nước gợn sóng ngoài sân/lối đi (tránh va chạm với cây trồng)
    const puddleGeo = new THREE.PlaneGeometry(0.75, 0.55);
    puddleGeo.rotateX(-Math.PI / 2);
    const puddleMat = new THREE.MeshBasicMaterial({
      map: pixelArt.getTexture('prop_puddle'),
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    const puddleCoords: [number, number][] = [
      [-5.5, -2.5],
      [-0.5, -2.5],
      [1.2, 1.5],
      [4.5, 4.2],
    ];
    puddleCoords.forEach(([px, pz], idx) => {
      const puddle = new THREE.Mesh(puddleGeo, puddleMat);
      puddle.position.set(px, 0.028, pz);
      this.rainGroup.add(puddle);

      const rMat = new THREE.MeshBasicMaterial({
        map: rippleTex,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      const ripple = new THREE.Mesh(puddleGeo, rMat);
      ripple.position.set(px, 0.031, pz);
      this.rainGroup.add(ripple);

      this.scenicPuddles.push({ puddle, ripple, rippleMat: rMat, phase: idx * 0.31 });
    });

    this.group.add(this.rainGroup);
  }

  private buildFogWisps(): void {
    const tex = pixelArt.getTexture('cloud_tuft');
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        color: PALETTE.cloudWhite,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const baseX = -11 + (i * 2.45);
      const baseY = 0.38 + (i % 3) * 0.22;
      const baseZ = -4.5 + ((i * 3.1) % 10.5);
      sprite.position.set(baseX, baseY, baseZ);
      const w = 2.6 + (i % 3) * 0.8;
      sprite.scale.set(w, w * 0.45, 1);
      this.fogWispGroup.add(sprite);
      this.fogWisps.push({
        sprite,
        mat,
        baseX,
        baseY,
        baseZ,
        speed: 0.32 + (i % 4) * 0.1,
        phase: i * 0.9,
      });
    }
    this.group.add(this.fogWispGroup);
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

  private buildBirds(): void {
    const tex0 = pixelArt.getTexture('prop_bird_0');
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex0,
        transparent: true,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const x = -12 + i * 9;
      const y = 4.6 + (i % 2) * 0.9;
      const z = -4.5 + i * 3.4;
      sprite.position.set(x, y, z);
      sprite.scale.set(0.75, 0.5, 1);
      this.group.add(sprite);
      this.birds.push({
        sprite,
        mat,
        x,
        y,
        z,
        vx: 1.55 + i * 0.22,
        vz: 0.25 + (i % 2) * 0.15,
        phase: i * 1.4,
      });
    }
  }

  public rollWeatherForNewDay(): WeatherType {
    this.currentWeather = this.tomorrowWeather;
    this.tomorrowWeather = rollRandomWeather();
    return this.currentWeather;
  }

  public getWeatherLabel(w: WeatherType = this.currentWeather): string {
    return WEATHER_CONFIG[w].label;
  }

  public getTomorrowWeatherLabel(): string {
    return WEATHER_CONFIG[this.tomorrowWeather].label;
  }

  private pushBurstParticle(
    sprite: THREE.Sprite,
    vx: number,
    vy: number,
    vz: number,
    gravity: number,
    maxLife: number
  ): void {
    if (this.bursts.length >= MAX_BURST_PARTICLES) {
      const oldest = this.bursts.shift()!;
      this.group.remove(oldest.mesh);
      oldest.mesh.material.dispose();
    }
    this.group.add(sprite);
    this.bursts.push({ mesh: sprite, vx, vy, vz, gravity, life: 0, maxLife });
  }

  public spawnBurst(x: number, y: number, z: number, color: string, count = 6): void {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({ color, transparent: true, opacity: 1 });
      const sp = new THREE.Sprite(mat);
      sp.position.set(x, y, z);
      sp.scale.set(0.14, 0.14, 1);
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      this.pushBurstParticle(
        sp,
        Math.cos(angle) * (1.2 + Math.random() * 0.9),
        1.8 + Math.random() * 1.4,
        Math.sin(angle) * (1.2 + Math.random() * 0.9),
        6.5,
        0.45 + Math.random() * 0.2
      );
    }
  }

  public spawnSparkleBurst(x: number, y: number, z: number, count = 12): void {
    const tex = pixelArt.getTexture('sparkle_pixel');
    const colors = [PALETTE.amberGold, PALETTE.sakuraPink, PALETTE.whiteWarm];
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        color: colors[i % colors.length],
        transparent: true,
        opacity: 1,
        depthWrite: false,
      });
      const sp = new THREE.Sprite(mat);
      sp.position.set(x + (Math.random() - 0.5) * 0.3, y, z + (Math.random() - 0.5) * 0.3);
      sp.scale.set(0.28, 0.28, 1);
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.35;
      this.pushBurstParticle(
        sp,
        Math.cos(angle) * (0.9 + Math.random() * 0.7),
        1.6 + Math.random() * 1.2,
        Math.sin(angle) * (0.9 + Math.random() * 0.7),
        2.2,
        0.85 + Math.random() * 0.25
      );
    }
  }

  public getActiveParticleCount(): number {
    let count = this.bursts.length;
    if (this.rainGroup.visible) {
      count += this.rainDrops.length + this.rainRipples.length + this.scenicPuddles.length * 2;
    }
    if (this.fogWispGroup.visible) {
      count += this.fogWisps.length;
    }
    if (this.fireflyGroup.visible) {
      count += this.fireflies.length;
    }
    if (this.petalGroup.visible) {
      count += this.petals.length;
    }
    for (const bf of this.butterflies) {
      if (bf.mesh.visible) count += 1;
    }
    for (const b of this.birds) {
      if (b.sprite.visible) count += 1;
    }
    count += this.skyLanterns.length;
    return count;
  }

  public clearSkyLanterns(): void {
    for (const l of this.skyLanterns) {
      this.group.remove(l.sprite);
      l.sprite.material.dispose();
    }
    this.skyLanterns = [];
  }

  public spawnSkyLanterns(count = 16): void {
    const tex = pixelArt.getTexture('prop_sky_lantern');
    for (let i = 0; i < count; i++) {
      if (this.skyLanterns.length >= 20) {
        const oldest = this.skyLanterns.shift()!;
        this.group.remove(oldest.sprite);
        oldest.sprite.material.dispose();
      }
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      const sp = new THREE.Sprite(mat);
      const bx = 2.0 + Math.random() * 7.5;
      const bz = -1.0 + Math.random() * 6.0;
      const by = 0.6 + Math.random() * 2.2;
      sp.position.set(bx, by, bz);
      sp.scale.set(0.55, 0.72, 1);
      this.group.add(sp);
      this.skyLanterns.push({
        sprite: sp,
        vy: 0.55 + Math.random() * 0.45,
        baseX: bx,
        phase: Math.random() * 6.28,
      });
    }
  }

  public update(dt: number, elapsed: number, nightFactor: number): void {
    const isRain = this.currentWeather === 'rainy';
    const isFog = this.currentWeather === 'foggy';

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

      for (const rp of this.rainRipples) {
        rp.phase = (rp.phase + dt * 1.45) % 1;
        const sc = 0.35 + rp.phase * 1.05;
        rp.mesh.scale.set(sc, sc, 1);
        rp.mat.opacity = (1 - rp.phase) * 0.78;
      }

      for (const p of this.scenicPuddles) {
        p.phase = (p.phase + dt * 0.9) % 1;
        const sc = 0.45 + p.phase * 0.75;
        p.ripple.scale.set(sc, sc, 1);
        p.rippleMat.opacity = (1 - p.phase) * 0.72;
      }
    }

    this.fogWispGroup.visible = isFog;
    if (isFog) {
      const fogNightShade = 1 - nightFactor * 0.45;
      for (const w of this.fogWisps) {
        w.sprite.position.x += w.speed * dt;
        if (w.sprite.position.x > 13.5) {
          w.sprite.position.x = -13.5;
        }
        w.sprite.position.y = w.baseY + Math.sin(elapsed * 0.8 + w.phase) * 0.12;
        w.mat.opacity = (0.2 + Math.sin(elapsed * 0.7 + w.phase) * 0.08) * (0.7 + fogNightShade * 0.3);
      }
    }

    // Đom đóm chỉ hiện từ hoàng hôn -> đêm (tạnh mưa)
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

    // Chim bay ngang bầu trời ban ngày tạnh ráo
    const showBirds = !isRain && nightFactor < 0.45;
    const flapFrame = Math.floor(elapsed * 4.5) % 2 === 0 ? 'prop_bird_0' : 'prop_bird_1';
    const birdTex = pixelArt.getTexture(flapFrame);
    for (const b of this.birds) {
      b.sprite.visible = showBirds;
      if (!showBirds) continue;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      if (b.x > 16) {
        b.x = -16;
        b.z = -5 + Math.random() * 10;
      }
      if (b.z > 8) b.z = -7;
      b.sprite.position.set(b.x, b.y + Math.sin(elapsed * 2.2 + b.phase) * 0.25, b.z);
      if (b.mat.map !== birdTex) {
        b.mat.map = birdTex;
        b.mat.needsUpdate = true;
      }
    }

    // Burst hạt khi cuốc / tưới / thu hoạch / mốc tim
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life += dt;
      if (b.life >= b.maxLife) {
        this.group.remove(b.mesh);
        b.mesh.material.dispose();
        this.bursts.splice(i, 1);
        continue;
      }
      b.vy -= dt * b.gravity;
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.y = Math.max(0.05, b.mesh.position.y + b.vy * dt);
      b.mesh.position.z += b.vz * dt;
      b.mesh.material.opacity = 1 - b.life / b.maxLife;
    }

    // Đèn trời thả bay lên vào Lễ Thả Đèn Mây Ngày 24
    for (let i = this.skyLanterns.length - 1; i >= 0; i--) {
      const l = this.skyLanterns[i];
      l.sprite.position.y += l.vy * dt;
      l.sprite.position.x = l.baseX + Math.sin(elapsed * 1.1 + l.phase) * 0.45;
      if (l.sprite.position.y > 14) {
        this.group.remove(l.sprite);
        l.sprite.material.dispose();
        this.skyLanterns.splice(i, 1);
      } else if (l.sprite.position.y > 10.5) {
        l.sprite.material.opacity = Math.max(0, 1 - (l.sprite.position.y - 10.5) / 3.5);
      }
    }
  }
}

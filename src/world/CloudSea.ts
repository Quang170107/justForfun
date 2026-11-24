import * as THREE from 'three';
import { PALETTE } from '../art/palette';
import { enableShadows, toonMaterials } from '../art/toonMaterials';

interface CloudCluster {
  group: THREE.Group;
  baseX: number;
  baseY: number;
  speed: number;
  amp: number;
  phase: number;
}

interface FloatingIslet {
  group: THREE.Group;
  baseY: number;
  phase: number;
}

export class CloudSea {
  public readonly group = new THREE.Group();
  private skyUniforms: {
    uTopColor: { value: THREE.Color };
    uHorizonColor: { value: THREE.Color };
    uSunDir: { value: THREE.Vector3 };
    uNightFactor: { value: number };
    uTime: { value: number };
  };
  private seaUniforms: {
    uTime: { value: number };
    uFogLevel: { value: number };
    uNightFactor: { value: number };
  };
  private cloudMat: THREE.MeshToonMaterial;
  private cloudClusters: CloudCluster[] = [];
  private distantIslets: FloatingIslet[] = [];
  private fogVeilMesh: THREE.Mesh;
  private readonly fogDayColor = new THREE.Color(PALETTE.cloudWhite);
  private readonly fogNightColor = new THREE.Color('#4a4778');
  private readonly cloudDayColor = new THREE.Color(PALETTE.cloudWhite);
  private readonly cloudNightColor = new THREE.Color('#666199');

  constructor() {
    // 1. Vòm trời Ghibli chuyển sắc theo thời gian + mặt trời / sao đêm
    this.skyUniforms = {
      uTopColor: { value: new THREE.Color(PALETTE.skyDeep) },
      uHorizonColor: { value: new THREE.Color('#d9e6fa') },
      uSunDir: { value: new THREE.Vector3(-0.4, 0.8, 0.4).normalize() },
      uNightFactor: { value: 0 },
      uTime: { value: 0 },
    };

    const skyGeo = new THREE.SphereGeometry(125, 32, 24);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunDir;
        uniform float uNightFactor;
        uniform float uTime;
        varying vec3 vDir;
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        void main() {
          float h = clamp(vDir.y * 0.85 + 0.18, 0.0, 1.0);
          vec3 col = mix(uHorizonColor, uTopColor, pow(h, 0.72));

          float sunDot = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
          float halo = pow(sunDot, 10.0) * 0.35;
          float disc = smoothstep(0.9965, 0.9988, sunDot);
          vec3 sunTint = mix(vec3(1.0, 0.92, 0.72), vec3(0.88, 0.92, 1.0), uNightFactor);
          col += sunTint * (halo * (1.0 - uNightFactor * 0.55) + disc * 0.85);

          if (uNightFactor > 0.25 && vDir.y > 0.08) {
            vec2 starCell = floor(vDir.xz / max(0.15, vDir.y + 0.2) * 38.0);
            float r = hash(starCell);
            if (r > 0.965) {
              float twinkle = 0.55 + 0.45 * sin(uTime * 2.5 + r * 40.0);
              col += vec3(0.98, 0.95, 0.86) * twinkle * (uNightFactor - 0.25) * 1.1;
            }
          }
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.group.add(skyDome);

    // 2. Biển mây Ghibli gợn sóng êm ả bên dưới hòn đảo
    this.seaUniforms = {
      uTime: { value: 0 },
      uFogLevel: { value: 0 },
      uNightFactor: { value: 0 },
    };

    const seaGeo = new THREE.PlaneGeometry(180, 180, 64, 64);
    seaGeo.rotateX(-Math.PI / 2);

    const seaMat = new THREE.ShaderMaterial({
      uniforms: this.seaUniforms,
      vertexShader: `
        uniform float uTime;
        varying vec2 vWorldXZ;
        varying float vWave;
        void main() {
          vec3 pos = position;
          float wave = sin(pos.x * 0.14 + uTime * 0.38) * 0.42
                     + cos(pos.z * 0.17 - uTime * 0.28) * 0.36
                     + sin((pos.x + pos.z) * 0.09 + uTime * 0.22) * 0.25;
          pos.y += wave;
          vWave = wave;
          vWorldXZ = pos.xz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uFogLevel;
        uniform float uNightFactor;
        varying vec2 vWorldXZ;
        varying float vWave;
        void main() {
          vec2 p = vWorldXZ * 0.16 + vec2(uTime * 0.09, uTime * 0.04);
          float billow = sin(p.x * 1.8) * cos(p.y * 1.5) + sin((p.x + p.y) * 1.15) * 0.65;
          float band = smoothstep(-0.7, 0.95, billow + vWave * 0.45);

          vec3 cDeep = vec3(0.561, 0.659, 0.878);   // #8fa8e0
          vec3 cSky  = vec3(0.718, 0.788, 0.941);   // #b7c9f0
          vec3 cPink = vec3(0.910, 0.835, 0.910);   // #e8d5e8
          vec3 cWht  = vec3(0.976, 0.941, 0.902);   // #f9f0e6

          vec3 col = mix(cDeep, cSky, smoothstep(0.0, 0.45, band));
          col = mix(col, cPink, smoothstep(0.4, 0.78, band));
          col = mix(col, cWht, smoothstep(0.72, 1.0, band));

          vec3 nightTint = vec3(0.24, 0.22, 0.42);
          col = mix(col, col * 0.45 + nightTint * 0.55, uNightFactor * 0.85);
          col = mix(col, cWht, uFogLevel * 0.28 * (1.0 - uNightFactor * 0.6));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    const seaMesh = new THREE.Mesh(seaGeo, seaMat);
    seaMesh.position.y = -3.6;
    this.group.add(seaMesh);

    // 3. Màn sương mù dâng quanh vách đảo
    const veilGeo = new THREE.PlaneGeometry(120, 120);
    veilGeo.rotateX(-Math.PI / 2);
    const veilMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(PALETTE.cloudWhite),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.fogVeilMesh = new THREE.Mesh(veilGeo, veilMat);
    this.fogVeilMesh.position.y = -0.5;
    this.group.add(this.fogVeilMesh);

    // 4. 36 cụm mây 3D bồng bềnh quanh đảo
    this.cloudMat = toonMaterials.createToonMaterial({
      color: PALETTE.cloudWhite,
    });
    const puffGeo = new THREE.IcosahedronGeometry(1, 1);

    for (let i = 0; i < 36; i++) {
      const cluster = new THREE.Group();
      const puffCount = 3 + (i % 3);
      for (let p = 0; p < puffCount; p++) {
        const mesh = new THREE.Mesh(puffGeo, this.cloudMat);
        const ox = (p - (puffCount - 1) * 0.5) * 1.15;
        const oy = p === 1 ? 0.35 : 0;
        const oz = ((p + i) % 2 === 0 ? 0.28 : -0.24);
        const rad = p === 1 ? 1.25 : 0.92;
        mesh.position.set(ox, oy, oz);
        mesh.scale.set(rad * 1.25, rad * 0.72, rad);
        cluster.add(mesh);
      }

      const ring = i % 4;
      let baseX = 0;
      let baseZ = 0;
      let baseY = -1.6;
      if (ring === 0) {
        baseX = -32 + ((i * 6.7) % 64);
        baseZ = 10.2 + (i % 4) * 3.4;
        baseY = -1.0 - (i % 3) * 0.45;
      } else if (ring === 1) {
        baseX = -32 + ((i * 6.1) % 64);
        baseZ = -10.8 - (i % 4) * 3.5;
        baseY = -1.7 - (i % 3) * 0.4;
      } else if (ring === 2) {
        baseX = -16.8 - (i % 4) * 3.6;
        baseZ = -13 + ((i * 4.9) % 26);
        baseY = -1.35 - (i % 3) * 0.45;
      } else {
        baseX = 16.8 + (i % 4) * 3.6;
        baseZ = -13 + ((i * 5.3) % 26);
        baseY = -1.35 - (i % 3) * 0.45;
      }

      const sc = ring === 0 ? 0.85 : 1.05;
      baseY = Math.min(baseY, -2.15);
      cluster.scale.setScalar(sc);
      cluster.position.set(baseX, baseY, baseZ);
      this.group.add(cluster);
      this.cloudClusters.push({
        group: cluster,
        baseX,
        baseY,
        speed: 0.28 + (i % 5) * 0.11,
        amp: 0.16 + (i % 3) * 0.06,
        phase: i * 0.7,
      });
    }

    // 5. 6 Đảo bay nhỏ ở chân trời tạo chiều sâu thế giới rộng mở
    this.buildDistantFloatingIslets();
  }

  private buildDistantFloatingIslets(): void {
    const spots = [
      { x: -24, y: 1.4, z: -18, s: 1.15, sakura: true },
      { x: 22, y: 2.2, z: -16, s: 1.35, sakura: false },
      { x: -28, y: -0.2, z: 4, s: 0.95, sakura: false },
      { x: 26, y: 0.6, z: 7, s: 1.05, sakura: true },
      { x: -4, y: 3.1, z: -24, s: 1.4, sakura: true },
      { x: 13, y: -0.6, z: 19, s: 0.9, sakura: false },
    ];

    const grassMat = toonMaterials.getSolidToon(PALETTE.grassMid);
    const rockMat = toonMaterials.getSolidToon(PALETTE.soilMid);
    const trunkMat = toonMaterials.getSolidToon(PALETTE.woodDark);
    const pineMat = toonMaterials.getSolidToon(PALETTE.grassDark);
    const sakuraMat = toonMaterials.getSolidToon(PALETTE.sakuraPink);
    const fallMat = toonMaterials.createToonMaterial({
      color: PALETTE.waterLight,
      transparent: true,
      opacity: 0.82,
    });

    spots.forEach((sp, idx) => {
      const g = new THREE.Group();
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.9, 0.5, 7), grassMat);
      g.add(cap);

      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.9, 2.7, 7), rockMat);
      cone.rotation.x = Math.PI;
      cone.position.y = -1.6;
      g.add(cone);

      // Cây nhỏ trên đảo xa
      for (let t = 0; t < 2; t++) {
        const tx = t === 0 ? -0.55 : 0.65;
        const tz = t === 0 ? 0.25 : -0.35;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.8, 5), trunkMat);
        trunk.position.set(tx, 0.6, tz);
        g.add(trunk);

        if (sp.sakura || t === 1) {
          const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), sp.sakura ? sakuraMat : pineMat);
          crown.position.set(tx, 1.2, tz);
          g.add(crown);
        } else {
          const coneT = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.25, 6), pineMat);
          coneT.position.set(tx, 1.25, tz);
          g.add(coneT);
        }
      }

      // Thác mây mảnh đổ xuống biển mây
      const waterfall = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.8, 0.14), fallMat);
      waterfall.position.set(0.3, -1.25, 1.45);
      g.add(waterfall);

      enableShadows(g, false, false);
      g.position.set(sp.x, sp.y, sp.z);
      g.scale.setScalar(sp.s);
      this.group.add(g);
      this.distantIslets.push({ group: g, baseY: sp.y, phase: idx * 1.1 });
    });
  }

  public update(
    elapsed: number,
    dt: number,
    fogStrength: number,
    nightFactor = 0,
    skyTopColor?: THREE.Color,
    skyHorizonColor?: THREE.Color,
    sunDirection?: THREE.Vector3
  ): void {
    this.skyUniforms.uTime.value = elapsed;
    this.skyUniforms.uNightFactor.value = nightFactor;
    if (skyTopColor) this.skyUniforms.uTopColor.value.copy(skyTopColor);
    if (skyHorizonColor) this.skyUniforms.uHorizonColor.value.copy(skyHorizonColor);
    if (sunDirection) this.skyUniforms.uSunDir.value.copy(sunDirection);

    this.seaUniforms.uTime.value = elapsed;
    this.seaUniforms.uFogLevel.value = fogStrength;
    this.seaUniforms.uNightFactor.value = nightFactor;

    this.cloudMat.color.lerpColors(this.cloudDayColor, this.cloudNightColor, nightFactor * 0.72);

    const veilMat = this.fogVeilMesh.material as THREE.MeshBasicMaterial;
    veilMat.opacity = THREE.MathUtils.lerp(veilMat.opacity, fogStrength * 0.35, Math.min(1, dt * 2.2));
    veilMat.color.lerpColors(this.fogDayColor, this.fogNightColor, nightFactor * 0.85);
    this.fogVeilMesh.position.y = THREE.MathUtils.lerp(-1.2, -0.08, fogStrength);

    for (const c of this.cloudClusters) {
      c.group.position.x += c.speed * dt;
      if (c.group.position.x > 36) {
        c.group.position.x = -36;
      }
      const outsideIsland =
        Math.abs(c.group.position.x) > 15.2 || Math.abs(c.group.position.z) > 10.2;
      const fogLift = outsideIsland ? fogStrength * 0.9 : 0;
      c.group.position.y = c.baseY + fogLift + Math.sin(elapsed * 0.75 + c.phase) * c.amp;
    }

    for (const isl of this.distantIslets) {
      isl.group.position.y = isl.baseY + Math.sin(elapsed * 0.55 + isl.phase) * 0.22;
    }
  }
}

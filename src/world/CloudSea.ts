import * as THREE from 'three';
import { PALETTE } from '../art/palette';
import { pixelArt } from '../art/pixelArtGenerator';

export class CloudSea {
  public readonly group = new THREE.Group();
  private seaUniforms: { uTime: { value: number }; uFogLevel: { value: number } };
  private tufts: { sprite: THREE.Sprite; baseX: number; baseY: number; speed: number; amp: number }[] = [];
  private fogVeilMesh: THREE.Mesh;

  constructor() {
    this.seaUniforms = {
      uTime: { value: 0 },
      uFogLevel: { value: 0 },
    };

    // Biển mây dưới đảo dùng shader pixel-stepped màu bảng PALETTE
    const seaGeo = new THREE.PlaneGeometry(140, 140, 48, 48);
    seaGeo.rotateX(-Math.PI / 2);

    const seaMat = new THREE.ShaderMaterial({
      uniforms: this.seaUniforms,
      vertexShader: `
        uniform float uTime;
        varying vec2 vWorldXZ;
        varying float vWave;
        void main() {
          vec3 pos = position;
          float wave = sin(pos.x * 0.18 + uTime * 0.4) * 0.35 + cos(pos.z * 0.22 - uTime * 0.3) * 0.3;
          pos.y += wave;
          vWave = wave;
          vWorldXZ = pos.xz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uFogLevel;
        varying vec2 vWorldXZ;
        varying float vWave;
        void main() {
          // Lượng tử hóa tọa độ để giữ nét pixel art trên biển mây
          vec2 q = floor((vWorldXZ + vec2(uTime * 0.65, uTime * 0.25)) * 2.0) / 2.0;
          float n = sin(q.x * 0.28) * cos(q.y * 0.24) + sin((q.x + q.y) * 0.16);
          vec3 cDeep = vec3(0.561, 0.659, 0.878);   // #8fa8e0
          vec3 cSky  = vec3(0.718, 0.788, 0.941);   // #b7c9f0
          vec3 cPink = vec3(0.910, 0.835, 0.910);   // #e8d5e8
          vec3 cWht  = vec3(0.957, 0.914, 0.882);   // #f4e9e1

          vec3 col = cDeep;
          if (n > -0.25) col = cSky;
          if (n > 0.35) col = cPink;
          if (n > 0.85 || vWave > 0.28) col = cWht;

          col = mix(col, cWht, uFogLevel * 0.35);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    const seaMesh = new THREE.Mesh(seaGeo, seaMat);
    seaMesh.position.y = -3.4;
    this.group.add(seaMesh);

    // Lớp sương mù dâng cao mép đảo khi thời tiết Sương mù
    const veilGeo = new THREE.PlaneGeometry(100, 100);
    veilGeo.rotateX(-Math.PI / 2);
    const veilMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(PALETTE.cloudWhite),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.fogVeilMesh = new THREE.Mesh(veilGeo, veilMat);
    this.fogVeilMesh.position.y = -0.35;
    this.group.add(this.fogVeilMesh);

    // Các cụm mây pixel trôi bao quanh cả 4 phía (tiền cảnh & hậu cảnh)
    const tuftTex = pixelArt.getTexture('cloud_tuft');
    for (let i = 0; i < 40; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tuftTex,
        transparent: true,
        opacity: i % 3 === 0 ? 0.85 : 0.95,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const ring = i % 4;
      let baseX = 0;
      let baseZ = 0;
      let baseY = -1.6;
      if (ring === 0) {
        // Phía Nam (tiền cảnh)
        baseX = -30 + ((i * 6.3) % 60);
        baseZ = 9.5 + (i % 4) * 3.0;
        baseY = -0.85 - (i % 3) * 0.45;
      } else if (ring === 1) {
        // Phía Bắc (hậu cảnh)
        baseX = -30 + ((i * 5.9) % 60);
        baseZ = -10.5 - (i % 4) * 3.2;
        baseY = -1.8 - (i % 3) * 0.4;
      } else if (ring === 2) {
        // Phía Tây
        baseX = -16.5 - (i % 4) * 3.4;
        baseZ = -12 + ((i * 4.7) % 24);
        baseY = -1.3 - (i % 3) * 0.45;
      } else {
        // Phía Đông
        baseX = 16.5 + (i % 4) * 3.4;
        baseZ = -12 + ((i * 5.1) % 24);
        baseY = -1.3 - (i % 3) * 0.45;
      }

      sprite.position.set(baseX, baseY, baseZ);
      const scale = ring === 0 ? 3.8 : 5.0;
      sprite.scale.set(scale, scale * 0.5, 1);
      this.group.add(sprite);
      this.tufts.push({
        sprite,
        baseX,
        baseY,
        speed: 0.35 + (i % 5) * 0.14,
        amp: 0.12 + (i % 3) * 0.05,
      });
    }
  }

  public update(elapsed: number, dt: number, fogStrength: number): void {
    this.seaUniforms.uTime.value = elapsed;
    this.seaUniforms.uFogLevel.value = fogStrength;

    const veilMat = this.fogVeilMesh.material as THREE.MeshBasicMaterial;
    veilMat.opacity = THREE.MathUtils.lerp(veilMat.opacity, fogStrength * 0.34, Math.min(1, dt * 2));
    this.fogVeilMesh.position.y = THREE.MathUtils.lerp(-1.2, -0.05, fogStrength);

    for (const t of this.tufts) {
      t.sprite.position.x += t.speed * dt;
      if (t.sprite.position.x > 34) {
        t.sprite.position.x = -34;
      }
      t.sprite.position.y = t.baseY + fogStrength * 0.75 + Math.sin(elapsed * 0.8 + t.baseX) * t.amp;
    }
  }
}

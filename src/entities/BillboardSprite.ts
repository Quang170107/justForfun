import * as THREE from 'three';
import { pixelArt } from '../art/pixelArtGenerator';
import { Direction } from '../data/types';

const DIR_ROW: Record<Direction, number> = {
  down: 3, // Texture V=0 là đáy ảnh canvas -> row 3 ở trên cùng tương ứng direction index 0 ('down')
  left: 2,
  right: 1,
  up: 0,
};

export class BillboardSprite {
  public readonly group = new THREE.Group();
  public readonly sprite: THREE.Sprite;
  protected readonly texture: THREE.CanvasTexture;
  protected readonly cols = 8;
  protected readonly rows = 4;

  public x = 0;
  public z = 0;
  public direction: Direction = 'down';

  constructor(textureKey: string, widthUnits = 1, heightUnits = 2, shadowScale = 0.85) {
    this.texture = pixelArt.getClonedTexture(textureKey);
    this.texture.repeat.set(1 / this.cols, 1 / this.rows);

    const mat = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      alphaTest: 0.25,
    });
    this.sprite = new THREE.Sprite(mat);
    // Chân sprite đặt sát mặt đất (y = 0)
    this.sprite.position.set(0, heightUnits / 2, 0);
    this.sprite.scale.set(widthUnits, heightUnits, 1);
    this.group.add(this.sprite);

    // Bóng đổ dạng elip pixel mờ dưới chân
    const shGeo = new THREE.PlaneGeometry(shadowScale, shadowScale * 0.5);
    shGeo.rotateX(-Math.PI / 2);
    const shMat = new THREE.MeshBasicMaterial({
      map: pixelArt.getTexture('shadow_ellipse'),
      transparent: true,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shGeo, shMat);
    shadow.position.y = 0.032;
    this.group.add(shadow);

    this.setFrame('down', 4);
  }

  public setFrame(dir: Direction, colIndex: number): void {
    this.direction = dir;
    const row = DIR_ROW[dir];
    const col = ((colIndex % this.cols) + this.cols) % this.cols;
    this.texture.offset.set(col / this.cols, row / this.rows);
  }

  public syncSnappedPosition(extraY = 0): void {
    // Pixel snapping: 1 đơn vị = 16 pixel
    const snap = (v: number) => Math.round(v * 16) / 16;
    this.group.position.set(snap(this.x), extraY, snap(this.z));
  }
}

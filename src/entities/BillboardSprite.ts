import * as THREE from 'three';
import { pixelArt, PIXELS_PER_UNIT } from '../art/pixelArtGenerator';
import { Direction } from '../data/types';

const DIR_ROW: Record<Direction, number> = {
  down: 3, // Texture V=0 là đáy ảnh canvas -> row 3 ở trên cùng tương ứng direction index 0 ('down')
  left: 2,
  right: 1,
  up: 0,
};

const CLOCKWISE_DIRS: Direction[] = ['down', 'right', 'up', 'left'];

export class BillboardSprite {
  public readonly group = new THREE.Group();
  public readonly sprite: THREE.Mesh;
  protected readonly texture: THREE.CanvasTexture;
  protected readonly cols = 8;
  protected readonly rows = 4;

  public x = 0;
  public z = 0;
  public direction: Direction = 'down';
  protected currentColIndex = 4;
  private lastCameraYawStep = 0;

  constructor(textureKey: string, widthPx = 16, heightPx = 32, shadowScale = 0.85) {
    this.texture = pixelArt.getClonedTexture(textureKey);
    this.texture.repeat.set(1 / this.cols, 1 / this.rows);

    const handle = pixelArt.createYBillboard({
      texture: this.texture,
      widthPx,
      heightPx,
      shadowScale,
      shadowYOffset: 0.036,
      baseYOffset: 0.032,
      alphaTest: 0.5,
    });

    this.sprite = handle.mesh;
    // Di chuyển các child từ handle.group vào group của thực thể
    while (handle.group.children.length > 0) {
      this.group.add(handle.group.children[0]);
    }

    this.setFrame('down', 4);
  }

  public setFrame(dir: Direction, colIndex: number): void {
    this.direction = dir;
    this.currentColIndex = ((colIndex % this.cols) + this.cols) % this.cols;
    this.applyCameraRelativeFrame(this.lastCameraYawStep);
  }

  public applyCameraRelativeFrame(cameraYawStep: number): void {
    this.lastCameraYawStep = ((cameraYawStep % 4) + 4) % 4;
    const worldIdx = CLOCKWISE_DIRS.indexOf(this.direction);
    const visualDir = CLOCKWISE_DIRS[(worldIdx - this.lastCameraYawStep + 4) % 4];
    const row = DIR_ROW[visualDir];
    this.texture.offset.set(this.currentColIndex / this.cols, row / this.rows);
  }

  public syncSnappedPosition(extraY = 0): void {
    // Pixel snapping: 1 đơn vị = 16 pixel
    const snap = (v: number) => Math.round(v * PIXELS_PER_UNIT) / PIXELS_PER_UNIT;
    this.group.position.set(snap(this.x), extraY, snap(this.z));
  }
}

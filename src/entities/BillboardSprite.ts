import * as THREE from 'three';
import { Direction } from '../data/types';
import { CharacterModel3D } from './CharacterModel3D';

export class BillboardSprite {
  public readonly group = new THREE.Group();
  public readonly model: CharacterModel3D;

  public x = 0;
  public z = 0;
  public direction: Direction = 'down';
  protected currentColIndex = 4;

  constructor(textureKey: string, _widthPx = 16, _heightPx = 32, _shadowScale = 0.85) {
    this.model = new CharacterModel3D(textureKey);
    this.group.add(this.model.root);
    this.setFrame('down', 4);
  }

  public setFrame(dir: Direction, colIndex: number): void {
    this.direction = dir;
    this.currentColIndex = ((colIndex % 8) + 8) % 8;
    this.model.setPose(this.direction, this.currentColIndex);
  }

  public applyCameraRelativeFrame(_cameraYawStep: number): void {
    // Trong thế giới 3D thực, nhân vật quay thẳng theo hướng thế giới
    this.model.setPose(this.direction, this.currentColIndex);
  }

  public syncSnappedPosition(extraY = 0): void {
    this.group.position.set(this.x, extraY, this.z);
  }
}

export type GameActionKey =
  | 'interact'
  | 'rotateLeft'
  | 'rotateRight'
  | 'inventory'
  | 'escape'
  | 'hotbar1'
  | 'hotbar2'
  | 'hotbar3'
  | 'hotbar4'
  | 'hotbar5'
  | 'hotbar6'
  | 'hotbar7'
  | 'hotbar8'
  | 'hotbar9';

export class InputSystem {
  private held = new Set<string>();
  private justPressed = new Set<GameActionKey>();

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  private onBlur = (): void => {
    this.held.clear();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(code)) {
      e.preventDefault();
    }

    if (!e.repeat) {
      if (code === 'KeyE' || code === 'Space') this.justPressed.add('interact');
      if (code === 'KeyQ') this.justPressed.add('rotateLeft');
      if (code === 'KeyR') this.justPressed.add('rotateRight');
      if (code === 'Tab' || code === 'KeyI') this.justPressed.add('inventory');
      if (code === 'Escape') this.justPressed.add('escape');
      if (code >= 'Digit1' && code <= 'Digit9') {
        const idx = Number(code.replace('Digit', ''));
        this.justPressed.add(`hotbar${idx}` as GameActionKey);
      }
    }

    this.held.add(code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.held.delete(e.code);
  };

  public getMoveAxis(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.held.has('KeyA') || this.held.has('ArrowLeft')) x -= 1;
    if (this.held.has('KeyD') || this.held.has('ArrowRight')) x += 1;
    if (this.held.has('KeyW') || this.held.has('ArrowUp')) y -= 1;
    if (this.held.has('KeyS') || this.held.has('ArrowDown')) y += 1;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  public consume(action: GameActionKey): boolean {
    if (this.justPressed.has(action)) {
      this.justPressed.delete(action);
      return true;
    }
    return false;
  }

  public clearFrameActions(): void {
    this.justPressed.clear();
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }
}

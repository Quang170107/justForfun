export type GameActionKey =
  | 'interact'
  | 'canvasClick'
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
  | 'hotbar9'
  | 'debugToggle'
  | 'debugPlusHour'
  | 'debugNextDay'
  | 'debugAddMoney'
  | 'debugCycleWeather'
  | 'debugGiveSeeds'
  | 'debugAddHearts';

export class InputSystem {
  private held = new Set<string>();
  private justPressed = new Set<GameActionKey>();
  private canvas: HTMLCanvasElement | null = null;
  private wheelSteps = 0;

  public mouseNdc = { x: 0, y: 0 };
  public mouseActive = false;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('wheel', this.onWheel, { passive: true });
  }

  public attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mouseleave', this.onMouseLeave);
  }

  private updateMouseFromEvent(e: MouseEvent): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.mouseActive = true;
  }

  private onMouseMove = (e: MouseEvent): void => {
    this.updateMouseFromEvent(e);
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this.updateMouseFromEvent(e);
    this.justPressed.add('canvasClick');
  };

  private onMouseLeave = (): void => {
    this.mouseActive = false;
  };

  private onWheel = (e: WheelEvent): void => {
    if (Math.abs(e.deltaY) < 1) return;
    this.wheelSteps += e.deltaY > 0 ? 1 : -1;
  };

  private onBlur = (): void => {
    this.held.clear();
    this.mouseActive = false;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(code)) {
      e.preventDefault();
    }
    if (import.meta.env.DEV && ['F3', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'].includes(code)) {
      e.preventDefault();
    }

    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      this.mouseActive = false;
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
      if (import.meta.env.DEV) {
        if (code === 'F3') this.justPressed.add('debugToggle');
        if (code === 'F5') this.justPressed.add('debugPlusHour');
        if (code === 'F6') this.justPressed.add('debugNextDay');
        if (code === 'F7') this.justPressed.add('debugAddMoney');
        if (code === 'F8') this.justPressed.add('debugCycleWeather');
        if (code === 'F9') this.justPressed.add('debugGiveSeeds');
        if (code === 'F10') this.justPressed.add('debugAddHearts');
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

  public consumeWheelSteps(): number {
    const s = this.wheelSteps;
    this.wheelSteps = 0;
    return s;
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
    this.wheelSteps = 0;
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('wheel', this.onWheel);
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.onMouseMove);
      this.canvas.removeEventListener('mousedown', this.onMouseDown);
      this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
    }
  }
}

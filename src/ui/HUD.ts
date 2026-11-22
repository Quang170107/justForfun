import { pixelArt } from '../art/pixelArtGenerator';
import { ITEMS } from '../data/crops';
import { InventorySlot, WeatherType } from '../data/types';

export interface TooltipCallbacks {
  show: (slot: InventorySlot, x: number, y: number) => void;
  hide: () => void;
}

export class HUD {
  private dayEl = document.getElementById('hud-day')!;
  private timeEl = document.getElementById('hud-time')!;
  private weatherEl = document.getElementById('hud-weather')!;
  private cafeStatusEl = document.getElementById('hud-cafe-status')!;
  private moneyEl = document.getElementById('hud-money')!;
  private dialHandEl = document.getElementById('dial-hand')!;
  private dialBgEl = document.getElementById('sun-moon-dial')!;
  private locationPillEl = document.getElementById('location-pill')!;
  private promptPillEl = document.getElementById('prompt-pill')!;
  private debugOverlayEl = document.getElementById('debug-overlay')!;
  private hotbarSlotsEl = document.getElementById('hotbar-slots')!;
  private toastContainerEl = document.getElementById('toast-container')!;
  private daylightTintEl = document.getElementById('daylight-tint')!;

  private lastRenderedKey = '';

  constructor(
    private onSelectHotbar: (idx: number) => void,
    private tooltip: TooltipCallbacks,
    onOpenInv: () => void,
    onOpenMenu: () => void
  ) {
    document.getElementById('btn-open-inv')!.addEventListener('click', onOpenInv);
    document.getElementById('btn-open-menu')!.addEventListener('click', onOpenMenu);
  }

  public updateClockAndMeta(
    day: number,
    season: string,
    formattedTime: string,
    progress: number,
    weather: WeatherType,
    isOpen: boolean,
    money: number,
    tintHex: string,
    nightFactor: number
  ): void {
    this.dayEl.textContent = `${season} • Ngày ${day}`;
    this.timeEl.textContent = formattedTime;
    this.moneyEl.textContent = String(money);

    const weatherIcon = weather === 'sunny' ? '☀️ Nắng ấm' : weather === 'rainy' ? '🌧️ Mưa nhẹ' : '🌫️ Sương mù';
    this.weatherEl.textContent = weatherIcon;
    this.cafeStatusEl.textContent = isOpen ? '🍵 Quán đang mở!' : '☕ 14:00 mở quán';
    this.cafeStatusEl.style.color = isOpen ? '#3f7d3a' : '#6b3e26';

    // Quay mặt trời / mặt trăng theo tiến độ ngày
    const arcX = Math.cos(Math.PI * (1 - progress)) * 11;
    const arcY = -Math.sin(Math.PI * (1 - progress)) * 8;
    this.dialHandEl.textContent = progress > 0.72 ? '🌙' : '☀️';
    this.dialHandEl.style.transform = `translate(${arcX.toFixed(1)}px, ${arcY.toFixed(1)}px)`;
    this.dialBgEl.style.background = progress > 0.72 ? '#313d5a' : progress > 0.55 ? '#ee9389' : '#8fa8e0';

    // Phủ lớp tint ngày đêm toàn màn hình kiểu Stardew
    this.daylightTintEl.style.backgroundColor = `#${tintHex}`;
    this.daylightTintEl.style.opacity = String(0.08 + nightFactor * 0.34);
  }

  public setLocation(label: string): void {
    if (this.locationPillEl.textContent !== label) {
      this.locationPillEl.textContent = label;
    }
  }

  public setPrompt(text: string | null): void {
    if (text) {
      this.promptPillEl.textContent = `[E] ${text}`;
      this.promptPillEl.classList.remove('hidden');
    } else {
      this.promptPillEl.classList.add('hidden');
    }
  }

  public updateDebugOverlay(
    visible: boolean,
    info: {
      fps: number;
      x: number;
      z: number;
      dir: string;
      tileInfo: string;
      timeInfo: string;
      weather: string;
    }
  ): void {
    if (!visible) {
      this.debugOverlayEl.classList.add('hidden');
      return;
    }
    this.debugOverlayEl.classList.remove('hidden');
    this.debugOverlayEl.innerHTML = `
      <div><b>[DEBUG F3]</b> FPS: <b>${info.fps}</b></div>
      <div>Vị trí: X=${info.x.toFixed(2)}, Z=${info.z.toFixed(2)} (${info.dir})</div>
      <div>Ô nhắm: ${info.tileInfo}</div>
      <div>Giờ: ${info.timeInfo} | ${info.weather}</div>
      <div style="font-size:11px;color:#6b3e26;margin-top:3px;">F5:+1h • F6:Qua ngày • F7:+1000Xu • F8:Thời tiết • F9:Hạt & NL</div>
    `;
  }

  public renderHotbar(inventory: (InventorySlot | null)[], selectedIdx: number): void {
    const key =
      selectedIdx +
      '|' +
      inventory
        .slice(0, 9)
        .map((s) => (s ? `${s.itemId}:${s.count}:${s.quality}` : '-'))
        .join(',');
    if (key === this.lastRenderedKey) return;
    this.lastRenderedKey = key;

    this.hotbarSlotsEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const slot = inventory[i];
      const div = document.createElement('div');
      div.className = `inv-slot ${i === selectedIdx ? 'active' : ''}`;

      const keyLabel = document.createElement('span');
      keyLabel.className = 'slot-key';
      keyLabel.textContent = String(i + 1);
      div.appendChild(keyLabel);

      if (slot) {
        const def = ITEMS[slot.itemId];
        const img = document.createElement('img');
        img.src = pixelArt.getIconUrl(def.iconKey);
        img.alt = def.name;
        div.appendChild(img);

        if (def.stackable && slot.count > 1) {
          const cnt = document.createElement('span');
          cnt.className = 'slot-count';
          cnt.textContent = String(slot.count);
          div.appendChild(cnt);
        }

        if (def.category !== 'tool' && def.category !== 'seed') {
          const st = document.createElement('span');
          st.className = `slot-star q${slot.quality}`;
          st.textContent = '★'.repeat(slot.quality);
          div.appendChild(st);
        }

        div.addEventListener('mouseenter', (e) => this.tooltip.show(slot, e.clientX, e.clientY));
        div.addEventListener('mousemove', (e) => this.tooltip.show(slot, e.clientX, e.clientY));
        div.addEventListener('mouseleave', () => this.tooltip.hide());
      }

      div.addEventListener('click', () => {
        this.onSelectHotbar(i);
      });
      this.hotbarSlotsEl.appendChild(div);
    }
  }

  public showToast(msg: string): void {
    const div = document.createElement('div');
    div.className = 'toast-msg';
    div.textContent = msg;
    this.toastContainerEl.appendChild(div);
    setTimeout(() => {
      div.remove();
    }, 2600);
  }

  public spawnFlyingItem(iconKey: string, startX: number, startY: number): void {
    const hotbarRect = this.hotbarSlotsEl.getBoundingClientRect();
    const targetX = hotbarRect.left + hotbarRect.width * 0.5 - 16;
    const targetY = hotbarRect.top + 8;

    const img = document.createElement('img');
    img.className = 'flying-item-icon';
    img.src = pixelArt.getIconUrl(iconKey);
    img.style.left = `${Math.round(startX - 16)}px`;
    img.style.top = `${Math.round(startY - 16)}px`;
    img.style.opacity = '1';
    document.body.appendChild(img);

    requestAnimationFrame(() => {
      const dx = Math.round(targetX - (startX - 16));
      const dy = Math.round(targetY - (startY - 16));
      img.style.transform = `translate(${dx}px, ${dy}px) scale(0.85)`;
      img.style.opacity = '0.2';
    });

    setTimeout(() => {
      img.remove();
    }, 540);
  }
}

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
  private questPillEl = document.getElementById('quest-pill')!;
  private promptPillEl = document.getElementById('prompt-pill')!;
  private debugOverlayEl = document.getElementById('debug-overlay')!;
  private hotbarSlotsEl = document.getElementById('hotbar-slots')!;
  private toastContainerEl = document.getElementById('toast-container')!;
  private daylightTintEl = document.getElementById('daylight-tint')!;

  private lastRenderedKey = '';
  private activeFloatingPopups: HTMLElement[] = [];

  constructor(
    private onSelectHotbar: (idx: number) => void,
    private tooltip: TooltipCallbacks,
    onOpenInv: () => void,
    onOpenMenu: () => void
  ) {
    document.getElementById('btn-open-inv')!.addEventListener('click', onOpenInv);
    document.getElementById('btn-open-menu')!.addEventListener('click', onOpenMenu);
    if (!import.meta.env.DEV) {
      this.debugOverlayEl.classList.add('hidden');
      this.debugOverlayEl.style.display = 'none';
    }
  }

  public updateClockAndMeta(
    day: number,
    season: string,
    formattedTime: string,
    progress: number,
    weather: WeatherType,
    isWithinCafeHours: boolean,
    isShopManuallyOpen: boolean,
    timeMinutes: number,
    money: number,
    tintHex: string,
    nightFactor: number,
    overlayOpacity?: number
  ): void {
    this.dayEl.textContent = `${season} • Ngày ${day}`;
    this.timeEl.textContent = formattedTime;
    this.moneyEl.textContent = String(money);

    const weatherIcon = weather === 'sunny' ? '☀️ Nắng ấm' : weather === 'rainy' ? '🌧️ Mưa nhẹ' : '🌫️ Sương mù';
    this.weatherEl.textContent = weatherIcon;
    if (isWithinCafeHours && isShopManuallyOpen) {
      this.cafeStatusEl.textContent = '🏮 Quán ĐANG MỞ!';
      this.cafeStatusEl.style.color = '#3f7d3a';
    } else if (isWithinCafeHours) {
      this.cafeStatusEl.textContent = '🪵 14:00–20:00 (Lật biển mở)';
      this.cafeStatusEl.style.color = '#b8433a';
    } else if (timeMinutes >= 1200) {
      this.cafeStatusEl.textContent = '🌙 Quán đã đóng cửa';
      this.cafeStatusEl.style.color = '#6b3e26';
    } else {
      this.cafeStatusEl.textContent = '☕ 14:00 mở quán';
      this.cafeStatusEl.style.color = '#6b3e26';
    }

    // Quay mặt trời / mặt trăng theo tiến độ ngày
    const arcX = Math.cos(Math.PI * (1 - progress)) * 11;
    const arcY = -Math.sin(Math.PI * (1 - progress)) * 8;
    this.dialHandEl.textContent = progress > 0.72 ? '🌙' : '☀️';
    this.dialHandEl.style.transform = `translate(${arcX.toFixed(1)}px, ${arcY.toFixed(1)}px)`;
    this.dialBgEl.style.background = progress > 0.72 ? '#313d5a' : progress > 0.55 ? '#ee9389' : '#8fa8e0';

    // Phủ lớp tint ngày đêm & thời tiết toàn màn hình kiểu Stardew
    this.daylightTintEl.style.backgroundColor = `#${tintHex}`;
    this.daylightTintEl.style.opacity = String(overlayOpacity ?? 0.08 + nightFactor * 0.34);
  }

  public setLocation(label: string): void {
    if (this.locationPillEl.textContent !== label) {
      this.locationPillEl.textContent = label;
    }
  }

  public setQuestHint(text: string | null): void {
    if (text) {
      if (this.questPillEl.textContent !== text) {
        this.questPillEl.textContent = text;
      }
      this.questPillEl.classList.remove('hidden');
    } else {
      this.questPillEl.classList.add('hidden');
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
      tomorrowWeather: string;
      particles: number;
    }
  ): void {
    if (!import.meta.env.DEV || !visible) {
      this.debugOverlayEl.classList.add('hidden');
      return;
    }
    this.debugOverlayEl.classList.remove('hidden');
    this.debugOverlayEl.innerHTML = `
      <div><b>[DEBUG F3]</b> FPS: <b>${info.fps}</b> • Hạt: <b>${info.particles}</b></div>
      <div>Vị trí: X=${info.x.toFixed(2)}, Z=${info.z.toFixed(2)} (${info.dir})</div>
      <div>Ô nhắm: ${info.tileInfo}</div>
      <div>Giờ: ${info.timeInfo} | ${info.weather} (Mai: ${info.tomorrowWeather})</div>
      <div style="font-size:11px;color:#6b3e26;margin-top:3px;">F5:+1h • F6:Qua ngày • F7:+1000Xu<br/>F8:Thời tiết • F9:Hạt & NL • F10:+1Tim</div>
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

        if (def.category !== 'tool' && def.category !== 'seed' && def.category !== 'decor') {
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

  public spawnFloatingText(
    text: string,
    screenX: number,
    screenY: number,
    variant: 'money' | 'heart' | 'info' = 'money'
  ): void {
    if (this.activeFloatingPopups.length >= 8) {
      const oldest = this.activeFloatingPopups.shift();
      oldest?.remove();
    }
    const el = document.createElement('div');
    el.className = `floating-popup ${variant}`;
    el.textContent = text;
    el.style.left = `${Math.round(screenX)}px`;
    el.style.top = `${Math.round(screenY)}px`;
    document.body.appendChild(el);
    this.activeFloatingPopups.push(el);

    setTimeout(() => {
      el.remove();
      const idx = this.activeFloatingPopups.indexOf(el);
      if (idx !== -1) this.activeFloatingPopups.splice(idx, 1);
    }, 1150);
  }

  public spawnHudMoneyPopup(amount: number): void {
    const rect = this.moneyEl.getBoundingClientRect();
    const cx = rect.width > 0 ? rect.left + rect.width * 0.5 : window.innerWidth - 90;
    const cy = rect.height > 0 ? rect.top - 8 : 95;
    this.spawnFloatingText(`+${amount} Xu Mây`, cx, cy, 'money');
  }
}

import { pixelArt } from '../art/pixelArtGenerator';
import { storybookArt } from '../art/storybookArt';
import { getItemSellValue, ITEMS } from '../data/crops';
import { GRANDMA_LETTER_LINES } from '../data/dialogues';
import {
  getShippingBinTotal,
  isUpgradePurchased,
  SHOP_DECORS,
  SHOP_SEEDS,
  SHOP_UPGRADES,
  ShopUpgradeId,
} from '../data/economy';
import { NPCS } from '../data/npcs';
import { GrandmaLetterDef, INTRO_SLIDES, LANTERN_FESTIVAL_WISHES } from '../data/story';
import { DailySummaryStats, InventorySlot, ItemId, NpcId, UpgradesState } from '../data/types';

export type ShopTabKind = 'seeds' | 'decor' | 'upgrades';

export interface SpringFinaleStats {
  totalTeasBrewed: number;
  totalCustomersServed: number;
  unlockedRecipesCount: number;
  unlockedLettersCount: number;
  totalLettersCount: number;
  totalMoneyEarned: number;
  currentMoney: number;
  lanternFestivalDone: boolean;
  npcHearts: Record<NpcId, number>;
}

export class ShopAndMenuModal {
  public shopTab: ShopTabKind = 'seeds';
  private animRafId: number | null = null;

  public cleanup(): void {
    if (this.animRafId !== null) {
      cancelAnimationFrame(this.animRafId);
      this.animRafId = null;
    }
  }

  private renderBuyItemCard(
    id: ItemId,
    money: number,
    onBuyItem: (itemId: ItemId) => void
  ): HTMLElement {
    const def = ITEMS[id];
    const price = def.buyPrice ?? 20;
    const card = document.createElement('div');
    card.className = 'card-box';
    card.innerHTML = `
      <div class="card-top">
        <img src="${pixelArt.getIconUrl(def.iconKey)}" />
        <div style="flex:1;">
          <strong>${def.name}</strong>
          <div style="font-size:12px;">${def.description}</div>
        </div>
      </div>
    `;
    const btn = document.createElement('button');
    btn.className = 'pixel-btn small primary';
    btn.textContent = `Mua 1 (${price} Xu Mây)`;
    btn.disabled = money < price;
    btn.onclick = () => onBuyItem(id);
    card.appendChild(btn);
    return card;
  }

  public renderShop(
    modalBox: HTMLElement,
    money: number,
    inventory: (InventorySlot | null)[],
    upgrades: UpgradesState,
    onBuyItem: (itemId: ItemId) => void,
    onBuyUpgrade: (upgradeId: ShopUpgradeId, price: number) => void,
    onSellSlot: (slotIdx: number) => void,
    onClose: () => void
  ): void {
    modalBox.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `<h2>🌱 Sạp Bé Sương (08:00–18:00) &nbsp;|&nbsp; 🪙 ${money} Xu Mây</h2>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'pixel-btn small';
    closeBtn.textContent = 'Đóng (Esc)';
    closeBtn.onclick = onClose;
    header.appendChild(closeBtn);
    modalBox.appendChild(header);

    const tabRow = document.createElement('div');
    tabRow.className = 'tab-row';
    const tabs: { id: ShopTabKind; label: string }[] = [
      { id: 'seeds', label: '🌱 Hạt Giống & Mật' },
      { id: 'decor', label: '🏮 Đồ Trang Trí' },
      { id: 'upgrades', label: '⬆️ Nâng Cấp' },
    ];
    for (const t of tabs) {
      const tBtn = document.createElement('button');
      tBtn.className = `pixel-btn small ${this.shopTab === t.id ? 'primary' : ''}`;
      tBtn.textContent = t.label;
      tBtn.onclick = () => {
        this.shopTab = t.id;
        this.renderShop(modalBox, money, inventory, upgrades, onBuyItem, onBuyUpgrade, onSellSlot, onClose);
      };
      tabRow.appendChild(tBtn);
    }
    modalBox.appendChild(tabRow);

    if (this.shopTab === 'seeds') {
      const list = document.createElement('div');
      list.className = 'shop-list';
      for (const id of SHOP_SEEDS) {
        list.appendChild(this.renderBuyItemCard(id, money, onBuyItem));
      }
      modalBox.appendChild(list);
    } else if (this.shopTab === 'decor') {
      const hint = document.createElement('div');
      hint.className = 'card-box';
      hint.style.marginBottom = '10px';
      hint.innerHTML = `<div style="font-size:13px;">💡 Mua đồ trang trí vào túi, chọn trên thanh hotbar rồi nhấn <b>Space / Click</b> ngoài sân hoặc hiên quán để bài trí. Dùng <b>Giỏ thu hoạch</b> để thu hồi lại.</div>`;
      modalBox.appendChild(hint);

      const list = document.createElement('div');
      list.className = 'shop-list';
      for (const id of SHOP_DECORS) {
        list.appendChild(this.renderBuyItemCard(id, money, onBuyItem));
      }
      modalBox.appendChild(list);
    } else {
      const upgList = document.createElement('div');
      upgList.className = 'shop-list';
      for (const u of SHOP_UPGRADES) {
        const owned = isUpgradePurchased(u.id, upgrades);
        const missingReq = u.requires ? !isUpgradePurchased(u.requires, upgrades) : false;
        const card = document.createElement('div');
        card.className = 'card-box';
        card.innerHTML = `
          <strong>${u.name}</strong>
          <div style="font-size:12px;">${u.description}</div>
        `;
        const btn = document.createElement('button');
        btn.className = `pixel-btn small ${owned || missingReq ? '' : 'primary'}`;
        if (owned) {
          btn.textContent = '✓ Đã nâng cấp';
        } else if (missingReq) {
          btn.textContent = '🔒 Cần mở Bàn Thứ 4 trước';
        } else {
          btn.textContent = `Nâng cấp (${u.price} Xu Mây)`;
        }
        btn.disabled = owned || missingReq || money < u.price;
        btn.onclick = () => onBuyUpgrade(u.id, u.price);
        card.appendChild(btn);
        upgList.appendChild(card);
      }
      modalBox.appendChild(upgList);
    }

    // Bán nhanh vật phẩm tại quầy nếu cần Xu ngay
    const sellable: { idx: number; slot: InventorySlot }[] = [];
    inventory.forEach((s, idx) => {
      if (s && ITEMS[s.itemId].sellPrice > 0) sellable.push({ idx, slot: s });
    });

    if (sellable.length > 0) {
      const sec3 = document.createElement('h3');
      sec3.style.margin = '16px 0 8px';
      sec3.textContent = 'Bán Nhanh Tại Sạp (Nhận Xu Mây ngay)';
      modalBox.appendChild(sec3);

      const sellRow = document.createElement('div');
      sellRow.className = 'chip-grid';
      for (const { idx, slot } of sellable) {
        const def = ITEMS[slot.itemId];
        const val = getItemSellValue(slot.itemId, slot.quality);
        const starTag =
          def.category !== 'seed' && def.category !== 'tool' && def.category !== 'decor'
            ? ` ${'★'.repeat(slot.quality)}`
            : '';
        const btn = document.createElement('button');
        btn.className = 'choice-chip';
        btn.innerHTML = `<img src="${pixelArt.getIconUrl(def.iconKey)}" /> Bán 1 ${def.name}${starTag} (+${val} Xu)`;
        btn.onclick = () => onSellSlot(idx);
        sellRow.appendChild(btn);
      }
      modalBox.appendChild(sellRow);
    }
  }

  public renderShippingBin(
    modalBox: HTMLElement,
    binSlots: InventorySlot[],
    inventory: (InventorySlot | null)[],
    onDepositSlot: (slotIdx: number) => void,
    onWithdrawBin: (binIdx: number) => void,
    onClose: () => void
  ): void {
    const estimatedTotal = getShippingBinTotal(binSlots);
    modalBox.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `<h2>📦 Hộp Bán Hàng Qua Đêm &nbsp;|&nbsp; Dự kiến: +${estimatedTotal} Xu Mây</h2>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'pixel-btn small';
    closeBtn.textContent = 'Đóng (Esc)';
    closeBtn.onclick = onClose;
    header.appendChild(closeBtn);
    modalBox.appendChild(header);

    const tipBox = document.createElement('div');
    tipBox.className = 'card-box';
    tipBox.style.marginBottom = '12px';
    tipBox.innerHTML = `<div style="font-size:13px;">🌙 Ký gửi nông sản, lá trà đã sơ chế, tách trà hoặc đồ trang trí vào hộp. Thương buôn tầng mây sẽ thanh toán tự động khi bạn ngủ sang ngày mới!</div>`;
    modalBox.appendChild(tipBox);

    const secBin = document.createElement('h3');
    secBin.style.margin = '0 0 8px';
    secBin.textContent = 'Hàng Đang Chờ Giao Đêm Nay (Nhấn để lấy lại)';
    modalBox.appendChild(secBin);

    if (binSlots.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.style.fontSize = '13px';
      emptyEl.style.marginBottom = '14px';
      emptyEl.textContent = 'Hộp đang trống — hãy chọn vật phẩm trong túi bên dưới để ký gửi.';
      modalBox.appendChild(emptyEl);
    } else {
      const binGrid = document.createElement('div');
      binGrid.className = 'chip-grid';
      binGrid.style.marginBottom = '14px';
      binSlots.forEach((slot, binIdx) => {
        const def = ITEMS[slot.itemId];
        const unitVal = getItemSellValue(slot.itemId, slot.quality);
        const starTag =
          def.category !== 'seed' && def.category !== 'tool' && def.category !== 'decor'
            ? ` ${'★'.repeat(slot.quality)}`
            : '';
        const btn = document.createElement('button');
        btn.className = 'choice-chip';
        btn.innerHTML = `<img src="${pixelArt.getIconUrl(def.iconKey)}" /> ${def.name}${starTag} ×${slot.count} (+${unitVal * slot.count} Xu) ↩️`;
        btn.onclick = () => onWithdrawBin(binIdx);
        binGrid.appendChild(btn);
      });
      modalBox.appendChild(binGrid);
    }

    const secBag = document.createElement('h3');
    secBag.style.margin = '0 0 8px';
    secBag.textContent = 'Ký Gửi Từ Túi Đồ (Nhấn để bỏ 1 món vào hộp)';
    modalBox.appendChild(secBag);

    const sellable: { idx: number; slot: InventorySlot }[] = [];
    inventory.forEach((s, idx) => {
      if (s && ITEMS[s.itemId].sellPrice > 0) sellable.push({ idx, slot: s });
    });

    if (sellable.length === 0) {
      const emptyBag = document.createElement('div');
      emptyBag.style.fontSize = '13px';
      emptyBag.textContent = 'Túi đồ hiện không có nông sản hay vật phẩm bán được.';
      modalBox.appendChild(emptyBag);
    } else {
      const bagGrid = document.createElement('div');
      bagGrid.className = 'chip-grid';
      for (const { idx, slot } of sellable) {
        const def = ITEMS[slot.itemId];
        const val = getItemSellValue(slot.itemId, slot.quality);
        const starTag =
          def.category !== 'seed' && def.category !== 'tool' && def.category !== 'decor'
            ? ` ${'★'.repeat(slot.quality)}`
            : '';
        const btn = document.createElement('button');
        btn.className = 'choice-chip';
        btn.innerHTML = `<img src="${pixelArt.getIconUrl(def.iconKey)}" /> Gửi 1 ${def.name}${starTag} (còn ${slot.count}) • +${val} Xu`;
        btn.onclick = () => onDepositSlot(idx);
        bagGrid.appendChild(btn);
      }
      modalBox.appendChild(bagGrid);
    }
  }

  public renderGrandmaLetter(modalBox: HTMLElement, onClose: () => void): void {
    modalBox.innerHTML = `
      <div class="modal-header">
        <h2>✉️ Lá Thư Của Bà Ngoại</h2>
      </div>
      <div class="card-box" style="padding:16px;font-size:16px;line-height:1.55;">
        ${GRANDMA_LETTER_LINES.map((l) => `<p style="margin:6px 0;">${l}</p>`).join('')}
      </div>
      <div style="margin-top:14px;text-align:right;">
        <button id="btn-letter-start" class="pixel-btn primary">🍵 Bắt đầu ngày mới trên Đảo Mây!</button>
      </div>
    `;
    modalBox.querySelector('#btn-letter-start')!.addEventListener('click', onClose);
  }

  public renderPauseMenu(
    modalBox: HTMLElement,
    bgmEnabled: boolean,
    onSaveNow: () => void,
    onOpenRelations: () => void,
    onToggleAudio: () => void,
    onOpenSettings: () => void,
    onReturnTitle: () => void,
    onResetSave: () => void,
    onClose: () => void
  ): void {
    modalBox.innerHTML = `
      <div class="modal-header">
        <h2>⚙️ Trà Quán Trên Mây — Menu</h2>
        <button id="btn-menu-close" class="pixel-btn small">Tiếp tục</button>
      </div>
      <div class="card-box" style="margin-bottom:12px;">
        <strong>🎮 Hướng Dẫn Nhanh:</strong>
        <div style="font-size:14px;line-height:1.5;">
          • <b>WASD / Mũi tên:</b> Di chuyển quanh đảo<br/>
          • <b>E / Space / Click:</b> Dùng công cụ, phơi/sao lá, pha trà, phục vụ khách hoặc nói chuyện NPC<br/>
          • <b>1–9 / Cuộn chuột:</b> Chọn ô Hotbar (1: Cuốc, 2: Bình tưới, 3: Giỏ, 4+: Hạt & Trà)<br/>
          • <b>Q / R:</b> Xoay góc nhìn camera 90° &nbsp;|&nbsp; <b>Tab / I:</b> Mở Túi đồ, Sổ Công Thức & Quan Hệ
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
        <button id="btn-menu-save" class="pixel-btn primary">💾 Lưu Game Ngay</button>
        <button id="btn-menu-relations" class="pixel-btn">💛 Quan Hệ (NPC)</button>
        <button id="btn-menu-audio" class="pixel-btn">${bgmEnabled ? '🔊 Nhạc nền: BẬT' : '🔇 Nhạc nền: TẮT'}</button>
        <button id="btn-menu-settings" class="pixel-btn">🎛️ Cài Đặt</button>
        <button id="btn-menu-title" class="pixel-btn">🏠 Màn Hình Tiêu Đề</button>
        <button id="btn-menu-reset" class="pixel-btn" style="background:#f28b82;">🗑️ Chơi Lại Từ Đầu</button>
      </div>
    `;
    modalBox.querySelector('#btn-menu-close')!.addEventListener('click', onClose);
    modalBox.querySelector('#btn-menu-save')!.addEventListener('click', onSaveNow);
    modalBox.querySelector('#btn-menu-relations')!.addEventListener('click', onOpenRelations);
    modalBox.querySelector('#btn-menu-audio')!.addEventListener('click', onToggleAudio);
    modalBox.querySelector('#btn-menu-settings')!.addEventListener('click', onOpenSettings);
    modalBox.querySelector('#btn-menu-title')!.addEventListener('click', onReturnTitle);
    modalBox.querySelector('#btn-menu-reset')!.addEventListener('click', onResetSave);
  }

  public renderSettingsModal(
    modalBox: HTMLElement,
    bgmEnabled: boolean,
    sfxEnabled: boolean,
    bgmVolume: number,
    sfxVolume: number,
    bgmMoodLabel: string,
    onToggleBgm: () => void,
    onChangeBgmVolume: (vol: number) => void,
    onToggleSfx: () => void,
    onChangeSfxVolume: (vol: number) => void,
    onTestSfx: () => void,
    onToggleFullscreen: () => void,
    onClose: () => void
  ): void {
    const bgmPct = Math.round(bgmVolume * 100);
    const sfxPct = Math.round(sfxVolume * 100);

    modalBox.innerHTML = `
      <div class="modal-header">
        <h2>🎛️ Cài Đặt Âm Thanh & Hiển Thị</h2>
        <button id="btn-settings-close" class="pixel-btn small">Đóng</button>
      </div>
      <div class="card-box" style="gap:8px;">
        <div class="settings-vol-row">
          <span style="min-width:165px;">🎵 Nhạc nền (${bgmMoodLabel})</span>
          <input id="slider-bgm-vol" class="pixel-slider" type="range" min="0" max="100" value="${bgmPct}" />
          <b id="val-bgm-vol" style="min-width:42px;text-align:right;">${bgmPct}%</b>
          <button id="btn-set-bgm" class="pixel-btn small ${bgmEnabled ? 'primary' : ''}">${bgmEnabled ? 'BẬT' : 'TẮT'}</button>
        </div>
        <div class="settings-vol-row">
          <span style="min-width:165px;">🔔 Âm lượng SFX</span>
          <input id="slider-sfx-vol" class="pixel-slider" type="range" min="0" max="100" value="${sfxPct}" />
          <b id="val-sfx-vol" style="min-width:42px;text-align:right;">${sfxPct}%</b>
          <button id="btn-set-sfx" class="pixel-btn small ${sfxEnabled ? 'primary' : ''}">${sfxEnabled ? 'BẬT' : 'TẮT'}</button>
          <button id="btn-test-sfx" class="pixel-btn small">Thử SFX</button>
        </div>
        <div class="summary-row" style="border-bottom:none;">
          <span>🖥️ Chế độ toàn màn hình</span>
          <button id="btn-set-fs" class="pixel-btn small">${document.fullscreenElement ? 'Thoát Fullscreen' : 'Bật Fullscreen'}</button>
        </div>
      </div>
      <div class="card-box" style="margin-top:10px;">
        <strong>🔤 Kiểm tra hiển thị Font Pixel Tiếng Việt:</strong>
        <div class="vn-font-preview">
          Trà Quán Trên Mây • ầ ẩ ẫ ậ ằ ẳ ẵ ặ ề ể ễ ệ ồ ổ ỗ ộ ờ ở ỡ ợ ừ ử ữ ự ỳ ỷ ỹ ỵ đ Đ
        </div>
      </div>
    `;
    modalBox.querySelector('#btn-settings-close')!.addEventListener('click', onClose);
    modalBox.querySelector('#btn-set-bgm')!.addEventListener('click', onToggleBgm);
    modalBox.querySelector('#btn-set-sfx')!.addEventListener('click', onToggleSfx);
    modalBox.querySelector('#btn-test-sfx')!.addEventListener('click', onTestSfx);
    modalBox.querySelector('#btn-set-fs')!.addEventListener('click', onToggleFullscreen);

    const bgmSlider = modalBox.querySelector('#slider-bgm-vol') as HTMLInputElement;
    const bgmVal = modalBox.querySelector('#val-bgm-vol')!;
    bgmSlider.addEventListener('input', () => {
      const pct = Number(bgmSlider.value);
      bgmVal.textContent = `${pct}%`;
      onChangeBgmVolume(pct / 100);
    });

    const sfxSlider = modalBox.querySelector('#slider-sfx-vol') as HTMLInputElement;
    const sfxVal = modalBox.querySelector('#val-sfx-vol')!;
    sfxSlider.addEventListener('input', () => {
      const pct = Number(sfxSlider.value);
      sfxVal.textContent = `${pct}%`;
      onChangeSfxVolume(pct / 100);
    });
  }

  public renderDaySummary(
    modalBox: HTMLElement,
    stats: DailySummaryStats,
    currentMoney: number,
    onContinue: () => void
  ): void {
    const netTotal = stats.teaIncome + stats.shippingBinIncome + stats.salesIncome - stats.penaltyMoney;
    const weatherText =
      stats.nextWeather === 'sunny'
        ? '☀️ Nắng ấm'
        : stats.nextWeather === 'rainy'
          ? '🌧️ Mưa nhẹ (tự tưới toàn đồi trà)'
          : '🌫️ Sương mù mây dâng';

    const recipeLine =
      stats.newRecipes.length > 0
        ? stats.newRecipes.join(', ')
        : 'Chưa mở công thức mới hôm nay';

    const heartLine =
      stats.heartGains.length > 0
        ? stats.heartGains.map((h) => `${h.name} (+${h.gained}♥ → ${h.total}/10)`).join(', ')
        : 'Chưa tăng mốc tim nào hôm nay';

    modalBox.innerHTML = `
      <div class="modal-header">
        <h2>🌙 Tổng Kết Cuối Ngày ${stats.dayFinished} (${stats.season})</h2>
      </div>
      ${
        stats.passedOut
          ? `<div class="card-box" style="background:#f28b82;margin-bottom:10px;">
               <strong>😵 Bạn đã thức quá 24:00 và thiếp đi ngoài đảo!</strong>
               <span>Ông Đăng đưa bạn về nhà nghỉ, thu phí dầu đèn bão nhẹ (-10%, tối đa 50 Xu Mây): <b>-${stats.penaltyMoney} Xu Mây</b>.</span>
             </div>`
          : `<div class="card-box" style="margin-bottom:10px;">
               <strong>🛏️ Một giấc ngủ ngon lành trên giường ấm!</strong>
               <span>Tiến trình đã được lưu an toàn vào bộ nhớ trình duyệt.</span>
             </div>`
      }
      <div class="card-box" style="margin-bottom:12px;">
        <div class="summary-row"><span>🍵 Thu nhập phục vụ trà:</span><b>+${stats.teaIncome} Xu Mây</b></div>
        <div class="summary-row"><span>📦 Thu nhập Hộp Bán Hàng Qua Đêm:</span><b>+${stats.shippingBinIncome} Xu Mây</b></div>
        <div class="summary-row"><span>🧺 Thu nhập bán trực tiếp tại sạp:</span><b>+${stats.salesIncome} Xu Mây</b></div>
        ${
          stats.penaltyMoney > 0
            ? `<div class="summary-row" style="color:#8e2f2f;"><span>🏮 Phí ngủ gục quá 24:00:</span><b>-${stats.penaltyMoney} Xu Mây</b></div>`
            : ''
        }
        <div class="summary-row"><span>📖 Công thức trà mới:</span><b>${recipeLine}</b></div>
        <div class="summary-row"><span>💛 Tình cảm tăng:</span><b>${heartLine}</b></div>
        <div class="summary-row"><span>🌤️ Thời tiết ngày ${stats.nextDay}:</span><b>${weatherText}</b></div>
        <div class="summary-row total"><span>🪙 Tổng kết ngày (${netTotal >= 0 ? `+${netTotal}` : netTotal}) • Số dư hiện tại:</span><b>${currentMoney} Xu Mây</b></div>
      </div>
      <div style="text-align:right;">
        <button id="btn-summary-next" class="pixel-btn primary">🌅 Chào Ngày Mới (Ngày ${stats.nextDay})</button>
      </div>
    `;
    modalBox.querySelector('#btn-summary-next')!.addEventListener('click', onContinue);
  }

  public renderIntroCutscene(modalBox: HTMLElement, onFinish: () => void): void {
    this.cleanup();
    let slideIdx = 0;

    modalBox.innerHTML = `
      <div class="modal-header">
        <h2>⛵ Hành Trình Lên Đảo Trà Trên Mây</h2>
        <button id="btn-intro-skip" class="pixel-btn small">Bỏ qua</button>
      </div>
      <div class="story-stage-wrap">
        <canvas id="intro-stage-canvas" width="640" height="300"></canvas>
        <div class="card-box" style="width:100%;font-size:16px;line-height:1.5;">
          <p id="intro-caption" style="margin:0;">${INTRO_SLIDES[0].caption}</p>
        </div>
      </div>
      <div style="margin-top:12px;text-align:right;">
        <button id="btn-intro-next" class="pixel-btn primary">${INTRO_SLIDES[0].buttonText}</button>
      </div>
    `;

    const canvas = modalBox.querySelector('#intro-stage-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const captionEl = modalBox.querySelector('#intro-caption')!;
    const nextBtn = modalBox.querySelector('#btn-intro-next') as HTMLButtonElement;
    const skipBtn = modalBox.querySelector('#btn-intro-skip') as HTMLButtonElement;

    let tick = 0;
    const drawFrame = () => {
      tick += 0.025;
      storybookArt.drawIntroCutsceneCanvas(ctx, canvas.width, canvas.height, slideIdx, tick);
      this.animRafId = requestAnimationFrame(drawFrame);
    };
    drawFrame();

    const finishIntro = () => {
      this.cleanup();
      onFinish();
    };
    skipBtn.addEventListener('click', finishIntro);
    nextBtn.addEventListener('click', () => {
      if (slideIdx + 1 < INTRO_SLIDES.length) {
        slideIdx += 1;
        captionEl.textContent = INTRO_SLIDES[slideIdx].caption;
        nextBtn.textContent = INTRO_SLIDES[slideIdx].buttonText;
      } else {
        finishIntro();
      }
    });
  }

  public renderGrandmaLetterModal(
    modalBox: HTMLElement,
    letter: GrandmaLetterDef,
    onClose: () => void,
    ctaLabel = '🍵 Đã đọc thư!'
  ): void {
    this.cleanup();
    modalBox.innerHTML = `
      <div class="modal-header">
        <h2>✉️ ${letter.title}</h2>
      </div>
      <div class="card-box" style="padding:16px;font-size:16px;line-height:1.55;">
        ${letter.lines.map((l) => `<p style="margin:6px 0;">${l}</p>`).join('')}
      </div>
      <div style="margin-top:14px;text-align:right;">
        <button id="btn-story-letter-ok" class="pixel-btn primary">${ctaLabel}</button>
      </div>
    `;
    modalBox.querySelector('#btn-story-letter-ok')!.addEventListener('click', onClose);
  }

  public renderLanternFestivalModal(modalBox: HTMLElement, onFinish: () => void): void {
    this.cleanup();
    modalBox.innerHTML = `
      <div class="modal-header">
        <h2>🏮 Lễ Hội Thả Đèn Mây — Ngày 24 Xuân</h2>
      </div>
      <div class="story-stage-wrap">
        <canvas id="festival-stage-canvas" width="640" height="300"></canvas>
        <div class="card-box" style="width:100%;font-size:14px;line-height:1.45;">
          ${LANTERN_FESTIVAL_WISHES.map(
            (w) => `<div style="margin:3px 0;"><b>${w.name}:</b> ${w.wish}</div>`
          ).join('')}
        </div>
      </div>
      <div style="margin-top:12px;text-align:right;">
        <button id="btn-festival-release" class="pixel-btn primary">✨ Thả Đèn Lên Trời Đêm!</button>
      </div>
    `;

    const canvas = modalBox.querySelector('#festival-stage-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const lanterns = Array.from({ length: 22 }, (_, idx) => ({
      x: 36 + ((idx * 37) % 568),
      y: 35 + (idx * 29) % 225,
      speed: 18 + (idx % 4) * 7,
      phase: idx * 0.7,
    }));

    let t = 0;
    const drawFestival = () => {
      t += 0.025;
      storybookArt.drawLanternFestivalCanvas(ctx, canvas.width, canvas.height, lanterns, t);
      this.animRafId = requestAnimationFrame(drawFestival);
    };
    drawFestival();

    modalBox.querySelector('#btn-festival-release')!.addEventListener('click', () => {
      this.cleanup();
      onFinish();
    });
  }

  public renderSpringFinaleModal(
    modalBox: HTMLElement,
    stats: SpringFinaleStats,
    onContinueFreeplay: () => void
  ): void {
    this.cleanup();
    const npcIds = Object.keys(NPCS) as NpcId[];

    modalBox.innerHTML = `
      <div class="modal-header">
        <h2>🌸 Tổng Kết Mùa Xuân — Trà Quán Trên Mây</h2>
      </div>
      <div class="card-box" style="margin-bottom:10px;background:#fff4d8;">
        <strong>✨ Chúc mừng! Bạn đã khép lại trọn vẹn 28 ngày Mùa Xuân đầu tiên trên đảo!</strong>
        <span style="font-size:14px;">Từ một quán trà phủ bụi, nơi đây đã trở thành mái nhà ấm áp giữa tầng mây.</span>
      </div>
      <div class="finale-stat-grid">
        <div class="card-box"><div class="summary-row" style="border:none;"><span>🍵 Tách trà đã pha:</span><b>${stats.totalTeasBrewed}</b></div></div>
        <div class="card-box"><div class="summary-row" style="border:none;"><span>😊 Khách đã phục vụ:</span><b>${stats.totalCustomersServed}</b></div></div>
        <div class="card-box"><div class="summary-row" style="border:none;"><span>📖 Công thức trà:</span><b>${stats.unlockedRecipesCount}/5</b></div></div>
        <div class="card-box"><div class="summary-row" style="border:none;"><span>✉️ Thư Bà Ngoại:</span><b>${stats.unlockedLettersCount}/${stats.totalLettersCount}</b></div></div>
        <div class="card-box"><div class="summary-row" style="border:none;"><span>🪙 Tổng Xu Mây kiếm được:</span><b>${stats.totalMoneyEarned} Xu</b></div></div>
        <div class="card-box"><div class="summary-row" style="border:none;"><span>🏮 Lễ Đèn Mây 24 Xuân:</span><b>${stats.lanternFestivalDone ? '✓ Đã tham dự' : 'Đang chờ'}</b></div></div>
      </div>
      <div class="finale-npc-row" style="margin-bottom:12px;">
        ${npcIds
          .map((id) => {
            const def = NPCS[id];
            const h = stats.npcHearts[id] ?? 0;
            return `
              <div class="card-box" style="align-items:center;text-align:center;">
                <img src="${storybookArt.getPortraitUrl(id, h >= 4 ? 'happy' : 'normal')}" style="width:52px;height:52px;border:2px solid #2b1d14;border-radius:6px;" alt="${def.name}" />
                <strong>${def.name}</strong>
                <span style="color:#b8433a;font-size:13px;">${'♥'.repeat(h)}${'♡'.repeat(10 - h)} (${h}/10)</span>
              </div>
            `;
          })
          .join('')}
      </div>
      <div class="card-box" style="margin-bottom:12px;">
        <div style="font-size:14px;">💌 <i>"Mùa Xuân khép lại, nhưng hương trà trên mây vẫn còn mãi. Hãy tiếp tục trồng trà, pha chế, đón khách và trang trí đảo theo cách của riêng cháu nhé!"</i></div>
      </div>
      <div style="text-align:right;">
        <button id="btn-finale-continue" class="pixel-btn primary">🌱 Tiếp Tục Chơi Tự Do (Vòng Xuân Mới)</button>
      </div>
    `;
    modalBox.querySelector('#btn-finale-continue')!.addEventListener('click', onContinueFreeplay);
  }
}

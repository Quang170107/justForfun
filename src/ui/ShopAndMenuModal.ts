import { pixelArt } from '../art/pixelArtGenerator';
import { ITEMS } from '../data/crops';
import { GRANDMA_LETTER_LINES } from '../data/dialogues';
import { InventorySlot, ItemId, UpgradesState } from '../data/types';
import { SHOP_SEEDS, SHOP_UPGRADES } from '../systems/ShopSystem';

export class ShopAndMenuModal {
  public renderShop(
    modalBox: HTMLElement,
    money: number,
    inventory: (InventorySlot | null)[],
    upgrades: UpgradesState,
    onBuyItem: (itemId: ItemId) => void,
    onBuyUpgrade: (upgradeId: keyof UpgradesState, price: number) => void,
    onSellSlot: (slotIdx: number) => void,
    onClose: () => void
  ): void {
    modalBox.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `<h2>🌱 Sạp Hạt Giống Bé Sương &nbsp;|&nbsp; 🪙 ${money} Xu Mây</h2>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'pixel-btn small';
    closeBtn.textContent = 'Đóng (Esc)';
    closeBtn.onclick = onClose;
    header.appendChild(closeBtn);
    modalBox.appendChild(header);

    const sec1 = document.createElement('h3');
    sec1.style.margin = '0 0 8px';
    sec1.textContent = 'Hạt Giống & Mật Ong';
    modalBox.appendChild(sec1);

    const seedList = document.createElement('div');
    seedList.className = 'shop-list';
    for (const id of SHOP_SEEDS) {
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
      btn.textContent = `Mua (${price} Xu Mây)`;
      btn.disabled = money < price;
      btn.onclick = () => {
        onBuyItem(id);
        this.renderShop(modalBox, money - price >= 0 ? money : money, inventory, upgrades, onBuyItem, onBuyUpgrade, onSellSlot, onClose);
      };
      card.appendChild(btn);
      seedList.appendChild(card);
    }
    modalBox.appendChild(seedList);

    const sec2 = document.createElement('h3');
    sec2.style.margin = '16px 0 8px';
    sec2.textContent = 'Nâng Cấp & Trang Trí Quán';
    modalBox.appendChild(sec2);

    const upgList = document.createElement('div');
    upgList.className = 'shop-list';
    for (const u of SHOP_UPGRADES) {
      const owned =
        u.id === 'wateringCanLevel' ? upgrades.wateringCanLevel >= 2 : Boolean(upgrades[u.id]);
      const card = document.createElement('div');
      card.className = 'card-box';
      card.innerHTML = `
        <strong>${u.name}</strong>
        <div style="font-size:12px;">${u.description}</div>
      `;
      const btn = document.createElement('button');
      btn.className = `pixel-btn small ${owned ? '' : 'primary'}`;
      btn.textContent = owned ? '✓ Đã sở hữu' : `Nâng cấp (${u.price} Xu)`;
      btn.disabled = owned || money < u.price;
      btn.onclick = () => onBuyUpgrade(u.id, u.price);
      card.appendChild(btn);
      upgList.appendChild(card);
    }
    modalBox.appendChild(upgList);

    // Bán nhanh nông sản hoặc trà dư
    const sellable: { idx: number; slot: InventorySlot }[] = [];
    inventory.forEach((s, idx) => {
      if (s && ITEMS[s.itemId].sellPrice > 0) sellable.push({ idx, slot: s });
    });

    if (sellable.length > 0) {
      const sec3 = document.createElement('h3');
      sec3.style.margin = '16px 0 8px';
      sec3.textContent = 'Bán Vật Phẩm (Nhận Xu Mây ngay)';
      modalBox.appendChild(sec3);

      const sellRow = document.createElement('div');
      sellRow.className = 'chip-grid';
      for (const { idx, slot } of sellable) {
        const def = ITEMS[slot.itemId];
        const val = Math.round(def.sellPrice * (slot.quality === 3 ? 1.3 : slot.quality === 2 ? 1.15 : 1));
        const btn = document.createElement('button');
        btn.className = 'choice-chip';
        btn.innerHTML = `<img src="${pixelArt.getIconUrl(def.iconKey)}" /> Bán 1 ${def.name} (+${val} Xu)`;
        btn.onclick = () => onSellSlot(idx);
        sellRow.appendChild(btn);
      }
      modalBox.appendChild(sellRow);
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
    onToggleAudio: () => void,
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
          • <b>E / Space:</b> Dùng công cụ trên đồi trà, phơi/sao lá, pha trà, phục vụ khách hoặc nói chuyện NPC<br/>
          • <b>1–9:</b> Chọn ô Hotbar (1: Cuốc, 2: Bình tưới, 3: Giỏ/Tay không, 4+: Hạt giống & Trà)<br/>
          • <b>Q / R:</b> Xoay góc nhìn camera 90° &nbsp;|&nbsp; <b>Tab / I:</b> Mở Túi đồ & Sổ Công Thức
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
        <button id="btn-menu-save" class="pixel-btn primary">💾 Lưu Game Ngay</button>
        <button id="btn-menu-audio" class="pixel-btn">${bgmEnabled ? '🔊 Nhạc nền: BẬT' : '🔇 Nhạc nền: TẮT'}</button>
        <button id="btn-menu-reset" class="pixel-btn" style="background:#f28b82;">🗑️ Chơi Lại Từ Đầu</button>
      </div>
    `;
    modalBox.querySelector('#btn-menu-close')!.addEventListener('click', onClose);
    modalBox.querySelector('#btn-menu-save')!.addEventListener('click', onSaveNow);
    modalBox.querySelector('#btn-menu-audio')!.addEventListener('click', onToggleAudio);
    modalBox.querySelector('#btn-menu-reset')!.addEventListener('click', onResetSave);
  }
}

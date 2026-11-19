import { pixelArt } from '../art/pixelArtGenerator';
import { ITEMS } from '../data/crops';
import { NPCS } from '../data/npcs';
import { getSteepLabel, getTempLabel, RECIPES } from '../data/recipes';
import { InventorySlot, NpcId } from '../data/types';
import { RelationshipSystem } from '../systems/RelationshipSystem';
import { TooltipCallbacks } from './HUD';

export class InventoryModal {
  private activeTab: 'bag' | 'book' = 'bag';
  private swapSourceIdx: number | null = null;

  constructor(private tooltip: TooltipCallbacks) {}

  public render(
    modalBox: HTMLElement,
    inventory: (InventorySlot | null)[],
    unlockedRecipes: Set<string>,
    relations: RelationshipSystem,
    onSwapSlots: (a: number, b: number) => void,
    onClose: () => void
  ): void {
    modalBox.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `<h2>🎒 Túi Đồ & Sổ Quán Trà</h2>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'pixel-btn small';
    closeBtn.textContent = 'Đóng (Esc)';
    closeBtn.onclick = onClose;
    header.appendChild(closeBtn);
    modalBox.appendChild(header);

    const tabs = document.createElement('div');
    tabs.className = 'tab-row';
    const bagBtn = document.createElement('button');
    bagBtn.className = `pixel-btn small ${this.activeTab === 'bag' ? 'primary' : ''}`;
    bagBtn.textContent = '🎒 Túi Đồ (24 ô)';
    bagBtn.onclick = () => {
      this.activeTab = 'bag';
      this.swapSourceIdx = null;
      this.render(modalBox, inventory, unlockedRecipes, relations, onSwapSlots, onClose);
    };

    const bookBtn = document.createElement('button');
    bookBtn.className = `pixel-btn small ${this.activeTab === 'book' ? 'primary' : ''}`;
    bookBtn.textContent = `📖 Sổ Công Thức (${unlockedRecipes.size}/5) & NPC`;
    bookBtn.onclick = () => {
      this.activeTab = 'book';
      this.render(modalBox, inventory, unlockedRecipes, relations, onSwapSlots, onClose);
    };
    tabs.append(bagBtn, bookBtn);
    modalBox.appendChild(tabs);

    if (this.activeTab === 'bag') {
      const hint = document.createElement('p');
      hint.style.margin = '0 0 10px';
      hint.style.fontSize = '14px';
      hint.textContent =
        'Hàng đầu tiên (1–9) là thanh Hotbar. Nhấp hai ô để đổi vị trí hoặc gộp chồng vật phẩm cùng loại & cùng chất lượng ★.';
      modalBox.appendChild(hint);

      const grid = document.createElement('div');
      grid.className = 'inv-grid';

      inventory.forEach((slot, idx) => {
        const div = document.createElement('div');
        div.className = `inv-slot ${this.swapSourceIdx === idx ? 'active' : ''}`;
        if (idx < 9) {
          const k = document.createElement('span');
          k.className = 'slot-key';
          k.textContent = String(idx + 1);
          div.appendChild(k);
        }
        if (slot) {
          const def = ITEMS[slot.itemId];
          const img = document.createElement('img');
          img.src = pixelArt.getIconUrl(def.iconKey);
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

        div.onclick = () => {
          this.tooltip.hide();
          if (this.swapSourceIdx === null) {
            this.swapSourceIdx = idx;
          } else {
            onSwapSlots(this.swapSourceIdx, idx);
            this.swapSourceIdx = null;
          }
          this.render(modalBox, inventory, unlockedRecipes, relations, onSwapSlots, onClose);
        };
        grid.appendChild(div);
      });

      modalBox.appendChild(grid);
    } else {
      const recTitle = document.createElement('h3');
      recTitle.style.margin = '0 0 8px';
      recTitle.textContent = '🍵 Sổ Công Thức Trà';
      modalBox.appendChild(recTitle);

      const list = document.createElement('div');
      list.className = 'recipe-list';
      for (const r of RECIPES) {
        const unlocked = unlockedRecipes.has(r.id);
        const card = document.createElement('div');
        card.className = 'card-box';
        const iconUrl = pixelArt.getIconUrl(ITEMS[r.resultItemId].iconKey);

        if (unlocked) {
          const addonNames = r.addons.length ? r.addons.map((a) => ITEMS[a].name).join(' + ') : 'Không phụ liệu';
          card.innerHTML = `
            <div class="card-top">
              <img src="${iconUrl}" alt="${r.name}" />
              <div>
                <strong>${r.name}</strong>
                <div style="font-size:12px;color:#6b3e26;">Giá bán: ${r.price} Xu Mây</div>
              </div>
            </div>
            <div style="font-size:13px;">• Chính: <b>${ITEMS[r.baseIngredient].name}</b></div>
            <div style="font-size:13px;">• Phụ liệu: ${addonNames}</div>
            <div style="font-size:13px;">• Nước: ${getTempLabel(r.waterTemp)} • Ủ: ${getSteepLabel(r.steepTime)}</div>
          `;
        } else {
          card.innerHTML = `
            <div class="card-top">
              <img src="${iconUrl}" style="filter:brightness(0.25);" alt="Chưa mở" />
              <div>
                <strong>??? (${r.name})</strong>
                <div style="font-size:12px;color:#8f5a34;">Chưa khám phá — hãy thử pha ở Quầy Trà!</div>
              </div>
            </div>
            <div style="font-size:13px;font-style:italic;">Gợi ý: "${r.hints[0]}"</div>
          `;
        }
        list.appendChild(card);
      }
      modalBox.appendChild(list);

      const npcTitle = document.createElement('h3');
      npcTitle.style.margin = '16px 0 8px';
      npcTitle.textContent = '💛 Tình Cảm Bạn Bè Trên Đảo';
      modalBox.appendChild(npcTitle);

      const npcList = document.createElement('div');
      npcList.className = 'recipe-list';
      (Object.keys(NPCS) as NpcId[]).forEach((id) => {
        const def = NPCS[id];
        const hearts = relations.getHearts(id);
        const card = document.createElement('div');
        card.className = 'card-box';
        card.innerHTML = `
          <div class="card-top">
            <img src="${pixelArt.getPortraitUrl(id, 'happy')}" style="width:48px;height:48px;border:2px solid #2b1d14;" />
            <div>
              <strong>${def.name}</strong>
              <div style="font-size:12px;">${def.role}</div>
              <div style="color:#b8433a;font-size:14px;">${'♥'.repeat(hearts)}${'♡'.repeat(10 - hearts)} (${hearts}/10)</div>
            </div>
          </div>
          <div style="font-size:12px;">Trà yêu thích: <b>${ITEMS[def.favoriteTea].name}</b> • Ký ức đã mở: ${relations.relations[id].seenMemories.length}/4</div>
        `;
        npcList.appendChild(card);
      });
      modalBox.appendChild(npcList);
    }
  }
}

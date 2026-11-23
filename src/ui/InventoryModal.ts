import { pixelArt } from '../art/pixelArtGenerator';
import { ITEMS } from '../data/crops';
import { NPCS } from '../data/npcs';
import { getSteepLabel, getTempLabel, RECIPES } from '../data/recipes';
import { InventorySlot, MemoryCutscene, NpcId } from '../data/types';
import { RelationshipSystem } from '../systems/RelationshipSystem';
import { TooltipCallbacks } from './HUD';

export type InventoryModalTab = 'bag' | 'book' | 'relations';

export class InventoryModal {
  private activeTab: InventoryModalTab = 'bag';
  private swapSourceIdx: number | null = null;

  constructor(private tooltip: TooltipCallbacks) {}

  public setActiveTab(tab: InventoryModalTab): void {
    this.activeTab = tab;
    this.swapSourceIdx = null;
  }

  public render(
    modalBox: HTMLElement,
    inventory: (InventorySlot | null)[],
    unlockedRecipes: Set<string>,
    relations: RelationshipSystem,
    npcLocations: Record<NpcId, string>,
    onSwapSlots: (a: number, b: number) => void,
    onReplayMemory: (npcId: NpcId, mem: MemoryCutscene) => void,
    onClose: () => void
  ): void {
    modalBox.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `<h2>🎒 Túi Đồ, Công Thức & Quan Hệ</h2>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'pixel-btn small';
    closeBtn.textContent = 'Đóng (Esc)';
    closeBtn.onclick = onClose;
    header.appendChild(closeBtn);
    modalBox.appendChild(header);

    const tabs = document.createElement('div');
    tabs.className = 'tab-row';
    const makeTabBtn = (id: InventoryModalTab, label: string) => {
      const btn = document.createElement('button');
      btn.className = `pixel-btn small ${this.activeTab === id ? 'primary' : ''}`;
      btn.textContent = label;
      btn.onclick = () => {
        this.activeTab = id;
        this.swapSourceIdx = null;
        this.render(
          modalBox,
          inventory,
          unlockedRecipes,
          relations,
          npcLocations,
          onSwapSlots,
          onReplayMemory,
          onClose
        );
      };
      return btn;
    };

    tabs.append(
      makeTabBtn('bag', '🎒 Túi Đồ (24 ô)'),
      makeTabBtn('book', `📖 Sổ Công Thức (${unlockedRecipes.size}/5)`),
      makeTabBtn('relations', '💛 Quan Hệ (4 NPC)')
    );
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
          this.render(
            modalBox,
            inventory,
            unlockedRecipes,
            relations,
            npcLocations,
            onSwapSlots,
            onReplayMemory,
            onClose
          );
        };
        grid.appendChild(div);
      });

      modalBox.appendChild(grid);
    } else if (this.activeTab === 'book') {
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
                <strong>???</strong>
                <div style="font-size:12px;color:#8f5a34;">Chưa khám phá — hãy thử pha ở Quầy Trà!</div>
              </div>
            </div>
            <div style="font-size:13px;font-style:italic;">Gợi ý: "${r.hints[0]}"</div>
          `;
        }
        list.appendChild(card);
      }
      modalBox.appendChild(list);
    } else {
      const npcTitle = document.createElement('h3');
      npcTitle.style.margin = '0 0 8px';
      npcTitle.textContent = '💛 Quan Hệ & Ký Ức Bạn Bè Trên Đảo';
      modalBox.appendChild(npcTitle);

      const npcList = document.createElement('div');
      npcList.className = 'recipe-list';
      (Object.keys(NPCS) as NpcId[]).forEach((id) => {
        const def = NPCS[id];
        const rel = relations.relations[id];
        const hearts = relations.getHearts(id);
        const pts = relations.getPoints(id);
        const subPts = hearts >= 10 ? 100 : pts % 100;
        const card = document.createElement('div');
        card.className = 'card-box';

        const top = document.createElement('div');
        top.className = 'card-top';
        top.innerHTML = `
          <img src="${pixelArt.getPortraitUrl(id, hearts >= 5 ? 'happy' : 'normal')}" style="width:64px;height:64px;border:3px solid #2b1d14;image-rendering:pixelated;" alt="${def.name}" />
          <div style="flex:1;">
            <strong>${def.name}</strong>
            <div style="font-size:12px;color:#6b3e26;">${def.role}</div>
            <div style="color:#b8433a;font-size:14px;">${'♥'.repeat(hearts)}${'♡'.repeat(10 - hearts)} (${hearts}/10)</div>
            <div class="heart-progress-bar" title="Điểm thân thiết: ${pts}/1000"><div class="heart-progress-fill" style="width:${subPts}%"></div></div>
          </div>
        `;
        card.appendChild(top);

        const meta = document.createElement('div');
        meta.className = 'relation-meta';
        meta.innerHTML = `
          <div>📍 <b>Đang ở:</b> ${npcLocations[id] ?? 'Trên đảo'}</div>
          <div>
            <span>${rel.talkedToday ? '💬 Đã trò chuyện ✓' : '💬 Chưa nói chuyện'}</span> •
            <span>${rel.giftedToday ? '🎁 Đã tặng quà ✓' : '🎁 Có thể tặng quà'}</span>
          </div>
          <div>🍵 <b>Thích nhất:</b> ${ITEMS[def.favoriteTea].name}</div>
          <div>👍 <b>Thích:</b> ${def.likedItems.slice(0, 3).map((x) => ITEMS[x].name).join(', ')}</div>
          <div>👎 <b>Ghét:</b> ${def.dislikedItems.slice(0, 2).map((x) => ITEMS[x].name).join(', ')}</div>
        `;
        card.appendChild(meta);

        const memRow = document.createElement('div');
        memRow.className = 'memory-chip-row';
        for (const mem of def.memories) {
          const seen = rel.seenMemories.includes(mem.heartsRequired);
          const unlocked = seen || hearts >= mem.heartsRequired;
          if (unlocked) {
            const btn = document.createElement('button');
            btn.className = `memory-chip unlocked`;
            btn.textContent = seen ? `▶ Ký ức ${mem.heartsRequired}♥ ✓` : `▶ Mở ký ức ${mem.heartsRequired}♥ ✨`;
            btn.title = mem.title;
            btn.onclick = () => onReplayMemory(id, mem);
            memRow.appendChild(btn);
          } else {
            const span = document.createElement('span');
            span.className = 'memory-chip';
            span.textContent = `🔒 ${mem.heartsRequired}♥`;
            memRow.appendChild(span);
          }
        }
        card.appendChild(memRow);
        npcList.appendChild(card);
      });
      modalBox.appendChild(npcList);
    }
  }
}

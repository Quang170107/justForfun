import { pixelArt } from '../art/pixelArtGenerator';
import { storybookArt } from '../art/storybookArt';
import { ITEMS } from '../data/crops';
import { NPCS } from '../data/npcs';
import { getSteepLabel, getTempLabel, RECIPES } from '../data/recipes';
import { GrandmaLetterDef, GRANDMA_LETTERS, SPRING_CALENDAR_EVENTS } from '../data/story';
import { InventorySlot, MemoryCutscene, NpcId, StoryState } from '../data/types';
import { RelationshipSystem } from '../systems/RelationshipSystem';
import { TooltipCallbacks } from './HUD';

export type InventoryModalTab = 'bag' | 'book' | 'relations' | 'story';

export class InventoryModal {
  private activeTab: InventoryModalTab = 'bag';
  private swapSourceIdx: number | null = null;
  private dragSourceIdx: number | null = null;

  constructor(private tooltip: TooltipCallbacks) {}

  public setActiveTab(tab: InventoryModalTab): void {
    this.activeTab = tab;
    this.swapSourceIdx = null;
    this.dragSourceIdx = null;
  }

  private createBagSlotEl(
    idx: number,
    slot: InventorySlot | null,
    onSwapAndRerender: (fromIdx: number, toIdx: number) => void,
    onSelectSwap: () => void
  ): HTMLElement {
    const div = document.createElement('div');
    div.className = `inv-slot ${this.swapSourceIdx === idx ? 'active' : ''}`;
    div.dataset.slotIndex = String(idx);

    if (idx < 9) {
      const k = document.createElement('span');
      k.className = 'slot-key';
      k.textContent = String(idx + 1);
      div.appendChild(k);
    }

    if (slot) {
      div.draggable = true;
      const def = ITEMS[slot.itemId];
      const img = document.createElement('img');
      img.src = pixelArt.getIconUrl(def.iconKey);
      img.draggable = false;
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

      div.addEventListener('mouseenter', (e) => {
        if (this.dragSourceIdx === null) this.tooltip.show(slot, e.clientX, e.clientY);
      });
      div.addEventListener('mousemove', (e) => {
        if (this.dragSourceIdx === null) this.tooltip.show(slot, e.clientX, e.clientY);
      });
      div.addEventListener('mouseleave', () => this.tooltip.hide());

      div.addEventListener('dragstart', (e) => {
        this.dragSourceIdx = idx;
        this.tooltip.hide();
        div.classList.add('dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(idx));
        }
      });

      div.addEventListener('dragend', () => {
        this.dragSourceIdx = null;
        div.classList.remove('dragging');
      });
    }

    div.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      if (this.dragSourceIdx !== idx) div.classList.add('drag-over');
    });

    div.addEventListener('dragleave', () => {
      div.classList.remove('drag-over');
    });

    div.addEventListener('drop', (e) => {
      e.preventDefault();
      div.classList.remove('drag-over');
      const raw = e.dataTransfer?.getData('text/plain');
      const fromIdx =
        raw !== undefined && raw !== '' ? Number.parseInt(raw, 10) : this.dragSourceIdx;
      this.dragSourceIdx = null;
      if (typeof fromIdx === 'number' && Number.isInteger(fromIdx) && fromIdx !== idx) {
        onSwapAndRerender(fromIdx, idx);
      }
    });

    div.onclick = onSelectSwap;
    return div;
  }

  public render(
    modalBox: HTMLElement,
    inventory: (InventorySlot | null)[],
    unlockedRecipes: Set<string>,
    relations: RelationshipSystem,
    npcLocations: Record<NpcId, string>,
    onSwapSlots: (a: number, b: number) => void,
    onReplayMemory: (npcId: NpcId, mem: MemoryCutscene) => void,
    onClose: () => void,
    onUiClick?: () => void,
    storyInfo?: {
      story: StoryState;
      currentDay: number;
      onReadLetter: (letter: GrandmaLetterDef) => void;
    }
  ): void {
    modalBox.innerHTML = '';

    const rerenderSelf = () =>
      this.render(
        modalBox,
        inventory,
        unlockedRecipes,
        relations,
        npcLocations,
        onSwapSlots,
        onReplayMemory,
        onClose,
        onUiClick,
        storyInfo
      );

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `<h2>🎒 Túi Đồ, Công Thức, Quan Hệ & Thư Xuân</h2>`;
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
        onUiClick?.();
        this.activeTab = id;
        this.swapSourceIdx = null;
        this.dragSourceIdx = null;
        rerenderSelf();
      };
      return btn;
    };

    const letterCount = storyInfo ? storyInfo.story.unlockedLetters.length : 1;
    tabs.append(
      makeTabBtn('bag', '🎒 Túi Đồ (24 ô)'),
      makeTabBtn('book', `📖 Sổ Công Thức (${unlockedRecipes.size}/5)`),
      makeTabBtn('relations', '💛 Quan Hệ (4 NPC)'),
      makeTabBtn('story', `📜 Thư & Lịch Xuân (${letterCount}/${GRANDMA_LETTERS.length})`)
    );
    modalBox.appendChild(tabs);

    if (this.activeTab === 'bag') {
      const hint = document.createElement('p');
      hint.style.margin = '0 0 8px';
      hint.style.fontSize = '14px';
      hint.textContent =
        'Kéo thả hoặc nhấp 2 ô bất kỳ để sắp xếp, chuyển lên Hotbar (1–9) hoặc gộp chồng vật phẩm cùng chất lượng ★.';
      modalBox.appendChild(hint);

      const performSwap = (fromIdx: number, toIdx: number) => {
        this.tooltip.hide();
        onSwapSlots(fromIdx, toIdx);
        onUiClick?.();
        this.swapSourceIdx = null;
        rerenderSelf();
      };

      const makeSlot = (idx: number) =>
        this.createBagSlotEl(idx, inventory[idx], performSwap, () => {
          this.tooltip.hide();
          onUiClick?.();
          if (this.swapSourceIdx === null) {
            this.swapSourceIdx = idx;
            rerenderSelf();
          } else {
            const from = this.swapSourceIdx;
            this.swapSourceIdx = null;
            if (from !== idx) onSwapSlots(from, idx);
            rerenderSelf();
          }
        });

      const hotbarLabel = document.createElement('div');
      hotbarLabel.className = 'inv-section-label';
      hotbarLabel.textContent = '🔧 Thanh Công Cụ Nhanh (Hotbar 1–9)';
      modalBox.appendChild(hotbarLabel);

      const hotbarRow = document.createElement('div');
      hotbarRow.className = 'inv-hotbar-row';
      for (let i = 0; i < 9; i++) {
        hotbarRow.appendChild(makeSlot(i));
      }
      modalBox.appendChild(hotbarRow);

      const bagLabel = document.createElement('div');
      bagLabel.className = 'inv-section-label';
      bagLabel.textContent = '🎒 Ngăn Chứa Túi Đồ (15 ô)';
      modalBox.appendChild(bagLabel);

      const bagGrid = document.createElement('div');
      bagGrid.className = 'inv-bag-grid';
      for (let i = 9; i < 24; i++) {
        bagGrid.appendChild(makeSlot(i));
      }
      modalBox.appendChild(bagGrid);
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
    } else if (this.activeTab === 'relations') {
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
          <img src="${storybookArt.getPortraitUrl(id, hearts >= 5 ? 'happy' : 'normal')}" style="width:68px;height:68px;border:3px solid #2b1d14;border-radius:6px;" alt="${def.name}" />
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
    } else {
      const currentDay = storyInfo?.currentDay ?? 1;
      const unlockedSet = new Set(storyInfo?.story.unlockedLetters ?? ['letter_1_welcome']);

      const letterHeading = document.createElement('h3');
      letterHeading.style.margin = '0 0 8px';
      letterHeading.textContent = `✉️ Hộp Thư Của Bà Ngoại (${unlockedSet.size}/${GRANDMA_LETTERS.length})`;
      modalBox.appendChild(letterHeading);

      const letterGrid = document.createElement('div');
      letterGrid.className = 'recipe-list';
      letterGrid.style.marginBottom = '14px';
      for (const letter of GRANDMA_LETTERS) {
        const unlocked = unlockedSet.has(letter.id);
        const card = document.createElement('div');
        card.className = 'card-box';
        if (unlocked) {
          card.innerHTML = `
            <strong>✉️ ${letter.title}</strong>
            <div style="font-size:13px;color:#6b3e26;">${letter.lines[1]}</div>
          `;
          const btn = document.createElement('button');
          btn.className = 'pixel-btn small primary';
          btn.textContent = '📖 Đọc lại lá thư';
          btn.onclick = () => {
            onUiClick?.();
            storyInfo?.onReadLetter(letter);
          };
          card.appendChild(btn);
        } else {
          card.innerHTML = `
            <strong style="color:#8f5a34;">🔒 Thư #${letter.order} — Chưa tìm thấy</strong>
            <div style="font-size:13px;">Gợi ý: ${letter.unlockHint}</div>
          `;
        }
        letterGrid.appendChild(card);
      }
      modalBox.appendChild(letterGrid);

      const calHeading = document.createElement('h3');
      calHeading.style.margin = '0 0 6px';
      calHeading.textContent = `📅 Lịch 28 Ngày Mùa Xuân (Hôm nay: Ngày ${currentDay})`;
      modalBox.appendChild(calHeading);

      const calGrid = document.createElement('div');
      calGrid.className = 'spring-calendar-grid';
      const eventMap = new Map(SPRING_CALENDAR_EVENTS.map((ev) => [ev.day, ev]));
      for (let d = 1; d <= 28; d++) {
        const ev = eventMap.get(d);
        const cell = document.createElement('div');
        const classes = ['calendar-day-cell'];
        if (d < currentDay) classes.push('past');
        if (d === currentDay) classes.push('today');
        if (ev?.kind === 'festival') classes.push('festival');
        if (ev?.kind === 'finale') classes.push('finale');
        cell.className = classes.join(' ');
        if (ev) cell.title = `${ev.title} — ${ev.description}`;

        cell.innerHTML = `
          <div><b>${d}</b>${d === currentDay ? ' ★' : ''}</div>
          <div class="calendar-tag">${ev ? ev.shortTag : '·'}</div>
        `;
        calGrid.appendChild(cell);
      }
      modalBox.appendChild(calGrid);

      const todayEv = eventMap.get(currentDay);
      const nextEv = SPRING_CALENDAR_EVENTS.find((ev) => ev.day >= currentDay);
      const evNote = document.createElement('div');
      evNote.className = 'card-box';
      evNote.style.marginTop = '10px';
      evNote.innerHTML = todayEv
        ? `<strong>🌟 Sự kiện hôm nay — ${todayEv.title}</strong><span style="font-size:13px;">${todayEv.description}</span>`
        : nextEv
          ? `<strong>📌 Sắp tới: ${nextEv.title}</strong><span style="font-size:13px;">${nextEv.description}</span>`
          : '';
      if (evNote.innerHTML) modalBox.appendChild(evNote);
    }
  }
}

import { pixelArt } from '../art/pixelArtGenerator';
import { ITEMS, ROASTABLE_ITEMS } from '../data/crops';
import { getSteepLabel, getTempLabel, RECIPES } from '../data/recipes';
import { InventorySlot, TeaSteepTime, TeaWaterTemp } from '../data/types';
import { BrewResult } from '../systems/BrewingSystem';

export class BrewingScreen {
  private selectedBaseSlot: number | null = null;
  private selectedAddonSlots: number[] = [];
  private waterTemp: TeaWaterTemp = 'warm';
  private steepTime: TeaSteepTime = 'short';

  private roastRaf: number | null = null;

  public cleanup(): void {
    if (this.roastRaf !== null) {
      cancelAnimationFrame(this.roastRaf);
      this.roastRaf = null;
    }
  }

  public renderBrewingCounter(
    modalBox: HTMLElement,
    inventory: (InventorySlot | null)[],
    unlockedRecipes: Set<string>,
    onExecuteBrew: (
      baseSlotIdx: number,
      addonSlotIndices: number[],
      temp: TeaWaterTemp,
      steep: TeaSteepTime
    ) => BrewResult | null,
    onClose: () => void
  ): void {
    this.cleanup();
    modalBox.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `<h2>🍵 Quầy Pha Trà Trên Mây</h2>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'pixel-btn small';
    closeBtn.textContent = 'Đóng (Esc)';
    closeBtn.onclick = onClose;
    header.appendChild(closeBtn);
    modalBox.appendChild(header);

    const surface = document.createElement('div');
    surface.className = 'brew-table-surface';

    // Cột trái: Bàn pha trà nhìn từ trên xuống
    const leftPanel = document.createElement('div');
    leftPanel.className = 'brew-panel-light';

    const baseSlots: { idx: number; slot: InventorySlot }[] = [];
    const addonSlots: { idx: number; slot: InventorySlot }[] = [];

    inventory.forEach((slot, idx) => {
      if (!slot) return;
      const def = ITEMS[slot.itemId];
      if (def.category === 'base') baseSlots.push({ idx, slot });
      if (def.category === 'addon' || slot.itemId === 'chrysanthemum_fresh' || slot.itemId === 'ginger_fresh') {
        addonSlots.push({ idx, slot });
      }
    });

    if (this.selectedBaseSlot !== null && !baseSlots.some((b) => b.idx === this.selectedBaseSlot)) {
      this.selectedBaseSlot = null;
    }
    this.selectedAddonSlots = this.selectedAddonSlots.filter((i) => addonSlots.some((a) => a.idx === i));

    const buildSectionTitle = (txt: string) => {
      const h = document.createElement('div');
      h.style.fontWeight = '700';
      h.style.fontSize = '14px';
      h.textContent = txt;
      return h;
    };

    leftPanel.appendChild(buildSectionTitle('1. Chọn Nguyên Liệu Chính (bắt buộc 1 món):'));
    const baseGrid = document.createElement('div');
    baseGrid.className = 'chip-grid';
    if (baseSlots.length === 0) {
      baseGrid.innerHTML = '<span style="font-size:13px;color:#8f5a34;">Chưa có lá trà/cúc/gừng trong túi!</span>';
    } else {
      for (const { idx, slot } of baseSlots) {
        const def = ITEMS[slot.itemId];
        const btn = document.createElement('button');
        btn.className = `choice-chip ${this.selectedBaseSlot === idx ? 'selected' : ''}`;
        btn.innerHTML = `<img src="${pixelArt.getIconUrl(def.iconKey)}" /> ${def.name} ×${slot.count}`;
        btn.onclick = () => {
          this.selectedBaseSlot = idx;
          this.renderBrewingCounter(modalBox, inventory, unlockedRecipes, onExecuteBrew, onClose);
        };
        baseGrid.appendChild(btn);
      }
    }
    leftPanel.appendChild(baseGrid);

    leftPanel.appendChild(buildSectionTitle('2. Phụ Liệu (tối đa 2 món):'));
    const addonGrid = document.createElement('div');
    addonGrid.className = 'chip-grid';
    if (addonSlots.length === 0) {
      addonGrid.innerHTML = '<span style="font-size:13px;color:#8f5a34;">Không có phụ liệu (vẫn pha Trà Xanh Thanh được!).</span>';
    } else {
      for (const { idx, slot } of addonSlots) {
        const def = ITEMS[slot.itemId];
        const isSel = this.selectedAddonSlots.includes(idx);
        const btn = document.createElement('button');
        btn.className = `choice-chip ${isSel ? 'selected' : ''}`;
        btn.innerHTML = `<img src="${pixelArt.getIconUrl(def.iconKey)}" /> ${def.name} ×${slot.count}`;
        btn.onclick = () => {
          if (isSel) {
            this.selectedAddonSlots = this.selectedAddonSlots.filter((i) => i !== idx);
          } else if (this.selectedAddonSlots.length < 2) {
            this.selectedAddonSlots.push(idx);
          }
          this.renderBrewingCounter(modalBox, inventory, unlockedRecipes, onExecuteBrew, onClose);
        };
        addonGrid.appendChild(btn);
      }
    }
    leftPanel.appendChild(addonGrid);

    leftPanel.appendChild(buildSectionTitle('3. Nhiệt Độ Nước & Thời Gian Ủ:'));
    const tempGrid = document.createElement('div');
    tempGrid.className = 'chip-grid';
    (['warm', 'hot', 'boiling'] as TeaWaterTemp[]).forEach((t) => {
      const btn = document.createElement('button');
      btn.className = `choice-chip ${this.waterTemp === t ? 'selected' : ''}`;
      btn.textContent = getTempLabel(t);
      btn.onclick = () => {
        this.waterTemp = t;
        this.renderBrewingCounter(modalBox, inventory, unlockedRecipes, onExecuteBrew, onClose);
      };
      tempGrid.appendChild(btn);
    });
    leftPanel.appendChild(tempGrid);

    const steepGrid = document.createElement('div');
    steepGrid.className = 'chip-grid';
    (['short', 'medium', 'long'] as TeaSteepTime[]).forEach((s) => {
      const btn = document.createElement('button');
      btn.className = `choice-chip ${this.steepTime === s ? 'selected' : ''}`;
      btn.textContent = `Ủ ${getSteepLabel(s)}`;
      btn.onclick = () => {
        this.steepTime = s;
        this.renderBrewingCounter(modalBox, inventory, unlockedRecipes, onExecuteBrew, onClose);
      };
      steepGrid.appendChild(btn);
    });
    leftPanel.appendChild(steepGrid);

    const brewBtn = document.createElement('button');
    brewBtn.className = 'pixel-btn primary';
    brewBtn.style.width = '100%';
    brewBtn.textContent = '🫖 Rót Nước Pha Trà!';
    brewBtn.disabled = this.selectedBaseSlot === null;
    brewBtn.onclick = () => {
      if (this.selectedBaseSlot === null) return;
      const res = onExecuteBrew(
        this.selectedBaseSlot,
        [...this.selectedAddonSlots],
        this.waterTemp,
        this.steepTime
      );
      if (res) {
        this.selectedBaseSlot = null;
        this.selectedAddonSlots = [];
        this.renderBrewingCounter(modalBox, inventory, unlockedRecipes, onExecuteBrew, onClose);
      }
    };
    leftPanel.appendChild(brewBtn);

    // Cột phải: Sổ Công Thức nhanh ngay trên quầy
    const rightPanel = document.createElement('div');
    rightPanel.className = 'brew-panel-light';
    rightPanel.innerHTML = `<div style="font-weight:700;font-size:15px;margin-bottom:8px;">📖 Sổ Công Thức (${unlockedRecipes.size}/5)</div>`;

    for (const r of RECIPES) {
      const known = unlockedRecipes.has(r.id);
      const row = document.createElement('div');
      row.style.borderBottom = '2px solid #d8be98';
      row.style.padding = '6px 0';
      row.style.fontSize = '13px';
      if (known) {
        const addonsTxt = r.addons.length ? ' + ' + r.addons.map((a) => ITEMS[a].name).join(' + ') : '';
        row.innerHTML = `<strong>${r.name}</strong><br/>${ITEMS[r.baseIngredient].name}${addonsTxt}<br/><span style="color:#6b3e26;">${getTempLabel(r.waterTemp)} • Ủ ${getSteepLabel(r.steepTime)}</span>`;
      } else {
        row.innerHTML = `<strong>${r.name}</strong> <span style="color:#8f5a34;">(Chưa mở)</span><br/><i>Gợi ý: ${r.description}</i>`;
      }
      rightPanel.appendChild(row);
    }

    surface.append(leftPanel, rightPanel);
    modalBox.appendChild(surface);
  }

  public renderRoastMiniGame(
    modalBox: HTMLElement,
    inventory: (InventorySlot | null)[],
    onFinishRoast: (slotIdx: number, accuracyScore: number) => void,
    onClose: () => void
  ): void {
    this.cleanup();
    modalBox.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `<h2>🔥 Chảo Sao Trà (Mini-Game)</h2>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'pixel-btn small';
    closeBtn.textContent = 'Đóng';
    closeBtn.onclick = () => {
      this.cleanup();
      onClose();
    };
    header.appendChild(closeBtn);
    modalBox.appendChild(header);

    const roastableSlots: { idx: number; slot: InventorySlot }[] = [];
    inventory.forEach((s, idx) => {
      if (s && ROASTABLE_ITEMS.includes(s.itemId)) {
        roastableSlots.push({ idx, slot: s });
      }
    });

    if (roastableSlots.length === 0) {
      modalBox.innerHTML += `<p>Bạn cần có <b>Lá Trà Xanh Tươi</b> hoặc <b>Trà Xanh Khô</b> trong túi để sao thành <b>Trà Sao Thơm</b>!</p>`;
      const back = document.createElement('button');
      back.className = 'pixel-btn';
      back.textContent = 'Quay lại';
      back.onclick = onClose;
      modalBox.appendChild(back);
      return;
    }

    let chosenSlotIdx = roastableSlots[0].idx;
    const pickDiv = document.createElement('div');
    pickDiv.innerHTML = '<div style="font-weight:700;margin-bottom:6px;">Chọn mẻ lá muốn sao:</div>';
    const chipRow = document.createElement('div');
    chipRow.className = 'chip-grid';
    roastableSlots.forEach(({ idx, slot }) => {
      const def = ITEMS[slot.itemId];
      const chip = document.createElement('button');
      chip.className = `choice-chip ${idx === chosenSlotIdx ? 'selected' : ''}`;
      chip.innerHTML = `<img src="${pixelArt.getIconUrl(def.iconKey)}" /> ${def.name} ×${slot.count}`;
      chip.onclick = () => {
        chosenSlotIdx = idx;
        Array.from(chipRow.children).forEach((c) => c.classList.remove('selected'));
        chip.classList.add('selected');
      };
      chipRow.appendChild(chip);
    });
    pickDiv.appendChild(chipRow);
    modalBox.appendChild(pickDiv);

    const gameBox = document.createElement('div');
    gameBox.className = 'card-box';
    gameBox.innerHTML = `
      <div>Nhấn giữ (hoặc nhấp liên tục) nút <b>🔥 Quạt Lửa</b> để giữ kim nhiệt độ nằm trong <b>vùng xanh</b> suốt 4 giây!</div>
      <div class="roast-bar">
        <div class="roast-green-zone"></div>
        <div id="roast-needle" class="roast-needle" style="left:20%;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span id="roast-timer-txt">Thời gian còn lại: 4.0s • Chuẩn: 0%</span>
        <div style="display:flex;gap:8px;">
          <button id="btn-roast-start" class="pixel-btn primary">Bắt Đầu Sao!</button>
          <button id="btn-roast-fan" class="pixel-btn hidden">🔥 Quạt Lửa (Giữ / Nhấn)</button>
        </div>
      </div>
    `;
    modalBox.appendChild(gameBox);

    const needleEl = gameBox.querySelector('#roast-needle') as HTMLElement;
    const timerTxtEl = gameBox.querySelector('#roast-timer-txt') as HTMLElement;
    const startBtn = gameBox.querySelector('#btn-roast-start') as HTMLButtonElement;
    const fanBtn = gameBox.querySelector('#btn-roast-fan') as HTMLButtonElement;

    let needlePos = 22; // 0..98
    let fanning = false;
    let remaining = 4.0;
    let inGreenTime = 0;
    let totalElapsed = 0;
    let lastTs = 0;

    const startFan = () => {
      fanning = true;
    };
    const stopFan = () => {
      fanning = false;
    };
    fanBtn.addEventListener('mousedown', startFan);
    fanBtn.addEventListener('mouseup', stopFan);
    fanBtn.addEventListener('mouseleave', stopFan);
    fanBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startFan();
    });
    fanBtn.addEventListener('touchend', stopFan);

    startBtn.onclick = () => {
      startBtn.classList.add('hidden');
      fanBtn.classList.remove('hidden');
      lastTs = performance.now();

      const step = (ts: number) => {
        const dt = Math.min(0.05, (ts - lastTs) / 1000);
        lastTs = ts;
        remaining -= dt;
        totalElapsed += dt;

        // Nhiệt giảm tự nhiên, quạt lửa tăng nhiệt
        needlePos += (fanning ? 46 : -30) * dt;
        needlePos = Math.max(2, Math.min(94, needlePos));
        needleEl.style.left = `${needlePos}%`;

        if (needlePos >= 37 && needlePos <= 63) {
          inGreenTime += dt;
        }
        const score = totalElapsed > 0 ? inGreenTime / totalElapsed : 0;
        timerTxtEl.textContent = `Thời gian: ${Math.max(0, remaining).toFixed(1)}s • Chuẩn: ${Math.round(score * 100)}%`;

        if (remaining <= 0) {
          this.roastRaf = null;
          onFinishRoast(chosenSlotIdx, score);
          return;
        }
        this.roastRaf = requestAnimationFrame(step);
      };
      this.roastRaf = requestAnimationFrame(step);
    };
  }
}

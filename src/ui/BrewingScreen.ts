import { pixelArt } from '../art/pixelArtGenerator';
import { getQualityLabel, ITEMS, ROASTABLE_ITEMS } from '../data/crops';
import { getSteepLabel, getTempLabel, RECIPES } from '../data/recipes';
import { InventorySlot, ItemId, TeaSteepTime, TeaWaterTemp } from '../data/types';
import { BrewResult } from '../systems/BrewingSystem';

export class BrewingScreen {
  private selectedBaseSlot: number | null = null;
  private selectedAddonSlots: number[] = [];
  private waterTemp: TeaWaterTemp = 'warm';
  private steepTime: TeaSteepTime = 'short';

  private roastRaf: number | null = null;
  private roastCleanupListeners: (() => void) | null = null;

  public cleanup(): void {
    if (this.roastRaf !== null) {
      cancelAnimationFrame(this.roastRaf);
      this.roastRaf = null;
    }
    if (this.roastCleanupListeners) {
      this.roastCleanupListeners();
      this.roastCleanupListeners = null;
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
        btn.innerHTML = `<img src="${pixelArt.getIconUrl(def.iconKey)}" /> ${def.name} ${'★'.repeat(slot.quality)} ×${slot.count}`;
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
        btn.innerHTML = `<img src="${pixelArt.getIconUrl(def.iconKey)}" /> ${def.name} ${'★'.repeat(slot.quality)} ×${slot.count}`;
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
    onFinishRoast: (slotIdx: number, accuracyScore: number) => { itemId: ItemId; quality: 1 | 2 | 3 } | null,
    onClose: () => void
  ): void {
    this.cleanup();
    modalBox.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `<h2>🔥 Chảo Sao Trà (Mini-Game)</h2>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'pixel-btn small';
    closeBtn.textContent = 'Đóng (Esc)';
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
    const chipButtons: HTMLButtonElement[] = [];
    roastableSlots.forEach(({ idx, slot }) => {
      const def = ITEMS[slot.itemId];
      const chip = document.createElement('button');
      chip.className = `choice-chip ${idx === chosenSlotIdx ? 'selected' : ''}`;
      chip.innerHTML = `<img src="${pixelArt.getIconUrl(def.iconKey)}" /> ${def.name} ${'★'.repeat(slot.quality)} ×${slot.count}`;
      chip.onclick = () => {
        chosenSlotIdx = idx;
        chipButtons.forEach((c) => c.classList.remove('selected'));
        chip.classList.add('selected');
      };
      chipButtons.push(chip);
      chipRow.appendChild(chip);
    });
    pickDiv.appendChild(chipRow);
    modalBox.appendChild(pickDiv);

    const gameBox = document.createElement('div');
    gameBox.className = 'card-box';
    gameBox.innerHTML = `
      <div>Giữ phím <b>Space / W / ↑</b> hoặc nhấn giữ nút <b>🔥 Quạt Lửa</b> để tăng nhiệt, nhả ra để hạ nhiệt. Giữ kim trong <b>vùng xanh</b> suốt 4 giây!</div>
      <div class="roast-zone-labels">
        <span>❄️ Lạnh</span>
        <span>🌿 Vùng Xanh Chuẩn</span>
        <span>🔥 Quá lửa</span>
      </div>
      <div id="roast-bar" class="roast-bar">
        <div class="roast-green-zone"></div>
        <div id="roast-needle" class="roast-needle" style="left:22%;"></div>
      </div>
      <div id="roast-controls" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <span id="roast-timer-txt">Thời gian: 4.0s • Trong vùng xanh: 0% • Dự kiến: ★</span>
        <div style="display:flex;gap:8px;">
          <button id="btn-roast-start" class="pixel-btn primary">Bắt Đầu Sao!</button>
          <button id="btn-roast-fan" class="pixel-btn hidden">🔥 Quạt Lửa (Giữ / Space)</button>
        </div>
      </div>
    `;
    modalBox.appendChild(gameBox);

    const roastBarEl = gameBox.querySelector('#roast-bar') as HTMLElement;
    const needleEl = gameBox.querySelector('#roast-needle') as HTMLElement;
    const controlsEl = gameBox.querySelector('#roast-controls') as HTMLElement;
    const timerTxtEl = gameBox.querySelector('#roast-timer-txt') as HTMLElement;
    const startBtn = gameBox.querySelector('#btn-roast-start') as HTMLButtonElement;
    const fanBtn = gameBox.querySelector('#btn-roast-fan') as HTMLButtonElement;

    let needlePos = 22; // 4..96
    let keyFanning = false;
    let mouseFanning = false;
    let running = false;
    let remaining = 4.0;
    let inGreenTime = 0;
    let totalElapsed = 0;
    let lastTs = 0;

    const startMouseFan = () => {
      mouseFanning = true;
      fanBtn.blur();
    };
    const stopMouseFan = () => {
      mouseFanning = false;
    };
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      startMouseFan();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!running) return;
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        e.preventDefault();
        keyFanning = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        keyFanning = false;
      }
    };
    const onWindowReset = () => {
      keyFanning = false;
      mouseFanning = false;
    };

    fanBtn.addEventListener('mousedown', startMouseFan);
    fanBtn.addEventListener('mouseup', stopMouseFan);
    fanBtn.addEventListener('mouseleave', stopMouseFan);
    fanBtn.addEventListener('touchstart', onTouchStart);
    fanBtn.addEventListener('touchend', stopMouseFan);
    fanBtn.addEventListener('touchcancel', stopMouseFan);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mouseup', onWindowReset);
    window.addEventListener('blur', onWindowReset);

    this.roastCleanupListeners = () => {
      fanBtn.removeEventListener('mousedown', startMouseFan);
      fanBtn.removeEventListener('mouseup', stopMouseFan);
      fanBtn.removeEventListener('mouseleave', stopMouseFan);
      fanBtn.removeEventListener('touchstart', onTouchStart);
      fanBtn.removeEventListener('touchend', stopMouseFan);
      fanBtn.removeEventListener('touchcancel', stopMouseFan);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mouseup', onWindowReset);
      window.removeEventListener('blur', onWindowReset);
    };

    startBtn.onclick = () => {
      startBtn.blur();
      running = true;
      chipButtons.forEach((b) => {
        b.disabled = true;
      });
      startBtn.classList.add('hidden');
      fanBtn.classList.remove('hidden');
      lastTs = performance.now();

      const step = (ts: number) => {
        const dt = Math.min(0.05, (ts - lastTs) / 1000);
        lastTs = ts;
        remaining -= dt;
        totalElapsed += dt;

        const fanning = keyFanning || mouseFanning;
        fanBtn.classList.toggle('active-fan', fanning);

        // Nhiệt giảm tự nhiên, quạt lửa tăng nhiệt
        needlePos += (fanning ? 48 : -32) * dt;
        needlePos = Math.max(4, Math.min(96, needlePos));
        needleEl.style.left = `${needlePos}%`;

        const inGreen = needlePos >= 36 && needlePos <= 64;
        roastBarEl.classList.toggle('in-zone', inGreen);
        if (inGreen) {
          inGreenTime += dt;
        }
        const score = totalElapsed > 0 ? inGreenTime / totalElapsed : 0;
        const estStars = score >= 0.7 ? '★★★' : score >= 0.35 ? '★★' : '★';
        timerTxtEl.textContent = `Thời gian: ${Math.max(0, remaining).toFixed(1)}s • Trong vùng xanh: ${Math.round(score * 100)}% • Dự kiến: ${estStars}`;

        if (remaining <= 0) {
          running = false;
          this.cleanup();
          const result = onFinishRoast(chosenSlotIdx, score);
          if (result !== null) {
            fanBtn.classList.add('hidden');
            controlsEl.classList.add('hidden');
            const outDef = ITEMS[result.itemId];
            const stars = '★'.repeat(result.quality);
            const note =
              result.quality === 3
                ? 'Sao vừa lửa tuyệt hảo! Lá trà dậy hương thơm ngát.'
                : result.quality === 2
                  ? 'Sao đều tay! Mẻ trà có hương thơm rất ổn.'
                  : 'Hơi lệch lửa một chút nhưng mẻ trà vẫn thơm ấm dùng pha trà tốt!';

            const resCard = document.createElement('div');
            resCard.className = 'roast-result-card';
            resCard.innerHTML = `
              <div class="card-top">
                <img src="${pixelArt.getIconUrl(outDef.iconKey)}" alt="${outDef.name}" />
                <div>
                  <strong>${outDef.name} ${stars} (${getQualityLabel(result.quality)})</strong>
                  <div style="font-size:13px;color:#6b3e26;">Giữ vùng xanh: ${Math.round(score * 100)}% • Không bao giờ hỏng mẻ!</div>
                </div>
              </div>
              <div style="font-size:14px;">${note}</div>
            `;

            const actionRow = document.createElement('div');
            actionRow.style.display = 'flex';
            actionRow.style.gap = '8px';
            actionRow.style.flexWrap = 'wrap';

            const canRoastMore = inventory.some((s) => s && ROASTABLE_ITEMS.includes(s.itemId));
            if (canRoastMore) {
              const againBtn = document.createElement('button');
              againBtn.className = 'pixel-btn primary small';
              againBtn.textContent = '🔥 Sao Mẻ Tiếp';
              againBtn.onclick = () => this.renderRoastMiniGame(modalBox, inventory, onFinishRoast, onClose);
              actionRow.appendChild(againBtn);
            }

            const doneBtn = document.createElement('button');
            doneBtn.className = 'pixel-btn small';
            doneBtn.textContent = 'Đóng';
            doneBtn.onclick = () => {
              this.cleanup();
              onClose();
            };
            actionRow.appendChild(doneBtn);
            resCard.appendChild(actionRow);
            gameBox.appendChild(resCard);
          }
          return;
        }
        this.roastRaf = requestAnimationFrame(step);
      };
      this.roastRaf = requestAnimationFrame(step);
    };
  }
}

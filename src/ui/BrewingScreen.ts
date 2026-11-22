import { PALETTE } from '../art/palette';
import { pixelArt } from '../art/pixelArtGenerator';
import { getQualityLabel, ITEMS, ROASTABLE_ITEMS } from '../data/crops';
import { getSteepLabel, getTeaLiquidColors, getTempLabel, RECIPES } from '../data/recipes';
import { InventorySlot, ItemId, TeaSteepTime, TeaWaterTemp } from '../data/types';
import { BrewResult } from '../systems/BrewingSystem';

export class BrewingScreen {
  private selectedBaseSlot: number | null = null;
  private selectedAddonSlots: number[] = [];
  private waterTemp: TeaWaterTemp = 'warm';
  private steepTime: TeaSteepTime = 'short';

  private brewRaf: number | null = null;
  private isBrewingAnim = false;
  private lastBrewResult: BrewResult | null = null;
  private justUnlockedRecipeId: string | null = null;

  private roastRaf: number | null = null;
  private roastCleanupListeners: (() => void) | null = null;

  public resetBrewSession(): void {
    this.lastBrewResult = null;
    this.justUnlockedRecipeId = null;
    this.isBrewingAnim = false;
  }

  public cleanup(): void {
    if (this.brewRaf !== null) {
      cancelAnimationFrame(this.brewRaf);
      this.brewRaf = null;
    }
    this.isBrewingAnim = false;
    if (this.roastRaf !== null) {
      cancelAnimationFrame(this.roastRaf);
      this.roastRaf = null;
    }
    if (this.roastCleanupListeners) {
      this.roastCleanupListeners();
      this.roastCleanupListeners = null;
    }
  }

  private getIngredientColors(itemId: ItemId): [string, string] {
    switch (itemId) {
      case 'tea_roasted':
        return [PALETTE.woodDark, PALETTE.amberWarm];
      case 'chrysanthemum_fresh':
      case 'chrysanthemum_dried':
        return [PALETTE.amberGold, PALETTE.amberWarm];
      case 'mint_fresh':
      case 'mint_dried':
        return [PALETTE.tealLight, PALETTE.grassBright];
      case 'jasmine_fresh':
      case 'jasmine_dried':
        return [PALETTE.whiteWarm, PALETTE.cloudPink];
      case 'ginger_fresh':
      case 'ginger_dried':
        return [PALETTE.amberWarm, PALETTE.woodBright];
      case 'honey':
        return [PALETTE.amberGold, PALETTE.whiteWarm];
      default:
        return [PALETTE.teaGreen, PALETTE.grassBright];
    }
  }

  private drawBrewStage(
    ctx: CanvasRenderingContext2D,
    tMs: number,
    animProgress: number | null,
    activeItems: ItemId[],
    resultToShow: BrewResult | null,
    waterTemp: TeaWaterTemp
  ): void {
    ctx.imageSmoothingEnabled = false;
    const p = (
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      col: string
    ) => {
      c.fillStyle = col;
      c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    };

    // 1. Top-down wooden counter surface + bamboo mat
    p(ctx, 0, 0, 144, 64, PALETTE.woodMid);
    for (let y = 0; y < 64; y += 8) {
      p(ctx, 0, y, 144, 1, PALETTE.woodDark);
      p(ctx, 0, y + 1, 144, 1, PALETTE.woodLight);
    }
    p(ctx, 0, 0, 144, 2, PALETTE.outlineDark);
    p(ctx, 0, 62, 144, 2, PALETTE.outlineDark);

    // Woven bamboo mat in center
    p(ctx, 48, 8, 54, 48, PALETTE.outlineDark);
    p(ctx, 49, 9, 52, 46, PALETTE.creamDark);
    for (let x = 51; x < 99; x += 3) {
      p(ctx, x, 11, 2, 42, PALETTE.woodBright);
    }

    // 2. Left side: Coal stove + Kettle (top-down angled)
    p(ctx, 7, 13, 32, 38, PALETTE.outlinePlum);
    p(ctx, 9, 15, 28, 34, PALETTE.rockMid);
    p(ctx, 12, 18, 22, 28, PALETTE.outlineDark);
    const emberCol =
      waterTemp === 'boiling' ? PALETTE.roofLight : waterTemp === 'hot' ? PALETTE.amberWarm : PALETTE.woodMid;
    const flameFlicker = Math.floor(tMs / 180) % 2;
    p(ctx, 14, 20, 18, 24, emberCol);
    if (waterTemp !== 'warm' || flameFlicker === 0) {
      p(ctx, 17 + flameFlicker, 24, 10, 14, PALETTE.amberGold);
    }
    if (waterTemp === 'boiling') {
      p(ctx, 20, 28 - flameFlicker, 4, 6, PALETTE.whiteWarm);
    }

    // Kettle shifts and tilts right while pouring (0.00 -> 0.44)
    const isPouring = animProgress !== null && animProgress < 0.44;
    const tiltFactor =
      animProgress === null
        ? 0
        : animProgress < 0.14
          ? animProgress / 0.14
          : animProgress < 0.36
            ? 1
            : animProgress < 0.48
              ? Math.max(0, 1 - (animProgress - 0.36) / 0.12)
              : 0;
    const kx = 12 + Math.round(tiltFactor * 16);
    const ky = 18 - Math.round(tiltFactor * 4);
    p(ctx, kx, ky + 6, 4, 10, PALETTE.outlineDark); // Kettle handle
    p(ctx, kx + 3, ky + 2, 20, 18, PALETTE.outlineDark); // Kettle body outline
    p(ctx, kx + 4, ky + 3, 18, 16, PALETTE.tealDark);
    p(ctx, kx + 5, ky + 4, 14, 12, PALETTE.tealLight);
    p(ctx, kx + 9, ky + 7, 8, 8, PALETTE.outlineDark); // Lid
    p(ctx, kx + 10, ky + 8, 6, 6, PALETTE.amberGold);
    p(ctx, kx + 22, ky + 7, 6, 4, PALETTE.outlineDark); // Spout
    p(ctx, kx + 23, ky + 8, 5, 2, PALETTE.tealLight);

    // 3. Center: Top-down ceramic saucer & teacup (center ~75, 34)
    const cx = 75;
    const cy = 34;
    p(ctx, cx - 15, cy - 15, 30, 30, PALETTE.outlineDark);
    p(ctx, cx - 14, cy - 14, 28, 28, PALETTE.woodDark);
    p(ctx, cx - 13, cy - 13, 26, 26, PALETTE.woodLight);

    // Cup handle + outer ceramic wall
    p(ctx, cx + 11, cy - 3, 5, 6, PALETTE.outlineDark);
    p(ctx, cx + 11, cy - 2, 4, 4, PALETTE.creamMid);
    for (let dy = -12; dy <= 12; dy++) {
      for (let dx = -12; dx <= 12; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 <= 144) {
          const col =
            d2 > 110 ? PALETTE.outlineDark : d2 > 82 ? PALETTE.creamLight : PALETTE.creamDark;
          p(ctx, cx + dx, cy + dy, 1, 1, col);
        }
      }
    }

    // Cup interior (r <= 8)
    const targetTea = resultToShow ? getTeaLiquidColors(resultToShow.itemId) : null;
    if (animProgress !== null && targetTea) {
      const fillFrac = Math.min(1, animProgress / 0.42);
      const steepFrac = animProgress < 0.35 ? 0 : Math.min(1, (animProgress - 0.35) / 0.52);

      // Dry leaves peeking before water fills
      if (fillFrac < 0.7 && activeItems.length > 0) {
        const [c1, c2] = this.getIngredientColors(activeItems[0]);
        p(ctx, cx - 4, cy - 2, 4, 3, c1);
        p(ctx, cx, cy + 1, 3, 2, c2);
      }

      if (fillFrac > 0.05) {
        const liqR = Math.max(2, Math.round(fillFrac * 8.5));
        const liqColor =
          steepFrac < 0.35
            ? PALETTE.waterLight
            : steepFrac < 0.7
              ? PALETTE.waterBlue
              : targetTea.liquidColor;
        const hiColor = steepFrac < 0.7 ? PALETTE.whiteWarm : targetTea.liquidHighlight;

        for (let dy = -liqR; dy <= liqR; dy++) {
          for (let dx = -liqR; dx <= liqR; dx++) {
            const d2 = dx * dx + dy * dy;
            if (d2 <= liqR * liqR) {
              const isRipple =
                isPouring && Math.abs(Math.sqrt(d2) - ((Math.floor(tMs / 90) % 5) + 2)) < 0.85;
              const isHighlight = dx >= -5 && dx <= -2 && dy >= -5 && dy <= -2;
              p(ctx, cx + dx, cy + dy, 1, 1, isRipple || isHighlight ? hiColor : liqColor);
            }
          }
        }
      }
    } else if (resultToShow && targetTea) {
      // Finished cup idle state: steeped tea color & subtle shimmer
      for (let dy = -8; dy <= 8; dy++) {
        for (let dx = -8; dx <= 8; dx++) {
          if (dx * dx + dy * dy <= 72) {
            const isHi = dx >= -5 && dx <= -2 && dy >= -5 && dy <= -2;
            p(ctx, cx + dx, cy + dy, 1, 1, isHi ? targetTea.liquidHighlight : targetTea.liquidColor);
          }
        }
      }
    } else {
      // Unbrewed empty cup + dry ingredients placed at cup bottom
      for (let dy = -8; dy <= 8; dy++) {
        for (let dx = -8; dx <= 8; dx++) {
          if (dx * dx + dy * dy <= 72) {
            p(ctx, cx + dx, cy + dy, 1, 1, PALETTE.creamMid);
          }
        }
      }
      activeItems.slice(0, 3).forEach((itemId, idx) => {
        const [c1, c2] = this.getIngredientColors(itemId);
        const ox = idx === 0 ? -3 : idx === 1 ? 2 : -1;
        const oy = idx === 0 ? -1 : idx === 1 ? -3 : 3;
        p(ctx, cx + ox, cy + oy, 3, 2, c1);
        p(ctx, cx + ox + 1, cy + oy, 1, 1, c2);
      });
    }

    // Pouring water stream from spout into center cup during 0.08..0.42
    if (animProgress !== null && animProgress >= 0.08 && animProgress <= 0.42) {
      const flowShift = Math.floor(tMs / 65) % 3;
      const sx = kx + 27;
      const sy = ky + 10;
      for (let i = 0; i <= 10; i++) {
        const u = i / 10;
        const pxX = sx + u * (cx - sx);
        const pxY = sy + u * u * (cy - sy);
        const streamCol = (i + flowShift) % 3 === 0 ? PALETTE.whiteWarm : PALETTE.waterLight;
        p(ctx, pxX, pxY, 2, 2, streamCol);
      }
    }

    // Steam particles & unlock sparkles above cup during end of brew or after brew finished
    const showSteam =
      (animProgress !== null && animProgress > 0.28) || (animProgress === null && resultToShow !== null);
    if (showSteam) {
      const steamCount = waterTemp === 'boiling' ? 5 : waterTemp === 'hot' ? 4 : 3;
      for (let i = 0; i < steamCount; i++) {
        const phase = ((tMs / 900 + i * 0.27) % 1);
        const wy = cy - 4 - phase * 18;
        const wx = cx - 4 + i * 2 + Math.round(Math.sin(phase * 6 + i) * 2);
        p(ctx, wx, wy, 2, 2, phase < 0.55 ? PALETTE.whiteWarm : PALETTE.cloudWhite);
      }
    }

    if (resultToShow?.newlyUnlocked && (animProgress === null || animProgress > 0.72)) {
      const blink = Math.floor(tMs / 180) % 2;
      const pts: [number, number][] = [
        [cx - 16, cy - 12],
        [cx + 15, cy - 11],
        [cx - 15, cy + 12],
        [cx + 16, cy + 11],
      ];
      pts.forEach(([sx, sy], idx) => {
        const c = (idx + blink) % 2 === 0 ? PALETTE.amberGold : PALETTE.whiteWarm;
        p(ctx, sx, sy - 1, 1, 3, c);
        p(ctx, sx - 1, sy, 3, 1, c);
      });
    }

    // 4. Right side: 3 small top-down porcelain plates showing Base + 2 Addons
    const plateCoords: [number, number][] = [
      [121, 15],
      [113, 35],
      [130, 44],
    ];
    plateCoords.forEach(([px0, py0], i) => {
      p(ctx, px0 - 7, py0 - 7, 14, 14, PALETTE.outlineDark);
      p(ctx, px0 - 6, py0 - 6, 12, 12, PALETTE.creamLight);
      p(ctx, px0 - 5, py0 - 5, 10, 10, PALETTE.creamMid);
      const itemId = activeItems[i];
      if (itemId) {
        const [c1, c2] = this.getIngredientColors(itemId);
        p(ctx, px0 - 3, py0 - 2, 6, 4, c1);
        p(ctx, px0 - 2, py0 - 3, 4, 2, c2);
        p(ctx, px0, py0, 1, 1, PALETTE.whiteWarm);
      }
    });
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
    onClose: () => void,
    onRevealNewRecipe?: () => void
  ): void {
    this.cleanup();
    modalBox.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `<h2>🍵 Quầy Pha Trà Trên Mây</h2>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'pixel-btn small';
    closeBtn.textContent = 'Đóng (Esc)';
    closeBtn.onclick = () => {
      this.cleanup();
      onClose();
    };
    header.appendChild(closeBtn);
    modalBox.appendChild(header);

    const surface = document.createElement('div');
    surface.className = 'brew-table-surface';

    // Cột trái: Bàn pha trà nhìn từ trên xuống + lựa chọn bằng chuột
    const leftPanel = document.createElement('div');
    leftPanel.className = 'brew-panel-light';

    const baseSlots: { idx: number; slot: InventorySlot }[] = [];
    const addonSlots: { idx: number; slot: InventorySlot }[] = [];

    inventory.forEach((slot, idx) => {
      if (!slot) return;
      const def = ITEMS[slot.itemId];
      if (def.category === 'base') baseSlots.push({ idx, slot });
      if (
        def.category === 'addon' ||
        slot.itemId === 'chrysanthemum_fresh' ||
        slot.itemId === 'chrysanthemum_dried' ||
        slot.itemId === 'ginger_fresh' ||
        slot.itemId === 'ginger_dried'
      ) {
        addonSlots.push({ idx, slot });
      }
    });

    if (this.selectedBaseSlot !== null && !baseSlots.some((b) => b.idx === this.selectedBaseSlot)) {
      this.selectedBaseSlot = null;
    }
    this.selectedAddonSlots = this.selectedAddonSlots.filter((i) => {
      const a = addonSlots.find((x) => x.idx === i);
      if (!a) return false;
      if (i === this.selectedBaseSlot && a.slot.count < 2) return false;
      return true;
    });

    const selectedItemIds: ItemId[] = [];
    const selectedQualities: (1 | 2 | 3)[] = [];
    if (this.selectedBaseSlot !== null && inventory[this.selectedBaseSlot]) {
      const b = inventory[this.selectedBaseSlot]!;
      selectedItemIds.push(b.itemId);
      selectedQualities.push(b.quality);
    }
    for (const aIdx of this.selectedAddonSlots) {
      const a = inventory[aIdx];
      if (a) {
        selectedItemIds.push(a.itemId);
        selectedQualities.push(a.quality);
      }
    }

    // Khu vực quầy nhìn từ trên xuống + hoạt cảnh rót nước
    const stageWrap = document.createElement('div');
    stageWrap.className = 'brew-stage-wrap';
    const canvas = document.createElement('canvas');
    canvas.id = 'brew-stage-canvas';
    canvas.width = 144;
    canvas.height = 64;
    stageWrap.appendChild(canvas);

    const banner = document.createElement('div');
    banner.id = 'brew-result-banner';
    banner.className = 'brew-result-banner';
    if (this.lastBrewResult) {
      const outDef = ITEMS[this.lastBrewResult.itemId];
      const stars = '★'.repeat(this.lastBrewResult.quality);
      const qLabel = getQualityLabel(this.lastBrewResult.quality);
      const { liquidColor } = getTeaLiquidColors(this.lastBrewResult.itemId);
      const badgeHtml = this.lastBrewResult.newlyUnlocked
        ? `<span class="brew-new-recipe-badge">✨ CÔNG THỨC MỚI! ✨</span>`
        : '';
      banner.innerHTML = `
        <img src="${pixelArt.getIconUrl(outDef.iconKey)}" alt="${outDef.name}" />
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span class="tea-color-dot" style="background:${liquidColor};"></span>
            <strong>${outDef.name} ${stars}</strong>
            ${badgeHtml}
          </div>
          <div style="font-size:12px;color:#6b3e26;">Chất lượng: ${qLabel} • ${this.lastBrewResult.matchedRecipe ? 'Đã ghi vào Sổ Công Thức!' : 'Trà ngẫu hứng — vẫn phục vụ khách được!'}</div>
        </div>
      `;
    } else if (selectedItemIds.length > 0) {
      const avgQ = Math.max(
        1,
        Math.min(3, Math.round(selectedQualities.reduce((s, q) => s + q, 0) / selectedQualities.length))
      ) as 1 | 2 | 3;
      const names = selectedItemIds.map((id) => ITEMS[id].name).join(' + ');
      banner.innerHTML = `
        <div style="font-size:13px;">
          <b>Trên quầy:</b> ${names}<br/>
          <span style="color:#6b3e26;">${getTempLabel(this.waterTemp)} • Ủ ${getSteepLabel(this.steepTime)} • Dự kiến: <b>${'★'.repeat(avgQ)}</b> (${getQualityLabel(avgQ)})</span>
        </div>
      `;
    } else {
      banner.innerHTML = `<div style="font-size:13px;color:#6b3e26;">Chọn nguyên liệu chính, phụ liệu (nếu muốn), nhiệt độ nước & thời gian ủ để rót trà.</div>`;
    }
    stageWrap.appendChild(banner);
    leftPanel.appendChild(stageWrap);

    const buildSectionTitle = (txt: string) => {
      const h = document.createElement('div');
      h.style.fontWeight = '700';
      h.style.fontSize = '14px';
      h.textContent = txt;
      return h;
    };

    const interactiveBtns: HTMLButtonElement[] = [];

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
          if (this.isBrewingAnim) return;
          this.lastBrewResult = null;
          this.justUnlockedRecipeId = null;
          this.selectedBaseSlot = idx;
          this.renderBrewingCounter(
            modalBox,
            inventory,
            unlockedRecipes,
            onExecuteBrew,
            onClose,
            onRevealNewRecipe
          );
        };
        interactiveBtns.push(btn);
        baseGrid.appendChild(btn);
      }
    }
    leftPanel.appendChild(baseGrid);

    leftPanel.appendChild(buildSectionTitle('2. Phụ Liệu (0–2 món):'));
    const addonGrid = document.createElement('div');
    addonGrid.className = 'chip-grid';
    if (addonSlots.length === 0) {
      addonGrid.innerHTML = '<span style="font-size:13px;color:#8f5a34;">Không có phụ liệu (vẫn pha Trà Xanh Thanh được!).</span>';
    } else {
      for (const { idx, slot } of addonSlots) {
        const def = ITEMS[slot.itemId];
        const isSel = this.selectedAddonSlots.includes(idx);
        const sameSlotLowCount = idx === this.selectedBaseSlot && slot.count < 2;
        const btn = document.createElement('button');
        btn.className = `choice-chip ${isSel ? 'selected' : ''}`;
        btn.disabled = sameSlotLowCount;
        btn.innerHTML = `<img src="${pixelArt.getIconUrl(def.iconKey)}" /> ${def.name} ${'★'.repeat(slot.quality)} ×${slot.count}`;
        btn.onclick = () => {
          if (this.isBrewingAnim) return;
          this.lastBrewResult = null;
          this.justUnlockedRecipeId = null;
          if (isSel) {
            this.selectedAddonSlots = this.selectedAddonSlots.filter((i) => i !== idx);
          } else if (this.selectedAddonSlots.length < 2) {
            this.selectedAddonSlots.push(idx);
          }
          this.renderBrewingCounter(
            modalBox,
            inventory,
            unlockedRecipes,
            onExecuteBrew,
            onClose,
            onRevealNewRecipe
          );
        };
        interactiveBtns.push(btn);
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
        if (this.isBrewingAnim) return;
        this.lastBrewResult = null;
        this.justUnlockedRecipeId = null;
        this.waterTemp = t;
        this.renderBrewingCounter(
          modalBox,
          inventory,
          unlockedRecipes,
          onExecuteBrew,
          onClose,
          onRevealNewRecipe
        );
      };
      interactiveBtns.push(btn);
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
        if (this.isBrewingAnim) return;
        this.lastBrewResult = null;
        this.justUnlockedRecipeId = null;
        this.steepTime = s;
        this.renderBrewingCounter(
          modalBox,
          inventory,
          unlockedRecipes,
          onExecuteBrew,
          onClose,
          onRevealNewRecipe
        );
      };
      interactiveBtns.push(btn);
      steepGrid.appendChild(btn);
    });
    leftPanel.appendChild(steepGrid);

    const brewBtn = document.createElement('button');
    brewBtn.id = 'btn-execute-brew';
    brewBtn.className = 'pixel-btn primary';
    brewBtn.style.width = '100%';
    brewBtn.textContent = '🫖 Rót Nước Pha Trà!';
    brewBtn.disabled = this.selectedBaseSlot === null;

    const stageCtx = canvas.getContext('2d')!;
    let animStartTs: number | null = null;
    let animatingRes: BrewResult | null = null;
    let animatingItems: ItemId[] = [...selectedItemIds];
    const BREW_ANIM_DURATION_MS = 1400;

    const tickStage = (nowTs: number) => {
      if (this.isBrewingAnim && animStartTs !== null && animatingRes !== null) {
        const progress = Math.min(1, (nowTs - animStartTs) / BREW_ANIM_DURATION_MS);
        this.drawBrewStage(stageCtx, nowTs, progress, animatingItems, animatingRes, this.waterTemp);
        if (progress >= 1) {
          this.isBrewingAnim = false;
          this.lastBrewResult = animatingRes;
          this.justUnlockedRecipeId = animatingRes.newlyUnlocked ? animatingRes.matchedRecipe!.id : null;
          this.selectedBaseSlot = null;
          this.selectedAddonSlots = [];
          if (animatingRes.newlyUnlocked) {
            onRevealNewRecipe?.();
          }
          this.renderBrewingCounter(
            modalBox,
            inventory,
            unlockedRecipes,
            onExecuteBrew,
            onClose,
            onRevealNewRecipe
          );
          return;
        }
      } else {
        this.drawBrewStage(stageCtx, nowTs, null, selectedItemIds, this.lastBrewResult, this.waterTemp);
      }
      this.brewRaf = requestAnimationFrame(tickStage);
    };
    this.brewRaf = requestAnimationFrame(tickStage);

    brewBtn.onclick = () => {
      if (this.selectedBaseSlot === null || this.isBrewingAnim) return;
      const res = onExecuteBrew(
        this.selectedBaseSlot,
        [...this.selectedAddonSlots],
        this.waterTemp,
        this.steepTime
      );
      if (!res) return;

      this.isBrewingAnim = true;
      animatingRes = res;
      animatingItems = [...selectedItemIds];
      animStartTs = performance.now();
      interactiveBtns.forEach((b) => {
        b.disabled = true;
      });
      brewBtn.disabled = true;
      brewBtn.textContent = '🫖 Đang rót nước & ủ trà...';
      banner.innerHTML = `<div style="font-size:13px;font-weight:700;color:#6b3e26;">🫖 Đang rót ${getTempLabel(this.waterTemp).toLowerCase()} và ủ ${getSteepLabel(this.steepTime).toLowerCase()}...</div>`;
    };
    leftPanel.appendChild(brewBtn);

    // Cột phải: Sổ Công Thức nhanh ngay trên quầy
    const rightPanel = document.createElement('div');
    rightPanel.className = 'brew-panel-light';
    rightPanel.innerHTML = `<div style="font-weight:700;font-size:15px;margin-bottom:8px;">📖 Sổ Công Thức (${unlockedRecipes.size}/5)</div>`;

    for (const r of RECIPES) {
      const known = unlockedRecipes.has(r.id);
      const isJustNew = known && this.justUnlockedRecipeId === r.id;
      const row = document.createElement('div');
      row.className = `brew-recipe-row ${isJustNew ? 'newly-unlocked' : ''}`;
      const iconUrl = pixelArt.getIconUrl(ITEMS[r.resultItemId].iconKey);

      if (known) {
        const addonsTxt = r.addons.length ? ' + ' + r.addons.map((a) => ITEMS[a].name).join(' + ') : '';
        row.innerHTML = `
          <div style="display:flex;align-items:center;gap:6px;">
            <img src="${iconUrl}" alt="${r.name}" style="width:20px;height:20px;image-rendering:pixelated;" />
            <span class="tea-color-dot" style="background:${r.liquidColor};"></span>
            <strong>${r.name}</strong>
            ${isJustNew ? '<span class="brew-new-recipe-badge" style="font-size:11px;padding:1px 5px;">✨ MỚI!</span>' : ''}
          </div>
          <div style="margin-top:2px;">${ITEMS[r.baseIngredient].name}${addonsTxt}</div>
          <div style="color:#6b3e26;">${getTempLabel(r.waterTemp)} • Ủ ${getSteepLabel(r.steepTime)}</div>
        `;
      } else {
        row.innerHTML = `
          <div style="display:flex;align-items:center;gap:6px;">
            <img src="${iconUrl}" alt="Chưa mở" style="width:20px;height:20px;image-rendering:pixelated;filter:brightness(0.25);" />
            <strong>???</strong>
            <span style="color:#8f5a34;">(Chưa mở)</span>
          </div>
          <div style="margin-top:2px;font-style:italic;color:#6b3e26;">Gợi ý: "${r.hints[0]}"</div>
        `;
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

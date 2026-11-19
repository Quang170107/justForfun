import { AudioSystem } from '../core/AudioSystem';
import { ITEMS } from '../data/crops';
import { InventorySlot } from '../data/types';
import { BrewingScreen } from './BrewingScreen';
import { DialogueBox } from './DialogueBox';
import { HUD, TooltipCallbacks } from './HUD';
import { InventoryModal } from './InventoryModal';
import { ShopAndMenuModal } from './ShopAndMenuModal';

export class UIManager {
  public readonly hud: HUD;
  public readonly dialogue: DialogueBox;
  public readonly inventoryModal: InventoryModal;
  public readonly brewingScreen: BrewingScreen;
  public readonly shopMenuModal: ShopAndMenuModal;

  public readonly modalOverlay = document.getElementById('modal-overlay')!;
  public readonly modalBox = document.getElementById('modal-box')!;
  private readonly hudLayer = document.getElementById('hud-layer')!;
  private readonly titleScreenEl = document.getElementById('title-screen')!;
  private readonly titleSaveMetaEl = document.getElementById('title-save-meta')!;
  private readonly titleContinueBtn = document.getElementById('btn-title-continue') as HTMLButtonElement;
  private readonly titleNewBtn = document.getElementById('btn-title-new') as HTMLButtonElement;
  private readonly titleSettingsBtn = document.getElementById('btn-title-settings') as HTMLButtonElement;
  private readonly sleepFadeEl = document.getElementById('sleep-fade-overlay')!;

  private tooltipEl = document.getElementById('item-tooltip')!;
  private tooltipTitle = document.getElementById('tooltip-title')!;
  private tooltipQuality = document.getElementById('tooltip-quality')!;
  private tooltipDesc = document.getElementById('tooltip-desc')!;

  public isTitleScreenOpen = false;
  public isModalOpen = false;
  public activeModalKind:
    | 'none'
    | 'inventory'
    | 'brewing'
    | 'roast'
    | 'shop'
    | 'menu'
    | 'settings'
    | 'day_summary'
    | 'letter' = 'none';

  constructor(
    audio: AudioSystem,
    onSelectHotbar: (idx: number) => void,
    onOpenInv: () => void,
    onOpenMenu: () => void
  ) {
    const tooltipOps: TooltipCallbacks = {
      show: (slot, x, y) => this.showTooltip(slot, x, y),
      hide: () => this.hideTooltip(),
    };

    this.hud = new HUD(onSelectHotbar, tooltipOps, onOpenInv, onOpenMenu);
    this.dialogue = new DialogueBox(audio);
    this.inventoryModal = new InventoryModal(tooltipOps);
    this.brewingScreen = new BrewingScreen();
    this.shopMenuModal = new ShopAndMenuModal();

    this.modalOverlay.addEventListener('click', (e) => {
      if (
        e.target === this.modalOverlay &&
        this.activeModalKind !== 'letter' &&
        this.activeModalKind !== 'day_summary'
      ) {
        this.closeModal();
      }
    });
  }

  public bindTitleCallbacks(
    onContinue: () => void,
    onNewGame: () => void,
    onSettings: () => void
  ): void {
    this.titleContinueBtn.onclick = onContinue;
    this.titleNewBtn.onclick = onNewGame;
    this.titleSettingsBtn.onclick = onSettings;
  }

  public showTitleScreen(
    meta: { day: number; season: string; money: number; saveVersion: number } | null
  ): void {
    this.isTitleScreenOpen = true;
    this.closeModal();
    this.dialogue.close();
    this.titleScreenEl.classList.remove('hidden');
    this.hudLayer.classList.add('hidden');
    if (meta) {
      this.titleContinueBtn.disabled = false;
      this.titleSaveMetaEl.textContent = `Bản lưu gần nhất: ${meta.season} • Ngày ${meta.day} • ${meta.money} Xu Mây (v${meta.saveVersion})`;
    } else {
      this.titleContinueBtn.disabled = true;
      this.titleSaveMetaEl.textContent = 'Chưa có bản lưu — hãy bấm "Chơi Mới" để bắt đầu!';
    }
  }

  public hideTitleScreen(): void {
    this.isTitleScreenOpen = false;
    this.titleScreenEl.classList.add('hidden');
    this.hudLayer.classList.remove('hidden');
  }

  public setSleepFade(dark: boolean): void {
    if (dark) {
      this.sleepFadeEl.classList.remove('hidden');
      // Force reflow để transition opacity chạy mượt
      void this.sleepFadeEl.offsetWidth;
      this.sleepFadeEl.classList.add('active');
    } else {
      this.sleepFadeEl.classList.remove('active');
      setTimeout(() => {
        if (!this.sleepFadeEl.classList.contains('active')) {
          this.sleepFadeEl.classList.add('hidden');
        }
      }, 460);
    }
  }

  public showTooltip(slot: InventorySlot, clientX: number, clientY: number): void {
    const def = ITEMS[slot.itemId];
    this.tooltipTitle.textContent = def.name;
    this.tooltipQuality.textContent =
      def.category !== 'tool' && def.category !== 'seed' ? `Chất lượng: ${'★'.repeat(slot.quality)}` : '';
    this.tooltipDesc.textContent = def.description;
    this.tooltipEl.style.left = `${Math.min(window.innerWidth - 255, clientX + 14)}px`;
    this.tooltipEl.style.top = `${Math.min(window.innerHeight - 130, clientY + 14)}px`;
    this.tooltipEl.classList.remove('hidden');
  }

  public hideTooltip(): void {
    this.tooltipEl.classList.add('hidden');
  }

  public openModal(kind: UIManager['activeModalKind']): void {
    this.hideTooltip();
    this.activeModalKind = kind;
    this.isModalOpen = true;
    this.modalOverlay.classList.remove('hidden');
  }

  public closeModal(): void {
    this.brewingScreen.cleanup();
    this.hideTooltip();
    this.isModalOpen = false;
    this.activeModalKind = 'none';
    this.modalOverlay.classList.add('hidden');
  }

  public isBlockingGameplay(): boolean {
    return this.isTitleScreenOpen || this.isModalOpen || this.dialogue.isOpen;
  }
}

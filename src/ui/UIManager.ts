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
  private tooltipEl = document.getElementById('item-tooltip')!;
  private tooltipTitle = document.getElementById('tooltip-title')!;
  private tooltipQuality = document.getElementById('tooltip-quality')!;
  private tooltipDesc = document.getElementById('tooltip-desc')!;

  public isModalOpen = false;
  public activeModalKind: 'none' | 'inventory' | 'brewing' | 'roast' | 'shop' | 'menu' | 'letter' = 'none';

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
      if (e.target === this.modalOverlay && this.activeModalKind !== 'letter') {
        this.closeModal();
      }
    });
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
    return this.isModalOpen || this.dialogue.isOpen;
  }
}

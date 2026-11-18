import { pixelArt } from '../art/pixelArtGenerator';
import { AudioSystem } from '../core/AudioSystem';
import { NpcId, PortraitExpression } from '../data/types';

export interface DialogueEntry {
  speaker: string;
  npcId?: NpcId;
  expression?: PortraitExpression;
  text: string;
  hearts?: number;
}

export class DialogueBox {
  private overlay = document.getElementById('dialogue-overlay')!;
  private speakerTag = document.getElementById('dialogue-speaker-tag')!;
  private portraitImg = document.getElementById('dialogue-portrait') as HTMLImageElement;
  private heartsEl = document.getElementById('dialogue-hearts')!;
  private textEl = document.getElementById('dialogue-text')!;
  private giftBtn = document.getElementById('dialogue-gift-btn') as HTMLButtonElement;

  private queue: DialogueEntry[] = [];
  private fullText = '';
  private charIndex = 0;
  private typingTimer: number | null = null;
  private onCompleteCallback: (() => void) | null = null;
  private onGiftCallback: (() => void) | null = null;

  public isOpen = false;

  constructor(private audio: AudioSystem) {
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.giftBtn) return;
      this.advance();
    });
    this.giftBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onGiftCallback) {
        const cb = this.onGiftCallback;
        this.close();
        cb();
      }
    });
  }

  public open(
    entries: DialogueEntry[],
    options?: {
      giftLabel?: string;
      onGift?: () => void;
      onComplete?: () => void;
    }
  ): void {
    this.queue = [...entries];
    this.onCompleteCallback = options?.onComplete ?? null;
    this.onGiftCallback = options?.onGift ?? null;

    if (options?.giftLabel && options.onGift) {
      this.giftBtn.textContent = options.giftLabel;
      this.giftBtn.classList.remove('hidden');
    } else {
      this.giftBtn.classList.add('hidden');
    }

    this.isOpen = true;
    this.overlay.classList.remove('hidden');
    this.showNextEntry();
  }

  private showNextEntry(): void {
    if (this.typingTimer !== null) {
      window.clearInterval(this.typingTimer);
      this.typingTimer = null;
    }

    const next = this.queue.shift();
    if (!next) {
      const doneCb = this.onCompleteCallback;
      this.close();
      if (doneCb) doneCb();
      return;
    }

    this.speakerTag.textContent = next.speaker;
    if (next.npcId) {
      this.portraitImg.style.display = 'block';
      this.portraitImg.src = pixelArt.getPortraitUrl(next.npcId, next.expression ?? 'normal');
      if (next.hearts !== undefined) {
        this.heartsEl.textContent = `${'♥'.repeat(next.hearts)}${'♡'.repeat(Math.max(0, 10 - next.hearts))}`;
      } else {
        this.heartsEl.textContent = '';
      }
    } else {
      this.portraitImg.style.display = 'none';
      this.heartsEl.textContent = '';
    }

    this.fullText = next.text;
    this.charIndex = 0;
    this.textEl.textContent = '';

    this.typingTimer = window.setInterval(() => {
      if (this.charIndex >= this.fullText.length) {
        if (this.typingTimer !== null) {
          window.clearInterval(this.typingTimer);
          this.typingTimer = null;
        }
        return;
      }
      this.charIndex += 1;
      this.textEl.textContent = this.fullText.slice(0, this.charIndex);
      if (this.charIndex % 3 === 1) {
        this.audio.playBlip();
      }
    }, 24);
  }

  public advance(): void {
    if (!this.isOpen) return;
    if (this.charIndex < this.fullText.length) {
      this.charIndex = this.fullText.length;
      this.textEl.textContent = this.fullText;
      if (this.typingTimer !== null) {
        window.clearInterval(this.typingTimer);
        this.typingTimer = null;
      }
      return;
    }
    this.showNextEntry();
  }

  public close(): void {
    if (this.typingTimer !== null) {
      window.clearInterval(this.typingTimer);
      this.typingTimer = null;
    }
    this.isOpen = false;
    this.queue = [];
    this.onCompleteCallback = null;
    this.onGiftCallback = null;
    this.overlay.classList.add('hidden');
  }
}

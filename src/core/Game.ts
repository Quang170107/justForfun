import * as THREE from 'three';
import { PALETTE } from '../art/palette';
import { CAMERA_ELEVATION_RAD, PIXELS_PER_UNIT, pixelArt } from '../art/pixelArtGenerator';
import { DRYING_OUTPUT_MAP, ITEMS } from '../data/crops';
import { NPCS } from '../data/npcs';
import {
  InventorySlot,
  ItemId,
  MemoryCutscene,
  NpcId,
  SaveData,
  TeaSteepTime,
  TeaWaterTemp,
  UpgradesState,
} from '../data/types';
import { CustomerEntity } from '../entities/Customer';
import { NPCEntity } from '../entities/NPC';
import { Player } from '../entities/Player';
import { BrewingSystem } from '../systems/BrewingSystem';
import { FarmingSystem } from '../systems/FarmingSystem';
import { ProcessingSystem } from '../systems/ProcessingSystem';
import { RelationshipSystem } from '../systems/RelationshipSystem';
import { ShopSystem } from '../systems/ShopSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { UIManager } from '../ui/UIManager';
import { Buildings } from '../world/Buildings';
import { CloudSea } from '../world/CloudSea';
import { Island } from '../world/Island';
import { Tiles } from '../world/Tiles';
import { AudioSystem } from './AudioSystem';
import { InputSystem } from './InputSystem';
import { createDefaultSave, SaveSystem } from './SaveSystem';
import { TimeSystem } from './TimeSystem';

const BASE_W = 480;
const BASE_H = 270;

export class Game {
  private renderer: THREE.WebGLRenderer;
  private renderTarget: THREE.WebGLRenderTarget;
  private postScene: THREE.Scene;
  private postCamera: THREE.OrthographicCamera;

  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;

  private saveSystem = new SaveSystem();
  private input = new InputSystem();
  private audio = new AudioSystem();
  private time = new TimeSystem();

  private ui: UIManager;
  private island: Island;
  private cloudSea: CloudSea;
  private tiles: Tiles;
  private buildings: Buildings;
  private weather: WeatherSystem;
  private farming: FarmingSystem;
  private processing: ProcessingSystem;
  private brewing: BrewingSystem;
  private relations: RelationshipSystem;
  private shop: ShopSystem;

  private player: Player;
  private npcs = new Map<NpcId, NPCEntity>();
  private customers: CustomerEntity[] = [];

  private money: number;
  private inventory: (InventorySlot | null)[];
  private selectedHotbarIndex: number;
  private upgrades: UpgradesState;
  private introRead: boolean;

  private cameraYawStep = 0; // 0, 1, 2, 3 (90 deg steps)
  private cameraCurrentYaw = 0;
  private rotStartYaw = 0;
  private rotTargetYaw = 0;
  private rotAnimElapsed = 0.3;
  private readonly rotAnimDuration = 0.3;
  private camFollowX = 0;
  private camFollowZ = 0;
  private readonly camTargetVec = new THREE.Vector3();
  private readonly camRightVec = new THREE.Vector3();
  private readonly camUpVec = new THREE.Vector3();
  private readonly billboardTint = new THREE.Color('#ffffff');

  private currentScale = 2;
  private lastTime = performance.now();
  private elapsed = 0;
  private isSleepingTransition = false;

  private debugVisible = false;
  private fpsFrames = 0;
  private fpsAccum = 0;
  private currentFps = 60;

  constructor(canvas: HTMLCanvasElement) {
    pixelArt.init();

    const loaded = this.saveSystem.load() ?? createDefaultSave();
    this.money = loaded.money;
    this.inventory = loaded.inventory;
    this.selectedHotbarIndex = loaded.selectedHotbarIndex;
    this.upgrades = { ...loaded.upgrades };
    this.introRead = loaded.introRead;
    this.time.day = loaded.day;
    this.time.season = loaded.season;
    this.time.timeMinutes = loaded.timeMinutes;

    // 1. Setup Pixel-Perfect WebGL Renderer & Low-Res RenderTarget (480x270)
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.renderTarget = new THREE.WebGLRenderTarget(BASE_W, BASE_H, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      depthBuffer: true,
    });
    this.renderTarget.texture.colorSpace = THREE.SRGBColorSpace;

    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ map: this.renderTarget.texture })
    );
    this.postScene.add(postQuad);

    // 2. Setup 2.5D Scene & Orthographic Camera (1 tile = 16x16 px at base res)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.skyLight);

    const halfW = BASE_W / PIXELS_PER_UNIT / 2; // 15
    const halfH = BASE_H / PIXELS_PER_UNIT / 2; // 8.4375
    this.camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 140);

    this.ambientLight = new THREE.AmbientLight('#fff8ec', 0.92);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight('#fff2d6', 0.85);
    this.dirLight.position.set(-14, 24, 10);
    this.scene.add(this.dirLight);

    // 3. World & Systems
    this.cloudSea = new CloudSea();
    this.scene.add(this.cloudSea.group);

    this.island = new Island();
    this.scene.add(this.island.group);

    this.tiles = new Tiles(loaded.plots, this.upgrades.expandedFarmUnlocked);
    this.scene.add(this.tiles.group);

    this.buildings = new Buildings(this.island, this.upgrades);
    this.scene.add(this.buildings.group);

    this.weather = new WeatherSystem(loaded.weather);
    this.scene.add(this.weather.group);

    this.farming = new FarmingSystem(this.tiles, this.weather, this.audio);
    this.processing = new ProcessingSystem(loaded.dryingRack);
    this.buildings.setDryingRackHasLeaves(this.processing.hasActiveItems());

    this.brewing = new BrewingSystem(loaded.unlockedRecipes);
    this.relations = new RelationshipSystem(loaded.relations);
    this.shop = new ShopSystem(this.relations);

    // 4. Entities
    this.player = new Player(loaded.playerPos.x, loaded.playerPos.z);
    this.camFollowX = this.player.x;
    this.camFollowZ = this.player.z;
    this.scene.add(this.player.group);

    (Object.keys(NPCS) as NpcId[]).forEach((id) => {
      const npc = new NPCEntity(NPCS[id]);
      this.npcs.set(id, npc);
      this.scene.add(npc.group);
    });

    // 5. UI Manager
    this.ui = new UIManager(
      this.audio,
      (idx) => {
        this.selectedHotbarIndex = idx;
      },
      () => this.openInventoryModal(),
      () => this.openPauseMenu()
    );

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pointerdown', () => this.audio.unlockAndStartBgm(), { once: true });
    this.handleResize();

    if (!this.introRead) {
      this.openGrandmaLetter();
    }
  }

  private handleResize = (): void => {
    const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H)));
    this.currentScale = scale;
    const w = BASE_W * scale;
    const h = BASE_H * scale;
    this.renderer.setSize(w, h, false);
    const canvas = this.renderer.domElement;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const wrapper = document.getElementById('viewport-wrapper')!;
    wrapper.style.width = `${w}px`;
    wrapper.style.height = `${h}px`;
  };

  public start(): void {
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  private loop = (now: number): void => {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.elapsed += dt;
    this.fpsFrames += 1;
    this.fpsAccum += dt;
    if (this.fpsAccum >= 0.25) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsFrames = 0;
      this.fpsAccum = 0;
    }

    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop);
  };

  // ---------------- Inventory Helpers ----------------
  private addItem = (itemId: ItemId, count: number, quality: 1 | 2 | 3 = 1): boolean => {
    const def = ITEMS[itemId];
    if (def.stackable) {
      for (const s of this.inventory) {
        if (s && s.itemId === itemId && s.quality === quality) {
          s.count += count;
          return true;
        }
      }
    }
    const emptyIdx = this.inventory.findIndex((s) => s === null);
    if (emptyIdx === -1) return false;
    this.inventory[emptyIdx] = { itemId, count, quality };
    return true;
  };

  private consumeAtSlot = (slotIndex: number, count: number): boolean => {
    const slot = this.inventory[slotIndex];
    if (!slot || slot.count < count) return false;
    slot.count -= count;
    if (slot.count <= 0) {
      this.inventory[slotIndex] = null;
    }
    return true;
  };

  private getHeldSlot(): InventorySlot | null {
    return this.inventory[this.selectedHotbarIndex];
  }

  // ---------------- Update Loop ----------------
  private update(dt: number): void {
    const blocked = this.ui.isBlockingGameplay() || this.isSleepingTransition;
    this.time.paused = blocked;

    this.handleGlobalInput();

    if (!blocked) {
      this.time.update(dt, () => this.triggerSleep(true));
      this.player.update(dt, this.input.getMoveAxis(), this.cameraYawStep, this.island, this.audio);
      this.updateCustomers(dt);
      this.updateInteractionPrompt();
    }

    const lighting = this.time.getLightingState();
    this.ambientLight.color.copy(lighting.tintColor);
    this.ambientLight.intensity = lighting.ambientIntensity;
    this.dirLight.intensity = lighting.sunIntensity;
    (this.scene.background as THREE.Color).copy(lighting.tintColor).lerp(new THREE.Color(PALETTE.skyLight), 0.35);

    const fogStrength = this.weather.currentWeather === 'foggy' ? 1 : 0;
    this.cloudSea.update(this.elapsed, dt, fogStrength);
    this.island.update(this.elapsed);
    this.tiles.updateWindAndRain(this.elapsed, this.weather.currentWeather === 'rainy');
    this.buildings.update(this.elapsed, lighting.nightFactor);
    this.weather.update(dt, this.elapsed, lighting.nightFactor);

    for (const npc of this.npcs.values()) {
      npc.update(dt, this.elapsed, lighting.nightFactor, this.island, blocked);
    }

    this.ui.hud.updateClockAndMeta(
      this.time.day,
      this.time.season,
      this.time.getFormattedTime(),
      this.time.getDayProgress(),
      this.weather.currentWeather,
      this.time.isTeahouseOpen(),
      this.money,
      lighting.tintColor.getHexString(),
      lighting.nightFactor
    );
    this.ui.hud.renderHotbar(this.inventory, this.selectedHotbarIndex);
    this.ui.hud.updateDebugOverlay(this.debugVisible, {
      fps: this.currentFps,
      x: this.player.x,
      z: this.player.z,
      dir: this.player.direction,
      tileInfo: this.getDebugTargetTileInfo(),
      timeInfo: `Ngày ${this.time.day} - ${this.time.getFormattedTime()}`,
      weather: this.weather.getWeatherLabel(),
    });

    // Cập nhật xoay camera mượt (~0.3s) & lerp theo dõi người chơi
    if (this.rotAnimElapsed < this.rotAnimDuration) {
      this.rotAnimElapsed = Math.min(this.rotAnimDuration, this.rotAnimElapsed + dt);
      const t = this.rotAnimElapsed / this.rotAnimDuration;
      const ease = t * t * (3 - 2 * t);
      this.cameraCurrentYaw = THREE.MathUtils.lerp(this.rotStartYaw, this.rotTargetYaw, ease);
    } else {
      this.cameraCurrentYaw = this.cameraYawStep * (Math.PI / 2);
      this.rotTargetYaw = this.cameraCurrentYaw;
    }

    const followAlpha = 1 - Math.exp(-12 * dt);
    this.camFollowX = THREE.MathUtils.lerp(this.camFollowX, this.player.x, followAlpha);
    this.camFollowZ = THREE.MathUtils.lerp(this.camFollowZ, this.player.z, followAlpha);

    // Đồng bộ hướng hiển thị billboard nhân vật/NPC/khách theo góc camera
    this.player.applyCameraRelativeFrame(this.cameraYawStep);
    for (const npc of this.npcs.values()) {
      npc.applyCameraRelativeFrame(this.cameraYawStep);
    }
    for (const cust of this.customers) {
      cust.applyCameraRelativeFrame(this.cameraYawStep);
    }

    // Xoay tất cả Y-Billboard theo camera & tint nhẹ ban đêm
    this.billboardTint.set('#ffffff').lerp(lighting.tintColor, lighting.nightFactor * 0.55);
    this.scene.traverse((obj) => {
      if (obj.userData.isYBillboard) {
        obj.rotation.y = this.cameraCurrentYaw;
        const mesh = obj as THREE.Mesh;
        if (mesh.material && obj.userData.isBillboardMat) {
          (mesh.material as THREE.MeshBasicMaterial).color.copy(this.billboardTint);
        }
      }
    });

    this.updateCameraWithPixelSnap();
    this.input.clearFrameActions();
  }

  private getDebugTargetTileInfo(): string {
    const facing = this.player.getFacingPos(0.8);
    const { gx, gy } = this.tiles.worldToGrid(facing.x, facing.z);
    if (!this.tiles.isPlotAccessible(gx, gy)) {
      return `Ngoài đồi (${Math.floor(facing.x)}, ${Math.floor(facing.z)})`;
    }
    const p = this.tiles.getPlot(gx, gy);
    if (!p) return `Đồi (${gx}, ${gy})`;
    const cropTxt = p.cropId ? `${p.cropId}[GĐ${p.stage}]` : p.tilled ? 'Đất cuốc' : 'Cỏ';
    return `Đồi (${gx}, ${gy}) • ${cropTxt}${p.watered ? ' (Ướt)' : ''}`;
  }

  private handleGlobalInput(): void {
    if (import.meta.env.DEV) {
      if (this.input.consume('debugToggle')) {
        this.debugVisible = !this.debugVisible;
      }
      if (this.input.consume('debugPlusHour')) {
        if (this.time.timeMinutes + 60 >= 1440) {
          this.triggerSleep(false);
        } else {
          this.time.advanceMinutes(60);
          this.ui.hud.showToast(`⏩ Debug: ${this.time.getFormattedTime()}`);
        }
      }
      if (this.input.consume('debugNextDay')) {
        this.triggerSleep(false);
      }
      if (this.input.consume('debugAddMoney')) {
        this.money += 1000;
        this.audio.playCoin();
        this.ui.hud.showToast('🪙 Debug: +1000 Xu Mây');
      }
      if (this.input.consume('debugCycleWeather')) {
        const order: ('sunny' | 'rainy' | 'foggy')[] = ['sunny', 'rainy', 'foggy'];
        const nextIdx = (order.indexOf(this.weather.currentWeather) + 1) % order.length;
        this.weather.currentWeather = order[nextIdx];
        if (this.weather.currentWeather === 'rainy') {
          for (const p of this.tiles.getAllPlots()) {
            if (p.tilled) {
              p.watered = true;
              this.tiles.refreshPlotVisual(p.gx, p.gy);
            }
          }
        }
        this.ui.hud.showToast(`🌦️ Debug: ${this.weather.getWeatherLabel()}`);
      }
      if (this.input.consume('debugGiveSeeds')) {
        const seeds: ItemId[] = [
          'seed_green_tea',
          'seed_chrysanthemum',
          'seed_mint',
          'seed_jasmine',
          'seed_ginger',
        ];
        seeds.forEach((s) => this.addItem(s, 5, 1));
        this.audio.playHarvest();
        this.ui.hud.showToast('🌱 Debug: +5 mỗi loại hạt giống');
      }
    }
    if (this.input.consume('escape')) {
      if (this.ui.dialogue.isOpen) {
        this.ui.dialogue.close();
      } else if (this.ui.isModalOpen && this.ui.activeModalKind !== 'letter') {
        this.ui.closeModal();
      } else if (!this.ui.isModalOpen) {
        this.openPauseMenu();
      }
      return;
    }

    if (this.ui.dialogue.isOpen) {
      if (this.input.consume('interact')) {
        this.ui.dialogue.advance();
      }
      return;
    }

    if (this.input.consume('inventory')) {
      if (this.ui.isModalOpen && this.ui.activeModalKind === 'inventory') {
        this.ui.closeModal();
      } else if (!this.ui.isModalOpen) {
        this.openInventoryModal();
      }
      return;
    }

    if (this.ui.isModalOpen) return;

    if (this.input.consume('rotateLeft')) {
      this.startCameraRotation(-1);
    }
    if (this.input.consume('rotateRight')) {
      this.startCameraRotation(1);
    }

    for (let i = 1; i <= 9; i++) {
      if (this.input.consume(`hotbar${i}` as 'hotbar1')) {
        this.selectedHotbarIndex = i - 1;
      }
    }

    if (this.input.consume('interact')) {
      this.handleInteractAction();
    }
  }

  private updateCustomers(dt: number): void {
    const isOpen = this.time.isTeahouseOpen();
    const spawned = this.shop.trySpawnCustomer(
      dt,
      isOpen,
      this.customers.map((c) => c.data),
      this.upgrades.extraTableUnlocked
    );
    if (spawned) {
      const seatPos = this.buildings.tableSeats[spawned.seatIndex];
      const ent = new CustomerEntity(spawned, seatPos);
      this.customers.push(ent);
      this.scene.add(ent.group);
      const npcEntity = this.npcs.get(spawned.npcId);
      if (npcEntity) npcEntity.hiddenDuringCafe = true;
      this.audio.playChime();
      this.ui.hud.showToast(`🍵 ${NPCS[spawned.npcId].name} vừa ghé quán!`);
    }

    // Nếu quá 21:00 thì khách đang ngồi từ từ rời quán
    if (this.time.timeMinutes > 1260) {
      for (const c of this.customers) {
        if (c.data.state === 'seated') c.data.state = 'leaving';
      }
    }

    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];
      const left = c.update(dt, this.elapsed);
      if (left) {
        this.scene.remove(c.group);
        const npcEntity = this.npcs.get(c.data.npcId);
        if (npcEntity) npcEntity.hiddenDuringCafe = false;
        this.customers.splice(i, 1);
      }
    }
  }

  private findNearestCustomer(): CustomerEntity | null {
    let best: CustomerEntity | null = null;
    let bestDist = Infinity;
    for (const c of this.customers) {
      if (c.data.state !== 'seated') continue;
      const d = Math.hypot(this.player.x - c.x, this.player.z - c.z);
      if (d <= 1.75 && d < bestDist) {
        best = c;
        bestDist = d;
      }
    }
    return best;
  }

  private findNearestNpc(): NPCEntity | null {
    let best: NPCEntity | null = null;
    let bestDist = Infinity;
    for (const n of this.npcs.values()) {
      if (n.hiddenDuringCafe) continue;
      const d = Math.hypot(this.player.x - n.x, this.player.z - n.z);
      if (d <= 1.55 && d < bestDist) {
        best = n;
        bestDist = d;
      }
    }
    return best;
  }

  private updateInteractionPrompt(): void {
    const cust = this.findNearestCustomer();
    if (cust) {
      const held = this.getHeldSlot();
      const heldIsTea = held && ITEMS[held.itemId].category === 'tea';
      this.ui.hud.setPrompt(
        heldIsTea
          ? `Phục vụ ${ITEMS[held.itemId].name} cho ${NPCS[cust.data.npcId].name}`
          : `Hỏi order của ${NPCS[cust.data.npcId].name}`
      );
      return;
    }

    const npc = this.findNearestNpc();
    if (npc) {
      this.ui.hud.setPrompt(`Nói chuyện với ${npc.def.name}`);
      return;
    }

    const zone = this.buildings.getNearestZone(
      this.player.x,
      this.player.z,
      this.upgrades.extraTableUnlocked
    );
    if (zone && zone.id !== 'tea_table') {
      this.ui.hud.setPrompt(zone.label);
      return;
    }

    // Kiểm tra ô đất trước mặt
    const facing = this.player.getFacingPos(0.8);
    const { gx, gy } = this.tiles.worldToGrid(facing.x, facing.z);
    if (this.tiles.isPlotAccessible(gx, gy)) {
      const plot = this.tiles.getPlot(gx, gy);
      if (plot?.cropId && plot.stage === 3) {
        this.ui.hud.setPrompt('Thu hoạch cây chín');
        return;
      }
    }

    this.ui.hud.setPrompt(null);
  }

  private handleInteractAction(): void {
    // 1. Phục vụ / hỏi order khách ngồi bàn
    const cust = this.findNearestCustomer();
    if (cust) {
      const held = this.getHeldSlot();
      const npcDef = NPCS[cust.data.npcId];
      if (held && ITEMS[held.itemId].category === 'tea') {
        const teaId = held.itemId;
        const quality = held.quality;
        this.consumeAtSlot(this.selectedHotbarIndex, 1);
        const res = this.shop.serveCustomer(cust.data, teaId, quality);
        this.money += res.moneyEarned;
        this.audio.playCoin();
        this.weather.spawnBurst(cust.x, 1.5, cust.z, PALETTE.amberGold, 10);
        this.ui.hud.showToast(res.message);

        if (res.bonusGiftSeed) {
          this.addItem(res.bonusGiftSeed, 1, 2);
          this.ui.hud.showToast(`🎁 ${npcDef.name} tặng kèm 1 ${ITEMS[res.bonusGiftSeed].name}!`);
        }
        if (res.memory) {
          this.playMemoryCutscene(cust.data.npcId, res.memory);
        }
        return;
      }

      this.ui.dialogue.open([
        {
          speaker: `${npcDef.name} (Khách quán)`,
          npcId: cust.data.npcId,
          expression: cust.data.patience < 45 ? 'sad' : 'normal',
          text: `"${cust.data.hintText}" (Hãy vào Quầy Pha Trà pha món hợp ý rồi cầm trên tay mang ra phục vụ!)`,
          hearts: this.relations.getHearts(cust.data.npcId),
        },
      ]);
      return;
    }

    // 2. Nói chuyện & tặng trà NPC
    const npc = this.findNearestNpc();
    if (npc) {
      const { line, memory } = this.relations.talkToNpc(npc.def.id);
      const held = this.getHeldSlot();
      const canGift =
        held &&
        !this.relations.relations[npc.def.id].giftedToday &&
        ITEMS[held.itemId].category === 'tea';

      this.ui.dialogue.open(
        [
          {
            speaker: npc.def.name,
            npcId: npc.def.id,
            expression: 'normal',
            text: line,
            hearts: this.relations.getHearts(npc.def.id),
          },
        ],
        {
          giftLabel: canGift ? `🍵 Tặng ${ITEMS[held!.itemId].name}` : undefined,
          onGift: canGift
            ? () => {
                const giftId = held!.itemId;
                const q = held!.quality;
                this.consumeAtSlot(this.selectedHotbarIndex, 1);
                const gRes = this.relations.giveGift(npc.def.id, giftId, q);
                this.audio.playChime();
                this.ui.dialogue.open(
                  [
                    {
                      speaker: npc.def.name,
                      npcId: npc.def.id,
                      expression: gRes.loved ? 'happy' : 'normal',
                      text: gRes.loved
                        ? `Ôi, ${ITEMS[giftId].name}! Đây là món tôi thích nhất đấy! Cảm ơn cậu nhiều lắm!`
                        : `Cảm ơn cậu đã tặng tôi ${ITEMS[giftId].name}, thật ấm áp quá.`,
                      hearts: this.relations.getHearts(npc.def.id),
                    },
                  ],
                  {
                    onComplete: () => {
                      if (gRes.memory) this.playMemoryCutscene(npc.def.id, gRes.memory);
                    },
                  }
                );
              }
            : undefined,
          onComplete: () => {
            if (memory) this.playMemoryCutscene(npc.def.id, memory);
          },
        }
      );
      return;
    }

    // 3. Các trạm tương tác cố định
    const zone = this.buildings.getNearestZone(
      this.player.x,
      this.player.z,
      this.upgrades.extraTableUnlocked
    );
    if (zone && zone.id !== 'tea_table') {
      if (zone.id === 'sleep_door') {
        this.triggerSleep(false);
        return;
      }
      if (zone.id === 'seed_shop') {
        this.openShopModal();
        return;
      }
      if (zone.id === 'brew_counter') {
        this.openBrewingModal();
        return;
      }
      if (zone.id === 'roast_wok') {
        this.openRoastModal();
        return;
      }
      if (zone.id === 'drying_rack') {
        this.interactDryingRack();
        return;
      }
    }

    // 4. Hành động trồng trọt tại ô trước mặt (hoặc dưới chân)
    const held = this.getHeldSlot();
    const heldId = held ? held.itemId : null;
    const facing = this.player.getFacingPos(0.8);
    let acted = this.farming.tryFarmAction(
      facing.x,
      facing.z,
      heldId,
      this.selectedHotbarIndex,
      this.upgrades.wateringCanLevel,
      { addItem: this.addItem, consumeAtSlot: this.consumeAtSlot },
      (msg) => this.ui.hud.showToast(msg)
    );
    if (!acted) {
      acted = this.farming.tryFarmAction(
        this.player.x,
        this.player.z,
        heldId,
        this.selectedHotbarIndex,
        this.upgrades.wateringCanLevel,
        { addItem: this.addItem, consumeAtSlot: this.consumeAtSlot },
        (msg) => this.ui.hud.showToast(msg)
      );
    }
    if (acted) {
      this.player.triggerToolAction();
    }
  }

  private interactDryingRack(): void {
    const collected = this.processing.collectReadyFromRack();
    if (collected.length > 0) {
      let okCount = 0;
      for (const item of collected) {
        if (this.addItem(item.itemId, 1, item.quality)) okCount++;
      }
      this.audio.playHarvest();
      this.buildings.setDryingRackHasLeaves(this.processing.hasActiveItems());
      this.ui.hud.showToast(`☀️ Đã thu ${okCount} mẻ nguyên liệu phơi khô từ nong tre!`);
      return;
    }

    const held = this.getHeldSlot();
    if (held && DRYING_OUTPUT_MAP[held.itemId]) {
      if (this.processing.putOnDryingRack(held.itemId, held.quality)) {
        this.consumeAtSlot(this.selectedHotbarIndex, 1);
        this.audio.playHarvest();
        this.buildings.setDryingRackHasLeaves(true);
        this.ui.hud.showToast(`🧺 Đã trải ${ITEMS[held.itemId].name} lên nong tre (xong vào sáng mai).`);
      } else {
        this.ui.hud.showToast('Nong tre đang đầy (tối đa 3 mẻ), hãy chờ sáng mai thu nhé!');
      }
      return;
    }

    this.ui.hud.showToast(this.processing.getRackStatusText());
  }

  private playMemoryCutscene(npcId: NpcId, mem: MemoryCutscene): void {
    const entries = mem.lines.map((l) => ({
      speaker: `${l.speaker} • ${mem.title}`,
      npcId,
      expression: l.expression,
      text: l.text,
      hearts: this.relations.getHearts(npcId),
    }));
    this.ui.dialogue.open(entries, {
      onComplete: () => {
        if (mem.rewardMoney) {
          this.money += mem.rewardMoney;
          this.audio.playCoin();
          this.ui.hud.showToast(`✨ Ký ức mở khóa! Nhận +${mem.rewardMoney} Xu Mây!`);
        }
        if (mem.rewardItem) {
          this.addItem(mem.rewardItem.itemId, mem.rewardItem.count, mem.rewardItem.quality);
          this.audio.playHarvest();
          this.ui.hud.showToast(
            `✨ Quà ký ức: +${mem.rewardItem.count} ${ITEMS[mem.rewardItem.itemId].name}!`
          );
        }
      },
    });
  }

  // ---------------- Modals ----------------
  private openGrandmaLetter(): void {
    this.ui.openModal('letter');
    this.ui.shopMenuModal.renderGrandmaLetter(this.ui.modalBox, () => {
      this.introRead = true;
      this.ui.closeModal();
      this.audio.unlockAndStartBgm();
      this.persistGame(false);
    });
  }

  private openInventoryModal(): void {
    this.ui.openModal('inventory');
    this.ui.inventoryModal.render(
      this.ui.modalBox,
      this.inventory,
      this.brewing.unlockedRecipes,
      this.relations,
      (a, b) => {
        const tmp = this.inventory[a];
        this.inventory[a] = this.inventory[b];
        this.inventory[b] = tmp;
      },
      () => this.ui.closeModal()
    );
  }

  private openBrewingModal(): void {
    this.ui.openModal('brewing');
    this.ui.brewingScreen.renderBrewingCounter(
      this.ui.modalBox,
      this.inventory,
      this.brewing.unlockedRecipes,
      (baseSlotIdx, addonSlots, temp: TeaWaterTemp, steep: TeaSteepTime) => {
        const baseSlot = this.inventory[baseSlotIdx];
        if (!baseSlot) return null;

        const addonObjs = addonSlots
          .map((idx) => this.inventory[idx])
          .filter((s): s is InventorySlot => s !== null)
          .map((s) => ({ itemId: s.itemId, quality: s.quality }));

        const result = this.brewing.brew(baseSlot.itemId, baseSlot.quality, addonObjs, temp, steep);
        this.consumeAtSlot(baseSlotIdx, 1);
        for (const aIdx of addonSlots) {
          this.consumeAtSlot(aIdx, 1);
        }

        if (!this.addItem(result.itemId, 1, result.quality)) {
          this.ui.hud.showToast('Túi đồ đã đầy!');
          return null;
        }

        this.time.advanceMinutes(15);
        this.audio.playPourTea();
        const teaName = ITEMS[result.itemId].name;
        this.ui.hud.showToast(
          result.newlyUnlocked
            ? `📖 Công thức mới: ${teaName} (${'★'.repeat(result.quality)})!`
            : `🍵 Đã pha xong ${teaName} (${'★'.repeat(result.quality)})!`
        );
        return result;
      },
      () => this.ui.closeModal()
    );
  }

  private openRoastModal(): void {
    this.ui.openModal('roast');
    this.ui.brewingScreen.renderRoastMiniGame(
      this.ui.modalBox,
      this.inventory,
      (slotIdx, accuracyScore) => {
        const slot = this.inventory[slotIdx];
        if (!slot) return;
        this.consumeAtSlot(slotIdx, 1);
        const q = this.processing.getRoastResultQuality(accuracyScore);
        this.addItem('tea_roasted', 1, q);
        this.time.advanceMinutes(20);
        this.audio.playHarvest();
        this.ui.closeModal();
        this.ui.hud.showToast(`🔥 Sao thành công Trà Sao Thơm (${'★'.repeat(q)})!`);
      },
      () => this.ui.closeModal()
    );
  }

  private openShopModal(): void {
    this.ui.openModal('shop');
    const rerender = () =>
      this.ui.shopMenuModal.renderShop(
        this.ui.modalBox,
        this.money,
        this.inventory,
        this.upgrades,
        (itemId) => {
          const price = ITEMS[itemId].buyPrice ?? 20;
          if (this.money < price) return;
          if (!this.addItem(itemId, 1, 1)) {
            this.ui.hud.showToast('Túi đồ đã đầy!');
            return;
          }
          this.money -= price;
          this.audio.playCoin();
          this.ui.hud.showToast(`Đã mua ${ITEMS[itemId].name}!`);
          rerender();
        },
        (upgradeId, price) => {
          if (this.money < price) return;
          this.money -= price;
          if (upgradeId === 'wateringCanLevel') this.upgrades.wateringCanLevel = 2;
          else this.upgrades[upgradeId] = true;
          this.buildings.applyUpgrades(this.upgrades);
          this.tiles.setExpandedUnlocked(this.upgrades.expandedFarmUnlocked);
          this.audio.playChime();
          this.ui.hud.showToast('✨ Đã nâng cấp thành công!');
          rerender();
        },
        (slotIdx) => {
          const s = this.inventory[slotIdx];
          if (!s) return;
          const base = ITEMS[s.itemId].sellPrice;
          const val = Math.round(base * (s.quality === 3 ? 1.3 : s.quality === 2 ? 1.15 : 1));
          this.consumeAtSlot(slotIdx, 1);
          this.money += val;
          this.audio.playCoin();
          this.ui.hud.showToast(`+${val} Xu Mây`);
          rerender();
        },
        () => this.ui.closeModal()
      );
    rerender();
  }

  private openPauseMenu(): void {
    this.ui.openModal('menu');
    const rerender = () =>
      this.ui.shopMenuModal.renderPauseMenu(
        this.ui.modalBox,
        this.audio.bgmEnabled,
        () => {
          this.persistGame(true);
          this.ui.closeModal();
        },
        () => {
          this.audio.bgmEnabled = !this.audio.bgmEnabled;
          rerender();
        },
        () => {
          this.saveSystem.clear();
          window.location.reload();
        },
        () => this.ui.closeModal()
      );
    rerender();
  }

  // ---------------- Sleep & Save ----------------
  private triggerSleep(passedOut: boolean): void {
    if (this.isSleepingTransition) return;
    this.isSleepingTransition = true;

    // Dọn khách còn sót về nghỉ
    for (const c of this.customers) {
      this.scene.remove(c.group);
    }
    this.customers = [];
    for (const n of this.npcs.values()) {
      n.hiddenDuringCafe = false;
    }

    this.time.startNewMorning();
    const newWeather = this.weather.rollWeatherForNewDay();
    const isRain = newWeather === 'rainy';

    this.farming.onNewDay(isRain);
    this.processing.onNewDay();
    this.buildings.setDryingRackHasLeaves(this.processing.hasActiveItems());
    this.relations.onNewDay();
    this.shop.onNewDay();

    this.player.x = -2;
    this.player.z = -2.2;
    this.camFollowX = this.player.x;
    this.camFollowZ = this.player.z;
    this.player.syncSnappedPosition();

    this.persistGame(false);
    this.audio.playChime();

    const weatherText = this.weather.getWeatherLabel();
    const rainNote = isRain ? ' Trời mưa nhẹ đã tự tưới hết đồi trà!' : '';
    const prefix = passedOut ? 'Đã quá 24:00 nên bạn thiếp đi... ' : '';
    this.ui.hud.showToast(`🌅 ${prefix}Ngày ${this.time.day} (Xuân) • ${weatherText}.${rainNote}`);

    setTimeout(() => {
      this.isSleepingTransition = false;
    }, 500);
  }

  private persistGame(showToast: boolean): void {
    const data: SaveData = {
      version: 1,
      day: this.time.day,
      season: this.time.season,
      timeMinutes: this.time.timeMinutes,
      weather: this.weather.currentWeather,
      money: this.money,
      playerPos: { x: this.player.x, z: this.player.z },
      selectedHotbarIndex: this.selectedHotbarIndex,
      inventory: this.inventory,
      plots: this.tiles.getAllPlots(),
      dryingRack: this.processing.rack,
      unlockedRecipes: Array.from(this.brewing.unlockedRecipes),
      relations: this.relations.relations,
      upgrades: this.upgrades,
      introRead: this.introRead,
    };
    const ok = this.saveSystem.save(data);
    if (showToast && ok) {
      this.ui.hud.showToast('💾 Đã lưu tiến trình vào bộ nhớ trình duyệt!');
    }
  }

  // ---------------- Camera & Render ----------------
  private startCameraRotation(deltaStep: 1 | -1): void {
    this.cameraYawStep = (this.cameraYawStep + deltaStep + 4) % 4;
    this.rotStartYaw = this.cameraCurrentYaw;
    this.rotTargetYaw = this.cameraCurrentYaw + deltaStep * (Math.PI / 2);
    this.rotAnimElapsed = 0;
  }

  private updateCameraWithPixelSnap(): void {
    const yaw = this.cameraCurrentYaw;
    const dist = 16;
    const height = dist * Math.tan(CAMERA_ELEVATION_RAD); // Góc nhìn nghiêng 40°

    this.camTargetVec.set(this.camFollowX, 0.4, this.camFollowZ);
    this.camera.position.set(
      this.camFollowX + Math.sin(yaw) * dist,
      0.4 + height,
      this.camFollowZ + Math.cos(yaw) * dist
    );
    this.camera.lookAt(this.camTargetVec);
    this.camera.updateMatrixWorld();

    // Screen-space pixel snapping: làm tròn theo lưới 1/16 đơn vị trên cả trục X & Y màn hình
    this.camRightVec.setFromMatrixColumn(this.camera.matrixWorld, 0).normalize();
    this.camUpVec.setFromMatrixColumn(this.camera.matrixWorld, 1).normalize();

    const projX = this.camTargetVec.dot(this.camRightVec);
    const projY = this.camTargetVec.dot(this.camUpVec);
    const snapX = Math.round(projX * PIXELS_PER_UNIT) / PIXELS_PER_UNIT;
    const snapY = Math.round(projY * PIXELS_PER_UNIT) / PIXELS_PER_UNIT;
    const dx = snapX - projX;
    const dy = snapY - projY;

    this.camera.position.addScaledVector(this.camRightVec, dx).addScaledVector(this.camUpVec, dy);
    this.camTargetVec.addScaledVector(this.camRightVec, dx).addScaledVector(this.camUpVec, dy);
    this.camera.lookAt(this.camTargetVec);
  }

  private render(): void {
    // 1. Render 3D scene vào RenderTarget 480x270 NearestFilter
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);

    // 2. Phóng đại theo bội số nguyên lên màn hình bằng NearestFilter
    this.renderer.setRenderTarget(null);
    this.renderer.setViewport(0, 0, BASE_W * this.currentScale, BASE_H * this.currentScale);
    this.renderer.render(this.postScene, this.postCamera);
  }
}

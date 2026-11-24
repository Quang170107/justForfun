import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { PALETTE } from '../art/palette';
import { CAMERA_ELEVATION_RAD, pixelArt } from '../art/pixelArtGenerator';
import { toonMaterials } from '../art/toonMaterials';
import { DRYING_OUTPUT_MAP, getItemSellValue, ITEMS } from '../data/crops';
import { GUEST_PROFILES } from '../data/customers';
import {
  getShippingBinTotal,
  isDecorItemId,
  isDecorTileInAllowedZone,
  isSeedShopOpen,
  ShopUpgradeId,
} from '../data/economy';
import { NPCS } from '../data/npcs';
import {
  CLEANUP_SPOTS,
  createDefaultStoryState,
  DAY14_TEA_GATHERING_DIALOGUE,
  DAY1_BE_SUONG_DIALOGUE,
  DAY3_ONG_DANG_DIALOGUE,
  getLandmarkLore,
  GRANDMA_LETTERS,
  GrandmaLetterDef,
} from '../data/story';
import { rollRandomWeather, WEATHER_CONFIG, WEATHER_FORECAST_TEXT } from '../data/weather';
import {
  DailySummaryStats,
  GuestAppearanceId,
  InventorySlot,
  ItemId,
  MemoryCutscene,
  NpcId,
  PlacedDecorState,
  SaveData,
  StoryState,
  TeaSteepTime,
  TeaWaterTemp,
  ToolId,
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
import { InventoryModalTab } from '../ui/InventoryModal';
import { Buildings } from '../world/Buildings';
import { CloudSea } from '../world/CloudSea';
import { Island } from '../world/Island';
import { Tiles } from '../world/Tiles';
import { AudioSystem } from './AudioSystem';
import { InputSystem } from './InputSystem';
import { createDefaultSave, CURRENT_SAVE_VERSION, SaveSystem } from './SaveSystem';
import { TimeSystem } from './TimeSystem';

const BASE_W = 480;
const BASE_H = 270;

export class Game {
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;

  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private hemiLight: THREE.HemisphereLight;
  private dirLight: THREE.DirectionalLight;
  private readonly camHalfH = 7.2;

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
  private shippingBin: InventorySlot[] = [];
  private placedDecors: PlacedDecorState[] = [];
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
  private readonly projVec = new THREE.Vector3();
  private readonly sceneFog = new THREE.Fog('#d9e6fa', 42, 160);
  private cameraShakeTime = 0;
  private cameraShakeDuration = 0.11;
  private cameraShakeIntensity = 0.085;

  private tileCursorMesh: THREE.Mesh;
  private tileCursorMat: THREE.MeshBasicMaterial;
  private readonly raycaster = new THREE.Raycaster();
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly rayHitVec = new THREE.Vector3();
  private readonly ndcVec = new THREE.Vector2();
  private targetTileX = -2;
  private targetTileZ = -1;

  private lastTime = performance.now();
  private elapsed = 0;
  private isSleepingTransition = false;

  private debugVisible = false;
  private fpsFrames = 0;
  private fpsAccum = 0;
  private currentFps = 60;

  private dailyTeaIncome = 0;
  private dailySalesIncome = 0;
  private dailyNewRecipes: string[] = [];
  private dayStartHearts: Record<NpcId, number> = { may: 0, co_lu: 0, ong_dang: 0, be_suong: 0 };
  private windChimeTimer = 18;
  private story: StoryState = createDefaultStoryState();

  constructor(canvas: HTMLCanvasElement) {
    pixelArt.init();
    toonMaterials.init();

    const loaded = this.saveSystem.load() ?? createDefaultSave();
    this.money = loaded.money;
    this.inventory = loaded.inventory;
    this.selectedHotbarIndex = loaded.selectedHotbarIndex;
    this.upgrades = { ...loaded.upgrades };
    this.shippingBin = loaded.shippingBin.map((s) => ({ ...s }));
    this.placedDecors = loaded.placedDecors.map((d) => ({ ...d }));
    this.introRead = loaded.introRead;
    this.story = loaded.story
      ? {
          ...createDefaultStoryState(),
          ...loaded.story,
          cleanedSpots: [...loaded.story.cleanedSpots],
          unlockedLetters: [...loaded.story.unlockedLetters],
          seenEvents: [...loaded.story.seenEvents],
        }
      : createDefaultStoryState();
    this.time.day = loaded.day;
    this.time.season = loaded.season;
    this.time.timeMinutes = loaded.timeMinutes;

    // 1. Setup Full-Res Stylized 3D WebGL Renderer, PCF Soft Shadows & Bloom
    const initW = Math.max(320, window.innerWidth);
    const initH = Math.max(240, window.innerHeight);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(initW, initH, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // 2. Setup Stylized 3D Scene & Responsive Orthographic Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.skyLight);
    this.scene.fog = this.sceneFog;

    const aspect = initW / initH;
    this.camera = new THREE.OrthographicCamera(
      -this.camHalfH * aspect,
      this.camHalfH * aspect,
      this.camHalfH,
      -this.camHalfH,
      0.1,
      240
    );

    this.hemiLight = new THREE.HemisphereLight('#b7c9f0', '#8f6d46', 0.95);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight('#fff2d6', 1.25);
    this.dirLight.position.set(-14, 24, 14);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.camera.left = -19;
    this.dirLight.shadow.camera.right = 19;
    this.dirLight.shadow.camera.top = 16;
    this.dirLight.shadow.camera.bottom = -16;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 75;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.03;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(initW, initH), 0.24, 0.55, 0.92);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    // 3. World & Systems
    this.cloudSea = new CloudSea();
    this.scene.add(this.cloudSea.group);

    this.island = new Island();
    this.scene.add(this.island.group);

    this.tiles = new Tiles(loaded.plots, this.upgrades.expandedFarmUnlocked);
    this.scene.add(this.tiles.group);

    this.buildings = new Buildings(this.island, this.upgrades);
    this.buildings.syncPlacedDecors(this.placedDecors);
    this.buildings.setShippingBinHasItems(this.shippingBin.length > 0);
    this.syncWorldStoryProps();
    this.scene.add(this.buildings.group);

    this.weather = new WeatherSystem(loaded.weather, loaded.tomorrowWeather);
    this.scene.add(this.weather.group);

    this.farming = new FarmingSystem(this.tiles, this.weather, this.audio);
    this.processing = new ProcessingSystem(loaded.dryingRack);
    this.buildings.setDryingRackState(this.processing.getVisualState());

    this.brewing = new BrewingSystem(loaded.unlockedRecipes);
    this.relations = new RelationshipSystem(loaded.relations);
    this.shop = new ShopSystem(this.relations);
    this.buildings.setShopOpenSign(false);

    // 4. Entities & Tile Cursor
    this.player = new Player(loaded.playerPos.x, loaded.playerPos.z);
    this.camFollowX = this.player.x;
    this.camFollowZ = this.player.z;
    this.scene.add(this.player.group);

    const cursorGeo = new THREE.PlaneGeometry(1, 1);
    cursorGeo.rotateX(-Math.PI / 2);
    this.tileCursorMat = new THREE.MeshBasicMaterial({
      map: pixelArt.getTexture('tile_cursor_default'),
      transparent: true,
      depthWrite: false,
    });
    this.tileCursorMesh = new THREE.Mesh(cursorGeo, this.tileCursorMat);
    this.tileCursorMesh.position.set(-2.5, 0.045, -1.5);
    this.scene.add(this.tileCursorMesh);

    this.input.attachCanvas(canvas);

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

    this.snapshotDayStartHearts();
    this.ui.bindTitleCallbacks(
      () => this.startFromSave(),
      () => this.startNewGame(),
      () => this.openSettingsModal()
    );
    this.openTitleScreen();
  }

  private openTitleScreen(): void {
    this.ui.showTitleScreen(this.saveSystem.getSaveMeta());
  }

  private startFromSave(): void {
    const saved = this.saveSystem.load() ?? createDefaultSave();
    this.applySaveData(saved);
    this.ui.hideTitleScreen();
    this.audio.unlockAndStartBgm();
    if (!this.story.introCompleted && !this.introRead) {
      this.openIntroSequence();
    } else {
      this.triggerMorningStoryEvents();
    }
  }

  private startNewGame(): void {
    const fresh = createDefaultSave();
    this.saveSystem.save(fresh);
    this.applySaveData(fresh);
    this.ui.hideTitleScreen();
    this.audio.unlockAndStartBgm();
    this.openIntroSequence();
  }

  private applySaveData(data: SaveData): void {
    for (const c of this.customers) {
      this.scene.remove(c.group);
    }
    this.customers = [];
    for (const n of this.npcs.values()) {
      n.hiddenDuringCafe = false;
    }

    this.money = data.money;
    this.inventory = data.inventory.map((s) => (s ? { ...s } : null));
    this.selectedHotbarIndex = data.selectedHotbarIndex;
    this.upgrades = { ...data.upgrades };
    this.shippingBin = data.shippingBin.map((s) => ({ ...s }));
    this.placedDecors = data.placedDecors.map((d) => ({ ...d }));
    this.introRead = data.introRead;
    this.story = data.story
      ? {
          ...createDefaultStoryState(),
          ...data.story,
          cleanedSpots: [...data.story.cleanedSpots],
          unlockedLetters: [...data.story.unlockedLetters],
          seenEvents: [...data.story.seenEvents],
        }
      : createDefaultStoryState();
    this.time.day = data.day;
    this.time.season = data.season;
    this.time.timeMinutes = data.timeMinutes;
    this.weather.currentWeather = data.weather;
    this.weather.tomorrowWeather = data.tomorrowWeather ?? rollRandomWeather();

    this.weather.clearSkyLanterns();
    this.tiles.loadPlots(data.plots, this.upgrades.expandedFarmUnlocked);
    this.buildings.applyUpgrades(this.upgrades);
    this.buildings.syncPlacedDecors(this.placedDecors);
    this.buildings.setShippingBinHasItems(this.shippingBin.length > 0);
    this.syncWorldStoryProps();
    this.processing = new ProcessingSystem(data.dryingRack);
    this.buildings.setDryingRackState(this.processing.getVisualState());
    this.brewing = new BrewingSystem(data.unlockedRecipes);
    this.relations = new RelationshipSystem(data.relations);
    this.shop = new ShopSystem(this.relations);
    this.buildings.setShopOpenSign(false);

    for (const npc of this.npcs.values()) {
      npc.hiddenDuringCafe = false;
      npc.syncToSchedule(this.time.timeMinutes, this.weather.currentWeather);
    }

    this.player.x = data.playerPos.x;
    this.player.z = data.playerPos.z;
    if (this.island.isBlocked(this.player.x, this.player.z, 0.3)) {
      this.player.x = -2;
      this.player.z = -2;
    }
    this.player.direction = 'down';
    this.camFollowX = this.player.x;
    this.camFollowZ = this.player.z;
    this.player.syncSnappedPosition();

    this.resetDailySummaryTrackers();
  }

  private snapshotDayStartHearts(): void {
    (Object.keys(NPCS) as NpcId[]).forEach((id) => {
      this.dayStartHearts[id] = this.relations.getHearts(id);
    });
  }

  private resetDailySummaryTrackers(): void {
    this.dailyTeaIncome = 0;
    this.dailySalesIncome = 0;
    this.dailyNewRecipes = [];
    this.snapshotDayStartHearts();
  }

  private handleResize = (): void => {
    const w = Math.max(320, window.innerWidth);
    const h = Math.max(240, window.innerHeight);
    const scale = Math.max(1, Math.floor(Math.min(w / BASE_W, h / BASE_H)));
    document.documentElement.style.setProperty('--ui-scale', String(scale));
    const aspect = w / h;
    this.camera.left = -this.camHalfH * aspect;
    this.camera.right = this.camHalfH * aspect;
    this.camera.top = this.camHalfH;
    this.camera.bottom = -this.camHalfH;
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloomPass.setSize(w, h);

    const canvas = this.renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    const wrapper = document.getElementById('viewport-wrapper')!;
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
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

  private addItemOrOverflowToBin = (
    itemId: ItemId,
    count: number,
    quality: 1 | 2 | 3 = 1
  ): 'bag' | 'bin' => {
    if (this.addItem(itemId, count, quality)) {
      return 'bag';
    }
    const def = ITEMS[itemId];
    if (def.stackable) {
      const existing = this.shippingBin.find((s) => s.itemId === itemId && s.quality === quality);
      if (existing) {
        existing.count += count;
      } else {
        this.shippingBin.push({ itemId, count, quality });
      }
    } else {
      this.shippingBin.push({ itemId, count, quality });
    }
    this.buildings.setShippingBinHasItems(true);
    this.ui.hud.showToast('📦 Túi đầy — quà đã được cất vào Thùng Giao Hàng!');
    return 'bin';
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
      this.updateTargetTile(false);
      this.updateInteractionPrompt();
    } else {
      this.tileCursorMesh.visible = false;
    }

    const lighting = this.time.getLightingState(this.weather.currentWeather);
    this.hemiLight.color.copy(lighting.hemiSkyColor);
    this.hemiLight.groundColor.copy(lighting.hemiGroundColor);
    this.hemiLight.intensity = lighting.ambientIntensity;
    this.dirLight.color.copy(lighting.tintColor);
    this.dirLight.intensity = lighting.sunIntensity;
    this.dirLight.position.copy(lighting.sunDirection).multiplyScalar(28);
    this.dirLight.target.position.set(0, 0, 0);
    this.bloomPass.strength = lighting.bloomStrength;
    (this.scene.background as THREE.Color).copy(lighting.skyHorizonColor);

    this.audio.setBgmMood(
      this.weather.currentWeather === 'rainy'
        ? 'rain'
        : lighting.nightFactor >= 0.55
          ? 'night'
          : 'day'
    );
    if (!blocked && !this.buildings.isInsideHome(this.player.x, this.player.z)) {
      if (this.placedDecors.some((d) => d.itemId === 'decor_wind_chime')) {
        this.windChimeTimer -= dt;
        if (this.windChimeTimer <= 0) {
          this.windChimeTimer = 20 + Math.random() * 10;
          this.audio.playWindChime();
        }
      }
    }

    const fogAlpha = Math.min(1, dt * 3);
    this.sceneFog.color.lerp(lighting.fogColor, fogAlpha);
    this.sceneFog.near = THREE.MathUtils.lerp(this.sceneFog.near, lighting.fogNear, fogAlpha);
    this.sceneFog.far = THREE.MathUtils.lerp(this.sceneFog.far, lighting.fogFar, fogAlpha);
    this.cameraShakeTime = Math.max(0, this.cameraShakeTime - dt);

    const fogStrength = WEATHER_CONFIG[this.weather.currentWeather].cloudRise;
    this.cloudSea.update(
      this.elapsed,
      dt,
      fogStrength,
      lighting.nightFactor,
      lighting.skyTopColor,
      lighting.skyHorizonColor,
      lighting.sunDirection
    );
    this.island.update(this.elapsed, lighting.nightFactor);
    this.tiles.updateWindAndRain(this.elapsed, this.weather.currentWeather === 'rainy');
    this.buildings.update(this.elapsed, lighting.nightFactor, this.player.x, this.player.z);
    this.weather.update(dt, this.elapsed, lighting.nightFactor);

    for (const npc of this.npcs.values()) {
      npc.update(
        dt,
        this.elapsed,
        lighting.nightFactor,
        this.island,
        blocked,
        this.time.timeMinutes,
        this.weather.currentWeather
      );
    }

    this.ui.hud.updateClockAndMeta(
      this.time.day,
      this.time.season,
      this.time.getFormattedTime(),
      this.time.getDayProgress(),
      this.weather.currentWeather,
      this.time.isTeahouseOpen(),
      this.shop.isManuallyOpen,
      this.time.timeMinutes,
      this.money,
      lighting.tintColor.getHexString(),
      lighting.nightFactor,
      lighting.overlayOpacity
    );
    this.ui.hud.setLocation(this.buildings.getLocationLabel(this.player.x, this.player.z));
    this.updateQuestHudHint();
    this.ui.hud.renderHotbar(this.inventory, this.selectedHotbarIndex);
    if (import.meta.env.DEV) {
      this.ui.hud.updateDebugOverlay(this.debugVisible, {
        fps: this.currentFps,
        x: this.player.x,
        z: this.player.z,
        dir: this.player.direction,
        tileInfo: this.getDebugTargetTileInfo(),
        timeInfo: `Ngày ${this.time.day} - ${this.time.getFormattedTime()}`,
        weather: this.weather.getWeatherLabel(),
        tomorrowWeather: this.weather.getTomorrowWeatherLabel(),
        particles: this.weather.getActiveParticleCount(),
      });
    }

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
    if (this.ui.isTitleScreenOpen) {
      this.camFollowX = Math.sin(this.elapsed * 0.16) * 4.5;
      this.camFollowZ = -0.8;
    } else {
      this.camFollowX = THREE.MathUtils.lerp(this.camFollowX, this.player.x, followAlpha);
      this.camFollowZ = THREE.MathUtils.lerp(this.camFollowZ, this.player.z, followAlpha);
    }

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
    const { gx, gy } = this.tiles.worldToGrid(this.targetTileX + 0.5, this.targetTileZ + 0.5);
    if (!this.tiles.isPlotAccessible(gx, gy)) {
      return `Ngoài đồi (${this.targetTileX}, ${this.targetTileZ})`;
    }
    const p = this.tiles.getPlot(gx, gy);
    if (!p) return `Đồi (${gx}, ${gy})`;
    const cropTxt = p.cropId ? `${p.cropId}[GĐ${p.stage}]` : p.tilled ? 'Đất cuốc' : 'Cỏ';
    return `Đồi (${gx}, ${gy}) • ${cropTxt}${p.watered ? ' (Ướt)' : ''}`;
  }

  private getMouseGroundTile(): { hx: number; hz: number } | null {
    if (!this.input.mouseActive) return null;
    this.ndcVec.set(this.input.mouseNdc.x, this.input.mouseNdc.y);
    this.raycaster.setFromCamera(this.ndcVec, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, this.rayHitVec)) {
      return null;
    }
    return {
      hx: Math.floor(this.rayHitVec.x),
      hz: Math.floor(this.rayHitVec.z),
    };
  }

  private updateTargetTile(hidden: boolean): void {
    if (hidden) {
      this.tileCursorMesh.visible = false;
      return;
    }

    const px = Math.floor(this.player.x);
    const pz = Math.floor(this.player.z);
    const facing = this.player.getFacingPos(0.85);
    let tx = Math.floor(facing.x);
    let tz = Math.floor(facing.z);

    const mouseTile = this.getMouseGroundTile();
    if (mouseTile && Math.abs(mouseTile.hx - px) <= 1 && Math.abs(mouseTile.hz - pz) <= 1) {
      tx = mouseTile.hx;
      tz = mouseTile.hz;
    }

    tx = Math.max(-this.island.halfWidth, Math.min(this.island.halfWidth - 1, tx));
    tz = Math.max(-this.island.halfDepth, Math.min(this.island.halfDepth - 1, tz));

    this.targetTileX = tx;
    this.targetTileZ = tz;

    this.tileCursorMesh.visible = true;
    this.tileCursorMesh.position.set(tx + 0.5, 0.045, tz + 0.5);
    const pulse = 0.96 + Math.sin(this.elapsed * 5) * 0.04;
    this.tileCursorMesh.scale.set(pulse, pulse, 1);

    const held = this.getHeldSlot();
    const heldId = held?.itemId ?? null;
    const { gx, gy } = this.tiles.worldToGrid(tx + 0.5, tz + 0.5);
    let canAct = false;
    if (this.tiles.isPlotAccessible(gx, gy)) {
      const p = this.tiles.getPlot(gx, gy);
      if (p) {
        if (p.cropId && p.stage === 3) canAct = true;
        else if (heldId === 'hoe' && !p.tilled) canAct = true;
        else if (heldId === 'watering_can' && p.tilled) canAct = true;
        else if (heldId?.startsWith('seed_') && p.tilled && !p.cropId) canAct = true;
      }
    } else if (isDecorItemId(heldId)) {
      canAct = this.canPlaceDecorAt(tx, tz);
    } else if (heldId === 'basket' && this.placedDecors.some((d) => d.tileX === tx && d.tileZ === tz)) {
      canAct = true;
    }
    const desiredTex = pixelArt.getTexture(canAct ? 'tile_cursor_action' : 'tile_cursor_default');
    if (this.tileCursorMat.map !== desiredTex) {
      this.tileCursorMat.map = desiredTex;
      this.tileCursorMat.needsUpdate = true;
    }
  }

  private canPlaceDecorAt(tileX: number, tileZ: number): boolean {
    if (!isDecorTileInAllowedZone(tileX, tileZ)) return false;
    if (Math.floor(this.player.x) === tileX && Math.floor(this.player.z) === tileZ) return false;
    if (this.placedDecors.some((d) => d.tileX === tileX && d.tileZ === tileZ)) return false;
    const wx = tileX + 0.5;
    const wz = tileZ + 0.5;
    if (this.island.isBlocked(wx, wz, 0.25)) return false;
    if (this.buildings.zones.some((z) => Math.hypot(wx - z.x, wz - z.z) < 0.72)) return false;
    if (this.buildings.tableSeats.some((s) => Math.hypot(wx - s.x, wz - s.z) < 0.85)) return false;
    return true;
  }

  private handleGlobalInput(): void {
    if (import.meta.env.DEV && !this.ui.isTitleScreenOpen && !this.isSleepingTransition) {
      if (this.input.consume('debugToggle')) {
        this.debugVisible = !this.debugVisible;
      }
      if (this.input.consume('debugPlusHour')) {
        if (this.time.timeMinutes + 60 >= 1440) {
          this.time.timeMinutes = 1440;
          this.triggerSleep(true);
        } else {
          this.time.advanceMinutes(60);
          for (const c of this.customers) {
            if (c.data.state === 'seated') {
              c.data.waitTimer += 40;
              c.data.patience = Math.max(15, 100 - c.data.waitTimer * 0.9);
            }
          }
          this.ui.hud.showToast(`⏩ Debug: ${this.time.getFormattedTime()}`);
        }
      }
      if (this.input.consume('debugNextDay')) {
        this.triggerSleep(false);
      }
      if (this.input.consume('debugAddMoney')) {
        this.money += 1000;
        this.audio.playCoin();
        this.ui.hud.spawnHudMoneyPopup(1000);
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
        const brewMats: { id: ItemId; count: number; quality: 1 | 2 | 3 }[] = [
          { id: 'leaf_green_tea_fresh', count: 3, quality: 1 },
          { id: 'tea_roasted', count: 3, quality: 3 },
          { id: 'chrysanthemum_fresh', count: 3, quality: 2 },
          { id: 'mint_fresh', count: 3, quality: 1 },
          { id: 'jasmine_fresh', count: 3, quality: 1 },
          { id: 'ginger_fresh', count: 3, quality: 3 },
          { id: 'honey', count: 3, quality: 1 },
        ];
        brewMats.forEach((m) => this.addItem(m.id, m.count, m.quality));
        this.audio.playHarvest();
        this.ui.hud.showToast('🌱 Debug: +5 hạt giống & +3 nguyên liệu pha trà các loại');
      }
      if (this.input.consume('debugAddHearts')) {
        let milestoneNpc: { x: number; z: number; name: string; hearts: number } | null = null;
        (Object.keys(NPCS) as NpcId[]).forEach((id) => {
          const prev = this.relations.getHearts(id);
          const next = this.relations.addDebugPoints(id, 100);
          const ent = this.npcs.get(id);
          if (ent && next > prev) {
            this.weather.spawnSparkleBurst(ent.x, 1.4, ent.z, 10);
            if (!milestoneNpc) {
              milestoneNpc = { x: ent.x, z: ent.z, name: NPCS[id].name, hearts: next };
            }
          }
        });
        if (milestoneNpc) {
          const m = milestoneNpc as { x: number; z: number; name: string; hearts: number };
          this.spawnWorldFloatingText(`💛 ${m.name} đạt ${m.hearts}♥!`, m.x, 1.85, m.z, 'heart');
        }
        this.audio.playChime();
        this.ui.hud.showToast(
          '💖 Debug: +1 tim cho cả 4 NPC! Nói chuyện hoặc mở Quan Hệ để xem ký ức.'
        );
      }
    }
    if (this.input.consume('escape')) {
      if (this.ui.isTitleScreenOpen) {
        if (this.ui.isModalOpen && this.ui.activeModalKind === 'settings') {
          this.ui.closeModal();
        }
        return;
      }
      if (this.ui.dialogue.isOpen) {
        this.ui.dialogue.close();
      } else if (
        this.ui.isModalOpen &&
        this.ui.activeModalKind !== 'letter' &&
        this.ui.activeModalKind !== 'day_summary' &&
        this.ui.activeModalKind !== 'intro_cutscene' &&
        this.ui.activeModalKind !== 'festival' &&
        this.ui.activeModalKind !== 'spring_finale'
      ) {
        this.ui.closeModal();
      } else if (!this.ui.isModalOpen && !this.isSleepingTransition) {
        this.openPauseMenu();
      }
      return;
    }

    if (this.ui.isTitleScreenOpen || this.isSleepingTransition) return;

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

    const wheelSteps = this.input.consumeWheelSteps();
    if (wheelSteps !== 0) {
      this.selectedHotbarIndex = (((this.selectedHotbarIndex + wheelSteps) % 9) + 9) % 9;
    }

    if (this.input.consume('canvasClick')) {
      const px = Math.floor(this.player.x);
      const pz = Math.floor(this.player.z);
      const mouseTile = this.getMouseGroundTile();
      if (mouseTile && Math.abs(mouseTile.hx - px) <= 1 && Math.abs(mouseTile.hz - pz) <= 1) {
        this.targetTileX = mouseTile.hx;
        this.targetTileZ = mouseTile.hz;
        this.player.faceTowards(mouseTile.hx + 0.5, mouseTile.hz + 0.5);
        this.handleInteractAction(mouseTile.hx + 0.5, mouseTile.hz + 0.5);
      }
      return;
    }

    if (this.input.consume('interact')) {
      this.handleInteractAction();
    }
  }

  private updateCustomers(dt: number): void {
    const withinHours = this.time.isTeahouseOpen();
    if (!withinHours && this.shop.isManuallyOpen) {
      this.shop.forceClose();
      this.buildings.setShopOpenSign(false);
      this.ui.hud.showToast(
        '🌙 Đã quá 20:00 — biển quán chuyển sang Đóng Cửa (khách đang ngồi vẫn được phục vụ nốt)!'
      );
    }

    const activelyOpen = withinHours && this.shop.isManuallyOpen;
    this.buildings.setShopOpenSign(activelyOpen);

    const spawned = this.shop.trySpawnCustomer(
      dt,
      activelyOpen,
      this.customers.map((c) => c.data),
      this.upgrades.tableCount,
      this.weather.currentWeather
    );
    if (spawned) {
      const seatPos = this.buildings.tableSeats[spawned.seatIndex];
      const ent = new CustomerEntity(spawned, seatPos);
      this.customers.push(ent);
      this.scene.add(ent.group);
      if (spawned.npcId) {
        const npcEntity = this.npcs.get(spawned.npcId);
        if (npcEntity) npcEntity.hiddenDuringCafe = true;
      }
      this.audio.playWindChime();
      this.ui.hud.showToast(`🍵 ${spawned.displayName} vừa bước qua Bến Mây ghé quán!`);
    }

    // Khách cực kỳ kiên nhẫn, chỉ tới khuya (22:00) mới đứng dậy ra về
    if (this.time.timeMinutes >= 1320) {
      for (const c of this.customers) {
        if (c.data.state === 'seated') c.data.state = 'leaving';
      }
    }

    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];
      const left = c.update(dt, this.elapsed);
      if (left) {
        this.scene.remove(c.group);
        if (c.data.npcId) {
          const npcEntity = this.npcs.get(c.data.npcId);
          if (npcEntity) npcEntity.hiddenDuringCafe = false;
        }
        this.customers.splice(i, 1);
      }
    }

    if (
      this.customers.length === 0 &&
      this.shop.customersSpawnedToday > 0 &&
      !this.shop.afternoonFinishedAnnounced &&
      (this.shop.customersSpawnedToday >= this.shop.maxCustomersToday || !withinHours)
    ) {
      this.shop.afternoonFinishedAnnounced = true;
      this.ui.hud.showToast(
        '🌅 Vị khách cuối cùng đã rời Bến Mây — kết thúc buổi chiều phục vụ trọn vẹn!'
      );
    }
  }

  private findNearestCustomer(): CustomerEntity | null {
    let best: CustomerEntity | null = null;
    let bestDist = Infinity;
    for (const c of this.customers) {
      if (c.data.state !== 'seated') continue;
      const seat = this.buildings.tableSeats[c.data.seatIndex];
      const d = Math.min(
        Math.hypot(this.player.x - c.x, this.player.z - c.z),
        Math.hypot(this.player.x - seat.x, this.player.z - seat.z)
      );
      if (d <= 1.85 && d < bestDist) {
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
          ? `Phục vụ ${ITEMS[held.itemId].name} cho ${cust.data.displayName}`
          : `Hỏi order của ${cust.data.displayName}`
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
      this.upgrades.tableCount
    );
    if (zone && zone.id !== 'tea_table') {
      if (zone.id === 'seed_shop') {
        if (isSeedShopOpen(this.time.timeMinutes)) {
          this.ui.hud.setPrompt('Mở Sạp Hạt Giống & Nâng Cấp Bé Sương');
        } else {
          this.ui.hud.setPrompt('Sạp Bé Sương đóng cửa (mở 08:00–18:00)');
        }
        return;
      }
      if (zone.id === 'shipping_bin') {
        const est = getShippingBinTotal(this.shippingBin);
        this.ui.hud.setPrompt(
          est > 0 ? `Mở Hộp Bán Hàng (Dự kiến +${est} Xu)` : 'Hộp Bán Hàng Qua Đêm'
        );
        return;
      }
      if (zone.id === 'drying_rack') {
        const readyCount = this.processing.getReadyCount();
        const held = this.getHeldSlot();
        if (readyCount > 0) {
          this.ui.hud.setPrompt(`Thu ${readyCount} mẻ lá khô (Nong tre)`);
        } else if (held && DRYING_OUTPUT_MAP[held.itemId] && this.processing.hasEmptySlot()) {
          this.ui.hud.setPrompt(`Phơi ${ITEMS[held.itemId].name} lên Nong tre`);
        } else {
          const dryingCount = this.processing.getDryingCount();
          this.ui.hud.setPrompt(
            dryingCount > 0
              ? `Nong tre (đang phơi ${dryingCount}/3 mẻ)`
              : 'Nong Phơi Lá Tre (cầm lá tươi để phơi)'
          );
        }
        return;
      }
      if (zone.id === 'roast_wok') {
        this.ui.hud.setPrompt('Sao trà trên Chảo Sao (Mini-game)');
        return;
      }
      if (zone.id === 'open_sign') {
        this.ui.hud.setPrompt(
          this.shop.isManuallyOpen ? 'Lật biển ĐÓNG CỬA Quán Trà' : 'Lật biển MỞ CỬA Quán Trà'
        );
        return;
      }
      this.ui.hud.setPrompt(zone.label);
      return;
    }

    // Kiểm tra ô đất mục tiêu (trước mặt hoặc theo con trỏ chuột)
    const { gx, gy } = this.tiles.worldToGrid(this.targetTileX + 0.5, this.targetTileZ + 0.5);
    const held = this.getHeldSlot();
    const heldId = held?.itemId ?? null;
    if (this.tiles.isPlotAccessible(gx, gy)) {
      const plot = this.tiles.getPlot(gx, gy);
      if (plot?.cropId && plot.stage === 3) {
        this.ui.hud.setPrompt('Thu hoạch cây chín');
        return;
      }
      if (plot && !plot.tilled && heldId === 'hoe') {
        this.ui.hud.setPrompt('Cuốc đất');
        return;
      }
      if (plot && plot.tilled && !plot.cropId && heldId?.startsWith('seed_')) {
        this.ui.hud.setPrompt(`Gieo ${ITEMS[heldId].name}`);
        return;
      }
      if (plot && plot.tilled && !plot.watered && heldId === 'watering_can') {
        this.ui.hud.setPrompt('Tưới nước');
        return;
      }
    } else if (isDecorItemId(heldId)) {
      this.ui.hud.setPrompt(
        this.canPlaceDecorAt(this.targetTileX, this.targetTileZ)
          ? `Đặt ${ITEMS[heldId].name}`
          : 'Không thể đặt đồ trang trí ở đây'
      );
      return;
    } else if (heldId === 'basket') {
      const existing = this.placedDecors.find(
        (d) => d.tileX === this.targetTileX && d.tileZ === this.targetTileZ
      );
      if (existing) {
        this.ui.hud.setPrompt(`Thu hồi ${ITEMS[existing.itemId].name}`);
        return;
      }
    }

    this.ui.hud.setPrompt(null);
  }

  private handleInteractAction(overrideX?: number, overrideZ?: number): void {
    // 1. Phục vụ / hỏi order khách ngồi bàn
    const cust = this.findNearestCustomer();
    if (cust) {
      const held = this.getHeldSlot();
      const customerHearts = cust.data.npcId ? this.relations.getHearts(cust.data.npcId) : undefined;
      if (held && ITEMS[held.itemId].category === 'tea') {
        const teaId = held.itemId;
        const quality = held.quality;
        this.consumeAtSlot(this.selectedHotbarIndex, 1);
        const prevHearts = cust.data.npcId ? this.relations.getHearts(cust.data.npcId) : 0;
        const res = this.shop.serveCustomer(cust.data, teaId, quality);
        this.money += res.moneyEarned;
        this.dailyTeaIncome += res.moneyEarned;
        this.story.totalCustomersServed += 1;
        this.story.totalMoneyEarned += res.moneyEarned;
        this.spawnWorldFloatingText(`+${res.moneyEarned} Xu Mây`, cust.x, 1.7, cust.z, 'money');
        this.ui.hud.spawnHudMoneyPopup(res.moneyEarned);
        if (res.exactMatch) {
          this.audio.playCoin();
          this.weather.spawnBurst(cust.x, 1.5, cust.z, PALETTE.amberGold, 10);
        } else {
          this.audio.playBlip(360);
          this.weather.spawnBurst(cust.x, 1.5, cust.z, PALETTE.waterBlue, 6);
        }
        if (cust.data.npcId) {
          const newHearts = this.relations.getHearts(cust.data.npcId);
          if (newHearts > prevHearts) {
            this.triggerHeartMilestoneEffect(cust.x, cust.z, cust.data.displayName, newHearts);
          }
        }
        this.ui.hud.showToast(res.message);

        if (res.bonusGiftSeed && cust.data.npcId) {
          this.addItemOrOverflowToBin(res.bonusGiftSeed, 1, 2);
          this.ui.hud.showToast(
            `🎁 ${cust.data.displayName} tặng kèm 1 ${ITEMS[res.bonusGiftSeed].name}!`
          );
        }

        const servedNpcId = cust.data.npcId;
        this.ui.dialogue.open(
          [
            {
              speaker: cust.data.displayName,
              portraitId: cust.data.appearanceId,
              expression: res.reaction,
              text: `${res.dialogueText} (+${res.moneyEarned} Xu Mây)`,
              hearts: customerHearts,
            },
          ],
          {
            onComplete: () => {
              const l3 = this.unlockLetter('letter_3_guests');
              if (res.memory && servedNpcId) {
                this.playMemoryCutscene(servedNpcId, res.memory);
                if (l3) {
                  this.ui.hud.showToast('✉️ Mở khóa Lá Thư #3 trong Sổ Thư!');
                }
              } else if (l3) {
                this.openLetterModalById('letter_3_guests', '💛 Thật ấm lòng!');
              }
            },
          }
        );
        return;
      }

      const waitingLong = cust.data.patience < 45;
      const waitNote = waitingLong
        ? cust.data.npcId
          ? 'Tôi ngồi đợi nãy giờ hơi khát cổ rồi... '
          : `${GUEST_PROFILES[cust.data.appearanceId as GuestAppearanceId].waitingLine} `
        : '';

      this.ui.dialogue.open([
        {
          speaker: `${cust.data.displayName} (${cust.data.npcId ? 'Khách quen' : cust.data.roleLabel})`,
          portraitId: cust.data.appearanceId,
          expression: waitingLong ? 'sad' : 'normal',
          text: `${waitNote}"${cust.data.hintText}" (Pha tách trà hợp ý tại Quầy rồi cầm trên tay phục vụ nhé!)`,
          hearts: customerHearts,
        },
      ]);
      return;
    }

    // 2. Nói chuyện & tặng quà NPC
    const npc = this.findNearestNpc();
    if (npc) {
      const prevTalkHearts = this.relations.getHearts(npc.def.id);
      const talk = this.relations.talkToNpc(npc.def.id, {
        day: this.time.day,
        weather: this.weather.currentWeather,
        timeMinutes: this.time.timeMinutes,
      });
      const postTalkHearts = this.relations.getHearts(npc.def.id);
      if (postTalkHearts > prevTalkHearts) {
        this.triggerHeartMilestoneEffect(npc.x, npc.z, npc.def.name, postTalkHearts);
      }
      if (talk.pointsAdded > 0) {
        this.ui.hud.showToast(`💛 +${talk.pointsAdded} điểm thân thiết với ${npc.def.name}`);
      }

      const held = this.getHeldSlot();
      const heldDef = held ? ITEMS[held.itemId] : null;
      const canGift =
        held !== null &&
        heldDef !== null &&
        !this.relations.relations[npc.def.id].giftedToday &&
        heldDef.category !== 'tool' &&
        heldDef.category !== 'seed';

      this.ui.dialogue.open(
        [
          {
            speaker: npc.def.name,
            npcId: npc.def.id,
            expression: talk.expression,
            text: talk.line,
            hearts: this.relations.getHearts(npc.def.id),
          },
        ],
        {
          giftLabel: canGift ? `🎁 Tặng ${heldDef!.name}` : undefined,
          onGift: canGift
            ? () => {
                const giftId = held!.itemId;
                const q = held!.quality;
                this.consumeAtSlot(this.selectedHotbarIndex, 1);
                const prevGiftHearts = this.relations.getHearts(npc.def.id);
                const gRes = this.relations.giveGift(npc.def.id, giftId, q);
                const postGiftHearts = this.relations.getHearts(npc.def.id);
                if (gRes.tier === 'disliked') {
                  this.audio.playBlip(280);
                  this.weather.spawnBurst(npc.x, 1.5, npc.z, PALETTE.waterBlue, 6);
                } else {
                  this.audio.playChime();
                  this.weather.spawnBurst(npc.x, 1.5, npc.z, PALETTE.amberGold, 9);
                }
                if (postGiftHearts > prevGiftHearts) {
                  this.triggerHeartMilestoneEffect(npc.x, npc.z, npc.def.name, postGiftHearts);
                }
                const sign = gRes.pointsDelta >= 0 ? `+${gRes.pointsDelta}` : `${gRes.pointsDelta}`;
                this.ui.hud.showToast(
                  `🎁 Tặng ${ITEMS[giftId].name} cho ${npc.def.name} (${sign} điểm thân thiết)`
                );
                this.ui.dialogue.open(
                  [
                    {
                      speaker: npc.def.name,
                      npcId: npc.def.id,
                      expression: gRes.expression,
                      text: gRes.line,
                      hearts: this.relations.getHearts(npc.def.id),
                    },
                  ],
                  {
                    onComplete: () => {
                      if (gRes.memory) this.playMemoryCutscene(npc.def.id, gRes.memory, true);
                    },
                  }
                );
              }
            : undefined,
          onComplete: () => {
            if (talk.memory) this.playMemoryCutscene(npc.def.id, talk.memory, true);
          },
        }
      );
      return;
    }

    // 3. Các trạm tương tác cố định
    const zone = this.buildings.getNearestZone(
      this.player.x,
      this.player.z,
      this.upgrades.tableCount
    );
    if (zone && zone.id !== 'tea_table') {
      if (zone.id === 'sleep_door') {
        this.triggerSleep(false);
        return;
      }
      if (zone.id === 'weather_radio') {
        const forecast = WEATHER_FORECAST_TEXT[this.weather.tomorrowWeather];
        this.audio.playChime();
        this.ui.dialogue.open([
          {
            speaker: '📻 Đài Khí Tượng Tầng Mây',
            text: `${forecast.title} — ${forecast.radioLine} (${forecast.tip})`,
          },
        ]);
        return;
      }
      if (zone.id === 'shipping_bin') {
        this.openShippingBinModal();
        return;
      }
      if (zone.id === 'seed_shop') {
        if (!isSeedShopOpen(this.time.timeMinutes)) {
          this.audio.playBlip(280);
          this.ui.hud.showToast(
            import.meta.env.DEV
              ? '⏰ Sạp Bé Sương chỉ mở từ 08:00 đến 18:00! (Nhấn F5 để tua giờ thử nhanh)'
              : '⏰ Sạp Bé Sương chỉ mở từ 08:00 đến 18:00!'
          );
          return;
        }
        this.openShopModal();
        return;
      }
      if (zone.id === 'cleanup_spot' && zone.spotId) {
        this.handleCleanupSpot(zone.spotId, zone.x, zone.z);
        return;
      }
      if (zone.id === 'tea_shrine') {
        const firstVisit = !this.story.unlockedLetters.includes('letter_6_shrine');
        this.weather.spawnSparkleBurst(10.3, 0.9, 0.35, 14);
        this.audio.playWindChime();
        if (firstVisit) {
          this.unlockLetter('letter_6_shrine');
          this.persistGame(false);
          this.openLetterModalById('letter_6_shrine', '⛩️ Cất vào Sổ Thư!');
        } else {
          const lore = getLandmarkLore('tea_shrine', this.time.timeMinutes, this.weather.currentWeather);
          this.ui.dialogue.open([{ speaker: lore.speaker, text: lore.text }]);
        }
        return;
      }
      if (zone.id === 'cloud_pond' || zone.id === 'overlook_bench') {
        this.audio.playChime();
        if (zone.id === 'cloud_pond') {
          this.weather.spawnBurst(-8.2, 0.3, 6.35, PALETTE.waterLight, 8);
        } else {
          this.weather.spawnSparkleBurst(-4.0, 0.9, 6.45, 8);
        }
        const lore = getLandmarkLore(zone.id, this.time.timeMinutes, this.weather.currentWeather);
        this.ui.dialogue.open([{ speaker: lore.speaker, text: lore.text }]);
        return;
      }
      if (zone.id === 'letter_pickup' && zone.letterId) {
        this.unlockLetter(zone.letterId);
        this.weather.spawnSparkleBurst(zone.x, 0.7, zone.z, 12);
        this.audio.playChime();
        this.syncWorldStoryProps();
        this.openLetterModalById(zone.letterId, '🏮 Cất vào Sổ Thư!');
        return;
      }
      if (zone.id === 'festival_stand') {
        this.triggerLanternFestival();
        return;
      }
      if (zone.id === 'brew_counter') {
        if (!this.story.teahouseCleaned) {
          this.audio.playBlip(280);
          const remain = CLEANUP_SPOTS.length - this.story.cleanedSpots.length;
          this.ui.hud.showToast(
            `🧹 Hiên Quán Trà còn ${remain} điểm lá bụi! Hãy quét dọn sạch ngoài hiên trước khi pha trà nhé.`
          );
          return;
        }
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
      if (zone.id === 'open_sign') {
        if (!this.story.teahouseCleaned) {
          this.audio.playBlip(280);
          const remain = CLEANUP_SPOTS.length - this.story.cleanedSpots.length;
          this.ui.hud.showToast(
            `🧹 Hãy quét sạch ${remain} điểm lá bụi trên hiên Quán Trà trước khi mở cửa đón khách!`
          );
          return;
        }
        const res = this.shop.toggleOpen(this.time.isTeahouseOpen());
        this.buildings.setShopOpenSign(res.isOpen);
        if (res.ok) {
          if (res.isOpen) this.audio.playWindChime();
          else this.audio.playChime();
        } else {
          this.audio.playBlip(320);
        }
        this.ui.hud.showToast(res.message);
        return;
      }
    }

    // 4. Hành động trồng trọt, đặt/thu đồ trang trí & dùng công cụ tại ô mục tiêu
    if (this.player.isPerformingAction()) return;
    const held = this.getHeldSlot();
    const heldId = held ? held.itemId : null;
    const targetX = overrideX ?? this.targetTileX + 0.5;
    const targetZ = overrideZ ?? this.targetTileZ + 0.5;
    const targetTileX = Math.floor(targetX);
    const targetTileZ = Math.floor(targetZ);

    if (heldId === 'basket') {
      const decIdx = this.placedDecors.findIndex(
        (d) => d.tileX === targetTileX && d.tileZ === targetTileZ
      );
      if (decIdx !== -1) {
        const dec = this.placedDecors[decIdx];
        if (!this.addItem(dec.itemId, 1, 1)) {
          this.ui.hud.showToast('Túi đồ đã đầy, không thể thu hồi đồ trang trí!');
          return;
        }
        this.placedDecors.splice(decIdx, 1);
        this.buildings.syncPlacedDecors(this.placedDecors);
        this.audio.playHarvest();
        this.ui.hud.showToast(`🧺 Đã thu hồi ${ITEMS[dec.itemId].name} về túi!`);
        return;
      }
    }

    if (isDecorItemId(heldId)) {
      if (!this.canPlaceDecorAt(targetTileX, targetTileZ)) {
        this.audio.playBlip(280);
        this.ui.hud.showToast('Không thể đặt đồ trang trí ở đây (chọn sân, lối đi hoặc hiên quán trống)!');
        return;
      }
      this.consumeAtSlot(this.selectedHotbarIndex, 1);
      this.placedDecors.push({
        id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        itemId: heldId,
        tileX: targetTileX,
        tileZ: targetTileZ,
      });
      this.buildings.syncPlacedDecors(this.placedDecors);
      this.weather.spawnBurst(targetTileX + 0.5, 0.5, targetTileZ + 0.5, PALETTE.amberGold, 8);
      if (heldId === 'decor_wind_chime') this.audio.playWindChime();
      else this.audio.playChime();
      this.ui.hud.showToast(`✨ Đã đặt ${ITEMS[heldId].name}!`);
      return;
    }

    const onHarvestVisual = (harvestItemId: ItemId, wx: number, wz: number) => {
      this.spawnWorldFlyingItem(ITEMS[harvestItemId].iconKey, wx, 0.9, wz);
    };
    const onTillGround = () => {
      this.triggerCameraShake(0.085, 0.11);
    };

    let acted = this.farming.tryFarmAction(
      targetX,
      targetZ,
      heldId,
      this.selectedHotbarIndex,
      this.upgrades.wateringCanLevel,
      { addItem: this.addItem, consumeAtSlot: this.consumeAtSlot },
      (msg) => this.ui.hud.showToast(msg),
      onHarvestVisual,
      onTillGround
    );
    if (!acted && overrideX === undefined) {
      acted = this.farming.tryFarmAction(
        this.player.x,
        this.player.z,
        heldId,
        this.selectedHotbarIndex,
        this.upgrades.wateringCanLevel,
        { addItem: this.addItem, consumeAtSlot: this.consumeAtSlot },
        (msg) => this.ui.hud.showToast(msg),
        onHarvestVisual,
        onTillGround
      );
    }

    const toolKind: ToolId | null =
      heldId === 'hoe' || heldId === 'watering_can' || heldId === 'basket'
        ? heldId
        : acted
          ? 'basket'
          : null;

    if (toolKind) {
      this.player.triggerToolAction(toolKind);
      if (!acted) {
        if (toolKind === 'watering_can') this.audio.playWater();
        else if (toolKind === 'hoe') this.audio.playHoe();
      }
    }
  }

  private spawnWorldFlyingItem(iconKey: string, wx: number, wy: number, wz: number): void {
    const proj = this.projVec.set(wx, wy, wz).project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    const sx = rect.left + (proj.x * 0.5 + 0.5) * rect.width;
    const sy = rect.top + (-proj.y * 0.5 + 0.5) * rect.height;
    this.ui.hud.spawnFlyingItem(iconKey, sx, sy);
  }

  private interactDryingRack(): void {
    const rackPos = this.buildings.dryingRackPos;
    if (this.processing.getReadyCount() > 0) {
      const collected = this.processing.collectReadyFromRack((itemId, quality) =>
        this.addItem(itemId, 1, quality)
      );
      if (collected.length === 0) {
        this.ui.hud.showToast('Túi đồ đã đầy, hãy dọn bớt ô trống để thu lá khô!');
        return;
      }
      this.audio.playHarvest();
      this.buildings.setDryingRackState(this.processing.getVisualState());
      this.weather.spawnBurst(rackPos.x, 0.8, rackPos.z, PALETTE.amberGold, 10);
      this.spawnWorldFlyingItem(ITEMS[collected[0].itemId].iconKey, rackPos.x, 0.9, rackPos.z);
      const summary = collected
        .map((c) => `${ITEMS[c.itemId].name} ${'★'.repeat(c.quality)}`)
        .join(', ');
      this.ui.hud.showToast(`☀️ Thu từ nong tre: ${summary}`);
      return;
    }

    const held = this.getHeldSlot();
    if (held && DRYING_OUTPUT_MAP[held.itemId]) {
      const itemName = ITEMS[held.itemId].name;
      const starTxt = '★'.repeat(held.quality);
      if (this.processing.putOnDryingRack(held.itemId, held.quality)) {
        this.consumeAtSlot(this.selectedHotbarIndex, 1);
        this.audio.playHarvest();
        this.weather.spawnBurst(rackPos.x, 0.75, rackPos.z, PALETTE.grassLight, 8);
        this.buildings.setDryingRackState(this.processing.getVisualState());
        this.ui.hud.showToast(
          `🧺 Đã trải ${itemName} ${starTxt} lên nong tre (${this.processing.getDryingCount()}/3, xong vào sáng mai).`
        );
      } else {
        this.ui.hud.showToast('Nong tre đang đầy (tối đa 3 mẻ), hãy chờ sáng mai thu nhé!');
      }
      return;
    }

    this.ui.hud.showToast(this.processing.getRackStatusText());
  }

  private playMemoryCutscene(npcId: NpcId, mem: MemoryCutscene, grantReward = true): void {
    const entries = mem.lines.map((l) => ({
      speaker: `${l.speaker} • ${mem.title}`,
      npcId,
      expression: l.expression,
      text: l.text,
      hearts: this.relations.getHearts(npcId),
    }));
    this.ui.dialogue.open(entries, {
      onComplete: () => {
        if (!grantReward) return;
        if (mem.rewardMoney) {
          this.money += mem.rewardMoney;
          this.audio.playCoin();
          this.ui.hud.showToast(`✨ Ký ức mở khóa! Nhận +${mem.rewardMoney} Xu Mây!`);
        }
        if (mem.rewardItem) {
          this.addItemOrOverflowToBin(mem.rewardItem.itemId, mem.rewardItem.count, mem.rewardItem.quality);
          this.audio.playHarvest();
          this.ui.hud.showToast(
            `✨ Quà ký ức: +${mem.rewardItem.count} ${ITEMS[mem.rewardItem.itemId].name}!`
          );
        }
      },
    });
  }

  // ---------------- Modals ----------------
  private openIntroSequence(): void {
    this.ui.openModal('intro_cutscene');
    this.ui.shopMenuModal.renderIntroCutscene(this.ui.modalBox, () => {
      this.ui.closeModal();
      this.unlockLetter('letter_1_welcome');
      this.openLetterModalById(
        'letter_1_welcome',
        '🍵 Bắt đầu ngày mới trên Đảo Mây!',
        () => {
          this.introRead = true;
          this.story.introCompleted = true;
          this.audio.unlockAndStartBgm();
          this.persistGame(false);
          this.triggerMorningStoryEvents();
        }
      );
    });
  }

  private openLetterModalById(
    letterId: string,
    ctaLabel = '🍵 Đã đọc thư!',
    onAfterClose?: () => void
  ): void {
    const letter = GRANDMA_LETTERS.find((l) => l.id === letterId) ?? GRANDMA_LETTERS[0];
    this.ui.openModal('letter');
    this.ui.shopMenuModal.renderGrandmaLetterModal(
      this.ui.modalBox,
      letter,
      () => {
        this.ui.closeModal();
        onAfterClose?.();
      },
      ctaLabel
    );
  }

  private unlockLetter(letterId: string): GrandmaLetterDef | null {
    const letter = GRANDMA_LETTERS.find((l) => l.id === letterId);
    if (!letter) return null;
    if (!this.story.unlockedLetters.includes(letterId)) {
      this.story.unlockedLetters.push(letterId);
      return letter;
    }
    return null;
  }

  private syncWorldStoryProps(): void {
    const showLetter4 =
      this.time.day >= 12 && !this.story.unlockedLetters.includes('letter_4_lanterns');
    const isFestivalDay = this.time.day === 24 && !this.story.lanternFestivalDone;
    this.buildings.syncStoryProps(this.story.cleanedSpots, showLetter4, isFestivalDay);
  }

  private updateQuestHudHint(): void {
    let hint: string | null = null;
    if (!this.story.teahouseCleaned) {
      hint = `🧹 Dọn hiên Quán Trà (${this.story.cleanedSpots.length}/${CLEANUP_SPOTS.length})`;
    } else if (this.time.day === 24 && !this.story.lanternFestivalDone) {
      hint = '🏮 Lễ Thả Đèn Mây: Gặp Đài Đèn phía Nam hiên quán!';
    } else if (this.story.totalTeasBrewed === 0) {
      hint = '🍵 Vào Quầy Pha Trà bên trong quán ủ tách trà đầu tiên';
    } else if (this.story.totalCustomersServed === 0) {
      hint = '☕ 14:00–20:00 lật Biển Mở Quán & phục vụ khách đầu tiên';
    } else if (this.time.day === 28 && !this.story.springCompleted) {
      hint = '🌸 Ngày 28 cuối Mùa Xuân — Ngủ tối để xem Tổng Kết!';
    } else if (this.time.day >= 12 && !this.story.unlockedLetters.includes('letter_4_lanterns')) {
      hint = '✉️ Tìm lá thư cũ gần lối ra Hải Đăng phía Đông';
    }
    this.ui.hud.setQuestHint(hint);
  }

  private handleCleanupSpot(spotId: string, wx: number, wz: number): void {
    if (this.story.cleanedSpots.includes(spotId)) return;
    this.story.cleanedSpots.push(spotId);
    this.audio.playHarvest();
    this.weather.spawnBurst(wx, 0.25, wz, PALETTE.creamDark, 8);

    if (this.story.cleanedSpots.length >= CLEANUP_SPOTS.length) {
      this.story.teahouseCleaned = true;
      if (!this.story.seenEvents.includes('teahouse_cleaned')) {
        this.story.seenEvents.push('teahouse_cleaned');
      }
      this.syncWorldStoryProps();
      this.audio.playWindChime();
      this.addItemOrOverflowToBin('leaf_green_tea_fresh', 2, 1);
      this.addItemOrOverflowToBin('chrysanthemum_dried', 1, 1);
      this.unlockLetter('letter_2_brewing');
      this.ui.hud.showToast('✨ Hiên Quán Trà đã sạch sẽ! (+2 Trà Xanh & +1 Hoa Cúc Khô)');
      this.openLetterModalById(
        'letter_2_brewing',
        '🍵 Tuyệt quá! Bắt đầu pha trà & mở quán!'
      );
    } else {
      this.syncWorldStoryProps();
      this.ui.hud.showToast(
        `🧹 Đã quét dọn sạch góc hiên (${this.story.cleanedSpots.length}/${CLEANUP_SPOTS.length})`
      );
    }
  }

  private triggerLanternFestival(): void {
    if (this.story.lanternFestivalDone) return;
    this.story.lanternFestivalDone = true;
    if (this.time.timeMinutes < 1170) {
      this.time.timeMinutes = 1170; // 19:30 ánh hoàng hôn tím thả đèn rực rỡ
    }
    this.ui.openModal('festival');
    this.ui.shopMenuModal.renderLanternFestivalModal(this.ui.modalBox, () => {
      this.ui.closeModal();
      this.weather.spawnSkyLanterns(18);
      this.audio.playWindChime();
      (Object.keys(NPCS) as NpcId[]).forEach((id) => {
        const prev = this.relations.getHearts(id);
        this.relations.addPoints(id, 50);
        const now = this.relations.getHearts(id);
        const ent = this.npcs.get(id);
        if (ent && now > prev) {
          this.weather.spawnSparkleBurst(ent.x, 1.4, ent.z, 10);
        }
      });
      this.unlockLetter('letter_5_spring_end');
      this.syncWorldStoryProps();
      this.persistGame(false);
      this.ui.hud.showToast(
        '🏮 Đèn trời đã bay khắp Đảo Mây! (+50 điểm thân thiết cả 4 bạn & mở Lá Thư #5)'
      );
    });
  }

  private triggerMorningStoryEvents(): void {
    const seen = new Set(this.story.seenEvents);
    const markSeen = (evId: string) => {
      if (!seen.has(evId)) {
        seen.add(evId);
        this.story.seenEvents.push(evId);
      }
    };

    if (this.time.day === 1 && !seen.has('day1_be_suong_intro')) {
      markSeen('day1_be_suong_intro');
      this.ui.dialogue.open(DAY1_BE_SUONG_DIALOGUE);
      return;
    }

    if (this.time.day >= 2 && !this.story.unlockedLetters.includes('letter_2_brewing')) {
      markSeen('day2_letter_delivery');
      this.addItemOrOverflowToBin('leaf_green_tea_fresh', 2, 1);
      this.addItemOrOverflowToBin('chrysanthemum_dried', 1, 1);
      this.unlockLetter('letter_2_brewing');
      this.openLetterModalById('letter_2_brewing', '🍵 Đọc thư hướng dẫn pha trà!');
      return;
    }

    if (this.time.day === 3 && !seen.has('day3_ong_dang_intro')) {
      markSeen('day3_ong_dang_intro');
      this.ui.dialogue.open(DAY3_ONG_DANG_DIALOGUE);
      return;
    }

    if (this.time.day === 6 && !seen.has('day6_sakura_bloom')) {
      markSeen('day6_sakura_bloom');
      this.addItemOrOverflowToBin('seed_chrysanthemum', 2, 1);
      this.ui.hud.showToast(
        '🌸 Sáng Hoa Anh Đào Nở Rộ! Bé Sương gửi tặng +2 Hạt Hoa Cúc trong túi!'
      );
    }

    if (this.time.day >= 7 && !this.story.unlockedLetters.includes('letter_3_guests')) {
      this.unlockLetter('letter_3_guests');
      this.ui.hud.showToast(
        '✉️ Bưu tá tầng mây vừa đặt Lá Thư #3 của Bà vào Hộp Thư (Tab → Thư & Lịch Xuân)!'
      );
    }

    if (this.time.day === 12 && !seen.has('day12_migratory_birds')) {
      markSeen('day12_migratory_birds');
      this.relations.addPoints('co_lu', 25);
      this.addItemOrOverflowToBin('tea_roasted', 1, 2);
      this.ui.hud.showToast(
        '🕊️ Ngày Chim Di Cư! Cò Lữ (+1 Trà Sao ★★) báo thấy lá thư cũ rơi trên lối ra Hải Đăng!'
      );
    }

    if (this.time.day === 14 && !seen.has('day14_moon_tea_party')) {
      markSeen('day14_moon_tea_party');
      this.addItemOrOverflowToBin('jasmine_fresh', 2, 2);
      (Object.keys(NPCS) as NpcId[]).forEach((id) => {
        this.relations.addPoints(id, 30);
      });
      this.audio.playWindChime();
      this.ui.hud.showToast('🌙 Hội Trà Trăng Non Ngày 14! Nhận +2 Hoa Nhài ★★ & +30 điểm thân thiết!');
      this.ui.dialogue.open(DAY14_TEA_GATHERING_DIALOGUE);
      return;
    }

    if (this.time.day === 18 && !seen.has('day18_honey_market')) {
      markSeen('day18_honey_market');
      this.addItemOrOverflowToBin('honey', 2, 2);
      this.ui.hud.showToast(
        '🍯 Phiên Chợ Mật Ong Tầng Mây! Bé Sương tặng +2 Mật Ong Rừng Mây ★★!'
      );
    }

    if (this.time.day >= 20 && !this.story.unlockedLetters.includes('letter_4_lanterns')) {
      this.unlockLetter('letter_4_lanterns');
      this.syncWorldStoryProps();
      this.ui.hud.showToast('✉️ Ông Đăng nhặt gửi lại bạn Lá Thư #4 trong Hộp Thư!');
    }

    const hasFiveHearts = (Object.keys(NPCS) as NpcId[]).some((id) => this.relations.getHearts(id) >= 5);
    if (
      (this.time.day >= 21 || hasFiveHearts) &&
      !this.story.unlockedLetters.includes('letter_7_seasons')
    ) {
      this.unlockLetter('letter_7_seasons');
      this.ui.hud.showToast('💌 Có thêm Lá Thư #7 của Bà Ngoại trong Hộp Thư (Tab → Thư & Lịch Xuân)!');
    }

    if (this.time.day === 24 && !this.story.lanternFestivalDone && !seen.has('day24_festival_invite')) {
      markSeen('day24_festival_invite');
      this.ui.hud.showToast(
        '🏮 Hôm nay là Lễ Thả Đèn Mây 24 Xuân! Hãy tới Đài Đèn phía Nam hiên quán khai hội nhé!'
      );
    }

    if (this.time.day === 28 && !seen.has('day28_final_day')) {
      markSeen('day28_final_day');
      this.ui.hud.showToast(
        '🌸 Hôm nay là Ngày 28 — ngày cuối Mùa Xuân đầu tiên! Tận hưởng trọn vẹn nhé.'
      );
    }
  }

  private openInventoryModal(initialTab?: InventoryModalTab): void {
    if (initialTab) {
      this.ui.inventoryModal.setActiveTab(initialTab);
    }
    const npcLocations = {} as Record<NpcId, string>;
    for (const [id, npc] of this.npcs.entries()) {
      npcLocations[id] = npc.hiddenDuringCafe ? 'Ngồi uống trà tại Quán Trà' : npc.getCurrentScheduleLabel();
    }

    this.ui.openModal('inventory');
    this.ui.inventoryModal.render(
      this.ui.modalBox,
      this.inventory,
      this.brewing.unlockedRecipes,
      this.relations,
      npcLocations,
      (a, b) => {
        if (a === b) return;
        const src = this.inventory[a];
        const dst = this.inventory[b];
        if (
          src &&
          dst &&
          src.itemId === dst.itemId &&
          src.quality === dst.quality &&
          ITEMS[src.itemId].stackable
        ) {
          dst.count += src.count;
          this.inventory[a] = null;
          return;
        }
        this.inventory[a] = dst;
        this.inventory[b] = src;
      },
      (npcId, mem) => {
        this.ui.closeModal();
        const firstUnlock = this.relations.markMemorySeen(npcId, mem.heartsRequired);
        this.playMemoryCutscene(npcId, mem, firstUnlock);
      },
      () => this.ui.closeModal(),
      () => this.audio.playUiClick(),
      {
        story: this.story,
        currentDay: this.time.day,
        onReadLetter: (letter) => {
          this.openLetterModalById(letter.id, '📜 Đóng lại', () => {
            this.openInventoryModal('story');
          });
        },
      }
    );
  }

  private openBrewingModal(): void {
    this.ui.openModal('brewing');
    this.ui.brewingScreen.resetBrewSession();
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

        const preview = this.brewing.previewBrew(baseSlot.itemId, baseSlot.quality, addonObjs, temp, steep);
        const hasStack = this.inventory.some(
          (s) => s !== null && s.itemId === preview.itemId && s.quality === preview.quality
        );
        const consumeCounts = new Map<number, number>();
        for (const idx of [baseSlotIdx, ...addonSlots]) {
          consumeCounts.set(idx, (consumeCounts.get(idx) ?? 0) + 1);
        }
        const willFreeSlot =
          this.inventory.some((s) => s === null) ||
          Array.from(consumeCounts.entries()).some(
            ([idx, n]) => (this.inventory[idx]?.count ?? 0) <= n
          );
        if (!hasStack && !willFreeSlot) {
          this.ui.hud.showToast('Túi đồ đã đầy, hãy dọn bớt 1 ô trống trước khi pha trà!');
          return null;
        }

        const result = this.brewing.brew(baseSlot.itemId, baseSlot.quality, addonObjs, temp, steep);
        this.consumeAtSlot(baseSlotIdx, 1);
        for (const aIdx of addonSlots) {
          this.consumeAtSlot(aIdx, 1);
        }
        this.addItem(result.itemId, 1, result.quality);

        this.time.advanceMinutes(15);
        this.audio.playPourTea();
        this.story.totalTeasBrewed += 1;
        const teaName = ITEMS[result.itemId].name;
        if (result.newlyUnlocked) {
          this.dailyNewRecipes.push(teaName);
        }
        this.ui.hud.showToast(
          result.newlyUnlocked
            ? `📖 Công thức mới: ${teaName} (${'★'.repeat(result.quality)})!`
            : `🍵 Đã pha xong ${teaName} (${'★'.repeat(result.quality)})!`
        );
        return result;
      },
      () => this.ui.closeModal(),
      () => this.audio.playChime()
    );
  }

  private openRoastModal(): void {
    this.ui.openModal('roast');
    this.ui.brewingScreen.renderRoastMiniGame(
      this.ui.modalBox,
      this.inventory,
      (slotIdx, accuracyScore) => {
        const slot = this.inventory[slotIdx];
        if (!slot) return null;
        const q = this.processing.getRoastResultQuality(accuracyScore);
        const hasStack = this.inventory.some(
          (s) => s !== null && s.itemId === 'tea_roasted' && s.quality === q
        );
        const hasSpaceAfterConsume = slot.count === 1 || this.inventory.some((s) => s === null);
        if (!hasStack && !hasSpaceAfterConsume) {
          this.ui.hud.showToast('Túi đồ đã đầy, hãy dọn bớt ô trống để nhận Trà Sao Thơm!');
          return null;
        }

        this.consumeAtSlot(slotIdx, 1);
        this.addItem('tea_roasted', 1, q);
        this.time.advanceMinutes(20);
        this.audio.playHarvest();
        const wokPos = this.buildings.roastWokPos;
        this.weather.spawnBurst(wokPos.x, 0.85, wokPos.z, PALETTE.amberGold, 10);
        this.spawnWorldFlyingItem(ITEMS.tea_roasted.iconKey, wokPos.x, 0.9, wokPos.z);
        this.ui.hud.showToast(`🔥 Sao thành công Trà Sao Thơm (${'★'.repeat(q)})!`);
        return { itemId: 'tea_roasted', quality: q };
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
        (upgradeId: ShopUpgradeId, price: number) => {
          if (this.money < price) return;
          if (upgradeId === 'wateringCanLevel') {
            if (this.upgrades.wateringCanLevel >= 2) return;
            this.upgrades.wateringCanLevel = 2;
          } else if (upgradeId === 'table4') {
            if (this.upgrades.tableCount >= 4) return;
            this.upgrades.tableCount = 4;
            this.upgrades.extraTableUnlocked = true;
          } else if (upgradeId === 'table5') {
            if (this.upgrades.tableCount < 4 || this.upgrades.tableCount >= 5) return;
            this.upgrades.tableCount = 5;
            this.upgrades.extraTableUnlocked = true;
          } else if (upgradeId === 'expandedFarmUnlocked') {
            if (this.upgrades.expandedFarmUnlocked) return;
            this.upgrades.expandedFarmUnlocked = true;
          }
          this.money -= price;
          this.buildings.applyUpgrades(this.upgrades);
          this.tiles.setExpandedUnlocked(this.upgrades.expandedFarmUnlocked);
          this.audio.playChime();
          this.ui.hud.showToast('✨ Đã nâng cấp thành công!');
          rerender();
        },
        (slotIdx) => {
          const s = this.inventory[slotIdx];
          if (!s) return;
          const val = getItemSellValue(s.itemId, s.quality);
          this.consumeAtSlot(slotIdx, 1);
          this.money += val;
          this.dailySalesIncome += val;
          this.story.totalMoneyEarned += val;
          this.audio.playCoin();
          this.ui.hud.spawnHudMoneyPopup(val);
          this.ui.hud.showToast(`+${val} Xu Mây`);
          rerender();
        },
        () => this.ui.closeModal()
      );
    rerender();
  }

  private openShippingBinModal(): void {
    this.ui.openModal('shipping_bin');
    const rerender = () =>
      this.ui.shopMenuModal.renderShippingBin(
        this.ui.modalBox,
        this.shippingBin,
        this.inventory,
        (slotIdx) => {
          const s = this.inventory[slotIdx];
          if (!s || ITEMS[s.itemId].sellPrice <= 0) return;
          const existing = this.shippingBin.find(
            (b) => b.itemId === s.itemId && b.quality === s.quality
          );
          if (existing) {
            existing.count += 1;
          } else {
            this.shippingBin.push({ itemId: s.itemId, count: 1, quality: s.quality });
          }
          this.consumeAtSlot(slotIdx, 1);
          this.buildings.setShippingBinHasItems(this.shippingBin.length > 0);
          this.audio.playCoin();
          rerender();
        },
        (binIdx) => {
          const b = this.shippingBin[binIdx];
          if (!b) return;
          if (!this.addItem(b.itemId, 1, b.quality)) {
            this.ui.hud.showToast('Túi đồ đã đầy!');
            return;
          }
          b.count -= 1;
          if (b.count <= 0) {
            this.shippingBin.splice(binIdx, 1);
          }
          this.buildings.setShippingBinHasItems(this.shippingBin.length > 0);
          this.audio.playBlip(440);
          rerender();
        },
        () => this.ui.closeModal()
      );
    rerender();
  }

  private openSettingsModal(): void {
    this.ui.openModal('settings');
    const rerender = () =>
      this.ui.shopMenuModal.renderSettingsModal(
        this.ui.modalBox,
        this.audio.bgmEnabled,
        this.audio.sfxEnabled,
        this.audio.bgmVolume,
        this.audio.sfxVolume,
        this.audio.getBgmMoodLabel(),
        () => {
          this.audio.setBgmEnabled(!this.audio.bgmEnabled);
          this.audio.playUiClick();
          rerender();
        },
        (vol) => {
          this.audio.setBgmVolume(vol);
        },
        () => {
          this.audio.setSfxEnabled(!this.audio.sfxEnabled);
          this.audio.playUiClick();
          rerender();
        },
        (vol) => {
          this.audio.setSfxVolume(vol);
        },
        () => {
          this.audio.playWindChime();
          setTimeout(() => this.audio.playCoin(), 220);
        },
        () => {
          if (!document.fullscreenElement) {
            void document.documentElement.requestFullscreen?.();
          } else {
            void document.exitFullscreen?.();
          }
          setTimeout(rerender, 80);
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
        () => this.openInventoryModal('relations'),
        () => {
          this.audio.setBgmEnabled(!this.audio.bgmEnabled);
          this.audio.playUiClick();
          rerender();
        },
        () => this.openSettingsModal(),
        () => {
          this.persistGame(false);
          this.openTitleScreen();
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
    this.ui.closeModal();
    this.ui.dialogue.close();
    this.ui.setSleepFade(true);

    setTimeout(() => {
      // Dọn khách còn sót về nghỉ
      for (const c of this.customers) {
        this.scene.remove(c.group);
      }
      this.customers = [];
      for (const n of this.npcs.values()) {
        n.hiddenDuringCafe = false;
      }

      const dayFinished = this.time.day;
      const seasonFinished = this.time.season;
      const shippingBinIncome = getShippingBinTotal(this.shippingBin);
      if (shippingBinIncome > 0) {
        this.money += shippingBinIncome;
        this.story.totalMoneyEarned += shippingBinIncome;
      }
      this.shippingBin = [];
      this.buildings.setShippingBinHasItems(false);

      const penaltyMoney = passedOut ? Math.min(50, Math.floor(this.money * 0.1)) : 0;
      if (penaltyMoney > 0) {
        this.money = Math.max(0, this.money - penaltyMoney);
      }

      const heartGains: { name: string; gained: number; total: number }[] = [];
      (Object.keys(NPCS) as NpcId[]).forEach((id) => {
        const nowH = this.relations.getHearts(id);
        const diff = nowH - (this.dayStartHearts[id] ?? nowH);
        if (diff > 0) {
          heartGains.push({ name: NPCS[id].name, gained: diff, total: nowH });
        }
      });

      this.time.startNewMorning();
      let newWeather = this.weather.rollWeatherForNewDay();
      if (this.time.day === 24) {
        this.weather.currentWeather = 'sunny';
        newWeather = 'sunny';
      }
      const isRain = newWeather === 'rainy';

      this.farming.onNewDay(isRain);
      this.processing.onNewDay();
      this.buildings.setDryingRackState(this.processing.getVisualState());
      this.relations.onNewDay();
      this.shop.onNewDay(newWeather);
      this.weather.clearSkyLanterns();
      this.buildings.setShopOpenSign(false);
      this.syncWorldStoryProps();
      for (const n of this.npcs.values()) {
        n.syncToSchedule(this.time.timeMinutes, this.weather.currentWeather);
      }

      // Đặt người chơi cạnh giường trong Nhà Ở
      this.player.x = -2.2;
      this.player.z = -4.6;
      this.player.direction = 'down';
      this.camFollowX = this.player.x;
      this.camFollowZ = this.player.z;
      this.player.syncSnappedPosition();

      this.persistGame(false);

      const summaryStats: DailySummaryStats = {
        dayFinished,
        nextDay: this.time.day,
        season: seasonFinished,
        passedOut,
        penaltyMoney,
        teaIncome: this.dailyTeaIncome,
        shippingBinIncome,
        salesIncome: this.dailySalesIncome,
        newRecipes: [...this.dailyNewRecipes],
        heartGains,
        nextWeather: newWeather,
      };

      this.ui.openModal('day_summary');
      this.ui.shopMenuModal.renderDaySummary(this.ui.modalBox, summaryStats, this.money, () => {
        this.ui.closeModal();
        this.ui.setSleepFade(false);
        this.resetDailySummaryTrackers();
        this.isSleepingTransition = false;
        this.audio.playChime();
        if (shippingBinIncome > 0) {
          this.ui.hud.spawnHudMoneyPopup(shippingBinIncome);
        }

        const weatherText = this.weather.getWeatherLabel();
        const rainNote = isRain ? ' Trời mưa nhẹ đã tự tưới hết đồi trà!' : '';
        this.ui.hud.showToast(`🌅 Ngày ${this.time.day} (Xuân) • ${weatherText}.${rainNote}`);

        if (dayFinished === 28 && !this.story.springCompleted) {
          this.unlockLetter('letter_5_spring_end');
          this.story.springCompleted = true;
          this.persistGame(false);
          this.openSpringFinaleModal();
        } else {
          this.triggerMorningStoryEvents();
        }
      });
    }, 450);
  }

  private openSpringFinaleModal(): void {
    const npcHearts: Record<NpcId, number> = {
      may: this.relations.getHearts('may'),
      co_lu: this.relations.getHearts('co_lu'),
      ong_dang: this.relations.getHearts('ong_dang'),
      be_suong: this.relations.getHearts('be_suong'),
    };
    this.ui.openModal('spring_finale');
    this.ui.shopMenuModal.renderSpringFinaleModal(
      this.ui.modalBox,
      {
        totalTeasBrewed: this.story.totalTeasBrewed,
        totalCustomersServed: this.story.totalCustomersServed,
        unlockedRecipesCount: this.brewing.unlockedRecipes.size,
        unlockedLettersCount: this.story.unlockedLetters.length,
        totalLettersCount: GRANDMA_LETTERS.length,
        totalMoneyEarned: this.story.totalMoneyEarned,
        currentMoney: this.money,
        lanternFestivalDone: this.story.lanternFestivalDone,
        npcHearts,
      },
      () => {
        this.ui.closeModal();
        this.ui.hud.showToast('🌸 Vòng Mùa Xuân mới bắt đầu — chúc bạn chơi tự do thật vui!');
        this.triggerMorningStoryEvents();
      }
    );
  }

  private persistGame(showToast: boolean): void {
    const data: SaveData = {
      saveVersion: CURRENT_SAVE_VERSION,
      version: CURRENT_SAVE_VERSION,
      day: this.time.day,
      season: this.time.season,
      timeMinutes: this.time.timeMinutes,
      weather: this.weather.currentWeather,
      tomorrowWeather: this.weather.tomorrowWeather,
      money: this.money,
      playerPos: { x: this.player.x, z: this.player.z },
      selectedHotbarIndex: this.selectedHotbarIndex,
      inventory: this.inventory,
      plots: this.tiles.getAllPlots(),
      dryingRack: this.processing.rack,
      unlockedRecipes: Array.from(this.brewing.unlockedRecipes),
      relations: this.relations.relations,
      upgrades: this.upgrades,
      shippingBin: this.shippingBin,
      placedDecors: this.placedDecors,
      introRead: this.introRead,
      story: this.story,
    };
    const ok = this.saveSystem.save(data);
    if (showToast && ok) {
      this.ui.hud.showToast('💾 Đã lưu tiến trình vào bộ nhớ trình duyệt!');
    }
  }

  private triggerCameraShake(intensity = 0.085, duration = 0.11): void {
    this.cameraShakeIntensity = intensity;
    this.cameraShakeDuration = duration;
    this.cameraShakeTime = duration;
  }

  private spawnWorldFloatingText(
    text: string,
    wx: number,
    wy: number,
    wz: number,
    variant: 'money' | 'heart' | 'info' = 'money'
  ): void {
    const proj = this.projVec.set(wx, wy, wz).project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    const sx = rect.left + (proj.x * 0.5 + 0.5) * rect.width;
    const sy = rect.top + (-proj.y * 0.5 + 0.5) * rect.height;
    this.ui.hud.spawnFloatingText(text, sx, sy, variant);
  }

  private triggerHeartMilestoneEffect(
    wx: number,
    wz: number,
    npcName: string,
    newHearts: number
  ): void {
    this.weather.spawnSparkleBurst(wx, 1.4, wz, 14);
    this.audio.playChime();
    this.spawnWorldFloatingText(`💛 ${npcName} đạt ${newHearts}♥!`, wx, 1.85, wz, 'heart');
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

    let shakeX = 0;
    let shakeZ = 0;
    if (this.cameraShakeTime > 0) {
      const ratio = this.cameraShakeTime / Math.max(0.01, this.cameraShakeDuration);
      const mag = this.cameraShakeIntensity * ratio;
      shakeX = Math.sin(this.elapsed * 95) * mag;
      shakeZ = Math.cos(this.elapsed * 82) * mag * 0.7;
    }

    this.camTargetVec.set(this.camFollowX + shakeX, 0.45, this.camFollowZ + shakeZ);
    this.camera.position.set(
      this.camFollowX + shakeX + Math.sin(yaw) * dist,
      0.45 + height,
      this.camFollowZ + shakeZ + Math.cos(yaw) * dist
    );
    this.camera.lookAt(this.camTargetVec);
    this.camera.updateMatrixWorld();
    this.camRightVec.setFromMatrixColumn(this.camera.matrixWorld, 0).normalize();
    this.camUpVec.setFromMatrixColumn(this.camera.matrixWorld, 1).normalize();
  }

  private render(): void {
    this.composer.render();
  }
}

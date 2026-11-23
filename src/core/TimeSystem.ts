import * as THREE from 'three';
import { WeatherType } from '../data/types';
import { WEATHER_CONFIG } from '../data/weather';

export interface DayLightingState {
  tintColor: THREE.Color;
  ambientIntensity: number;
  sunIntensity: number;
  nightFactor: number; // 0 = full day, 1 = full night
  overlayOpacity: number;
  fogColor: THREE.Color;
  fogNear: number;
  fogFar: number;
}

export class TimeSystem {
  public day = 1;
  public season: 'Xuân' = 'Xuân';
  /** 360 = 06:00, 1440 = 24:00 */
  public timeMinutes = 360;
  public paused = false;

  /**
   * 1 ngày trong game = 12 phút thực (720 giây) từ 6:00 đến 24:00 (1080 phút game)
   * => 1.5 phút game / giây thực.
   */
  private readonly gameMinutesPerSecond = 1.5;

  private readonly cDawn = new THREE.Color('#ffd3a6');
  private readonly cNoon = new THREE.Color('#fff9ee');
  private readonly cSunset = new THREE.Color('#ee9389');
  private readonly cDusk = new THREE.Color('#9a73b5');
  private readonly cNight = new THREE.Color('#42396e');

  public update(dt: number, onPassOut: () => void): void {
    if (this.paused) return;
    this.timeMinutes += dt * this.gameMinutesPerSecond;
    if (this.timeMinutes >= 1440) {
      this.timeMinutes = 1440;
      onPassOut();
    }
  }

  public advanceMinutes(mins: number): void {
    this.timeMinutes = Math.min(1440, this.timeMinutes + mins);
  }

  public startNewMorning(): void {
    this.day += 1;
    if (this.day > 28) {
      this.day = 1;
    }
    this.timeMinutes = 360; // 06:00
  }

  public isTeahouseOpen(): boolean {
    return this.timeMinutes >= 840 && this.timeMinutes < 1200; // 14:00 -> 20:00
  }

  public getFormattedTime(): string {
    const total = Math.floor(this.timeMinutes);
    if (total >= 1440) return '24:00';
    const hh = Math.floor(total / 60);
    const mm = Math.floor((total % 60) / 10) * 10; // Bước 10 phút kiểu Stardew
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  public getDayProgress(): number {
    return THREE.MathUtils.clamp((this.timeMinutes - 360) / (1440 - 360), 0, 1);
  }

  public getLightingState(weather: WeatherType = 'sunny'): DayLightingState {
    const m = this.timeMinutes;
    const tint = new THREE.Color();
    let ambient = 0.9;
    let sun = 0.8;
    let nightFactor = 0;

    if (m < 540) {
      // 06:00 -> 09:00: Bình minh ấm
      const t = (m - 360) / 180;
      tint.lerpColors(this.cDawn, this.cNoon, t);
      ambient = THREE.MathUtils.lerp(0.76, 0.96, t);
      sun = THREE.MathUtils.lerp(0.65, 0.9, t);
      nightFactor = THREE.MathUtils.lerp(0.18, 0, t);
    } else if (m < 960) {
      // 09:00 -> 16:00: Trưa trung tính ấm
      tint.copy(this.cNoon);
      ambient = 0.96;
      sun = 0.9;
      nightFactor = 0;
    } else if (m < 1110) {
      // 16:00 -> 18:30: Hoàng hôn cam hồng
      const t = (m - 960) / 150;
      tint.lerpColors(this.cNoon, this.cSunset, t);
      ambient = THREE.MathUtils.lerp(0.96, 0.72, t);
      sun = THREE.MathUtils.lerp(0.9, 0.55, t);
      nightFactor = THREE.MathUtils.lerp(0, 0.45, t);
    } else if (m < 1200) {
      // 18:30 -> 20:00: Chạng vạng tím
      const t = (m - 1110) / 90;
      tint.lerpColors(this.cSunset, this.cDusk, t);
      ambient = THREE.MathUtils.lerp(0.72, 0.55, t);
      sun = THREE.MathUtils.lerp(0.55, 0.3, t);
      nightFactor = THREE.MathUtils.lerp(0.45, 0.85, t);
    } else {
      // 20:00 -> 24:00: Đêm xanh tím Stardew
      const t = THREE.MathUtils.clamp((m - 1200) / 120, 0, 1);
      tint.lerpColors(this.cDusk, this.cNight, t);
      ambient = THREE.MathUtils.lerp(0.55, 0.42, t);
      sun = THREE.MathUtils.lerp(0.3, 0.16, t);
      nightFactor = THREE.MathUtils.lerp(0.85, 1.0, t);
    }

    const cfg = WEATHER_CONFIG[weather];
    if (cfg.tintMix > 0) {
      tint.lerp(new THREE.Color(cfg.tintHex), cfg.tintMix * (1 - nightFactor * 0.45));
    }
    ambient *= cfg.ambientMult;
    sun *= cfg.sunMult;

    const overlayOpacity = 0.08 + nightFactor * 0.34 + cfg.overlayOpacityBoost;
    const fogColor = new THREE.Color(cfg.fogTintDay).lerp(
      new THREE.Color(cfg.fogTintNight),
      nightFactor * 0.92
    );

    return {
      tintColor: tint,
      ambientIntensity: ambient,
      sunIntensity: sun,
      nightFactor,
      overlayOpacity,
      fogColor,
      fogNear: cfg.fogNear,
      fogFar: cfg.fogFar,
    };
  }
}

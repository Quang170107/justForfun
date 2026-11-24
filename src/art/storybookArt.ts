import { PALETTE } from './palette';
import { PortraitExpression, PortraitId } from '../data/types';

class StorybookArtRegistry {
  private portraitCache = new Map<string, string>();

  public getPortraitUrl(id: PortraitId, expression: PortraitExpression = 'normal'): string {
    const key = `${id}:${expression}`;
    const existing = this.portraitCache.get(key);
    if (existing) return existing;

    const url = this.paintPortrait(id, expression);
    this.portraitCache.set(key, url);
    return url;
  }

  private paintPortrait(id: PortraitId, expression: PortraitExpression): string {
    const s = 128;
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d')!;

    // Nền hội họa ấm áp theo tính cách nhân vật
    const bg = ctx.createLinearGradient(0, 0, 0, s);
    if (id === 'may') {
      bg.addColorStop(0, PALETTE.skyDeep);
      bg.addColorStop(1, PALETTE.cloudPink);
    } else if (id === 'co_lu') {
      bg.addColorStop(0, PALETTE.skyMid);
      bg.addColorStop(1, PALETTE.cloudWhite);
    } else if (id === 'ong_dang') {
      bg.addColorStop(0, PALETTE.navyDark);
      bg.addColorStop(1, PALETTE.amberWarm);
    } else if (id === 'be_suong') {
      bg.addColorStop(0, PALETTE.grassLight);
      bg.addColorStop(1, PALETTE.creamLight);
    } else {
      bg.addColorStop(0, PALETTE.skyLight);
      bg.addColorStop(1, PALETTE.creamMid);
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, s, s);

    // Vầng sáng hậu cảnh mềm kiểu Ghibli
    const aura = ctx.createRadialGradient(64, 58, 12, 64, 58, 54);
    aura.addColorStop(0, 'rgba(255, 248, 236, 0.55)');
    aura.addColorStop(1, 'rgba(255, 248, 236, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(64, 58, 54, 0, Math.PI * 2);
    ctx.fill();

    // Vai áo
    const coatMap: Record<PortraitId, string> = {
      may: PALETTE.whiteWarm,
      co_lu: PALETTE.whiteWarm,
      ong_dang: PALETTE.navyDark,
      be_suong: PALETTE.grassMid,
      guest_traveler: PALETTE.tealLight,
      guest_poet: PALETTE.cloudPink,
      guest_painter: PALETTE.roofMid,
      guest_merchant: PALETTE.amberWarm,
    };
    ctx.fillStyle = coatMap[id] ?? PALETTE.creamLight;
    ctx.strokeStyle = PALETTE.outlineDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(64, 126, 42, 32, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (id === 'co_lu') {
      this.paintCranePortrait(ctx, expression);
      return canvas.toDataURL('image/png');
    }

    // Khăn cổ / dây yếm đặc trưng
    if (id === 'may') {
      ctx.fillStyle = PALETTE.sakuraPink;
      ctx.beginPath();
      ctx.ellipse(64, 102, 24, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (id === 'be_suong') {
      ctx.fillStyle = PALETTE.creamLight;
      ctx.beginPath();
      ctx.ellipse(64, 102, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tóc sau nếu là nữ / linh hồn mây
    if (id === 'be_suong') {
      ctx.fillStyle = PALETTE.hairBrown;
      for (const sx of [32, 96]) {
        ctx.beginPath();
        ctx.arc(sx, 78, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Khuôn mặt bo tròn mềm + ánh má hồng
    const faceFill =
      id === 'may' ? PALETTE.whiteWarm : id === 'ong_dang' ? PALETTE.skinShadow : PALETTE.skinBase;
    ctx.fillStyle = faceFill;
    ctx.beginPath();
    ctx.arc(64, 62, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Tóc mái
    if (id !== 'may') {
      ctx.fillStyle = id === 'ong_dang' ? PALETTE.hairSilver : id === 'guest_poet' ? PALETTE.outlinePlum : PALETTE.hairBrown;
      ctx.beginPath();
      ctx.arc(64, 52, 28, Math.PI, Math.PI * 2);
      ctx.lineTo(86, 54);
      ctx.quadraticCurveTo(64, 44, 42, 54);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Má ửng hồng
    ctx.fillStyle = PALETTE.coralRed;
    ctx.globalAlpha = expression === 'happy' ? 0.55 : 0.35;
    for (const cx of [46, 82]) {
      ctx.beginPath();
      ctx.ellipse(cx, 69, 6.5, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Đôi mắt biểu cảm
    this.paintEyesAndMouth(ctx, expression, 64, 61);

    // Phụ kiện đặc trưng
    if (id === 'may') {
      // Kẹp sao vàng
      ctx.fillStyle = PALETTE.amberGold;
      ctx.beginPath();
      ctx.arc(84, 44, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (id === 'be_suong') {
      // Nón cói rộng vành
      ctx.fillStyle = PALETTE.amberGold;
      ctx.beginPath();
      ctx.ellipse(64, 42, 46, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(64, 38, 22, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PALETTE.grassMid;
      ctx.fillRect(42, 34, 44, 5);
    } else if (id === 'ong_dang') {
      // Mũ hải đăng + chòm râu bạc
      ctx.fillStyle = PALETTE.navyDark;
      ctx.beginPath();
      ctx.arc(64, 42, 26, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PALETTE.outlineDark;
      ctx.fillRect(38, 40, 52, 7);

      ctx.fillStyle = PALETTE.hairSilver;
      ctx.beginPath();
      ctx.moveTo(42, 70);
      ctx.quadraticCurveTo(64, 114, 86, 70);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (id === 'guest_painter') {
      ctx.fillStyle = PALETTE.roofMid;
      ctx.beginPath();
      ctx.ellipse(68, 34, 28, 12, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (id === 'guest_merchant') {
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(36, 36, 56, 7);
      ctx.fillRect(45, 18, 38, 20);
      ctx.strokeRect(45, 18, 38, 20);
    } else if (id === 'guest_traveler') {
      ctx.fillStyle = PALETTE.navyDark;
      ctx.beginPath();
      ctx.arc(64, 41, 25, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(40, 39, 54, 6);
    }

    return canvas.toDataURL('image/png');
  }

  private paintCranePortrait(ctx: CanvasRenderingContext2D, expression: PortraitExpression): void {
    ctx.strokeStyle = PALETTE.outlineDark;
    ctx.lineWidth = 3;

    // Cổ thanh
    ctx.fillStyle = PALETTE.whiteWarm;
    ctx.fillRect(54, 68, 20, 42);
    ctx.strokeRect(54, 68, 20, 42);

    // Khăn đỏ cổ
    ctx.fillStyle = PALETTE.roofMid;
    ctx.beginPath();
    ctx.ellipse(64, 96, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Đầu cò
    ctx.fillStyle = PALETTE.whiteWarm;
    ctx.beginPath();
    ctx.arc(62, 54, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mỏ cam dài
    ctx.fillStyle = PALETTE.amberWarm;
    ctx.beginPath();
    ctx.moveTo(76, 50);
    ctx.lineTo(114, 58);
    ctx.lineTo(76, 65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Mắt
    ctx.fillStyle = PALETTE.outlineDark;
    if (expression === 'happy') {
      ctx.beginPath();
      ctx.arc(62, 52, 5, Math.PI, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(62, 51, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private paintEyesAndMouth(
    ctx: CanvasRenderingContext2D,
    expression: PortraitExpression,
    cx: number,
    yEye: number
  ): void {
    ctx.strokeStyle = PALETTE.outlineDark;
    ctx.fillStyle = PALETTE.outlineDark;
    ctx.lineWidth = 2.6;

    for (const dx of [-11, 11]) {
      const ex = cx + dx;
      if (expression === 'happy') {
        ctx.beginPath();
        ctx.arc(ex, yEye + 2, 5, Math.PI, Math.PI * 2);
        ctx.stroke();
      } else if (expression === 'sad') {
        ctx.beginPath();
        ctx.arc(ex, yEye + 2, 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(ex - 5, yEye - 5);
        ctx.lineTo(ex + 5, yEye - 8);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(ex, yEye, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.whiteWarm;
        ctx.beginPath();
        ctx.arc(ex - 1.5, yEye - 1.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.outlineDark;
      }
    }

    // Miệng nhỏ ấm áp
    ctx.beginPath();
    if (expression === 'happy') {
      ctx.arc(cx, yEye + 12, 6, 0, Math.PI);
    } else if (expression === 'sad') {
      ctx.arc(cx, yEye + 17, 5, Math.PI, Math.PI * 2);
    } else {
      ctx.arc(cx, yEye + 12, 4, 0.15, Math.PI - 0.15);
    }
    ctx.stroke();
  }

  public drawIntroCutsceneCanvas(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    slideIdx: number,
    tick: number
  ): void {
    ctx.imageSmoothingEnabled = true;

    // Bầu trời Ghibli bình minh hồng - xanh
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
    if (slideIdx === 2) {
      sky.addColorStop(0, PALETTE.skyDeep);
      sky.addColorStop(0.55, PALETTE.roofLight);
      sky.addColorStop(1, PALETTE.creamMid);
    } else {
      sky.addColorStop(0, PALETTE.skyMid);
      sky.addColorStop(0.55, PALETTE.cloudPink);
      sky.addColorStop(1, PALETTE.creamLight);
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Mặt trời ấm & quầng sáng
    const sunY = slideIdx === 0 ? 112 : slideIdx === 1 ? 94 : 132;
    const sunGrad = ctx.createRadialGradient(w * 0.5, sunY, 8, w * 0.5, sunY, 96);
    sunGrad.addColorStop(0, PALETTE.whiteWarm);
    sunGrad.addColorStop(0.45, 'rgba(242, 193, 78, 0.48)');
    sunGrad.addColorStop(1, 'rgba(242, 193, 78, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(w * 0.5, sunY, 96, 0, Math.PI * 2);
    ctx.fill();

    // Đảo Trà Trên Mây dần tiến lại gần theo 3 slide
    if (slideIdx === 0 || slideIdx === 1) {
      const sc = slideIdx === 0 ? 0.65 : 1.05;
      const ix = slideIdx === 0 ? w * 0.76 : w * 0.58;
      const iy = slideIdx === 0 ? h * 0.56 : h * 0.52;

      ctx.save();
      ctx.translate(ix, iy);
      ctx.scale(sc, sc);
      ctx.fillStyle = PALETTE.soilDark;
      ctx.beginPath();
      ctx.moveTo(-110, 0);
      ctx.lineTo(110, 0);
      ctx.lineTo(45, 62);
      ctx.lineTo(-40, 56);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = PALETTE.grassMid;
      ctx.beginPath();
      ctx.roundRect(-118, -14, 236, 22, 10);
      ctx.fill();

      // Quán trà & Hải đăng nhỏ
      ctx.fillStyle = PALETTE.roofMid;
      ctx.beginPath();
      ctx.moveTo(-58, -14);
      ctx.lineTo(12, -14);
      ctx.lineTo(-4, -44);
      ctx.lineTo(-42, -44);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = PALETTE.sakuraPink;
      ctx.beginPath();
      ctx.arc(-84, -36, 22, 0, Math.PI * 2);
      ctx.arc(44, -32, 19, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = PALETTE.creamLight;
      ctx.fillRect(72, -58, 16, 44);
      ctx.fillStyle = PALETTE.amberGold;
      ctx.fillRect(74, -52, 12, 10);
      ctx.restore();
    } else {
      // Slide 2: Mái hiên quán trà ban chiều ấm áp
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(0, h * 0.68, w, h * 0.32);
      ctx.fillStyle = PALETTE.creamLight;
      ctx.fillRect(w * 0.25, h * 0.26, w * 0.5, h * 0.42);
      ctx.fillStyle = PALETTE.roofMid;
      ctx.beginPath();
      ctx.moveTo(w * 0.16, h * 0.3);
      ctx.lineTo(w * 0.84, h * 0.3);
      ctx.lineTo(w * 0.72, h * 0.12);
      ctx.lineTo(w * 0.28, h * 0.12);
      ctx.closePath();
      ctx.fill();
      for (const lx of [w * 0.32, w * 0.68]) {
        const glow = 0.75 + Math.sin(tick * 4) * 0.15;
        ctx.fillStyle = `rgba(242, 193, 78, ${glow * 0.4})`;
        ctx.beginPath();
        ctx.arc(lx, h * 0.44, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.coralRed;
        ctx.fillRect(lx - 8, h * 0.34, 16, 22);
      }
      // Bàn trà + lá thư bà ngoại ở cận cảnh
      ctx.fillStyle = PALETTE.woodMid;
      ctx.fillRect(w * 0.38, h * 0.64, w * 0.24, 16);
      ctx.fillStyle = PALETTE.whiteWarm;
      ctx.fillRect(w * 0.48, h * 0.59, 26, 16);
      ctx.fillStyle = PALETTE.roofMid;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.6, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Biển mây Ghibli cuồn cuộn + Thuyền mây trượt êm
    if (slideIdx !== 2) {
      ctx.fillStyle = PALETTE.skyMid;
      ctx.fillRect(0, h * 0.67, w, h * 0.33);
      for (let i = 0; i < 16; i++) {
        const cx = ((i * 58 + tick * 28) % (w + 120)) - 60;
        const cy = h * 0.72 + (i % 3) * 22 + Math.sin(tick * 2 + i) * 4;
        ctx.fillStyle = i % 2 === 0 ? PALETTE.cloudWhite : PALETTE.cloudPink;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 48, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      const bx = slideIdx === 0 ? w * 0.26 + Math.sin(tick * 1.4) * 14 : w * 0.34;
      const by = h * 0.62 + Math.sin(tick * 2.8) * 5;
      ctx.fillStyle = PALETTE.woodMid;
      ctx.beginPath();
      ctx.moveTo(bx - 42, by);
      ctx.lineTo(bx + 46, by);
      ctx.lineTo(bx + 30, by + 20);
      ctx.lineTo(bx - 28, by + 20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(bx - 2, by - 54, 5, 56);
      ctx.fillStyle = PALETTE.creamLight;
      ctx.beginPath();
      ctx.moveTo(bx + 3, by - 50);
      ctx.quadraticCurveTo(bx + 36, by - 28, bx + 4, by - 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.amberGold;
      ctx.beginPath();
      ctx.arc(bx + 44, by - 6, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  public drawLanternFestivalCanvas(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    lanterns: { x: number; y: number; speed: number; phase: number }[],
    tick: number
  ): void {
    ctx.imageSmoothingEnabled = true;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#1f1a3c');
    sky.addColorStop(0.55, '#3b2e66');
    sky.addColorStop(1, '#5a447d');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Trăng lưỡi liềm & sao lấp lánh
    ctx.fillStyle = PALETTE.creamLight;
    for (let i = 0; i < 36; i++) {
      const sx = (i * 79 + 23) % (w - 16);
      const sy = (i * 43 + 11) % (h * 0.62);
      const r = 1.2 + Math.abs(Math.sin(tick * 3 + i)) * 1.4;
      ctx.globalAlpha = 0.55 + Math.sin(tick * 2.5 + i) * 0.4;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = PALETTE.amberGold;
    ctx.beginPath();
    ctx.arc(w * 0.84, 52, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#28204c';
    ctx.beginPath();
    ctx.arc(w * 0.84 + 8, 48, 17, 0, Math.PI * 2);
    ctx.fill();

    // Đèn trời tỏa quầng ấm áp bay lên
    for (const l of lanterns) {
      const ly = (((l.y - tick * l.speed) % (h - 30)) + (h - 30)) % (h - 30);
      const lx = l.x + Math.sin(tick * 1.8 + l.phase) * 9;
      const halo = ctx.createRadialGradient(lx, ly, 2, lx, ly, 22);
      halo.addColorStop(0, 'rgba(242, 193, 78, 0.72)');
      halo.addColorStop(1, 'rgba(242, 193, 78, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(lx, ly, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = PALETTE.coralRed;
      ctx.beginPath();
      ctx.roundRect(lx - 6, ly - 8, 12, 15, 4);
      ctx.fill();
      ctx.fillStyle = PALETTE.whiteWarm;
      ctx.beginPath();
      ctx.arc(lx, ly + 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lan can hiên quán & 5 nhân vật cùng ngước nhìn trời đêm
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(0, h - 38, w, 38);
    ctx.fillStyle = PALETTE.woodMid;
    ctx.fillRect(0, h - 44, w, 8);
    for (const gx of [150, 220, 310, 395, 475]) {
      ctx.fillStyle = PALETTE.outlineDark;
      ctx.beginPath();
      ctx.roundRect(gx - 8, h - 76, 16, 36, 5);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(gx, h - 86, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export const storybookArt = new StorybookArtRegistry();

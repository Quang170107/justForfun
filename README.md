# 🍵 Trà Quán Trên Mây

> Game chill 2.5D kiểu Stardew Valley. Người chơi trồng trà, chế biến, pha trà và phục vụ những vị khách lạ trên một hòn đảo nổi giữa biển mây.

## Công nghệ
- **Three.js + Vite + TypeScript**
- Toàn bộ pixel art (tileset 16×16, nhân vật 16×32, chân dung NPC 64×64, icon vật phẩm 16×16) được vẽ bằng code thành texture `NearestFilter` ở độ phân giải gốc `480×270` và phóng đại theo bội số nguyên.

## Cài đặt & Chạy
```bash
npm install
npm run dev
```

Build bản production:
```bash
npm run build
```

## Điều khiển
| Phím | Hành động |
|---|---|
| `WASD` / Phím mũi tên | Di chuyển |
| `E` / `Space` | Dùng công cụ, thu hoạch, phơi/sao lá, pha trà, phục vụ, nói chuyện NPC |
| `1–9` | Chọn ô trên Hotbar |
| `Q` / `R` | Xoay camera 90° |
| `Tab` / `I` | Mở Túi đồ & Sổ Công Thức |
| `Esc` | Mở Menu / Đóng cửa sổ |

## Cấu trúc thư mục
- `src/art/`: Bảng màu và bộ tạo pixel art (`CanvasTexture` + icon/portrait DataURL)
- `src/core/`: Vòng lặp render 2.5D, hệ thống thời gian, điều khiển, lưu game (`localStorage`), âm thanh Web Audio API
- `src/data/`: Dữ liệu cây trồng, công thức trà, NPC và lời thoại ký ức
- `src/world/`: Đảo nổi 2.5D, biển mây shader, kiến trúc & ô đất trồng trọt
- `src/entities/`: Sprite billboard nhân vật, 4 NPC (`Mây`, `Cò Lữ`, `Ông Đăng`, `Bé Sương`) và khách hàng quán trà
- `src/systems/`: Trồng trọt, phơi/sao lá, pha trà, quản lý quán & cửa hàng, thân thiết NPC, thời tiết
- `src/ui/`: HUD, hộp thoại, túi đồ, quầy pha trà, cửa hàng và menu

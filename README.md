# 🍵 Trà Quán Trên Mây

> **Game mô phỏng quán trà & nông trại 2.5D pixel art phong cách Stardew Valley.**  
> Bạn thừa kế một quán trà cũ của bà ngoại trên hòn đảo nổi giữa biển mây. Mỗi ngày, hãy tự tay cuốc đất, trồng trà và thảo mộc, phơi nắng, sao lá, pha nên những tách trà ấm thơm ngát để đón những vị khách lạc mây và lắng nghe câu chuyện ký ức của cư dân trên đảo.

---

## 📸 Hình ảnh trong game

### Đời sống ban ngày trên Đảo Mây (Mùa Xuân)
![Gameplay buổi sáng Mùa Xuân trên Đảo Trà Trên Mây](docs/screenshots/gameplay-spring.png)

### Hiên Quán Trà ấm áp về đêm (Nâng cấp 5 bàn & Đèn lồng)
![Hiên Quán Trà nâng cấp 5 bàn rực sáng đèn lồng ban đêm](docs/screenshots/teahouse-evening.png)

### Đêm mưa nhẹ với vũng nước gợn sóng
![Thời tiết mưa đêm trên đảo với vũng nước gợn sóng và ánh đèn](docs/screenshots/rainy-night.png)

---

## ✨ Tính năng nổi bật

- **Đồ họa 2.5D Pixel Art nhất quán:** Toàn bộ sprite, tileset auto-tile 4 hướng, vách đảo, mái ngói Á Đông, nội thất trong suốt khi vào nhà, chân dung 64×64 và giao diện 9-slice gỗ/giấy da được vẽ bằng code chung một bảng màu thống nhất, render nội bộ `480×270` (`NearestFilter`) và phóng đại theo bội số nguyên không nhòe.
- **Trồng trọt 5 loại cây Mùa Xuân:** *Trà Xanh Mây* (thu hoạch nhiều lần, mọc lại sau 2 ngày), *Hoa Cúc Vàng*, *Bạc Hà Gió*, *Hoa Nhài Đêm* và *Gừng Ấm Đất* với 4 giai đoạn sinh trưởng đung đưa theo gió, dấu hiệu lấp lánh khi chín và cơ chế mưa tự tưới.
- **Chế biến & Pha trà thủ công:** Phơi lá trên **Nong Tre** qua đêm, **Sao Trà** trên chảo nóng qua mini-game giữ nhịp cho chất lượng `★ / ★★ / ★★★`, và **Quầy Pha Trà** góc nhìn từ trên xuống cho phép phối nguyên liệu, nhiệt độ nước (`75°C / 90°C / 100°C`) và thời gian ủ để mở khóa **5 công thức chính + Trà Lạ** trong Sổ Công Thức.
- **Vận hành Quán Trà buổi chiều (`14:00–20:00`):** Lật biển mở quán đón khách từ Bến Mây, đọc gợi ý mơ hồ qua lời nói của khách để pha đúng tách trà, thu **Xu Mây** theo chất lượng và thái độ phục vụ.
- **4 Cư dân trên Đảo & Ký ức (`0–10♥`):** Đồng hành cùng **Mây**, **Cò Lữ**, **Ông Đăng** và **Bé Sương** với lịch trình sinh hoạt sáng/chiều/tối & trú mưa, hội thoại biến đổi theo ngữ cảnh không lặp, tặng quà 4 mức và các đoạn **cutscene ký ức** tại mốc `2 / 5 / 8 / 10♥`.
- **Kinh tế, Nâng cấp & Trang trí:** Mua hạt giống, mật ong rừng và 3 món đồ trang trí tại **Sạp Bé Sương** (`08:00–18:00`); mở khóa **Bình tưới đồng 3 ô**, **Mở rộng quán 3 → 4 → 5 bàn**, **Đồi trà 10×6**, ký gửi qua đêm ở **Hộp Bán Hàng** và xem kết toán cuối ngày.
- **Thời tiết & Âm thanh Web Audio:** Nghe **Đài Dự Báo** ngày mai trong Nhà Ở; trải nghiệm *Nắng ấm* (bướm, chim bay, cánh hoa rơi), *Mưa nhẹ* (hạt mưa xiên, vũng nước gợn sóng, tự tưới đất), *Sương mù* (biển mây dâng cao + hiệu ứng sương); kèm **3 giai điệu lo-fi/acoustic** ngày/đêm/mưa và SFX riêng cho từng thao tác & mặt đất.
- **Cốt truyện 28 ngày Mùa Xuân:** Cảnh mở đầu Thuyền Mây, 5 lá thư từ bà ngoại, hướng dẫn lồng mượt 3 ngày đầu, các sự kiện ngày `6 / 12 / 18`, **Lễ Hội Thả Đèn Mây** tối `24 Xuân` và **Tổng Kết Mùa Xuân** ngày `28`.

---

## 🛠️ Cài đặt & Chạy

Yêu cầu: **Node.js 18+** và **npm**.

```bash
# 1. Cài đặt thư viện
npm install

# 2. Chạy môi trường phát triển (Dev Server)
npm run dev

# 3. Kiểm tra TypeScript & build bản Production vào dist/
npm run build

# 4. Chạy thử bản Production vừa build
npm run preview
```

---

## 🎮 Điều khiển

| Phím / Thao tác | Chức năng |
|---|---|
| `WASD` / Phím mũi tên | Di chuyển (8 hướng mượt, trượt dọc tường) |
| `E` / `Space` | Dùng công cụ, thu hoạch, phơi/sao, pha trà, phục vụ khách, nói chuyện NPC |
| `Chuột trái` | Tương tác ô đất / đối tượng trong tầm 1 ô hoặc tiếp tục hội thoại |
| `1–9` / `Lăn chuột` | Chọn ô vật phẩm trên Hotbar |
| `Q` / `R` | Xoay góc nhìn camera `90°` quanh đảo |
| `Tab` / `I` | Mở **Túi Đồ (24 ô Kéo-Thả), Sổ Công Thức, Quan Hệ NPC & Thư / Lịch Xuân** |
| `Esc` | Mở Menu Tạm Dừng / Cài Đặt hoặc đóng cửa sổ đang mở |

> **Chế độ phát triển (`npm run dev`):** Bộ phím kiểm thử debug (`F3` Overlay FPS/tọa độ, `F5` +1h, `F6` qua ngày, `F7` +1000 Xu Mây, `F8` đổi thời tiết, `F9` thêm nguyên liệu, `F10` +1 tim NPC) chỉ hoạt động khi chạy `vite` dev (`import.meta.env.DEV`) và **được vô hiệu hóa hoàn toàn ở bản build production** (`npm run build` / `npm run preview`).

---

## 🗂️ Kiến trúc mã nguồn

```text
src/
├── main.ts                      # Điểm khởi chạy ứng dụng
├── style.css                    # Kiểu dáng UI 9-slice, font pixel tiếng Việt (Handjet / VT323)
├── art/
│   ├── palette.ts               # Bảng màu pixel cố định toàn dự án
│   └── pixelArtGenerator.ts     # Bộ vẽ sprite, tileset auto-tile, 9-slice UI & icon/chân dung
├── core/
│   ├── AudioSystem.ts           # Nhạc nền Web Audio (ngày/đêm/mưa) & SFX
│   ├── Game.ts                  # Vòng lặp chính, render 2.5D pixel-snap, tương tác thế giới
│   ├── InputSystem.ts           # Bàn phím, chuột, hotbar, khóa phím debug theo DEV
│   ├── SaveSystem.ts            # Lưu/tải localStorage (v4) kèm kiểm tra tính toàn vẹn dữ liệu
│   └── TimeSystem.ts            # Đồng hồ 06:00–24:00, ánh sáng bình minh/trưa/hoàng hôn/đêm
├── data/
│   ├── crops.ts                 # Dữ liệu 5 cây trồng, vật phẩm & giá trị chất lượng
│   ├── customers.ts             # Ngoại hình khách vãng lai & lời gợi ý order mơ hồ
│   ├── dialogues.ts             # Hội thoại theo ngày, thời tiết, buổi tối & số tim
│   ├── economy.ts               # Giờ mở sạp, bảng giá nâng cấp, vùng đặt đồ trang trí
│   ├── islandMap.ts             # Bố cục bản đồ đảo 26×16, cây, đá, đèn, hàng rào
│   ├── npcs.ts                  # Hồ sơ 4 NPC, quà thích/ghét, lịch trình & ký ức
│   ├── recipes.ts               # 5 công thức pha trà & chuẩn hóa nguyên liệu tươi/khô
│   ├── story.ts                 # Cảnh mở đầu, dọn hiên quán, 5 lá thư & Lịch 28 ngày Xuân
│   ├── types.ts                 # Khai báo kiểu TypeScript dùng chung
│   └── weather.ts               # Cấu hình 3 loại thời tiết & lời Đài Khí Tượng
├── entities/
│   ├── BillboardSprite.ts       # Y-billboard 4 hướng cho nhân vật & bước chân
│   ├── Customer.ts              # Khách hàng di chuyển từ Bến Mây, bong bóng trạng thái
│   ├── NPC.ts                   # 4 cư dân đảo đi tuần tra & đổi lịch trình theo thời tiết/giờ
│   └── Player.ts                # Điều khiển người chơi, animation 4 hướng & động tác công cụ
├── systems/
│   ├── BrewingSystem.ts         # Logic khớp công thức, chất lượng trung bình & Sổ Công Thức
│   ├── FarmingSystem.ts         # Cuốc, gieo, tưới (1 ô / 3 ô đồng), lớn theo ngày & thu hoạch
│   ├── ProcessingSystem.ts      # Nong tre phơi lá & Chảo sao tính chất lượng ★–★★★
│   ├── RelationshipSystem.ts    # Thân thiết 0–10 tim, tặng quà & ký ức chống lặp thoại
│   ├── ShopSystem.ts            # Vận hành Quán trà 14:00–20:00, lượt khách & trả thưởng
│   └── WeatherSystem.ts         # Hạt mưa/sương mù/cánh hoa/đom đóm/chim & đèn trời 3D
├── ui/
│   ├── BrewingScreen.ts         # Màn pha trà nhìn từ trên xuống & mini-game Chảo sao
│   ├── DialogueBox.ts           # Hộp thoại NPC có chân dung biểu cảm & tặng quà nhanh
│   ├── HUD.ts                   # HUD ngày/giờ, vị trí, gợi ý mục tiêu, hotbar & pop-up
│   ├── InventoryModal.ts        # Túi 24 ô kéo-thả, Sổ Công Thức, Quan Hệ, Thư & Lịch Xuân
│   ├── ShopAndMenuModal.ts      # Sạp Bé Sương, Hộp Bán Hàng, Tóm tắt ngày, Menu/Cài đặt & Cutscene
│   └── UIManager.ts             # Điều phối overlay, tiêu đề game & hiệu ứng ngủ qua ngày
└── world/
    ├── Buildings.ts             # Nhà Ở (ẩn mái), Quán Trà (3–5 bàn), Sạp, Hải Đăng, Bến Mây & Decor
    ├── CloudSea.ts              # Biển mây shader động 4 phía & mây trôi sương mù
    ├── Island.ts                # Mặt đất auto-tile 4 hướng, vách đảo & collider toàn đảo
    └── Tiles.ts                 # Lưới đất trồng `10×6` ô có dấu hiệu lấp lánh cây chín
```

---

## 📦 Công nghệ sử dụng

- **Three.js** (`^0.170.0`) — Dựng cảnh 2.5D camera trực giao (`OrthographicCamera`) & sprite Y-billboard.
- **TypeScript** (`^5.6.3`) — Kiểm tra kiểu nghiêm ngặt toàn bộ dữ liệu và logic.
- **Vite** (`^6.0.0`) — Môi trường phát triển nhanh & đóng gói production tách chunk `three` riêng biệt.
- **Web Audio API** — Tổng hợp 100% nhạc nền và hiệu ứng âm thanh không cần tải tệp audio rời.

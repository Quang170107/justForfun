# 🍵 TRÀ QUÁN TRÊN MÂY — Game Brief

> Game chill 2.5D kiểu Stardew Valley. Người chơi trồng trà, pha trà và phục vụ những vị khách lạ trên một hòn đảo nổi giữa biển mây.

---

## 1. Tổng quan

| Mục | Nội dung |
|---|---|
| Thể loại | Cozy sim / farming / quản lý quán, 2.5D |
| Cảm giác | Chill, ấm áp, không áp lực, không có game over |
| Góc nhìn | Camera orthographic nghiêng ~35–45° nhìn xuống, có thể xoay theo bước 90° |
| Phong cách | **Pixel art kiểu Stardew Valley** đặt trong không gian 3D (2.5D). Chi tiết ở mục 1.1 |
| Nền tảng | Web (chạy trên trình duyệt desktop) |
| Tech stack | **Three.js + Vite + TypeScript**. Không dùng engine nặng. |
| Asset | Tự tạo toàn bộ pixel art (vẽ bằng code thành texture, hoặc xuất file PNG spritesheet vào `public/assets`). Không phụ thuộc asset bên ngoài |

## 1.1 Yêu cầu đồ họa: phong cách Stardew Valley (QUAN TRỌNG)

> Mục tiêu: nhìn vào phải thấy ngay chất **Stardew Valley**, tức pixel art ấm áp, rực rỡ, chi tiết, kiểu vẽ tay, nhưng có thêm chiều sâu 3D (2.5D). Hình khối placeholder (hộp màu trơn, hình cầu trơn) **không được chấp nhận** ở bản hoàn thiện.

### A. Kỹ thuật render pixel art 2.5D
- Render toàn bộ scene vào **render target độ phân giải thấp** (gợi ý 480×270 hoặc 640×360), sau đó phóng lên màn hình theo **bội số nguyên** bằng `NearestFilter`.
- Canvas dùng CSS `image-rendering: pixelated`. Tắt antialias.
- Mọi texture dùng `magFilter = minFilter = NearestFilter`, tắt mipmap.
- Dùng `OrthographicCamera`. Tỉ lệ cố định: **1 ô lưới = 16×16 pixel** trên màn hình (ở độ phân giải gốc).
- **Pixel snapping:** làm tròn vị trí camera và sprite theo lưới pixel để không bị rung hay nhòe khi di chuyển.
- Mặt đất, tường nhà, vách đảo, mái nhà là khối 3D **dán texture pixel art**. Nhân vật, cây, hoa, đồ vật là **sprite billboard** (chỉ xoay quanh trục Y, chân sprite đặt sát mặt đất).
- Sắp xếp độ sâu đúng: nhân vật đi sau cây hoặc nhà thì bị che, đi phía trước thì che lại vật đó.
- Có **bóng đổ** dạng elip pixel mờ dưới chân nhân vật và đồ vật.

### B. Bảng màu
- Dùng **bảng màu giới hạn khoảng 32–48 màu**, toàn bộ asset dùng chung bảng này.
- Tông màu ấm, bão hòa vừa phải, tươi sáng như Stardew. Không dùng màu xám lạnh hay đen tuyền.
- Gợi ý màu chủ đạo:

| Nhóm | Màu (hex) |
|---|---|
| Cỏ | `#3f7d3a` `#5a9c3a` `#7cc142` `#a8d85a` |
| Đất | `#5c3a21` `#7a4e2d` `#9c6b3f` (đất ướt: `#4a2e1a`) |
| Gỗ | `#6b3e26` `#8f5a34` `#b57a45` `#d9a066` |
| Mái ngói | `#8e2f2f` `#b8433a` `#d9634a` |
| Mây / trời | `#f4e9e1` `#e8d5e8` `#b7c9f0` `#8fa8e0` |
| Hoa / điểm nhấn | `#f2c14e` `#f28b82` `#e86fa0` `#ffffff` |
| Viền tối | `#2b1d14` `#3a2a3e` |

### C. Quy tắc vẽ pixel art
- **Viền (outline):** dùng màu tối cùng tông (nâu đậm, tím đậm), không dùng đen `#000`.
- **Đổ bóng:** 2–3 sắc độ cho mỗi chất liệu. Nguồn sáng thống nhất từ **phía trên bên trái**.
- Hạn chế dithering. **Không** dùng gradient mượt, blur, texture chụp ảnh thật.
- **Không trộn kích thước pixel**: mọi asset vẽ cùng tỉ lệ 1 pixel, không phóng to hay thu nhỏ lẻ, không xoay sprite theo góc lẻ.
- Đồ vật có chi tiết nhỏ kiểu Stardew: vân gỗ, cỏ lấm tấm hoa, sỏi trên lối đi, lá cây có nhiều mảng sáng tối.

### D. Nhân vật
- Sprite nhân vật **16×32 px**, tỉ lệ chibi (đầu to, người nhỏ) như Stardew.
- Đi bộ **4 hướng**, mỗi hướng **4 frame**. Idle có nhịp thở nhẹ (2 frame).
- Animation dùng công cụ: cuốc, tưới, hái (2–4 frame mỗi động tác).
- NPC có thiết kế khác biệt rõ ràng, nhìn hình bóng (silhouette) là nhận ra:
  - **Mây**: linh hồn trắng mờ, trôi lơ lửng, có đốm sáng.
  - **Cò Lữ**: chim cò cao gầy, đeo túi du hành, khăn quàng.
  - **Ông Đăng**: ông lão râu bạc, áo khoác thủy thủ, cầm đèn bão.
  - **Bé Sương**: cô bé tóc hai bím, đội nón lá nhỏ, đeo giỏ hạt giống.
- **Chân dung hội thoại** cho mỗi NPC: **64×64 px**, tối thiểu 3 biểu cảm (bình thường, vui, buồn).

### E. Môi trường & tileset
- Tileset 16×16: cỏ (≥3 biến thể + cỏ có hoa), đất cuốc, đất đã tưới (sẫm màu hơn), lối đi lát đá, sàn gỗ, hàng rào (tự nối ô).
- Cây trồng: **4 giai đoạn** cho mỗi loại cây, nhìn khác nhau rõ rệt. Cây thu hoạch được có dấu hiệu nhận biết (ví dụ hoa nở, lá căng bóng).
- Cây to (thông, anh đào...): sprite 32×48 trở lên, tán lá nhiều lớp.
- Quán trà: mái cong kiểu Á Đông, đèn lồng đỏ, rèm tre, hiên gỗ, bảng hiệu "Trà Quán". Nội thất có ấm trà, kệ hũ trà, chậu cây.
- Mép đảo có vách đất/đá nhìn rõ độ dày (lợi thế 2.5D), rễ cây và dây leo rủ xuống biển mây.

### F. Hiệu ứng động
- Cỏ và cây lay nhẹ theo gió. Hoa đung đưa.
- Biển mây cuộn chậm, có lớp mây trôi ở tiền cảnh và hậu cảnh tạo chiều sâu.
- Bướm và chim bay ngang, cánh hoa rơi, khói bốc từ ống khói và ấm trà.
- Mưa: hạt mưa pixel xiên, vũng nước gợn sóng. Sương mù: lớp mây dâng lên mép đảo.
- Ban đêm: đom đóm, đèn lồng và cửa sổ phát sáng.
- Hiệu ứng tương tác: đất văng khi cuốc, giọt nước khi tưới, lá bay lấp lánh khi thu hoạch, số tiền nảy lên khi nhận Xu Mây.

### G. Ánh sáng ngày đêm (kiểu Stardew)
- Phủ một lớp **màu tint toàn màn hình** đổi theo giờ: sáng vàng nhạt, trưa trung tính, hoàng hôn cam hồng, đêm xanh tím đậm.
- Ban đêm, nguồn sáng (đèn lồng, cửa sổ, đom đóm) là các **quầng sáng pixel** cộng màu, nổi bật trên nền tối.
- Chuyển màu mượt theo thời gian, không đổi đột ngột.

### H. UI kiểu Stardew
- Khung UI dạng **gỗ và giấy da** (9-slice pixel art), viền nâu đậm, nền kem.
- Hotbar: các ô vuông gỗ, ô đang chọn có viền vàng sáng. Icon vật phẩm 16×16 (hiển thị phóng 2–3 lần).
- Đồng hồ HUD có hình mặt trời/mặt trăng xoay theo giờ, giống Stardew.
- Hộp thoại: khung gỗ, chân dung NPC bên cạnh, tên NPC trên nhãn riêng, chữ chạy từng ký tự kèm tiếng "bíp" nhỏ.
- Tooltip khi rê chuột vào vật phẩm (tên, mô tả, chất lượng ★).
- **Font pixel phải hiển thị đúng tiếng Việt có dấu**. Kiểm tra font có bộ ký tự Vietnamese (ví dụ trên Google Fonts lọc subset "Vietnamese"). Nếu không có font phù hợp thì tự làm bitmap font. Chữ không bị nhòe, scale theo bội số nguyên.
- UI cũng phải sắc nét theo pixel, cùng tỉ lệ với game.

### I. Tham khảo
- **Stardew Valley**: bảng màu, tỉ lệ nhân vật, UI, cảm giác ấm cúng (tham chiếu chính).
- **Eastward**, **Sea of Stars**: pixel art kết hợp ánh sáng đẹp.
- **Octopath Traveler (HD-2D)**: cách đặt sprite pixel vào không gian 3D, nhưng giữ đơn giản và ấm áp hơn, không dùng hiệu ứng tilt-shift quá mạnh.

## 2. Cốt truyện

Người chơi nhận được lá thư của bà ngoại, chủ cũ của **Trà Quán Trên Mây**, một quán trà nhỏ trên hòn đảo nổi đã đóng cửa nhiều năm. Người chơi đến đảo, dọn dẹp, trồng lại đồi trà và mở cửa quán.

Khách của quán là những nhân vật kỳ lạ: linh hồn lạc đường, chim di cư, người lữ hành, một ông lão gác hải đăng mây... Mỗi người mang một nỗi niềm. Pha đúng loại trà sẽ mở ra một đoạn ký ức của họ.

## 3. Vòng lặp gameplay

```
Sáng:  Ra vườn → tưới / hái lá trà, thảo mộc
Trưa:  Chế biến lá (phơi, sao, ủ)
Chiều: Mở quán → nhận order → pha trà → phục vụ → nhận tiền + điểm thân thiết
Tối:   Đi dạo đảo, nói chuyện NPC, trang trí quán → đi ngủ (lưu game)
```

- 1 ngày trong game ≈ 12 phút thực (6:00 → 24:00).
- Ngủ để sang ngày mới. Thức quá 24:00 thì tự ngủ gục, không bị phạt nặng.

## 4. Hệ thống cốt lõi

### 4.1 Trồng trọt
- Đất chia theo ô lưới (tile 1×1).
- Hành động: **cuốc đất → gieo hạt → tưới → chờ lớn → thu hoạch**.
- Cây có 4 giai đoạn hiển thị. Ngày nào không tưới thì cây không lớn (nhưng không chết).
- Cây trồng MVP: **Trà xanh, Hoa cúc, Bạc hà, Hoa nhài, Gừng**.

### 4.2 Chế biến
- **Phơi** (nong tre): lá tươi → lá khô, mất 1 ngày.
- **Sao** (chảo): lá tươi → trà sao, mini-game giữ thanh nhiệt độ trong vùng xanh vài giây.
- Không có kết quả thất bại hoàn toàn: làm kém thì chất lượng ★, làm tốt thì ★★★.

### 4.3 Pha trà (cơ chế chính)
Pha trà gồm 3 lựa chọn:
1. **Nguyên liệu chính** (trà xanh / trà sao...)
2. **Phụ liệu** (0–2 món: cúc, bạc hà, nhài, gừng, mật ong)
3. **Nhiệt độ nước** (Ấm / Nóng / Sôi) và **thời gian ủ** (Ngắn / Vừa / Lâu)

Công thức đúng sẽ ra trà có tên (ví dụ *Trà Cúc Mật Ong*). Công thức mới được ghi vào **Sổ Công Thức**. Pha sai vẫn ra "Trà lạ", khách vẫn uống nhưng ít vui hơn.

Một số công thức MVP:

| Tên | Nguyên liệu | Nước | Ủ |
|---|---|---|---|
| Trà Xanh Thanh | Trà xanh | Ấm | Ngắn |
| Trà Cúc Mật Ong | Hoa cúc + Mật ong | Nóng | Vừa |
| Trà Bạc Hà Mát | Trà xanh + Bạc hà | Ấm | Vừa |
| Trà Nhài Đêm | Trà sao + Hoa nhài | Nóng | Lâu |
| Trà Gừng Ấm | Gừng + Mật ong | Sôi | Lâu |

### 4.4 Quán & khách
- Quán mở 14:00–20:00, mỗi buổi 3–6 khách.
- Khách gợi ý order bằng lời mơ hồ ("Hôm nay tôi thấy lạnh lẽo quá...", tức là Trà Gừng Ấm).
- Phục vụ đúng thì được tiền, tim thân thiết (0–10) và đôi khi quà.
- Khách có kiên nhẫn rất cao, chờ lâu chỉ hơi buồn, không bỏ đi.

### 4.5 NPC & quan hệ (MVP: 4 NPC)
| NPC | Mô tả | Trà yêu thích |
|---|---|---|
| **Mây** | Linh hồn nhỏ hay quên tên mình | Trà Nhài Đêm |
| **Cò Lữ** | Chim cò di cư, kể chuyện các vùng đất | Trà Bạc Hà Mát |
| **Ông Đăng** | Lão gác hải đăng mây, cộc cằn nhưng tốt bụng | Trà Gừng Ấm |
| **Bé Sương** | Cô bé bán hạt giống, vui vẻ, lắm lời | Trà Cúc Mật Ong |

Mỗi NPC có các mốc tim 2 / 5 / 8 / 10 để mở đoạn hội thoại ký ức (cutscene dạng hộp thoại).

### 4.6 Kinh tế & tiến trình
- Tiền: **Xu Mây**.
- Mua hạt giống ở cửa hàng Bé Sương.
- Nâng cấp: bình tưới lớn hơn, thêm bàn trong quán, mở rộng đồi trà, đồ trang trí (đèn lồng, chậu cây, chuông gió).

### 4.7 Thời gian, thời tiết, mùa
- Chu kỳ ngày đêm với ánh sáng đổi màu (bình minh cam, trưa trắng ấm, hoàng hôn hồng tím, đêm xanh tím có đèn lồng phát sáng).
- Thời tiết: Nắng / Mưa (tự tưới cây) / Sương mù (biển mây dâng cao, rất đẹp).
- MVP chỉ cần 1 mùa (Xuân, 28 ngày). Các mùa khác để sau.

## 5. Thế giới (MVP)

Một hòn đảo nổi nhỏ, gồm:
- **Quán trà** (nhà gỗ, mái cong kiểu Á Đông, có hiên và 3 bàn)
- **Đồi trà** (vùng đất trồng ~8×6 ô)
- **Nhà ở** (giường để ngủ/lưu game)
- **Sạp hạt giống** của Bé Sương
- **Hải đăng** nhỏ ở mép đảo
- Xung quanh là **biển mây** hoạt họa (plane có shader nhấp nhô, mây trôi)

## 6. Điều khiển

| Phím | Hành động |
|---|---|
| WASD / phím mũi tên | Di chuyển |
| E / Space | Tương tác (nói chuyện, dùng công cụ, nhặt) |
| 1–5 | Chọn ô hotbar (cuốc, bình tưới, hạt giống, giỏ...) |
| Q / R | Xoay camera 90° |
| Tab / I | Túi đồ |
| Esc | Menu / tạm dừng |

## 7. UI

- **HUD:** đồng hồ + ngày + icon thời tiết (góc trên phải), tiền (dưới đồng hồ), hotbar (giữa dưới).
- **Hộp thoại:** khung gỗ pixel art, có chân dung NPC, chữ chạy từng ký tự (xem mục 1.1-H).
- **Màn pha trà:** giao diện riêng, nhìn từ trên xuống quầy, chọn nguyên liệu bằng chuột.
- Font pixel, dễ đọc, hỗ trợ tiếng Việt đầy đủ dấu.
- Toàn bộ text trong game bằng **tiếng Việt**.

## 8. Âm thanh (tùy chọn cho MVP)
- Nhạc nền lo-fi / acoustic nhẹ (có thể tạo bằng Web Audio API đơn giản).
- SFX: bước chân, tiếng nước rót, chuông gió, chim hót.

## 9. Lưu game
- Lưu vào `localStorage` khi đi ngủ.
- Lưu: ngày, tiền, túi đồ, trạng thái từng ô đất, công thức đã mở, điểm thân thiết NPC, đồ trang trí.

## 10. Phạm vi MVP & tiêu chí hoàn thành

MVP được coi là **xong** khi:
- [ ] Chạy được bằng `npm install && npm run dev`, mở trên trình duyệt không lỗi console.
- [ ] Nhân vật đi lại trên đảo 2.5D, va chạm với nhà/cây, camera bám theo và xoay được.
- [ ] Chu kỳ ngày đêm hoạt động, ánh sáng đổi theo giờ, ngủ để qua ngày.
- [ ] Trồng trọt đủ vòng: cuốc, gieo, tưới, lớn, thu hoạch (ít nhất 5 loại cây).
- [ ] Phơi/sao lá hoạt động.
- [ ] Màn pha trà với 5 công thức, có Sổ Công Thức.
- [ ] Quán mở buổi chiều, khách đến order, phục vụ, nhận tiền.
- [ ] 4 NPC có hội thoại và hệ thống tim, ít nhất mốc 2 tim có đoạn ký ức.
- [ ] Mua hạt giống, có ít nhất 1 nâng cấp.
- [ ] Lưu/tải game bằng localStorage.
- [ ] Trời mưa thì cây tự được tưới.
- [ ] **Đồ họa đạt yêu cầu mục 1.1:** pixel art sắc nét (không nhòe, không rung khi di chuyển), dùng chung bảng màu, không còn hình khối placeholder, nhân vật có animation 4 hướng, có ánh sáng ngày đêm và đèn phát sáng ban đêm, UI khung gỗ kiểu Stardew hiển thị đúng tiếng Việt.

## 11. Cấu trúc code gợi ý

```
src/
  main.ts            # khởi tạo
  core/              # Game loop, Time, Input, Save
  world/             # Island, CloudSea, Buildings, Tiles
  entities/          # Player, NPC, Customer (billboard sprites)
  systems/           # Farming, Processing, Brewing, Shop, Relationship, Weather
  ui/                # HUD, Dialogue, Inventory, BrewingScreen, Menu
  data/              # crops.ts, recipes.ts, npcs.ts, dialogues.ts (dữ liệu tách riêng)
```

Nguyên tắc: dữ liệu (cây, công thức, NPC, hội thoại) tách ra file riêng để dễ thêm nội dung; code chia module rõ ràng.

## 12. Ngoài MVP (để sau)
- Đủ 4 mùa, lễ hội (Tết Trung Thu ngắm trăng trên mây)
- Câu cá mây
- Thêm đảo nổi mới bằng khinh khí cầu
- Thú cưng (mèo quán)
- Trang trí quán tự do

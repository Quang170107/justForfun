# 🗺️ ROADMAP — Trà Quán Trên Mây

> Tài liệu hướng dẫn **Argon 4** hoàn thiện game theo từng giai đoạn.
> Tài liệu thiết kế gốc: [`GAME_BRIEF.md`](./GAME_BRIEF.md). Khi hai file mâu thuẫn, **GAME_BRIEF.md là chuẩn**.

---

## 0. Quy tắc làm việc (BẮT BUỘC đọc trước)

1. **Làm từng giai đoạn một, theo đúng thứ tự.** Không nhảy sang giai đoạn sau khi giai đoạn hiện tại chưa đạt hết "Tiêu chí hoàn thành".
2. **Trước khi bắt đầu mỗi giai đoạn:** đọc lại phần liên quan trong `GAME_BRIEF.md` (đặc biệt mục **1.1 Yêu cầu đồ họa**) và file `PROGRESS.md`.
3. **Sau khi xong mỗi giai đoạn, bắt buộc:**
   - `npm run build` chạy **không lỗi TypeScript**.
   - `npm run dev`, mở game, **không có lỗi hay cảnh báo đỏ trong console**.
   - Tự chạy hết **Kịch bản kiểm tra** của giai đoạn đó.
   - Cập nhật `PROGRESS.md` (xem mẫu ở mục cuối).
   - Commit git: `git commit -m "Phase X: <tên giai đoạn>"`.
   - **Dừng lại, báo cáo** cho người dùng: đã làm gì, cách test, vấn đề còn tồn đọng. Chờ người dùng xác nhận rồi mới sang giai đoạn tiếp.
4. **Không phá thứ đã chạy.** Sau khi sửa, kiểm tra lại nhanh các tính năng của các giai đoạn trước (smoke test).
5. **Dữ liệu tách khỏi logic:** cây trồng, công thức, NPC, hội thoại, giá cả nằm trong `src/data/`. Không hardcode trong system hay UI.
6. **Đồ họa không được "tạm bợ"**: không để hộp màu trơn, hình cầu trơn hay placeholder ở bản hoàn thiện của mỗi giai đoạn. Mọi asset theo đúng mục 1.1 của brief.
7. **Toàn bộ text trong game bằng tiếng Việt có dấu.** File lưu ở mã hóa **UTF-8** (lưu ý: `README.md` hiện đang bị lỗi font chữ, sửa ở Giai đoạn 0).
8. Nếu một yêu cầu không khả thi hoặc không rõ: **ghi vào `PROGRESS.md` mục "Câu hỏi"** và hỏi người dùng, không tự ý bỏ qua.

---

## Tổng quan các giai đoạn

| # | Giai đoạn | Mục tiêu chính |
|---|---|---|
| 0 | Kiểm tra & ổn định khung | Build sạch, chạy được, lập danh sách việc còn thiếu |
| 1 | Pipeline render pixel 2.5D | Pixel sắc nét, không rung, camera chuẩn, sắp xếp độ sâu đúng |
| 2 | Thế giới & tileset | Hòn đảo đẹp kiểu Stardew, nhà cửa, cây, va chạm |
| 3 | Nhân vật & điều khiển | Đi 4 hướng, animation, tương tác ô, hotbar, công cụ |
| 4 | Thời gian, ngày đêm, lưu game | Đồng hồ, ánh sáng, ngủ, save/load |
| 5 | Trồng trọt | Vòng cuốc → gieo → tưới → lớn → thu hoạch |
| 6 | Chế biến | Phơi, sao lá, chất lượng ★ |
| 7 | Pha trà & Sổ Công Thức | Màn pha trà hoàn chỉnh |
| 8 | Quán trà & khách | Mở quán, order, phục vụ, nhận tiền |
| 9 | NPC, hội thoại, thân thiết | 4 NPC, chân dung, tim, đoạn ký ức |
| 10 | Kinh tế, cửa hàng, nâng cấp | Mua bán, nâng cấp công cụ/quán |
| 11 | Thời tiết & hiệu ứng | Mưa, sương mù, particle, "juice" |
| 12 | UI hoàn thiện & âm thanh | UI khung gỗ kiểu Stardew, nhạc, SFX |
| 13 | Cốt truyện & nội dung mùa Xuân | Mở đầu, hướng dẫn, 28 ngày nội dung |
| 14 | Cân bằng, QA, tối ưu, phát hành | Đạt toàn bộ checklist mục 10 của brief |

---

## Giai đoạn 0 — Kiểm tra & ổn định khung

**Mục tiêu:** hiểu rõ khung code hiện có, đảm bảo nó chạy, và lập danh sách việc cần làm.

**Việc cần làm**
- [ ] `git init` (nếu chưa có), đảm bảo `.gitignore` bỏ qua `node_modules/` và `dist/`.
- [ ] Chạy `npm install`, `npm run build`, `npm run dev`. Sửa mọi lỗi TypeScript và lỗi runtime.
- [ ] Sửa `README.md` bị lỗi mã hóa (đang hiển thị kiểu `TrÃ  QuÃ¡n`), lưu lại ở UTF-8.
- [ ] Đọc toàn bộ `src/`, đối chiếu với `GAME_BRIEF.md`. Với mỗi hệ thống, đánh giá: **Có / Một phần / Chưa có / Có nhưng lỗi**.
- [ ] Tạo `PROGRESS.md` theo mẫu ở cuối file này, ghi kết quả đánh giá.
- [ ] Thêm **debug overlay** (bật/tắt bằng `F3`): FPS, tọa độ người chơi, ô đang nhắm, giờ trong game.
- [ ] Thêm **phím debug** (chỉ ở chế độ dev): `F5` +1 giờ, `F6` qua ngày, `F7` +1000 Xu Mây, `F8` đổi thời tiết, `F9` cho tất cả hạt giống. Dùng để test nhanh các giai đoạn sau.

**Tiêu chí hoàn thành**
- Build và chạy sạch, không lỗi console.
- `PROGRESS.md` có bảng đánh giá đầy đủ.
- Debug overlay và phím debug hoạt động.

**Kịch bản kiểm tra:** mở game → đi lại vài bước → bấm F3 thấy thông tin → F6 qua ngày không crash.

---

## Giai đoạn 1 — Pipeline render pixel 2.5D

**Mục tiêu:** nền móng hình ảnh đúng chuẩn mục **1.1-A** của brief. Đây là giai đoạn quyết định "chất Stardew", phải làm chắc.

**Việc cần làm**
- [ ] Render scene vào `WebGLRenderTarget` độ phân giải gốc **480×270**, phóng lên màn hình theo **bội số nguyên** lớn nhất vừa cửa sổ (phần dư để viền màu tối). Xử lý khi resize cửa sổ.
- [ ] Tắt antialias. Canvas có `image-rendering: pixelated`. Mọi texture `NearestFilter`, không mipmap.
- [ ] `OrthographicCamera`, góc nghiêng 35–45°, **1 ô = 16 pixel** ở độ phân giải gốc.
- [ ] **Pixel snapping** cho camera và sprite. Camera bám người chơi mượt (lerp) nhưng vị trí render được làm tròn theo pixel.
- [ ] Xoay camera 90° bằng `Q`/`R`, có animation xoay ngắn (~0.3s), sprite billboard vẫn đúng hướng.
- [ ] Sắp xếp độ sâu đúng giữa sprite và khối 3D (nhân vật đi sau cây/nhà thì bị che).
- [ ] Bóng đổ elip pixel dưới chân sprite.
- [ ] Viết hàm tiện ích chung để tạo sprite và texture từ dữ liệu pixel + `palette.ts`, mọi asset sau này đều đi qua đây.

**Tiêu chí hoàn thành**
- Phóng to ảnh chụp màn hình: mỗi pixel game là một khối vuông đều nhau, không nhòe, không có pixel méo.
- Đi lại liên tục không thấy rung (jitter) ở sprite hay viền nhà.
- Xoay camera đủ 4 hướng không lỗi hiển thị.

**Kịch bản kiểm tra:** đi vòng quanh cây và nhà ở cả 4 góc camera; resize cửa sổ nhiều kích cỡ; chụp màn hình và zoom 400% kiểm tra pixel.

---

## Giai đoạn 2 — Thế giới & tileset

**Mục tiêu:** hòn đảo nổi nhìn đẹp, ấm cúng, chi tiết như Stardew (brief mục 5 và 1.1-B, C, E).

**Việc cần làm**
- [ ] Bản đồ đảo dạng dữ liệu (mảng 2D hoặc file JSON trong `src/data/`), dễ chỉnh sửa.
- [ ] Tileset 16×16: cỏ ≥3 biến thể + cỏ có hoa, lối đá, sàn gỗ, đất trồng, rìa chuyển tiếp cỏ↔đất↔đá (auto-tile).
- [ ] Vách đảo 3D có độ dày, texture đất đá nhiều lớp, rễ cây và dây leo rủ xuống.
- [ ] Công trình: **Quán trà** (mái cong, đèn lồng đỏ, rèm tre, hiên, bảng hiệu), **Nhà ở**, **Sạp hạt giống**, **Hải đăng**. Có cửa để vào quán và nhà (có thể dùng chuyển cảnh nội thất hoặc mái nhà trong suốt khi người chơi vào trong).
- [ ] Cây to (thông, anh đào), bụi cây, đá, hàng rào tự nối, chậu hoa, đèn đá.
- [ ] Biển mây: lớp mây cuộn chậm, mây trôi ở tiền cảnh và hậu cảnh tạo chiều sâu.
- [ ] **Va chạm** với nhà, cây, đá, hàng rào, mép đảo (không rơi khỏi đảo).
- [ ] Bảng màu dùng chung, đúng mục 1.1-B.

**Tiêu chí hoàn thành**
- Không còn hình khối placeholder trong cảnh.
- Đi khắp đảo không kẹt, không xuyên vật thể, không rơi khỏi đảo.
- Ảnh chụp màn hình nhìn "giống một game Stardew-like thật sự".

**Kịch bản kiểm tra:** đi dọc toàn bộ mép đảo; thử đi xuyên mọi công trình; vào/ra quán trà và nhà.

---

## Giai đoạn 3 — Nhân vật & điều khiển

**Mục tiêu:** điều khiển nhân vật "sướng tay" như Stardew (brief mục 6 và 1.1-D).

**Việc cần làm**
- [ ] Sprite người chơi 16×32, đi 4 hướng × 4 frame, idle 2 frame, tốc độ animation khớp tốc độ di chuyển.
- [ ] Di chuyển chéo được chuẩn hóa tốc độ; trượt dọc theo vật cản thay vì dừng cứng.
- [ ] **Con trỏ ô (tile cursor):** ô phía trước người chơi được viền sáng, cho biết sẽ tương tác ô nào. Hỗ trợ cả chuột (click vào ô trong tầm 1 ô quanh người chơi).
- [ ] Hotbar `1–9` + lăn chuột để đổi ô. Công cụ: cuốc, bình tưới, giỏ hái, hạt giống.
- [ ] Animation dùng công cụ (cuốc, tưới, hái) 2–4 frame, khóa di chuyển trong lúc thực hiện.
- [ ] `E`/`Space` tương tác theo ngữ cảnh, có gợi ý nhỏ (ví dụ "E: Nói chuyện") khi đứng gần đối tượng.

**Tiêu chí hoàn thành**
- Di chuyển mượt, animation đúng hướng, không trượt chân (foot sliding) rõ rệt.
- Luôn biết chắc mình đang tương tác ô nào.

**Kịch bản kiểm tra:** đi 8 hướng, áp sát và trượt dọc tường; đổi hết các ô hotbar; dùng từng công cụ ở 4 hướng.

---

## Giai đoạn 4 — Thời gian, ngày đêm, lưu game

**Mục tiêu:** nhịp một ngày đúng brief mục 3, 4.7, 9 và ánh sáng mục 1.1-G.

**Việc cần làm**
- [ ] Đồng hồ 6:00 → 24:00, 1 ngày ≈ 12 phút thực, tăng theo bước 10 phút như Stardew. Tạm dừng khi mở menu, hội thoại, màn pha trà.
- [ ] Lớp tint toàn màn hình đổi màu mượt theo giờ (sáng vàng nhạt → trưa trung tính → hoàng hôn cam hồng → đêm xanh tím).
- [ ] Nguồn sáng ban đêm: đèn lồng, cửa sổ, đèn đá là quầng sáng pixel cộng màu, tự bật khi trời tối.
- [ ] Ngủ trên giường → màn hình tối dần → **tóm tắt cuối ngày** (thu nhập, công thức mới, tim tăng) → sáng hôm sau.
- [ ] Quá 24:00 tự ngủ gục, mất 10% tiền tối đa 50 Xu Mây (phạt nhẹ).
- [ ] Save khi ngủ vào `localStorage`, có **phiên bản dữ liệu save** (`saveVersion`) để sau này nâng cấp không hỏng save cũ.
- [ ] Màn hình tiêu đề: **Tiếp tục / Chơi mới / Cài đặt**.

**Tiêu chí hoàn thành**
- Tải lại trang sau khi ngủ → mọi thứ y như cũ.
- Chuyển màu ngày đêm không giật, ban đêm đèn sáng rõ.

**Kịch bản kiểm tra:** dùng F5 tua từng giờ quan sát ánh sáng; ngủ → reload trang → kiểm tra dữ liệu; thức đến 24:00.

---

## Giai đoạn 5 — Trồng trọt

**Mục tiêu:** hoàn chỉnh brief mục 4.1.

**Việc cần làm**
- [ ] Cuốc đất trên vùng đồi trà (8×6 ô) → đất cuốc. Gieo hạt → cây giai đoạn 0. Tưới → đất sẫm màu.
- [ ] Mỗi sáng: ô đã tưới thì cây lớn thêm, đất trở lại khô. Không tưới thì cây đứng yên, **không chết**.
- [ ] 5 cây: **Trà xanh, Hoa cúc, Bạc hà, Hoa nhài, Gừng**, mỗi cây 4 sprite giai đoạn khác nhau rõ, có hiệu ứng lay nhẹ.
- [ ] Cây trà xanh thu hoạch **nhiều lần** (mọc lại sau vài ngày); các cây khác thu 1 lần.
- [ ] Cây chín có dấu hiệu nhận biết (lấp lánh nhẹ hoặc hoa nở).
- [ ] Hiệu ứng: đất văng khi cuốc, giọt nước khi tưới, lá bay khi thu hoạch, icon vật phẩm bay vào túi.
- [ ] Trạng thái từng ô được lưu.

**Tiêu chí hoàn thành:** trồng và thu hoạch đủ 5 loại cây qua nhiều ngày, reload không mất trạng thái.

**Kịch bản kiểm tra:** trồng mỗi loại 2 ô, chỉ tưới 1 ô; F6 qua ngày nhiều lần; so sánh 2 ô; thu hoạch; reload.

---

## Giai đoạn 6 — Chế biến

**Mục tiêu:** hoàn chỉnh brief mục 4.2.

**Việc cần làm**
- [ ] **Nong tre phơi lá:** đặt lá tươi vào → sau 1 ngày thành lá khô. Có sprite nong đang phơi và đã xong.
- [ ] **Chảo sao:** mini-game giữ thanh nhiệt trong vùng xanh vài giây (giữ phím/chuột để tăng nhiệt, nhả để giảm). Kết quả chất lượng ★ / ★★ / ★★★, không bao giờ thất bại hoàn toàn.
- [ ] Chất lượng ★ được lưu theo vật phẩm trong túi đồ và ảnh hưởng giá bán, độ vui của khách.
- [ ] Vật phẩm cùng loại cùng chất lượng thì gộp chồng (stack).

**Tiêu chí hoàn thành:** chế biến ra đủ 3 mức chất lượng; túi đồ hiển thị đúng sao.

**Kịch bản kiểm tra:** phơi lá rồi qua ngày; chơi mini-game sao cố tình kém / vừa / giỏi.

---

## Giai đoạn 7 — Pha trà & Sổ Công Thức

**Mục tiêu:** cơ chế chính của game, brief mục 4.3.

**Việc cần làm**
- [ ] Màn pha trà riêng, nhìn từ trên xuống quầy, chọn bằng chuột: nguyên liệu chính → 0–2 phụ liệu → nhiệt độ nước → thời gian ủ.
- [ ] Hoạt cảnh rót nước, hơi bốc, màu trà thay đổi theo công thức.
- [ ] 5 công thức trong brief. Đúng công thức → trà có tên; sai → "Trà lạ".
- [ ] Lần đầu pha ra công thức mới → hiệu ứng "Công thức mới!" và ghi vào **Sổ Công Thức** (chưa mở thì hiện "???" kèm gợi ý mơ hồ).
- [ ] Chất lượng trà = trung bình chất lượng nguyên liệu.

**Tiêu chí hoàn thành:** pha được cả 5 công thức và "Trà lạ"; Sổ Công Thức cập nhật và được lưu.

**Kịch bản kiểm tra:** dùng F9 lấy nguyên liệu, pha lần lượt 5 công thức + 1 công thức sai, reload kiểm tra Sổ.

---

## Giai đoạn 8 — Quán trà & khách

**Mục tiêu:** brief mục 4.4.

**Việc cần làm**
- [ ] Biển "Mở cửa / Đóng cửa" ở quán. Quán hoạt động 14:00–20:00.
- [ ] 3–6 khách mỗi buổi, đi bộ từ bến mây vào, ngồi vào bàn trống, hiện bong bóng order.
- [ ] Order bằng **lời gợi ý mơ hồ** (ví dụ "Hôm nay lạnh lẽo quá..." → Trà Gừng Ấm), dữ liệu gợi ý nằm trong `src/data/`.
- [ ] Phục vụ: cầm trà đến bàn và tương tác. Đúng → tiền + biểu cảm vui; sai → vẫn trả tiền ít hơn, biểu cảm hơi buồn.
- [ ] Kiên nhẫn rất cao, khách không bỏ về.
- [ ] Khách vãng lai ngẫu nhiên (vài kiểu ngoại hình) + 4 NPC chính thỉnh thoảng ghé.

**Tiêu chí hoàn thành:** một buổi chiều chạy trọn vẹn từ mở cửa đến khách cuối rời đi.

**Kịch bản kiểm tra:** mở quán, phục vụ đúng 2 khách, sai 1 khách, để 1 khách chờ lâu; kiểm tra tiền.

---

## Giai đoạn 9 — NPC, hội thoại, thân thiết

**Mục tiêu:** brief mục 4.5 và 1.1-D.

**Việc cần làm**
- [ ] 4 NPC với sprite riêng biệt và **lịch trình hằng ngày** (sáng ở đâu, chiều ở đâu, tối ở đâu). Mưa thì đổi lịch.
- [ ] Hộp thoại khung gỗ, chân dung 64×64 với 3 biểu cảm, chữ chạy từng ký tự, bấm để chạy nhanh/qua câu.
- [ ] Hội thoại hằng ngày thay đổi theo ngày, thời tiết, mức tim (không lặp lại liên tục).
- [ ] Hệ thống tim 0–10: nói chuyện mỗi ngày +nhỏ, tặng quà / phục vụ trà yêu thích +lớn. Có món thích / bình thường / ghét.
- [ ] Đoạn ký ức ở mốc **2 / 5 / 8 / 10 tim** cho cả 4 NPC (ít nhất mốc 2 và 5 phải có nội dung đầy đủ trong MVP).
- [ ] Màn **Quan hệ** trong menu: chân dung + số tim từng NPC.

**Tiêu chí hoàn thành:** đạt mốc 2 tim với 4 NPC và xem được đoạn ký ức tương ứng.

**Kịch bản kiểm tra:** theo dõi một NPC trong cả ngày; tặng quà thích và ghét; dùng phím debug tăng tim để xem các đoạn ký ức.

---

## Giai đoạn 10 — Kinh tế, cửa hàng, nâng cấp

**Mục tiêu:** brief mục 4.6.

**Việc cần làm**
- [ ] Cửa hàng Bé Sương: mua hạt giống, mật ong, đồ trang trí. Mở cửa theo giờ.
- [ ] Hộp bán hàng (thùng gỗ cạnh nhà): bỏ vật phẩm vào, tiền được tính khi qua ngày (như Stardew).
- [ ] Nâng cấp: bình tưới lớn (tưới 3 ô), thêm bàn trong quán (tối đa 3 → 5), mở rộng đồi trà.
- [ ] Đồ trang trí đặt được (đèn lồng, chậu cây, chuông gió) ở vị trí cho phép.
- [ ] Bảng giá nằm trong `src/data/`, dễ cân bằng.

**Tiêu chí hoàn thành:** mua, bán, nâng cấp và đặt trang trí đều hoạt động và được lưu.

**Kịch bản kiểm tra:** F7 lấy tiền, mua mỗi loại nâng cấp, đặt 3 món trang trí, reload.

---

## Giai đoạn 11 — Thời tiết & hiệu ứng

**Mục tiêu:** brief mục 4.7 và 1.1-F.

**Việc cần làm**
- [ ] Dự báo thời tiết ngày mai (ví dụ trên tờ báo/radio trong nhà).
- [ ] **Mưa:** hạt mưa pixel xiên, vũng nước gợn, tự tưới mọi ô, ánh sáng tối hơn, ít khách hơn.
- [ ] **Sương mù:** biển mây dâng lên mép đảo, tầm nhìn mờ nhẹ, không khí huyền ảo.
- [ ] Hiệu ứng môi trường: cỏ cây lay, bướm, chim, cánh hoa rơi, khói ống khói, hơi ấm trà, đom đóm ban đêm.
- [ ] "Juice": số tiền nảy lên, rung nhẹ khi cuốc, hiệu ứng lấp lánh khi đạt mốc tim.
- [ ] Giới hạn số particle để giữ FPS.

**Tiêu chí hoàn thành:** cả 3 kiểu thời tiết nhìn khác biệt rõ ràng; FPS ổn định ≥ 55 trên máy tầm trung.

**Kịch bản kiểm tra:** F8 đổi qua lại 3 loại thời tiết vào ban ngày và ban đêm, theo dõi FPS ở overlay F3.

---

## Giai đoạn 12 — UI hoàn thiện & âm thanh

**Mục tiêu:** brief mục 7, 8 và 1.1-H.

**Việc cần làm**
- [ ] Toàn bộ UI dùng khung gỗ/giấy da 9-slice pixel art, sắc nét, scale theo bội số nguyên.
- [ ] HUD: đồng hồ có mặt trời/mặt trăng xoay, ngày, thời tiết, tiền.
- [ ] Túi đồ dạng lưới, kéo thả để sắp xếp, tooltip (tên, mô tả, ★).
- [ ] Font pixel **hiển thị đúng 100% tiếng Việt có dấu** (kiểm tra các chữ: ầ ẩ ẫ ậ ằ ẳ ẵ ặ ề ể ễ ệ ồ ổ ỗ ộ ờ ở ỡ ợ ừ ử ữ ự ỳ ỷ ỹ ỵ đ Đ).
- [ ] Menu Cài đặt: âm lượng nhạc, âm lượng SFX, toàn màn hình.
- [ ] Nhạc nền lo-fi/acoustic khác nhau cho ban ngày, ban đêm, trời mưa (Web Audio API hoặc file âm thanh tự tạo).
- [ ] SFX: bước chân (khác nhau trên cỏ/gỗ/đá), cuốc, tưới, rót trà, chuông gió, bíp hội thoại, mở menu, nhận tiền.

**Tiêu chí hoàn thành:** mọi màn hình UI đồng bộ một phong cách; không có chữ tiếng Việt bị lỗi; âm thanh chỉnh được.

**Kịch bản kiểm tra:** mở lần lượt mọi màn hình UI, chụp màn hình so sánh phong cách; hiển thị chuỗi kiểm tra dấu tiếng Việt ở trên.

---

## Giai đoạn 13 — Cốt truyện & nội dung mùa Xuân

**Mục tiêu:** biến các hệ thống thành một trải nghiệm có đầu có cuối (brief mục 2).

**Việc cần làm**
- [ ] **Mở đầu:** cảnh khinh khí cầu/thuyền mây đến đảo, đọc lá thư của bà, quán trà phủ bụi.
- [ ] **Hướng dẫn lồng vào cốt truyện** trong 3 ngày đầu (Bé Sương dạy trồng trọt, lá thư thứ hai dạy pha trà...). Không dùng bảng hướng dẫn dài.
- [ ] **Dọn dẹp quán** ở ngày 1–2 (nhặt lá rụng, lau bàn) để mở khóa chức năng quán.
- [ ] Lịch 28 ngày mùa Xuân: ít nhất **1 lễ hội** (ví dụ Lễ Thả Đèn Mây ngày 24) và các sự kiện nhỏ rải rác.
- [ ] Các lá thư của bà được tìm thấy dần, kể câu chuyện về quán.
- [ ] **Kết thúc mùa Xuân:** cảnh tổng kết (số trà đã pha, khách đã phục vụ, tim NPC) và cho phép chơi tiếp tự do.

**Tiêu chí hoàn thành:** một người chơi mới có thể chơi từ đầu tới ngày 28 mà không cần ai hướng dẫn và không bị kẹt.

**Kịch bản kiểm tra:** chơi mới hoàn toàn 3 ngày đầu không dùng phím debug; dùng F6 nhảy tới lễ hội và ngày 28.

---

## Giai đoạn 14 — Cân bằng, QA, tối ưu, phát hành

**Mục tiêu:** đạt **toàn bộ checklist mục 10** trong `GAME_BRIEF.md`.

**Việc cần làm**
- [ ] Cân bằng: giá hạt, giá trà, thời gian lớn của cây sao cho tới ngày 28 mua được hầu hết nâng cấp nhưng không quá dễ.
- [ ] Rà lỗi: kẹt nhân vật, mất vật phẩm, save hỏng, hội thoại lặp, chữ tràn khung.
- [ ] Tối ưu: gộp geometry tĩnh, texture atlas, không tạo object mới mỗi frame, kiểm tra rò rỉ bộ nhớ khi chơi lâu.
- [ ] Ẩn toàn bộ phím debug ở bản build production.
- [ ] Cập nhật `README.md`: giới thiệu, ảnh chụp màn hình, cách chạy, điều khiển.
- [ ] `npm run build` → test bản `dist/` bằng `npm run preview`.
- [ ] Đánh dấu toàn bộ checklist mục 10 của brief, ghi vào `PROGRESS.md`.

**Tiêu chí hoàn thành:** mọi ô checklist mục 10 trong brief đã được đánh dấu và người dùng xác nhận.

---

## Mẫu `PROGRESS.md`

```markdown
# PROGRESS — Trà Quán Trên Mây

## Giai đoạn hiện tại
Phase X — <tên> (Đang làm / Chờ xác nhận / Xong)

## Lịch sử
| Phase | Trạng thái | Ngày | Ghi chú |
|---|---|---|---|
| 0 | Xong | 2026-11-19 | ... |

## Đánh giá hệ thống (cập nhật liên tục)
| Hệ thống | Trạng thái | Ghi chú |
|---|---|---|
| Render pixel 2.5D | Một phần | Chưa pixel snap |
| Trồng trọt | Có nhưng lỗi | ... |

## Lỗi đã biết
- ...

## Câu hỏi cho người dùng
- ...
```

---

## Câu lệnh mẫu để giao việc cho Argon 4

Bắt đầu:
> Đọc `GAME_BRIEF.md` và `ROADMAP.md`. Thực hiện **Giai đoạn 0** theo đúng quy tắc ở mục 0 của ROADMAP. Xong thì dừng lại báo cáo.

Các lần sau:
> Giai đoạn trước OK. Đọc `PROGRESS.md` rồi thực hiện **Giai đoạn N** trong `ROADMAP.md`. Xong thì dừng lại báo cáo.

Khi có lỗi:
> Giai đoạn N chưa đạt: <mô tả lỗi>. Sửa cho đạt tiêu chí hoàn thành, chưa sang giai đoạn tiếp theo.

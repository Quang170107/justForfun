# PROGRESS — Trà Quán Trên Mây

## Giai đoạn hiện tại
Phase 8 — Quán trà & khách (Xong, chờ xác nhận)

## Lịch sử
| Phase | Trạng thái | Ngày | Ghi chú |
|---|---|---|---|
| 0 | Xong | 2026-11-18 | Khởi tạo git, sửa `README.md` UTF-8, thêm Debug Overlay (`F3`) và phím debug dev (`F5`–`F9`), đối chiếu hệ thống `src/` với `GAME_BRIEF.md` và `ROADMAP.md` |
| 1 | Xong | 2026-11-19 | Hoàn thiện Y-Billboard chuẩn 1:1 texel (`1/cos(40°)`), screen-space pixel snapping, camera lerp mượt, xoay camera 90° ~0.3s, đồng bộ hướng nhìn 4 góc, hàm tiện ích chung trong `pixelArtGenerator.ts` |
| 2 | Xong | 2026-11-19 | Tách bản đồ `src/data/islandMap.ts`, auto-tile 4 hướng (đá, gỗ, đất trồng), vách đảo 2.5D có rễ/dây leo, mái ngói Á Đông xếp lớp ngang + cửa vào/ra Nhà ở & Quán trà làm mờ mái lộ nội thất, hàng rào tự nối 4 hướng, đá/chậu hoa/đèn đá, bỏ khối hộp vàng trơn hải đăng |
| 3 | Xong | 2026-11-19 | Khớp animation bước chân theo quãng đường thực, chuẩn hóa 8 hướng + trượt dọc tường & lách góc, con trỏ ô (`tile cursor`), click chuột trong tầm 1 ô, lăn chuột đổi hotbar, animation công cụ 3 frame 4 hướng kèm khóa di chuyển và gợi ý ngữ cảnh `[E]` |
| 4 | Xong | 2026-11-19 | Màn hình tiêu đề (Tiếp tục / Chơi mới / Cài đặt), ánh sáng ngày đêm mượt & quầng sáng cửa sổ shoji/đèn đêm, ngủ tối màn hình + bảng Tóm tắt cuối ngày, phạt nhẹ 10% tối đa 50 Xu Mây khi quá 24:00, hệ thống `SaveSystem` có `saveVersion: 2` & migration |
| 5 | Xong | 2026-11-19 | Hoàn thiện vòng trồng 5 cây (4 giai đoạn), Trà Xanh thu hoạch nhiều lần mọc lại sau 2 ngày, dấu hiệu lấp lánh pixel `sparkle_pixel` khi cây chín, hiệu ứng lá bay & icon bay vào túi khi thu hoạch |
| 6 | Xong | 2026-11-19 | Hoàn thiện chế biến: Nong tre 3 trạng thái sprite (trống / đang phơi / đã xong có sao lấp lánh `sparkle_pixel`), mini-game Chảo sao điều khiển bằng cả giữ phím (`Space`/`W`/`↑`) và chuột, đủ 3 mức chất lượng `★ / ★★ / ★★★` ảnh hưởng giá bán/độ vui và gộp chồng theo cùng loại & cùng chất lượng |
| 7 | Xong | 2026-11-22 | Hoàn thiện màn Pha trà nhìn từ trên xuống (`#brew-stage-canvas`) có hoạt cảnh rót nước, đổi màu theo 5 công thức & Trà Lạ, hơi bốc & sao mở khóa, ẩn công thức chưa mở (`???` + gợi ý mơ hồ), hiệu ứng "CÔNG THỨC MỚI!", chất lượng trung bình nguyên liệu, và cập nhật `F9` hỗ trợ test đủ 5 công thức + Trà Lạ |
| 8 | Xong | 2026-11-23 | Hoàn thiện Quán trà & khách: biển Mở/Đóng cửa (`14:00–20:00`), Bến Mây phía Nam đảo, 4 kiểu khách vãng lai ngẫu nhiên + 4 NPC chính đi từ Bến Mây vào bàn không cắt xuyên bàn, dữ liệu order gợi ý mơ hồ ở `src/data/customers.ts`, bong bóng order/chờ lâu/vui/buồn + chân dung 3 biểu cảm, phục vụ đúng/sai trả tiền tương ứng & khách chờ lâu không bỏ về |

## Đánh giá hệ thống (cập nhật liên tục)
| Hệ thống | Trạng thái | Ghi chú |
|---|---|---|
| Khung dự án & Build (`package.json`, `tsconfig.json`, `vite.config.ts`) | Có | Build `tsc && vite build` sạch, `.gitignore` bỏ qua `node_modules/`, `dist/`, `.vite/` |
| Debug Overlay & Phím Debug (`F3`, `F5`–`F9`) | Có | Chỉ bật khi `import.meta.env.DEV`; hiển thị FPS, tọa độ, ô nhắm, giờ, thời tiết |
| Render pixel 2.5D (`src/core/Game.ts`, `src/art/*`) | Có | RenderTarget `480×270` `NearestFilter`, scale bội số nguyên khi resize, `OrthographicCamera` 40° (1 ô = 16 px), camera lerp + screen-space pixel snap, xoay 90° mượt 0.3s, Y-billboard + bóng elip, helper tạo texture/billboard dùng chung |
| Thế giới & Tileset (`src/world/*`, `src/data/islandMap.ts`) | Có | Bản đồ 2D tách dữ liệu, auto-tile rìa đá/gỗ/đất 4 hướng, vách đảo 2.5D + dây leo/rễ cây, biển mây 4 phía, Quán trà & Nhà ở có cửa vào/ra làm mờ mái lộ nội thất, Sạp hạt giống & Hải đăng kính pixel, hàng rào tự nối 4 hướng, đá/chậu hoa/đèn đá, va chạm kín toàn đảo |
| Nhân vật & Điều khiển (`src/entities/Player.ts`, `src/core/InputSystem.ts`) | Có | Sprite 16×32 đi 4 hướng × 4 frame + idle 2 frame khớp quãng đường thực (không foot sliding), chuẩn hóa 8 hướng + trượt dọc tường/góc, con trỏ ô (`tile cursor`) hỗ trợ click chuột 1 ô, hotbar `1–9` + lăn chuột, animation công cụ 3 frame khóa di chuyển, gợi ý ngữ cảnh `[E]` |
| Thời gian, Ngày đêm, Lưu game (`src/core/TimeSystem.ts`, `src/core/SaveSystem.ts`) | Có | Đồng hồ 6:00–24:00 (bước 10 phút, tạm dừng khi mở UI), tint ngày đêm mượt + đèn lồng/cửa sổ/đèn đá phát sáng cộng màu, màn hình tiêu đề (Tiếp tục / Chơi mới / Cài đặt), fade ngủ + Tóm tắt cuối ngày, tự ngủ gục 24:00 phạt 10% tối đa 50 Xu Mây, `localStorage` có `saveVersion: 2` & migration từ v1 |
| Trồng trọt (`src/systems/FarmingSystem.ts`, `src/world/Tiles.ts`, `src/data/crops.ts`) | Có | Đủ 5 cây trồng 4 giai đoạn (lay gió), cuốc/gieo/tưới/thu hoạch, cây không tưới đứng yên không chết, mưa tự tưới, Trà xanh thu nhiều lần (`regrowDays: 2`), cây chín lấp lánh, đất văng/giọt nước/lá bay & icon bay vào túi, lưu trạng thái từng ô |
| Chế biến (`src/systems/ProcessingSystem.ts`, `src/ui/BrewingScreen.ts`) | Có | Nong tre phơi lá 1 ngày (3 sprite trống / đang phơi / đã xong + sao lấp lánh), mini-game Chảo sao giữ phím `Space`/`W`/`↑` hoặc chuột ra chất lượng ★–★★★ không thất bại, lưu & gộp chồng theo chất lượng ảnh hưởng giá bán và độ vui khách |
| Pha trà & Sổ Công Thức (`src/systems/BrewingSystem.ts`, `src/data/recipes.ts`, `src/ui/BrewingScreen.ts`) | Có | Màn pha trà nhìn từ trên xuống bằng pixel canvas (`#brew-stage-canvas`) có hoạt cảnh rót nước, đổi màu theo công thức, hơi bốc, 5 công thức + Trà Lạ, Sổ Công Thức ẩn `???` kèm gợi ý, hiệu ứng "CÔNG THỨC MỚI!", chất lượng = trung bình nguyên liệu và lưu trong `localStorage` |
| Quán trà & Khách (`src/systems/ShopSystem.ts`, `src/entities/Customer.ts`, `src/data/customers.ts`) | Có | Biển Mở/Đóng quán (`14:00–20:00`), Bến Mây phía Nam, 4–6 khách mỗi buổi gồm 4 ngoại hình khách vãng lai + 4 NPC chính, lộ trình vào/ra từ Bến Mây, bong bóng pixel (`bubble_order`/`waiting`/`happy`/`sad`), order gợi ý mơ hồ từ `src/data/`, phục vụ đúng/sai trả Xu Mây + biểu cảm tương ứng và kiên nhẫn cao không bỏ về |
| NPC, Hội thoại, Thân thiết (`src/entities/NPC.ts`, `src/systems/RelationshipSystem.ts`, `src/data/*`) | Một phần | Đã có 4 NPC riêng, chân dung 64×64 (3 biểu cảm), chữ chạy kèm bíp, mốc ký ức 2/5/8/10 tim; thiếu lịch trình sáng/chiều/tối đổi theo mưa và hội thoại biến thiên theo thời tiết/tim (Phase 9) |
| Kinh tế, Cửa hàng, Nâng cấp (`src/systems/ShopSystem.ts`, `src/ui/ShopAndMenuModal.ts`) | Một phần | Đã có Sạp Bé Sương mua hạt/mật ong, nâng cấp bình tưới 3 ô, bàn thứ 4, mở rộng đồi, trang trí; thiếu hộp bán hàng qua đêm, đặt trang trí tùy vị trí, nâng tối đa 5 bàn, tách toàn bộ bảng giá vào `src/data/` (Phase 10) |
| Thời tiết & Hiệu ứng (`src/systems/WeatherSystem.ts`) | Một phần | Đã có Nắng/Mưa/Sương mù, mưa xiên, vũng nước, bướm, cánh hoa, khói, đom đóm; thiếu dự báo thời tiết ngày mai, số tiền nảy lên và rung nhẹ khi cuốc (Phase 11) |
| UI & Âm thanh (`src/ui/*`, `src/core/AudioSystem.ts`) | Một phần | Đã có khung gỗ giấy da Stardew, đồng hồ mặt trời/trăng, tooltip, nhạc & SFX Web Audio; thiếu kéo thả túi đồ, slider âm lượng tách nhạc/SFX, nhạc riêng ngày/đêm/mưa và bước chân theo bề mặt (Phase 12) |
| Cốt truyện & Nội dung mùa Xuân (`src/data/dialogues.ts`) | Một phần | Đã có lá thư bà ngoại mở đầu; thiếu cảnh mở đầu thuyền mây, hướng dẫn lồng 3 ngày đầu, dọn quán, Lễ Thả Đèn Mây ngày 24 và tổng kết ngày 28 (Phase 13) |

## Lỗi đã biết
- Không có lỗi TypeScript hay lỗi biên dịch.
- Lưu ý trong `ShopSystem.ts`: bảng giá nâng cấp (`SHOP_UPGRADES`) hiện đang đặt trong `src/systems/ShopSystem.ts`, cần chuyển sang `src/data/` ở Phase 10 theo nguyên tắc tách dữ liệu khỏi logic.

## Câu hỏi cho người dùng
- Chưa có câu hỏi chặn tiến độ. Sau khi xác nhận Giai đoạn 8, tôi sẽ chuyển sang **Giai đoạn 9 — NPC, hội thoại, thân thiết**.

import { NpcId, StoryState } from './types';

export interface CleanupSpotDef {
  id: string;
  label: string;
  kind: 'leaves' | 'dust';
  x: number;
  z: number;
}

export interface GrandmaLetterDef {
  id: string;
  order: number;
  title: string;
  unlockHint: string;
  lines: string[];
}

export interface SpringCalendarEvent {
  day: number;
  id: string;
  title: string;
  shortTag: string;
  kind: 'story' | 'mini' | 'festival' | 'finale';
  description: string;
}

/**
 * 5 điểm bụi & lá rụng ngoài hiên Quán Trà — nằm ở các khoảng trống giữa bàn trà,
 * không đè lên collider bàn (Row 1 tại z=-0.35, Row 2 tại z=1.65) hay biển mở quán (x=2.5, z=-1.6).
 */
export const CLEANUP_SPOTS: CleanupSpotDef[] = [
  { id: 'dust_leaves_1', label: 'Quét đống lá khô ngoài hiên Tây', kind: 'leaves', x: 3.1, z: 0.55 },
  { id: 'dust_leaves_2', label: 'Quét lá rụng giữa sân hiên trà', kind: 'leaves', x: 5.5, z: 0.55 },
  { id: 'dust_leaves_3', label: 'Quét lá khô góc hiên Đông', kind: 'leaves', x: 7.9, z: 0.55 },
  { id: 'dust_spot_1', label: 'Lau bụi gỗ hiên trước Quầy Trà', kind: 'dust', x: 4.3, z: -1.75 },
  { id: 'dust_spot_2', label: 'Lau vết bụi ván gỗ bên phải cửa quán', kind: 'dust', x: 6.7, z: -1.75 },
];

export const GRANDMA_LETTERS: GrandmaLetterDef[] = [
  {
    id: 'letter_1_welcome',
    order: 1,
    title: 'Lá Thư #1 — Chào Mừng Lên Đảo Mây',
    unlockHint: 'Nhận khi đặt chân lên Đảo Trà Trên Mây vào Ngày 1.',
    lines: [
      'Gửi cháu thương yêu,',
      'Khi cháu đọc được lá thư này, chiếc Thuyền Mây nhỏ chắc vừa đưa cháu cập Bến Mây của đảo.',
      'Quán trà đã ngủ yên nhiều năm nên hiên gỗ giờ còn phủ bụi và lá khô. Trước tiên cháu hãy ra Đồi Trà xới luống, gieo hạt tưới nước, rồi giúp bà quét dọn sạch 5 chỗ lá bụi trên hiên quán nhé!',
      'Đừng vội vàng — cứ từ từ làm quen từng góc đảo, bà gửi lại đây cuốn sổ và túi hạt giống đầu mùa.',
      '— Bà ngoại của cháu 🍵',
    ],
  },
  {
    id: 'letter_2_brewing',
    order: 2,
    title: 'Lá Thư #2 — Bí Quyết Phơi, Sao & Pha Trà',
    unlockHint: 'Dọn sạch 5 điểm lá bụi trên hiên Quán Trà (hoặc nhận sáng Ngày 2).',
    lines: [
      'Cháu yêu quý,',
      'Nhìn hiên quán sáng bóng sạch sẽ thế kia, hẳn cơn gió mây cũng reo vui thay cho bà!',
      'Từ giờ cháu đã có thể vào Quầy Pha Trà (bên trong mái ngói đỏ) để ủ nên những tách trà đầu tiên. Nếu thu được lá Trà Xanh tươi, hãy đem phơi qua 1 đêm trên Nong Tre hoặc giữ lửa xanh trên Chảo Sao để tạo thành Trà Sao Thơm thượng hạng.',
      'Chiều từ 14:00 đến 20:00, hãy lật Biển Mở Quán trên hiên gỗ đón những người bạn đầu tiên từ Bến Mây nhé!',
      '— Bà ngoại 🌿',
    ],
  },
  {
    id: 'letter_3_guests',
    order: 3,
    title: 'Lá Thư #3 — Bốn Người Bạn Giữa Tầng Mây',
    unlockHint: 'Phục vụ vị khách đầu tiên tại Quán Trà (hoặc nhận sáng Ngày 7).',
    lines: [
      'Gửi cháu chủ quán nhỏ,',
      'Vậy là tách trà đầu tiên của cháu đã mang lại hơi ấm cho khách ghé Bến Mây rồi!',
      'Trên hòn đảo này có bốn tri kỷ cũ của quán: bé Mây hay quên thích Trà Nhài Đêm, bác Cò Lữ ưa vị Trà Bạc Hà Mát, ông Đăng ngoài hải đăng mê Trà Gừng Ấm, còn cô bé Bé Sương lại khoái Trà Cúc Mật Ong.',
      'Hãy lắng nghe tâm sự và trò chuyện với họ mỗi ngày — hương trà đúng vị sẽ đánh thức những ký ức ngủ sâu đấy.',
      '— Bà ngoại 💛',
    ],
  },
  {
    id: 'letter_4_lanterns',
    order: 4,
    title: 'Lá Thư #4 — Đêm Hội Thả Đèn Mây Ngày 24',
    unlockHint: 'Nhặt lá thư cũ rơi trên lối đá ra Hải Đăng (hoặc nhận sáng Ngày 20).',
    lines: [
      'Cháu thương,',
      'Lá thư này ngày xưa bà đánh rơi lúc ra ngắm ngọn Hải Đăng cùng ông Đăng...',
      'Vào ngày 24 mùa Xuân hằng năm, cả đảo sẽ cùng tụ họp dưới sân hiên quán tổ chức Lễ Thả Đèn Mây, gửi ước nguyện bình an trôi theo biển mây bát ngát.',
      'Nếu kịp chuẩn bị, cháu hãy treo thêm vài chiếc Đèn Lồng hay Chuông Gió cho quán thật rực rỡ trước đêm hội nhé!',
      '— Bà ngoại 🏮',
    ],
  },
  {
    id: 'letter_5_spring_end',
    order: 5,
    title: 'Lá Thư #5 — Hương Xuân Ở Lại Mãi Trên Đảo',
    unlockHint: 'Tham gia Lễ Thả Đèn Mây Ngày 24 hoặc hoàn tất Mùa Xuân Ngày 28.',
    lines: [
      'Gửi người giữ lửa Trà Quán Trên Mây,',
      'Chứng kiến cháu tự tay gây dựng lại vườn trà xanh mướt, mở từng bàn trà ấm áp và gắn kết mọi người bạn trên đảo suốt mùa Xuân này — bà thật sự mãn nguyện lắm.',
      'Mùa Xuân 28 ngày chỉ là khởi đầu đẹp đẽ. Quán trà, vườn đồi và những tách trà thơm vẫn sẽ mãi ở đây đợi cháu tiếp tục viết nên câu chuyện tự do của riêng mình.',
      'Thương cháu thật nhiều! — Bà ngoại 🌸🍵',
    ],
  },
];

export const SPRING_CALENDAR_EVENTS: SpringCalendarEvent[] = [
  {
    day: 1,
    id: 'day1_arrival',
    title: 'Ngày 1: Cập Bến Mây & Gặp Bé Sương',
    shortTag: 'Thuyền Mây',
    kind: 'story',
    description: 'Đáp Thuyền Mây xuống đảo, gặp Bé Sương làm quen trồng trà & dọn dẹp hiên quán.',
  },
  {
    day: 2,
    id: 'day2_brewing_unlock',
    title: 'Ngày 2: Lá Thư Pha Trà & Nong Phơi',
    shortTag: 'Thư Pha Trà',
    kind: 'story',
    description: 'Nhận hướng dẫn sơ chế lá trà trên Nong tre, Chảo sao & pha tách trà đầu tiên.',
  },
  {
    day: 3,
    id: 'day3_ong_dang_visit',
    title: 'Ngày 3: Ông Đăng Chia Sẻ Chuyện Đảo',
    shortTag: 'Ông Đăng',
    kind: 'story',
    description: 'Ông Đăng kể về Hộp Bán Hàng Qua Đêm, lịch mở quán chiều và đêm hội sắp tới.',
  },
  {
    day: 6,
    id: 'day6_sakura_bloom',
    title: 'Ngày 6: Sáng Hoa Anh Đào Nở Rộ',
    shortTag: 'Hoa Đào',
    kind: 'mini',
    description: 'Cánh hoa anh đào rợp đảo! Bé Sương gửi tặng thêm Hạt Hoa Cúc đầu vụ.',
  },
  {
    day: 12,
    id: 'day12_migratory_birds',
    title: 'Ngày 12: Ngày Chim Di Cư Ghé Bến',
    shortTag: 'Chim Di Cư',
    kind: 'mini',
    description: 'Cò Lữ mang tin bạn bay từ phương xa và nhặt được manh mối Lá Thư #4 gần Hải Đăng.',
  },
  {
    day: 18,
    id: 'day18_honey_market',
    title: 'Ngày 18: Phiên Chợ Mật Ong Tầng Mây',
    shortTag: 'Mật Ong',
    kind: 'mini',
    description: 'Bé Sương tặng 2 hũ Mật Ong Rừng Mây ★★ giúp pha Trà Cúc & Trà Gừng thơm lừng.',
  },
  {
    day: 24,
    id: 'day24_lantern_festival',
    title: 'Ngày 24: Lễ Hội Thả Đèn Mây',
    shortTag: 'Lễ Đèn Mây',
    kind: 'festival',
    description: 'Sự kiện lớn mùa Xuân! Tới Đài Đèn Mây phía Nam hiên quán cùng 4 NPC thả đèn lên trời đêm.',
  },
  {
    day: 28,
    id: 'day28_spring_finale',
    title: 'Ngày 28: Tổng Kết Mùa Xuân',
    shortTag: 'Kết Xuân',
    kind: 'finale',
    description: 'Khép lại hành trình 28 ngày mùa Xuân với bảng kỷ niệm & mở ra chế độ chơi tự do.',
  },
];

export const INTRO_SLIDES = [
  {
    caption:
      'Chiếc Thuyền Mây nhẹ nhàng lướt qua biển mây hồng phấn sáng sớm, mang theo lá thư cũ và một hạt mầm hy vọng...',
    buttonText: '⛵ Cập Bến Đảo Mây →',
  },
  {
    caption:
      'Trước mắt bạn là Đảo Trà Trên Mây rợp bóng thông và anh đào, nơi Trà Quán của bà ngoại đang lặng lẽ chờ được thắp sáng trở lại.',
    buttonText: '✉️ Mở Lá Thư Đầu Tiên →',
  },
];

export const DAY1_BE_SUONG_DIALOGUE = [
  {
    speaker: 'Bé Sương',
    npcId: 'be_suong' as NpcId,
    expression: 'happy' as const,
    text: 'Á! Cuối cùng cũng có người tới tiếp quản Trà Quán Trên Mây rồi! Em là Bé Sương ở sạp hạt giống phía Tây đây ạ!',
  },
  {
    speaker: 'Bé Sương',
    npcId: 'be_suong' as NpcId,
    expression: 'normal' as const,
    text: 'Để khởi động nhẹ nhàng hôm nay: anh/chị chọn Cuốc (phím 1) cuốc đất ngoài Đồi Trà, gieo hạt (phím 4–6) rồi tưới nước bằng Bình tưới (phím 2) nhé!',
  },
  {
    speaker: 'Bé Sương',
    npcId: 'be_suong' as NpcId,
    expression: 'happy' as const,
    text: 'Sau đó qua hiên gỗ Quán Trà nhấn [E] quét giúp em 5 đống lá khô & bụi bặm để mở khóa Quầy Pha Trà nha. Chúc ngày đầu thật vui!',
  },
];

export const DAY3_ONG_DANG_DIALOGUE = [
  {
    speaker: 'Ông Đăng',
    npcId: 'ong_dang' as NpcId,
    expression: 'normal' as const,
    text: 'Chào cháu! Hai hôm nay thấy khói bếp với tiếng quét dọn bên quán trà, lão ngoài hải đăng cũng thấy vui lây.',
  },
  {
    speaker: 'Ông Đăng',
    npcId: 'ong_dang' as NpcId,
    expression: 'happy' as const,
    text: 'Nhớ mẹo nhỏ này nhé: nông sản hay lá trà dư cứ bỏ vào Hộp Bán Hàng Qua Đêm cạnh hông Nhà Ở, sáng hôm sau thương buôn sẽ tự thanh toán Xu Mây cho cháu.',
  },
  {
    speaker: 'Ông Đăng',
    npcId: 'ong_dang' as NpcId,
    expression: 'normal' as const,
    text: 'À, ngày 24 tháng Xuân này cả đảo có Lễ Thả Đèn Mây lớn nhất năm đấy — đừng bỏ lỡ nhé!',
  },
];

export const LANTERN_FESTIVAL_WISHES = [
  {
    name: 'Mây',
    wish: '"Mong cho ngọn đèn nhỏ này soi sáng những mảnh ký ức dịu êm, và giữ mãi mùi hoa nhài nơi quán trà!"',
  },
  {
    name: 'Cò Lữ',
    wish: '"Cầu gió tầng mây luôn hiền hòa dưới đôi cánh di cư, để năm nào ta cũng được bay về uống trà cùng mọi người."',
  },
  {
    name: 'Ông Đăng',
    wish: '"Chúc ngọn hải đăng chẳng bao giờ tắt lửa, và Trà Quán Trên Mây ngày một tấp nập tiếng cười."',
  },
  {
    name: 'Bé Sương',
    wish: '"Ước cho đồi trà xanh tốt quanh năm, mùa nào hoa cũng nở rộ và khách ghé quán đông kín cả 5 bàn!"',
  },
];

export function createDefaultStoryState(): StoryState {
  return {
    introCompleted: false,
    teahouseCleaned: false,
    cleanedSpots: [],
    unlockedLetters: ['letter_1_welcome'],
    seenEvents: [],
    lanternFestivalDone: false,
    springCompleted: false,
    totalTeasBrewed: 0,
    totalCustomersServed: 0,
    totalMoneyEarned: 0,
  };
}

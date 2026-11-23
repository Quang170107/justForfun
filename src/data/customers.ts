import { NPCS } from './npcs';
import { RECIPES } from './recipes';
import { GuestAppearanceId, NpcId } from './types';

export interface GuestProfileDef {
  id: GuestAppearanceId;
  name: string;
  role: string;
  happyLine: string;
  sadLine: string;
  waitingLine: string;
}

export const GUEST_APPEARANCE_POOL: GuestAppearanceId[] = [
  'guest_traveler',
  'guest_poet',
  'guest_painter',
  'guest_merchant',
];

export const GUEST_PROFILES: Record<GuestAppearanceId, GuestProfileDef> = {
  guest_traveler: {
    id: 'guest_traveler',
    name: 'Khách Lữ Hành',
    role: 'Người đi thuyền mây phương xa',
    happyLine: 'Đúng tách trà tôi hằng nhớ trên đường đi rồi! Cảm ơn chủ quán nhiều lắm!',
    sadLine: 'Hmm... hơi khác hương vị tôi tưởng một chút, nhưng uống vẫn ấm lòng giữa biển mây.',
    waitingLine: 'Đường bay xa nên hơi mệt một chút... nhưng không sao, tôi vẫn kiên nhẫn chờ được.',
  },
  guest_poet: {
    id: 'guest_poet',
    name: 'Thi Sĩ Mây',
    role: 'Người chép thơ bên tầng mây trắng',
    happyLine: 'Ôi chao! Hương trà quyện làn mây thế này, đủ cảm hứng viết thêm ba bài thơ nữa!',
    sadLine: 'Vị này hơi lạ với điều tôi thầm mơ... nhưng tấm lòng pha trà thật đáng quý.',
    waitingLine: 'Tôi đang ngắm mây tìm vần thơ... phiền chủ quán pha cho tôi sớm chút nhé.',
  },
  guest_painter: {
    id: 'guest_painter',
    name: 'Họa Sĩ Lang Thang',
    role: 'Người vẽ lại các hòn đảo trôi',
    happyLine: 'Sắc trà đẹp tựa nắng hoàng hôn! Hôm nay bức ký họa của tôi hoàn hảo rồi!',
    sadLine: 'Màu nước hơi khác sắc vị tôi mong... nhưng vẫn rất êm dịu, cảm ơn bạn.',
    waitingLine: 'Cọ vẽ đã sẵn sàng mà họng hơi khát rồi... nhưng tôi cứ ngồi ngắm quán chờ thêm cũng vui.',
  },
  guest_merchant: {
    id: 'guest_merchant',
    name: 'Thương Nhân Bến Mây',
    role: 'Chủ thuyền hàng ghé nghỉ chân',
    happyLine: 'Tuyệt hảo! Đúng vị tôi cần sau cả buổi neo thuyền bến mây!',
    sadLine: 'Vị trà này chưa đúng gu lắm... thôi tôi vẫn gửi chút Xu Mây cảm ơn công pha chế.',
    waitingLine: 'Thuyền neo ngoài bến lâu rồi, bụng hơi cồn cào chút... mong sớm có tách trà ấm.',
  },
};

export const RECIPE_ORDER_HINTS: Record<string, string[]> = {
  recipe_green_pure: [
    'Một tách trà mộc mạc, thanh nhẹ, không thêm hương vị cầu kỳ...',
    'Tôi chỉ muốn uống chút trà xanh thanh dịu cho nhẹ lòng sau chuyến đi.',
  ],
  recipe_chrysanthemum_honey: [
    'Thèm một tách trà vàng rực hương hoa hòa quyện mật ong ngọt thanh...',
    'Có món trà nào mang hương hoa ngoài vườn cùng chút ngọt dịu của mật ong không?',
  ],
  recipe_mint_cool: [
    'Bay qua tầng gió khô cổ họng quá, cần tách trà gì thật xanh mát sảng khoái...',
    'Giá mà có tách trà xanh thoang thoảng vị bạc hà mát rượi thì tuyệt lắm.',
  ],
  recipe_jasmine_night: [
    'Tôi muốn tách trà sao đậm đà quyện hương hoa trắng nở về đêm, ủ thật kỹ...',
    'Nghe đồn quán có món trà sao thơm kết hợp hoa nhài hương đêm sâu lắng lắm.',
  ],
  recipe_ginger_warm: [
    'Hôm nay tôi thấy lạnh lẽo quá, giá mà có tách trà cay ấm quyện mật ong xua tan sương...',
    'Gió trên bến mây thổi lạnh buốt cả tay, cho tôi tách trà thật sôi, cay nồng ấm bụng nhé.',
  ],
};

export function pickVagueOrderHint(recipeId: string, npcId: NpcId | null): string {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (npcId && recipe && recipe.resultItemId === NPCS[npcId].favoriteTea) {
    const hints = NPCS[npcId].orderHints;
    return hints[Math.floor(Math.random() * hints.length)];
  }
  const pool = RECIPE_ORDER_HINTS[recipeId] ?? recipe?.hints ?? ['Cho tôi một tách trà ấm nhé!'];
  return pool[Math.floor(Math.random() * pool.length)];
}

import { NpcDef, NpcId } from './types';
import { NPC_MEMORIES } from './dialogues';

export const NPCS: Record<NpcId, NpcDef> = {
  may: {
    id: 'may',
    name: 'Mây',
    role: 'Linh hồn nhỏ lạc giữa biển mây',
    favoriteTea: 'cup_jasmine_night',
    likedItems: ['jasmine_fresh', 'jasmine_dried', 'tea_roasted', 'cup_green_pure'],
    dislikedItems: ['ginger_fresh', 'ginger_dried', 'cup_ginger_warm', 'cup_mystery_tea'],
    giftReactions: {
      loved: 'Ôi, Trà Nhài Đêm! Mùi hoa nhài trắng này... cảm ơn cậu nhiều lắm, tim tớ ấm hẳn lên rồi!',
      liked: 'Cảm ơn cậu nha! Hương thơm thanh nhẹ này làm tớ dễ chịu vô cùng.',
      neutral: 'Ồ, món này là tặng tớ sao? Cảm ơn cậu đã nghĩ tới tớ nhé.',
      disliked: 'Á... mùi này hơi nồng cay quá, linh hồn mây như tớ hơi khó quen được...',
    },
    homePos: { x: 9.8, z: -2.2 },
    patrolPoints: [
      { x: 9.8, z: -2.2 },
      { x: 9.4, z: 0.4 },
      { x: 10.6, z: 1.0 },
      { x: 9.2, z: -3.0 },
    ],
    schedule: {
      morning: {
        label: 'Bãi cỏ Đông (ngắm mây sáng)',
        points: [
          { x: 9.8, z: -2.2 },
          { x: 9.4, z: 0.4 },
          { x: 10.6, z: 1.0 },
        ],
      },
      afternoon: {
        label: 'Bến Mây & trước hiên quán',
        points: [
          { x: 5.3, z: 5.4 },
          { x: 4.8, z: 3.4 },
          { x: 6.4, z: 3.0 },
        ],
      },
      evening: {
        label: 'Ngắm đèn gần Hải Đăng',
        points: [
          { x: 8.6, z: 2.8 },
          { x: 9.2, z: 4.4 },
          { x: 8.0, z: 1.2 },
        ],
      },
      rainy: {
        label: 'Trú mưa dưới mái hiên Trà Quán',
        points: [
          { x: 4.3, z: -2.6 },
          { x: 5.8, z: -2.6 },
        ],
      },
    },
    dailyLines: [
      'Gió hôm nay mềm như bông ấy... nhưng tớ vẫn chẳng nhớ mình từ đâu tới.',
      'Mỗi khi nghe tiếng ấm trà sôi, tim tớ lại rung lên như chuông gió.',
      'Cậu thấy đám mây hồng phía xa kia không? Đôi khi nó giống nụ cười lắm.',
    ],
    orderHints: [
      'Mùi hương hoa trắng và lá trà sao thơm... hình như gắn với một cái tên...',
      'Cho tớ tách trà thật êm, có hương hoa nở về đêm và vị trà sao đậm...',
    ],
    memories: NPC_MEMORIES.may,
  },

  co_lu: {
    id: 'co_lu',
    name: 'Cò Lữ',
    role: 'Chim cò di cư mang chuyện muôn phương',
    favoriteTea: 'cup_mint_cool',
    likedItems: ['mint_fresh', 'mint_dried', 'leaf_green_tea_fresh', 'leaf_green_tea_dried', 'cup_green_pure'],
    dislikedItems: ['honey', 'chrysanthemum_fresh', 'chrysanthemum_dried', 'cup_mystery_tea'],
    giftReactions: {
      loved: 'Khà khà! Trà Bạc Hà Mát đây rồi! Đúng vị thanh mát giúp cánh ta nhẹ tênh giữa biển mây!',
      liked: 'Cảm ơn cậu bạn trẻ! Vị thảo mộc tự nhiên thế này hợp khẩu vị dân bay lượn lắm!',
      neutral: 'Ồ, đa tạ cậu đã có lòng tặng món quà nhỏ này.',
      disliked: 'Chà... vị ngọt gắt quá, cổ họng chim di cư như ta uống xong dễ khát nước lắm...',
    },
    homePos: { x: -7.5, z: 4.5 },
    patrolPoints: [
      { x: -7.5, z: 4.5 },
      { x: -4.8, z: 4.0 },
      { x: -8.6, z: 2.0 },
    ],
    schedule: {
      morning: {
        label: 'Cạnh đồi trà phía Tây Nam',
        points: [
          { x: -7.5, z: 4.5 },
          { x: -4.8, z: 4.0 },
          { x: -8.6, z: 2.0 },
        ],
      },
      afternoon: {
        label: 'Bến Mây đón gió Nam',
        points: [
          { x: 5.3, z: 5.8 },
          { x: 3.4, z: 4.4 },
          { x: 3.8, z: 3.2 },
        ],
      },
      evening: {
        label: 'Dạo dọc lối đá giữa đảo',
        points: [
          { x: 1.5, z: -2.2 },
          { x: 1.5, z: 2.0 },
          { x: 3.2, z: -2.4 },
        ],
      },
      rainy: {
        label: 'Trú mưa dưới hiên Nhà Ở',
        points: [
          { x: -2.4, z: -3.2 },
          { x: -1.2, z: -3.2 },
        ],
      },
    },
    dailyLines: [
      'Khà khà, sáng nay ta bay qua vùng hồ sương tím, mây đọng trên lông cánh lạnh buốt!',
      'Bà ngoại cậu ngày trước hay pha cho ta một ấm trà thơm mát trước mỗi chuyến bay dài.',
      'Đôi chân tuy gầy nhưng ta đã đặt bước qua bảy tầng mây cao rồi đấy!',
    ],
    orderHints: [
      'Bay suốt từ dãy núi xa tới đây cổ họng khô quá, cần vị gì thật mát lành...',
      'Có tách trà nào thoang thoảng mùi gió xanh mát rượi không nhỉ?',
    ],
    memories: NPC_MEMORIES.co_lu,
  },

  ong_dang: {
    id: 'ong_dang',
    name: 'Ông Đăng',
    role: 'Người gác hải đăng mây kỳ cựu',
    favoriteTea: 'cup_ginger_warm',
    likedItems: ['ginger_fresh', 'ginger_dried', 'tea_roasted', 'honey'],
    dislikedItems: ['mint_fresh', 'mint_dried', 'cup_mint_cool', 'cup_mystery_tea'],
    giftReactions: {
      loved: 'Chà! Trà Gừng Ấm! Đúng thứ ta khoái nhất — uống một ngụm là ấm rực cả người lên!',
      liked: 'Hừm, đồ ngon đấy! Cầm đi trực đêm ở hải đăng thì không gì bằng. Cảm ơn cháu!',
      neutral: 'Ừm, cảm ơn tấm lòng của cháu nhé.',
      disliked: 'Hừm... lạnh bụng lắm cháu ơi! Lão già gác đêm kỵ mấy món the lạnh này lắm.',
    },
    homePos: { x: 1.4, z: -2.4 },
    patrolPoints: [
      { x: 1.4, z: -2.4 },
      { x: -1.4, z: -2.4 },
      { x: 1.4, z: 1.6 },
    ],
    schedule: {
      morning: {
        label: 'Đi kiểm tra lối đá giữa đảo',
        points: [
          { x: 1.4, z: -2.4 },
          { x: -1.4, z: -2.4 },
          { x: 1.4, z: 1.6 },
        ],
      },
      afternoon: {
        label: 'Lối sang Bến Mây & Hải Đăng',
        points: [
          { x: 6.4, z: 4.5 },
          { x: 8.6, z: 4.5 },
          { x: 7.4, z: 3.6 },
        ],
      },
      evening: {
        label: 'Trực đèn tại Hải Đăng Mây',
        points: [
          { x: 9.2, z: 5.2 },
          { x: 8.5, z: 5.4 },
          { x: 9.4, z: 3.8 },
        ],
      },
      rainy: {
        label: 'Trú mưa bên hiên Trà Quán',
        points: [
          { x: 6.8, z: -2.6 },
          { x: 7.8, z: -2.6 },
        ],
      },
    },
    dailyLines: [
      'Hừm! Đèn hải đăng tối nào cũng phải sáng, kẻo mấy con tàu mây lạc bến.',
      'Đừng có thức khuya quá 24 giờ, gió đêm trên đảo độc lắm đấy thanh niên.',
      'Trà của quán hồi bà cháu còn mở, uống một ngụm là ấm tới tận xương cốt.',
    ],
    orderHints: [
      'Hôm nay tôi thấy lạnh lẽo quá, gió biển mây cứ thổi buốt cả tay...',
      'Trên ngọn hải đăng sương xuống dày lắm, giá mà có tách trà cay nóng ngọt dịu.',
    ],
    memories: NPC_MEMORIES.ong_dang,
  },

  be_suong: {
    id: 'be_suong',
    name: 'Bé Sương',
    role: 'Cô bé bán hạt giống vui vẻ',
    favoriteTea: 'cup_chrysanthemum_honey',
    likedItems: ['chrysanthemum_fresh', 'chrysanthemum_dried', 'honey', 'jasmine_fresh'],
    dislikedItems: ['ginger_fresh', 'ginger_dried', 'cup_ginger_warm', 'cup_mystery_tea'],
    giftReactions: {
      loved: 'Oa!! Trà Cúc Mật Ong ngọt thơm đúng gu cháu luôn! Cảm ơn anh chị chủ quán nhiều thật nhiều!',
      liked: 'Hihi, cháu thích hương hoa ngọt ngào này lắm! Cảm ơn anh chị nha!',
      neutral: 'Cháu cảm ơn quà của anh chị nhé!',
      disliked: 'Ái... cay nồng hoặc lạ vị quá à, cháu chưa uống quen mấy vị gắt đâu...',
    },
    homePos: { x: -8.2, z: -3.1 },
    patrolPoints: [
      { x: -8.2, z: -3.1 },
      { x: -7.2, z: -2.5 },
      { x: -8.9, z: -2.2 },
    ],
    schedule: {
      morning: {
        label: 'Đứng bán ở Sạp Hạt Giống',
        points: [
          { x: -8.2, z: -3.1 },
          { x: -7.2, z: -2.5 },
          { x: -8.9, z: -2.2 },
        ],
      },
      afternoon: {
        label: 'Thăm vườn trà & dạo lối chính',
        points: [
          { x: -4.2, z: -2.5 },
          { x: -0.6, z: -2.5 },
          { x: -5.4, z: 0.6 },
        ],
      },
      evening: {
        label: 'Thu dọn Sạp Hạt Giống',
        points: [
          { x: -7.2, z: -2.8 },
          { x: -6.2, z: -2.7 },
          { x: -8.4, z: -2.8 },
        ],
      },
      rainy: {
        label: 'Trú mưa dưới mái che Sạp Hạt Giống',
        points: [
          { x: -8.3, z: -3.4 },
          { x: -7.5, z: -3.4 },
        ],
      },
    },
    dailyLines: [
      'Chào anh chị chủ quán! Hôm nay hạt giống tươi rói luôn nè, ghé sạp xem đi!',
      'Cháu nghe nói nếu chăm tưới mỗi sáng, đồi trà sẽ thơm nức cả đảo đó!',
      'Lúc nào quán mở cửa, cháu nhất định ghé xin một ly trà ngọt lịm nha!',
    ],
    orderHints: [
      'Cháu thèm một ly trà vàng ươm ngọt lịm hương hoa ngoài vườn!',
      'Hôm nay trời nắng đẹp, uống gì có vị hoa và mật ong thật thích.',
    ],
    memories: NPC_MEMORIES.be_suong,
  },
};

import { NpcDef, NpcId } from './types';
import { NPC_MEMORIES } from './dialogues';

export const NPCS: Record<NpcId, NpcDef> = {
  may: {
    id: 'may',
    name: 'Mây',
    role: 'Linh hồn nhỏ lạc giữa biển mây',
    favoriteTea: 'cup_jasmine_night',
    homePos: { x: 10.5, z: -2.2 },
    patrolPoints: [
      { x: 10.5, z: -2.2 },
      { x: 8.8, z: 0.4 },
      { x: 11.4, z: 2.0 },
      { x: 9.2, z: -3.2 },
    ],
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
    homePos: { x: -7.5, z: 4.5 },
    patrolPoints: [
      { x: -7.5, z: 4.5 },
      { x: -4.5, z: 4.0 },
      { x: -8.6, z: 1.8 },
      { x: -5.2, z: 5.8 },
    ],
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
    homePos: { x: 9.2, z: 5.2 },
    patrolPoints: [
      { x: 9.2, z: 5.2 },
      { x: 8.4, z: 5.5 },
      { x: 9.5, z: 3.8 },
      { x: 7.4, z: 4.5 },
    ],
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
    homePos: { x: -8.2, z: -3.2 },
    patrolPoints: [
      { x: -8.2, z: -3.2 },
      { x: -7.2, z: -2.4 },
      { x: -8.9, z: -2.0 },
    ],
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

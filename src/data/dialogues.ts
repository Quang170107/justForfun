import { MemoryCutscene, NpcId } from './types';

export const GRANDMA_LETTER_LINES = [
  'Gửi cháu thương yêu,',
  'Khi cháu đọc được lá thư này, có lẽ gió tầng mây đã đưa cháu lên hòn đảo nhỏ của bà.',
  'Quán trà đã ngủ yên nhiều năm, nhưng luống đất ngoài vườn vẫn đợi hạt mầm mới.',
  'Hãy trồng lại trà xanh, hoa cúc, bạc hà, hoa nhài và gừng; lắng nghe câu chuyện của những người bạn quanh đảo.',
  'Mỗi buổi chiều từ 14:00 đến 20:00 hãy mở quán đón khách nhé. Đừng vội vàng, ở trên mây không có gì phải gấp cả.',
  '— Bà ngoại của cháu 🍵',
];

export const NPC_MEMORIES: Record<NpcId, MemoryCutscene[]> = {
  may: [
    {
      heartsRequired: 2,
      title: 'Ký ức: Đóm sáng trong sương',
      lines: [
        {
          speaker: 'Mây',
          expression: 'sad',
          text: 'Khi uống ngụm trà ấm của cậu, tớ bỗng thấy một khung cửa sổ gỗ và tiếng mưa rơi lộp bộp...',
        },
        {
          speaker: 'Mây',
          expression: 'normal',
          text: 'Ngày trước tớ từng là người pha hương hoa nhài cho bà ngoại cậu sao? Hay là một giấc mơ?',
        },
        {
          speaker: 'Mây',
          expression: 'happy',
          text: 'Dù sao thì ở cạnh quán trà này, tớ không còn thấy cô đơn nữa. Cảm ơn cậu nhé!',
        },
      ],
      rewardItem: { itemId: 'seed_jasmine', count: 3, quality: 2 },
    },
    {
      heartsRequired: 5,
      title: 'Ký ức: Tên gọi từ ngàn mây',
      lines: [
        {
          speaker: 'Mây',
          expression: 'happy',
          text: 'Tớ nhớ ra rồi! Tên thật của tớ ngày xưa là Hạ Miên — tinh linh sinh ra từ hơi trà bốc lên trong đêm trăng.',
        },
        {
          speaker: 'Mây',
          expression: 'normal',
          text: 'Nhưng tớ vẫn thích cái tên "Mây" mà mọi người trên đảo gọi hơn.',
        },
      ],
      rewardMoney: 120,
    },
    {
      heartsRequired: 8,
      title: 'Ký ức: Khúc hát ru tầng không',
      lines: [
        {
          speaker: 'Mây',
          expression: 'happy',
          text: 'Mỗi đêm cậu thắp đèn lồng ngoài hiên quán, ánh sáng ấy dẫn đường cho bao linh hồn nhỏ tìm thấy bình yên.',
        },
      ],
      rewardMoney: 180,
    },
    {
      heartsRequired: 10,
      title: 'Ký ức: Trọn vẹn dưới mái hiên',
      lines: [
        {
          speaker: 'Mây',
          expression: 'happy',
          text: 'Từ giờ quán trà không bao giờ vắng bóng ấm hương nữa. Tớ sẽ mãi ở lại đây cùng cậu!',
        },
      ],
      rewardMoney: 300,
    },
  ],

  co_lu: [
    {
      heartsRequired: 2,
      title: 'Ký ức: Tấm bản đồ cánh chim',
      lines: [
        {
          speaker: 'Cò Lữ',
          expression: 'normal',
          text: 'Ta từng bay lạc trong cơn bão sương năm năm trước, tưởng chừng không thể cất cánh nữa.',
        },
        {
          speaker: 'Cò Lữ',
          expression: 'happy',
          text: 'Chính mùi trà bạc hà thoang thoảng từ hòn đảo này đã kéo ta hạ cánh xuống hiên gỗ. Ta tặng cậu ít hạt giống quý ta nhặt được!',
        },
      ],
      rewardItem: { itemId: 'seed_mint', count: 4, quality: 2 },
    },
    {
      heartsRequired: 5,
      title: 'Ký ức: Bức thư phương Bắc',
      lines: [
        {
          speaker: 'Cò Lữ',
          expression: 'happy',
          text: 'Đàn cò bạn ta bảo chưa có quán trà nào ở chín tầng mây pha êm như quán của cậu đâu!',
        },
      ],
      rewardMoney: 100,
    },
    {
      heartsRequired: 8,
      title: 'Ký ức: Quà tặng phương xa',
      lines: [
        {
          speaker: 'Cò Lữ',
          expression: 'happy',
          text: 'Trong túi hành trang này, thứ quý nhất chính là những câu chuyện ta đem về kể bên tách trà.',
        },
      ],
      rewardMoney: 160,
    },
    {
      heartsRequired: 10,
      title: 'Ký ức: Chốn dừng chân mãi mãi',
      lines: [
        {
          speaker: 'Cò Lữ',
          expression: 'happy',
          text: 'Dù có bay tới chân trời nào, hòn đảo trà quán này luôn là nhà của lão Cò Lữ này.',
        },
      ],
      rewardMoney: 260,
    },
  ],

  ong_dang: [
    {
      heartsRequired: 2,
      title: 'Ký ức: Ngọn đèn bão cũ',
      lines: [
        {
          speaker: 'Ông Đăng',
          expression: 'sad',
          text: 'Hừm... hồi quán trà đóng cửa, cả hòn đảo tối om, ta cứ thắp mãi ngọn đèn hải đăng chờ người quay về.',
        },
        {
          speaker: 'Ông Đăng',
          expression: 'happy',
          text: 'Thấy khói bếp quán trà lại bay lên, lão già này nhẹ cả lòng. Cầm lấy ít mật ong ngon để pha trà nhé!',
        },
      ],
      rewardItem: { itemId: 'honey', count: 3, quality: 3 },
    },
    {
      heartsRequired: 5,
      title: 'Ký ức: Chuyến tàu cuối cùng',
      lines: [
        {
          speaker: 'Ông Đăng',
          expression: 'normal',
          text: 'Ngày trẻ ta cũng là thủy thủ vượt biển mây. Sau cùng chỉ có bình yên trên đảo mới giữ nổi bước chân ta.',
        },
      ],
      rewardMoney: 130,
    },
    {
      heartsRequired: 8,
      title: 'Ký ức: Ánh sáng hải đăng',
      lines: [
        {
          speaker: 'Ông Đăng',
          expression: 'happy',
          text: 'Ngọn hải đăng và quán trà như hai anh em gác đảo vậy, thiếu một bên là đảo buồn ngay.',
        },
      ],
      rewardMoney: 200,
    },
    {
      heartsRequired: 10,
      title: 'Ký ức: Tri kỷ bên ấm trà gừng',
      lines: [
        {
          speaker: 'Ông Đăng',
          expression: 'happy',
          text: 'Cảm ơn cháu vì đã thổi lại hơi ấm cho cả hòn đảo già nua này!',
        },
      ],
      rewardMoney: 300,
    },
  ],

  be_suong: [
    {
      heartsRequired: 2,
      title: 'Ký ức: Chiếc giỏ hạt giống đầu tiên',
      lines: [
        {
          speaker: 'Bé Sương',
          expression: 'happy',
          text: 'Anh chị biết không, chính bà ngoại anh chị đã dạy cháu cách phân biệt từng loại hạt trà đấy!',
        },
        {
          speaker: 'Bé Sương',
          expression: 'normal',
          text: 'Cháu đã giữ những hạt hoa cúc đẹp nhất để chờ ngày quán trà mở lại.',
        },
      ],
      rewardItem: { itemId: 'seed_chrysanthemum', count: 3, quality: 2 },
    },
    {
      heartsRequired: 5,
      title: 'Ký ức: Giấc mơ khu vườn hoa',
      lines: [
        {
          speaker: 'Bé Sương',
          expression: 'happy',
          text: 'Mai mốt cháu muốn trồng hoa khắp mép đảo để từ xa nhìn tới đảo mình rực rỡ như bó hoa giữa mây!',
        },
      ],
      rewardMoney: 90,
    },
    {
      heartsRequired: 8,
      title: 'Ký ức: Bí quyết ươm mầm',
      lines: [
        {
          speaker: 'Bé Sương',
          expression: 'happy',
          text: 'Anh chị là chủ vườn tuyệt nhất đảo! Hạt giống nào qua tay anh chị cũng nở hoa rạng rỡ!',
        },
      ],
      rewardMoney: 150,
    },
    {
      heartsRequired: 10,
      title: 'Ký ức: Người bạn lớn của Sương',
      lines: [
        {
          speaker: 'Bé Sương',
          expression: 'happy',
          text: 'Quán trà bây giờ đông vui hơn cả trong chuyện cổ tích! Cháu thích ở đây mãi thôi!',
        },
      ],
      rewardMoney: 250,
    },
  ],
};

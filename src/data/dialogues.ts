import { MemoryCutscene, NpcId } from './types';

export interface NpcDialoguePool {
  lowHeart: string[];
  midHeart: string[];
  highHeart: string[];
  rainy: string[];
  foggy: string[];
  evening: string[];
}

export const GRANDMA_LETTER_LINES = [
  'Gửi cháu thương yêu,',
  'Khi cháu đọc được lá thư này, có lẽ gió tầng mây đã đưa cháu lên hòn đảo nhỏ của bà.',
  'Quán trà đã ngủ yên nhiều năm, nhưng luống đất ngoài vườn vẫn đợi hạt mầm mới.',
  'Hãy trồng lại trà xanh, hoa cúc, bạc hà, hoa nhài và gừng; lắng nghe câu chuyện của những người bạn quanh đảo.',
  'Mỗi buổi chiều từ 14:00 đến 20:00 hãy mở quán đón khách nhé. Đừng vội vàng, ở trên mây không có gì phải gấp cả.',
  '— Bà ngoại của cháu 🍵',
];

export const NPC_CONTEXT_DIALOGUES: Record<NpcId, NpcDialoguePool> = {
  may: {
    lowHeart: [
      'Gió hôm nay mềm như bông ấy... nhưng tớ vẫn chẳng nhớ mình từ đâu tới.',
      'Mỗi khi nghe tiếng ấm trà sôi, tim tớ lại rung lên như chuông gió.',
      'Cậu thấy đám mây hồng phía xa kia không? Đôi khi nó giống một nụ cười lắm.',
    ],
    midHeart: [
      'Ở gần cậu, đám sương quanh tớ hình như cũng ấm áp hẳn lên đó!',
      'Hôm nay mùi trà xanh bay từ vườn sang tận bãi cỏ, làm tớ nhớ mang máng tiếng cười xưa.',
      'Tớ thích nhất là nhìn khói bếp của quán trà cuộn tròn lên trời mỗi buổi trưa.',
    ],
    highHeart: [
      'Cảm ơn cậu vì đã lắng nghe một linh hồn hay quên như tớ suốt thời gian qua!',
      'Mỗi khi nghe cậu pha trà nhài, tớ không còn thấy sợ màn đêm trống trải nữa.',
      'Đảo Trà Trên Mây giờ đã thật sự là nhà của tớ rồi.',
    ],
    rainy: [
      'Mưa trên mây rơi nghe tí tách thích ghê... tớ ghé hiên quán tránh ướt áo chút nha.',
      'Trời mưa thế này, chỉ mong được hít hà hương ấm trà nóng bốc khói bên cửa sổ.',
      'Hạt mưa chạm vào tay tớ mát lạnh, làm các mảnh ký ức cứ lung linh như thủy tinh vậy.',
    ],
    foggy: [
      'Sương mù dâng lên dày quá... may mà vẫn nhìn thấy mái ngói đỏ của quán trà.',
      'Trong biển sương trắng, mùi hoa nhài càng trở nên rõ ràng hơn bao giờ hết.',
      'Cậu đi cẩn thận kẻo lạc giữa tầng mây mù nhé, tớ sẽ tỏa sáng chút xíu chỉ đường cho!',
    ],
    evening: [
      'Đèn lồng trước hiên và ngọn hải đăng về đêm sáng lên đẹp như sao sa vậy.',
      'Khi mặt trời lặn, không khí tĩnh lặng làm tớ nghe rõ cả tiếng côn trùng trên thảm cỏ.',
      'Buổi tối mà có tách trà ấm trong tay thì mọi nỗi buồn đều tan biến hết.',
    ],
  },

  co_lu: {
    lowHeart: [
      'Khà khà, sáng nay ta bay qua vùng hồ sương tím, mây đọng trên lông cánh lạnh buốt!',
      'Bà ngoại cậu ngày trước hay pha cho ta một ấm trà thơm mát trước mỗi chuyến bay dài.',
      'Đôi chân tuy gầy nhưng ta đã đặt bước qua bảy tầng mây cao rồi đấy!',
    ],
    midHeart: [
      'Hôm nay thấy cậu tất bật ngoài vườn, dáng vẻ hệt như bà ngoại cậu hồi trẻ!',
      'Bến Mây phía Nam dạo này đông thuyền ghé lắm, tiếng đồn về quán trà lan xa rồi!',
      'Bay mỏi cánh chỉ mong hạ xuống khoảng cỏ xanh mát của đồi trà này nghỉ chân.',
    ],
    highHeart: [
      'Ta đi khắp chín tầng mây, chẳng nơi nào có tách trà bạc hà thanh dịu bằng nơi này!',
      'Bao giờ có dịp, ta sẽ kể cậu nghe trọn bộ nhật ký bay vượt biển mây phương Bắc.',
      'Thấy quán trà tấp nập trở lại, lão Cò này mừng tới rụng cả chiếc lông đuôi!',
    ],
    rainy: [
      'Ướt cánh thế này bay không nổi đâu, cho ta đứng nhờ dưới hiên nhà chút nhé!',
      'Mưa nhẹ giúp đám cây trên đồi đỡ khát, người làm vườn cũng đỡ vất vả một hôm.',
      'Nghe tiếng mưa lộp bộp trên mái ngói gỗ, nhớ mấy chặng trú mưa dọc đường di cư ghê.',
    ],
    foggy: [
      'Sương dày thế này tầm nhìn giảm hẳn, bay mà không có đèn hải đăng thì dễ lạc lắm!',
      'Trong sương mù, hương bạc hà và trà sao từ quán bay ra là hoa tiêu tốt nhất.',
      'Hôm nay sương lạnh, nhớ pha thêm chút trà nóng đón khách phương xa nhé cháu.',
    ],
    evening: [
      'Chiều tà gió dịu hẳn xuống, dạo bước trên lối đá nghe tiếng bước chân thật thanh bình.',
      'Hoàng hôn qua mặt biển mây nhuộm hồng cả bộ lông trắng của ta rồi này!',
      'Tối nay đàn chim phương Đông chắc cũng đang tìm đảo cao để nghỉ ngơi qua đêm.',
    ],
  },

  ong_dang: {
    lowHeart: [
      'Hừm! Đèn hải đăng tối nào cũng phải sáng, kẻo mấy con tàu mây lạc bến.',
      'Đừng có thức khuya quá 24 giờ, gió đêm trên đảo độc lắm đấy thanh niên.',
      'Trà của quán hồi bà cháu còn mở, uống một ngụm là ấm tới tận xương cốt.',
    ],
    midHeart: [
      'Hừm... cháu coi bộ cũng có tay trồng trọt đấy, luống trà trông xanh mướt hẳn lên.',
      'Sáng nay ta đi kiểm tra lối đá quanh đảo, thấy con đường sạch sẽ mát mắt ra phết.',
      'Có lúc rảnh mang tách trà gừng nóng ra hải đăng ngồi ngắm mây, ta kể chuyện biển cho nghe.',
    ],
    highHeart: [
      'Lâu rồi lão già này mới lại thấy lòng ấm áp như thời còn tàu mây cập bến mỗi chiều.',
      'Cháu đừng khách sáo với lão. Hải đăng sáng thì đảo còn bình yên, quán mở thì đảo có hồn!',
      'Bà ngoại cháu hẳn tự hào lắm khi thấy quán trà nhỏ giờ đông bạn hiền thế này.',
    ],
    rainy: [
      'Chà, mưa gió tạt ướt râu rồi! Để ta ghé mái hiên quán trà trú tạm một lát.',
      'Trời mưa ẩm thế này khớp gối hơi nhức... giá có tách trà gừng sôi thì hết ý.',
      'Dù mưa bão cũng đừng lo, đèn dầu trong hải đăng lúc nào cũng cháy ổn định!',
    ],
    foggy: [
      'Sương đặc quánh thế này mà thiếu ngọn hải đăng thì tàu hàng đâm lạc hết mất!',
      'Mỗi sáng sương mù, ta phải lau kỹ kính hải đăng hơn bình thường gấp đôi.',
      'Trời mù sương uống trà nóng vừa giữ ấm vừa tỉnh táo trông bến bãi.',
    ],
    evening: [
      'Tới giờ ta đứng gác ngọn hải đăng rồi. Ánh đèn vàng kia sẽ quét suốt biển đêm.',
      'Đêm xuống trên đảo yên ả thật, chỉ còn tiếng gió lùa qua tán thông và tiếng chuông.',
      'Nhớ đóng cửa nghỉ ngơi trước nửa đêm kẻo ngã bệnh giữa đảo nhé cháu!',
    ],
  },

  be_suong: {
    lowHeart: [
      'Chào anh chị chủ quán! Hôm nay hạt giống tươi rói luôn nè, ghé sạp xem đi!',
      'Cháu nghe nói nếu chăm tưới mỗi sáng, đồi trà sẽ thơm nức cả đảo đó!',
      'Lúc nào quán mở cửa, cháu nhất định ghé xin một ly trà ngọt lịm nha!',
    ],
    midHeart: [
      'Hạt giống hoa cúc hôm nay nở đều tăm tắp, đúng là hợp tay anh chị chăm nhất rồi!',
      'Chiều nay cháu đi dạo quanh đồi xem cây của anh chị lớn tới đâu rồi đó nha!',
      'Khách ở Bến Mây dạo này ai cũng khen trà quán nấu khéo tay quá trời!',
    ],
    highHeart: [
      'Anh chị giống như người thân trong nhà của cháu vậy! Ở đảo vui chưa từng thấy!',
      'Mốt quán nổi tiếng nhất vùng mây, cháu sẽ khoe mọi người là hạt giống đều từ sạp cháu!',
      'Cảm ơn anh chị lúc nào cũng chia sẻ mấy tách trà ngon nhất cho cô bé bán hạt này nha!',
    ],
    rainy: [
      'Ái chà, mưa rơi tí tách rồi! Cháu kéo bạt mái sạp xuống kẻo ướt hết túi hạt giống!',
      'Trời mưa đỡ phải xách bình tưới từng luống đất anh chị ha, thích ghê!',
      'Mùi đất ướt sau mưa lúc nào cũng thơm mùi mầm non mới nhú.',
    ],
    foggy: [
      'Sương mù phủ trắng xóa luôn, đứng ở sạp mà nhìn đồi trà mờ ảo như trong truyện cổ tích!',
      'Trời sương nhẹ thế này hạt trà xanh dễ giữ ẩm lắm đó anh chị ơi!',
      'Cẩn thận kẻo vấp hòn đá rêu dưới chân nha, sương ẩm nên hơi trơn chút xíu.',
    ],
    evening: [
      'Chiều tối rồi cháu thu dọn mấy bao hạt vào sạp kẻo sương đêm làm ẩm mất.',
      'Ánh đèn đá dọc đường sáng lên ấm cúng quá! Ngày hôm nay của anh chị thế nào?',
      'Tối nay xong việc nhớ đi ngủ sớm nhé anh chị, sáng mai tụi mình lại trồng cây tiếp!',
    ],
  },
};

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
          text: 'Ngày trước tớ từng đứng bên quầy gỗ nghe bà ngoại cậu giã hoa nhài khô hay sao? Hình ảnh mờ quá...',
        },
        {
          speaker: 'Mây',
          expression: 'happy',
          text: 'Dù sao thì ở cạnh quán trà này, tớ không còn thấy cô đơn nữa. Tớ nhặt được ít hạt hoa nhài tặng cậu nè!',
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
          expression: 'normal',
          text: 'Hôm qua gió mây thổi qua hiên quán mang theo hương trà sao nóng hổi... tự nhiên trong đầu tớ vang lên một tiếng gọi dịu dàng.',
        },
        {
          speaker: 'Mây',
          expression: 'happy',
          text: 'Tớ nhớ ra rồi! Tên thật của tớ ngày xưa là Hạ Miên — tinh linh nhỏ sinh ra từ hơi ấm tách trà đầu tiên bà cậu pha trong đêm trăng.',
        },
        {
          speaker: 'Mây',
          expression: 'happy',
          text: 'Nhưng tớ vẫn thích cái tên "Mây" mà mọi người trên đảo gọi hơn. Cậu giữ lấy chút Xu Mây kỷ niệm này nhé!',
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
        {
          speaker: 'Mây',
          expression: 'normal',
          text: 'Bà ngoại cậu hay hát khe khẽ lúc ủ trà khuya... giờ nghe tiếng chuông gió quán cậu, tớ nhớ trọn vẹn giai điệu ấy rồi.',
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
          text: 'Từ giờ quán trà không bao giờ vắng bóng ấm hương nữa. Tớ sẽ mãi ở lại đây làm người bạn thân nhất của cậu!',
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
          expression: 'sad',
          text: 'Năm năm trước ta từng bay lạc vào cơn bão mây mù suốt ba ngày liền, hai cánh mỏi nhừ tưởng chẳng qua khỏi.',
        },
        {
          speaker: 'Cò Lữ',
          expression: 'normal',
          text: 'Đúng lúc ấy, một làn gió thoang thoảng hương trà bạc hà mát lạnh dẫn ta hạ cánh đúng xuống hiên quán nhỏ này.',
        },
        {
          speaker: 'Cò Lữ',
          expression: 'happy',
          text: 'Nhờ tách trà của quán mà ta lấy lại sức. Ta còn giữ vài hạt bạc hà quý phương Bắc, tặng cậu đem gieo khắp đồi nhé!',
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
          expression: 'normal',
          text: 'Chuyến bay tuần trước, ta gặp lại cả đàn cò bạn cũ bên dãy núi Tuyết Mây.',
        },
        {
          speaker: 'Cò Lữ',
          expression: 'happy',
          text: 'Cả đàn bảo chưa nơi nào ở chín tầng mây có vị trà thanh mát làm nhẹ cánh như Trà Quán Trên Mây của cậu!',
        },
        {
          speaker: 'Cò Lữ',
          expression: 'happy',
          text: 'Chúng gửi lời cảm ơn và chút lộ phí đường mây để ủng hộ quán mở thêm bàn đón lữ khách đấy!',
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
          text: 'Trong chiếc túi hành trang này, thứ quý nhất chính là những câu chuyện ta đem về kể bên tách trà mỗi chiều.',
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
          text: 'Hừm... hồi quán trà đóng cửa suốt mấy năm liền, cả hòn đảo tối om hiu quạnh lắm cháu ạ.',
        },
        {
          speaker: 'Ông Đăng',
          expression: 'normal',
          text: 'Đêm nào ta cũng thắp sáng ngọn đèn bão với đèn hải đăng, chỉ mong một ngày cháu bà ngoại trở về nhóm bếp lại.',
        },
        {
          speaker: 'Ông Đăng',
          expression: 'happy',
          text: 'Giờ thấy khói bếp quán trà lại bay lên mỗi trưa, lão già này nhẹ cả lòng! Cầm lấy mấy hũ mật ong rừng để pha trà nhé.',
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
          text: 'Ngày trẻ ta từng là thuyền trưởng lái tàu buôn vượt qua bao eo biển mây mù phía Tây.',
        },
        {
          speaker: 'Ông Đăng',
          expression: 'sad',
          text: 'Một cơn giông làm hỏng la bàn, may nhờ bà cháu pha cho ấm trà gừng nóng sưởi qua đêm giá rét ở hải đăng này.',
        },
        {
          speaker: 'Ông Đăng',
          expression: 'happy',
          text: 'Từ bữa đó ta gác mái chèo ở lại trông bến mây luôn. Đây là chút Xu Mây lão để dành mừng quán làm ăn phát đạt!',
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
          text: 'Ngọn hải đăng và quán trà như hai anh em gác đảo vậy, thiếu một bên là biển mây buồn ngay.',
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
          expression: 'normal',
          text: 'Hồi nhỏ cháu hay trốn sau sạp gỗ nhìn bà ngoại anh chị chọn từng hạt trà mẩy đều ra gieo xuống đất.',
        },
        {
          speaker: 'Bé Sương',
          expression: 'happy',
          text: 'Chính bà ngoại đã tặng cháu chiếc giỏ mây nhỏ và dạy cách nâng niu từng mầm hoa cúc!',
        },
        {
          speaker: 'Bé Sương',
          expression: 'happy',
          text: 'Cháu cất riêng mấy hạt hoa cúc đẹp nhất chờ anh chị về mở quán nè — tặng anh chị hết đó!',
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
          text: 'Anh chị ơi, mỗi lần thấy đồi trà nở hoa vàng hoa trắng, tim cháu cứ nhảy cẫng lên vì vui đó!',
        },
        {
          speaker: 'Bé Sương',
          expression: 'normal',
          text: 'Mai mốt cháu mơ sẽ mở rộng sạp nhỏ này thành vườn ươm hoa trên mây, để thuyền nào ghé Bến Mây cũng trầm trồ.',
        },
        {
          speaker: 'Bé Sương',
          expression: 'happy',
          text: 'Cảm ơn anh chị lúc nào cũng ủng hộ sạp cháu nhé, cháu góp thêm ít Xu Mây giúp quán mua đồ trang trí nè!',
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

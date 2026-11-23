import { WeatherType } from './types';

export interface WeatherVisualConfig {
  id: WeatherType;
  label: string;
  icon: string;
  ambientMult: number;
  sunMult: number;
  tintHex: string;
  tintMix: number;
  overlayOpacityBoost: number;
  fogNear: number;
  fogFar: number;
  fogTintDay: string;
  fogTintNight: string;
  cloudRise: number;
  customerCap: number;
}

export const WEATHER_CONFIG: Record<WeatherType, WeatherVisualConfig> = {
  sunny: {
    id: 'sunny',
    label: 'Nắng ấm',
    icon: '☀️',
    ambientMult: 1.0,
    sunMult: 1.0,
    tintHex: '#fff9ee',
    tintMix: 0,
    overlayOpacityBoost: 0,
    fogNear: 42,
    fogFar: 160,
    fogTintDay: '#d9e6fa',
    fogTintNight: '#34305e',
    cloudRise: 0,
    customerCap: 6,
  },
  rainy: {
    id: 'rainy',
    label: 'Mưa nhẹ',
    icon: '🌧️',
    ambientMult: 0.72,
    sunMult: 0.42,
    tintHex: '#5c7299',
    tintMix: 0.42,
    overlayOpacityBoost: 0.14,
    fogNear: 24,
    fogFar: 78,
    fogTintDay: '#7f95ba',
    fogTintNight: '#262b4d',
    cloudRise: 0.18,
    customerCap: 3,
  },
  foggy: {
    id: 'foggy',
    label: 'Sương mù',
    icon: '🌫️',
    ambientMult: 0.88,
    sunMult: 0.62,
    tintHex: '#d8d2ea',
    tintMix: 0.34,
    overlayOpacityBoost: 0.15,
    fogNear: 13,
    fogFar: 38,
    fogTintDay: '#e8e2f2',
    fogTintNight: '#4a4778',
    cloudRise: 1.0,
    customerCap: 5,
  },
};

export const WEATHER_FORECAST_TEXT: Record<
  WeatherType,
  { title: string; radioLine: string; tip: string }
> = {
  sunny: {
    title: '☀️ Dự báo ngày mai: NẮNG ẤM',
    radioLine:
      'Gió nhẹ tầng mây, bầu trời quang đãng suốt cả ngày mai. Rất thích hợp mở quán đông khách!',
    tip: 'Đừng quên tưới đồi trà vào sáng mai nhé.',
  },
  rainy: {
    title: '🌧️ Dự báo ngày mai: MƯA NHẸ',
    radioLine:
      'Đám mây ẩm đang tụ lại từ phía tây. Ngày mai sẽ có mưa rơi đều từ sáng đến tối.',
    tip: 'Trời mưa sẽ tự tưới sạch mọi ô đất đã cuốc, nhưng khách ghé quán sẽ thưa hơn một chút.',
  },
  foggy: {
    title: '🌫️ Dự báo ngày mai: SƯƠNG MÙ MÂY DÂNG',
    radioLine:
      'Biển mây dưới chân đảo dâng cao, sương trắng bảng lảng phủ quanh trà quán cực kỳ huyền ảo.',
    tip: 'Tầm nhìn hơi mờ dịu nhưng trà nóng và đèn lồng sẽ trông ấm cúng lắm đấy!',
  },
};

export function rollRandomWeather(): WeatherType {
  const r = Math.random();
  if (r < 0.56) return 'sunny';
  if (r < 0.8) return 'rainy';
  return 'foggy';
}

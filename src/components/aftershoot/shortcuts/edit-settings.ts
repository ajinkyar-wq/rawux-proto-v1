// Edit slider settings shape, used by the Keyboard Shortcuts modal's slider
// registry. Copied from the Export push prototype (types + defaults only).
// Image processing engine using HTML Canvas
export interface EditSettings {
  // White Balance
  temperature: number; // 2000-10000, default 7000
  tint: number; // -100 to 100

  // Light
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;

  // Presence
  texture: number;
  clarity: number;
  dehaze: number;
  vibrance: number;
  saturation: number;

  // Color Mixer
  colorMixerTab: 'hue' | 'saturation' | 'luminance' | 'all';
  colorMixer: {
    red: { hue: number; saturation: number; luminance: number };
    orange: { hue: number; saturation: number; luminance: number };
    yellow: { hue: number; saturation: number; luminance: number };
    green: { hue: number; saturation: number; luminance: number };
    aqua: { hue: number; saturation: number; luminance: number };
    blue: { hue: number; saturation: number; luminance: number };
    purple: { hue: number; saturation: number; luminance: number };
    magenta: { hue: number; saturation: number; luminance: number };
  };

  // Color Grading
  colorGradingTab: 'shadows' | 'midtones' | 'highlights' | 'global' | 'all';
  colorGrading: {
    shadows: { hue: number; saturation: number; luminance: number };
    midtones: { hue: number; saturation: number; luminance: number };
    highlights: { hue: number; saturation: number; luminance: number };
    global: { hue: number; saturation: number; luminance: number };
  };
  blending: number;
  balance: number;

  // Detail
  sharpeningAmount: number;
  sharpeningRadius: number;
  sharpeningDetail: number;
  sharpeningMasking: number;
  noiseLuminance: number;
  noiseColor: number;

  // Calibration
  shadowsTint: number;
  redPrimaryHue: number;
  redPrimarySaturation: number;
  greenPrimaryHue: number;
  greenPrimarySaturation: number;
  bluePrimaryHue: number;
  bluePrimarySaturation: number;

  // Section visibility toggles
  whiteBalanceEnabled: boolean;
  lightEnabled: boolean;
  presenceEnabled: boolean;
  colorMixerEnabled: boolean;
  colorGradingEnabled: boolean;
  detailEnabled: boolean;
  calibrationEnabled: boolean;
}

export const defaultSettings: EditSettings = {
  temperature: 7000,
  tint: 0,
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  texture: 0,
  clarity: 0,
  dehaze: 0,
  vibrance: 0,
  saturation: 0,
  colorMixerTab: 'hue',
  colorMixer: {
    red: { hue: 0, saturation: 0, luminance: 0 },
    orange: { hue: 0, saturation: 0, luminance: 0 },
    yellow: { hue: 0, saturation: 0, luminance: 0 },
    green: { hue: 0, saturation: 0, luminance: 0 },
    aqua: { hue: 0, saturation: 0, luminance: 0 },
    blue: { hue: 0, saturation: 0, luminance: 0 },
    purple: { hue: 0, saturation: 0, luminance: 0 },
    magenta: { hue: 0, saturation: 0, luminance: 0 },
  },
  colorGradingTab: 'shadows',
  colorGrading: {
    shadows: { hue: 0, saturation: 0, luminance: 0 },
    midtones: { hue: 0, saturation: 0, luminance: 0 },
    highlights: { hue: 0, saturation: 0, luminance: 0 },
    global: { hue: 0, saturation: 0, luminance: 0 },
  },
  blending: 0,
  balance: 0,
  sharpeningAmount: 0,
  sharpeningRadius: 0,
  sharpeningDetail: 0,
  sharpeningMasking: 0,
  noiseLuminance: 0,
  noiseColor: 0,
  shadowsTint: 0,
  redPrimaryHue: 0,
  redPrimarySaturation: 0,
  greenPrimaryHue: 0,
  greenPrimarySaturation: 0,
  bluePrimaryHue: 0,
  bluePrimarySaturation: 0,
  whiteBalanceEnabled: true,
  lightEnabled: true,
  presenceEnabled: true,
  colorMixerEnabled: true,
  colorGradingEnabled: true,
  detailEnabled: true,
  calibrationEnabled: true,
};

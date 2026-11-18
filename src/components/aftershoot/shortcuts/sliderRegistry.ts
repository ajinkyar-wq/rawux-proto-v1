import type { EditSettings } from "./edit-settings";

export type SliderDef = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  defaultValue?: number;
  onChange: (v: number) => void;
  gradient?: string;
};

export type ColorKey = keyof EditSettings["colorMixer"];
export type GradingKey = keyof EditSettings["colorGrading"];

export const colorKeys: ColorKey[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "aqua",
  "blue",
  "purple",
  "magenta",
];

export const gradingKeys: GradingKey[] = ["shadows", "midtones", "highlights", "global"];

export const colorGradients: Record<ColorKey, string> = {
  red: "linear-gradient(to right, #991b1b, #ef4444, #fca5a5)",
  orange: "linear-gradient(to right, #9a3412, #f97316, #fdba74)",
  yellow: "linear-gradient(to right, #854d0e, #eab308, #fde047)",
  green: "linear-gradient(to right, #166534, #22c55e, #86efac)",
  aqua: "linear-gradient(to right, #155e75, #06b6d4, #67e8f9)",
  blue: "linear-gradient(to right, #1e3a8a, #3b82f6, #93c5fd)",
  purple: "linear-gradient(to right, #581c87, #a855f7, #d8b4fe)",
  magenta: "linear-gradient(to right, #831843, #ec4899, #f9a8d4)",
};

export const gradingGradients: Record<"hue" | "saturation" | "luminance", string | undefined> = {
  hue: "linear-gradient(90deg, #a90a25, #ae4a04, #af8c04, #16833e, #0f8a7c, #005899, #5d11a2, #910ea4)",
  saturation: "linear-gradient(90deg, #333333, #903a37)",
  luminance: undefined,
};

export function buildSliderRegistry(
  settings: EditSettings,
  onChange: (next: EditSettings) => void,
  pinnedIds: string[],
): Record<string, SliderDef> {
  const update = <K extends keyof EditSettings>(key: K, value: EditSettings[K]) =>
    onChange({ ...settings, [key]: value });

  const updateColorMixer = (
    color: ColorKey,
    prop: "hue" | "saturation" | "luminance",
    value: number,
  ) => {
    onChange({
      ...settings,
      colorMixer: {
        ...settings.colorMixer,
        [color]: { ...settings.colorMixer[color], [prop]: value },
      },
    });
  };

  const updateColorGrading = (
    tone: GradingKey,
    prop: "hue" | "saturation" | "luminance",
    value: number,
  ) => {
    onChange({
      ...settings,
      colorGrading: {
        ...settings.colorGrading,
        [tone]: { ...settings.colorGrading[tone], [prop]: value },
      },
    });
  };

  const defs: Record<string, SliderDef> = {};

  defs["temperature"] = {
    id: "temperature",
    label: "Temperature",
    value: settings.temperature,
    min: 2000,
    max: 10000,
    defaultValue: 7000,
    onChange: (v) => update("temperature", v),
    gradient: "linear-gradient(to right, #3b82f6, #f59e0b)",
  };
  defs["tint"] = {
    id: "tint",
    label: "Tint",
    value: settings.tint,
    min: -100,
    max: 100,
    onChange: (v) => update("tint", v),
    gradient: "linear-gradient(to right, #22c55e, #a855f7)",
  };

  (["exposure", "contrast", "highlights", "shadows", "whites", "blacks"] as const).forEach((k) => {
    defs[k] = {
      id: k,
      label: k.charAt(0).toUpperCase() + k.slice(1),
      value: settings[k],
      min: -100,
      max: 100,
      onChange: (v) => update(k, v),
    };
  });

  (["texture", "clarity", "dehaze"] as const).forEach((k) => {
    defs[k] = {
      id: k,
      label: k.charAt(0).toUpperCase() + k.slice(1),
      value: settings[k],
      min: -100,
      max: 100,
      onChange: (v) => update(k, v),
    };
  });

  defs["vibrance"] = {
    id: "vibrance",
    label: "Vibrance",
    value: settings.vibrance,
    min: -100,
    max: 100,
    onChange: (v) => update("vibrance", v),
    gradient: "linear-gradient(to right, #71717a, #3b82f6, #22c55e, #eab308, #ef4444, #a855f7)",
  };
  defs["saturation"] = {
    id: "saturation",
    label: "Saturation",
    value: settings.saturation,
    min: -100,
    max: 100,
    onChange: (v) => update("saturation", v),
    gradient: "linear-gradient(to right, #71717a, #3b82f6, #22c55e, #eab308, #ef4444, #a855f7)",
  };
  defs["blending"] = {
    id: "blending",
    label: "Blending",
    value: settings.blending,
    min: -100,
    max: 100,
    onChange: (v) => update("blending", v),
  };
  defs["balance"] = {
    id: "balance",
    label: "Balance",
    value: settings.balance,
    min: -100,
    max: 100,
    onChange: (v) => update("balance", v),
  };

  (
    ["sharpeningAmount", "sharpeningRadius", "sharpeningDetail", "sharpeningMasking"] as const
  ).forEach((k) => {
    defs[k] = {
      id: k,
      label: k.replace("sharpening", "").replace(/^./, (c) => c.toUpperCase()),
      value: settings[k],
      min: 0,
      max: 100,
      onChange: (v) => update(k, v),
    };
  });

  defs["noiseLuminance"] = {
    id: "noiseLuminance",
    label: "Luminance",
    value: settings.noiseLuminance,
    min: 0,
    max: 100,
    onChange: (v) => update("noiseLuminance", v),
  };
  defs["noiseColor"] = {
    id: "noiseColor",
    label: "Color",
    value: settings.noiseColor,
    min: 0,
    max: 100,
    onChange: (v) => update("noiseColor", v),
  };

  defs["shadowsTint"] = {
    id: "shadowsTint",
    label: "Tint",
    value: settings.shadowsTint,
    min: -100,
    max: 100,
    onChange: (v) => update("shadowsTint", v),
    gradient: "linear-gradient(to right, #22c55e, #a855f7)",
  };

  (
    [
      "redPrimaryHue",
      "redPrimarySaturation",
      "greenPrimaryHue",
      "greenPrimarySaturation",
      "bluePrimaryHue",
      "bluePrimarySaturation",
    ] as const
  ).forEach((k) => {
    const color = k.startsWith("red") ? "red" : k.startsWith("green") ? "green" : "blue";
    defs[k] = {
      id: k,
      label: k.includes("Hue") ? "Hue" : "Saturation",
      value: settings[k],
      min: -100,
      max: 100,
      onChange: (v) => update(k, v),
      gradient: colorGradients[color as ColorKey],
    };
  });

  colorKeys.forEach((color) => {
    const colorLabel = color.charAt(0).toUpperCase() + color.slice(1);
    (["hue", "saturation", "luminance"] as const).forEach((prop) => {
      const id = `colorMixer.${color}.${prop}`;
      defs[id] = {
        id,
        label: `${colorLabel} ${prop.charAt(0).toUpperCase()}`,
        value: settings.colorMixer[color][prop],
        min: -100,
        max: 100,
        onChange: (v) => updateColorMixer(color, prop, v),
        gradient: colorGradients[color],
      };
    });
  });

  gradingKeys.forEach((tone) => {
    const toneLabel = tone.charAt(0).toUpperCase() + tone.slice(1);
    (["hue", "saturation", "luminance"] as const).forEach((prop) => {
      const id = `colorGrading.${tone}.${prop}`;
      defs[id] = {
        id,
        label: `${toneLabel} ${prop.charAt(0).toUpperCase()}`,
        value: settings.colorGrading[tone][prop],
        min: -100,
        max: 100,
        onChange: (v) => updateColorGrading(tone, prop, v),
        gradient: gradingGradients[prop],
      };
    });
  });

  pinnedIds.forEach((id) => {
    const orig = defs[id];
    if (orig) defs[`pinned:${id}`] = { ...orig, id: `pinned:${id}` };
  });

  return defs;
}

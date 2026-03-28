import type {
  SchulteThemeConfig,
  SchulteThemeId
} from "../../types/domain";

export const SCHULTE_THEME_PRESETS: Record<SchulteThemeId, SchulteThemeConfig> = {
  classic_bw: {
    boardBg: "#f1f4f3",
    cellBg: "#ffffff",
    numberColor: "#111111",
    highlightColor: "#f2a93b",
    successColor: "#1e7f71",
    errorColor: "#b74343"
  },
  contrast: {
    boardBg: "#0f1215",
    cellBg: "#171b21",
    numberColor: "#ffffff",
    highlightColor: "#ffd166",
    successColor: "#34d399",
    errorColor: "#fb7185"
  },
  soft: {
    boardBg: "#f4f8ff",
    cellBg: "#ffffff",
    numberColor: "#2d3f5f",
    highlightColor: "#7db9ff",
    successColor: "#5ac8a8",
    errorColor: "#ea6f8f"
  },
  rainbow: {
    boardBg: "#fff6f0",
    cellBg: "#ffffff",
    numberColor: "#3b2f63",
    highlightColor: "#ff9f1c",
    successColor: "#2ec4b6",
    errorColor: "#e71d36"
  },
  kid_candy: {
    boardBg: "#fff0f6",
    cellBg: "#ffffff",
    numberColor: "#4a154b",
    highlightColor: "#ff4d6d",
    successColor: "#2ecc71",
    errorColor: "#ff6b6b"
  },
  kid_ocean: {
    boardBg: "#e6fbff",
    cellBg: "#ffffff",
    numberColor: "#0b3d5c",
    highlightColor: "#00a3ff",
    successColor: "#00c48c",
    errorColor: "#ff5a5f"
  },
  kid_space: {
    boardBg: "#0b1020",
    cellBg: "#141b34",
    numberColor: "#eaf2ff",
    highlightColor: "#8a5cff",
    successColor: "#2ecc71",
    errorColor: "#ff6b6b"
  },
  kid_comics: {
    boardBg: "#fff7d6",
    cellBg: "#ffffff",
    numberColor: "#222222",
    highlightColor: "#ffb703",
    successColor: "#00b894",
    errorColor: "#d63031"
  }
};

const HEX_PATTERN = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

function normalizeColor(
  value: string | undefined,
  fallback: string
): string {
  if (!value) {
    return fallback;
  }
  const trimmed = value.trim();
  return HEX_PATTERN.test(trimmed) ? trimmed : fallback;
}

export function resolveSchulteTheme(
  themeId: SchulteThemeId,
  customTheme: Partial<SchulteThemeConfig> | null | undefined
): SchulteThemeConfig {
  const base = SCHULTE_THEME_PRESETS[themeId] ?? SCHULTE_THEME_PRESETS.classic_bw;
  if (!customTheme) {
    return base;
  }

  return {
    boardBg: normalizeColor(customTheme.boardBg, base.boardBg),
    cellBg: normalizeColor(customTheme.cellBg, base.cellBg),
    numberColor: normalizeColor(customTheme.numberColor, base.numberColor),
    highlightColor: normalizeColor(customTheme.highlightColor, base.highlightColor),
    successColor: normalizeColor(customTheme.successColor, base.successColor),
    errorColor: normalizeColor(customTheme.errorColor, base.errorColor)
  };
}

export const SCHULTE_QUICK_THEME_OPTIONS: Array<{
  id: SchulteThemeId;
  label: string;
}> = [
  { id: "classic_bw", label: "Светлая Ч/Б" },
  { id: "contrast", label: "Тёмная Ч/Б" }
];

export const SCHULTE_THEME_OPTIONS: Array<{
  id: SchulteThemeId;
  label: string;
}> = [
  { id: "classic_bw", label: "Светлая Ч/Б" },
  { id: "contrast", label: "Тёмная Ч/Б" },
  { id: "soft", label: "Мягкая" },
  { id: "rainbow", label: "Радуга" },
  { id: "kid_candy", label: "Конфетки" },
  { id: "kid_ocean", label: "Океан" },
  { id: "kid_space", label: "Космос" },
  { id: "kid_comics", label: "Комикс" }
];

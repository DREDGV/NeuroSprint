export function formatLastActivity(isoString: string | undefined): string {
  if (!isoString) {
    return "Никогда";
  }

  const last = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - last.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return "Только что";
  }
  if (diffMin < 60) {
    return `${diffMin} мин назад`;
  }
  if (diffHour < 24) {
    return `${diffHour} ч назад`;
  }
  if (diffDay < 7) {
    return `${diffDay} дн назад`;
  }

  return last.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  });
}

export function formatTotalTime(totalSec: number | undefined): string {
  if (!totalSec || totalSec < 60) {
    return "0 мин";
  }

  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);

  if (hours >= 1) {
    return `${hours} ч ${minutes} мин`;
  }

  return `${minutes} мин`;
}

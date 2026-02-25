export interface ReleaseEntry {
  version: string;
  date: string;
  title: string;
  status: "stable" | "alpha" | "dev";
  highlights: string[];
}

export const RELEASE_HISTORY: ReleaseEntry[] = [
  {
    version: "0.5.0-dev.0",
    date: "2026-02-25",
    title: "Sprint Math + расширенная аналитика + UX-улучшения",
    status: "dev",
    highlights: [
      "Sprint Math активирован в TrainingHub и доступен без прямого ввода URL.",
      "Добавлена расширенная индивидуальная аналитика Sprint Math на /stats/individual.",
      "Добавлен встроенный раздел 'Справка' с историей версий и инструкциями.",
      "Усилена видимость активного пользователя в интерфейсе."
    ]
  },
  {
    version: "0.4.1",
    date: "2026-02-24",
    title: "Visual+ / Classes / Audio hardening",
    status: "alpha",
    highlights: [
      "Цветовые темы Шульте, advanced-настройка и детские визуальные пресеты.",
      "Ручное управление классами и учениками, массовое добавление.",
      "Аудио-сигналы (start/end default), mute/volume, стабильный e2e контур."
    ]
  },
  {
    version: "0.3.0",
    date: "2026-02-24",
    title: "Групповая аналитика и сравнения",
    status: "alpha",
    highlights: [
      "Сравнения user/group/global для индивидуальной и групповой статистики.",
      "Перцентиль ученика, распределение уровней, динамика групп.",
      "Fixture-генератор для классов и benchmark агрегаций."
    ]
  },
  {
    version: "0.2.0",
    date: "2026-02-24",
    title: "Новая IA и расширение Шульте",
    status: "alpha",
    highlights: [
      "Выделенный раздел Тренировки и setup-поток перед запуском.",
      "Режимы Schulte: Classic+, Timed+, Reverse.",
      "Адаптивная сложность и ручной override уровня."
    ]
  },
  {
    version: "0.1.0",
    date: "2026-02-23",
    title: "Первый рабочий MVP",
    status: "alpha",
    highlights: [
      "Профили пользователей и активный пользователь.",
      "Classic/Timed Шульте, сохранение сессий в IndexedDB.",
      "Базовая статистика по дням и PWA offline-first."
    ]
  }
];

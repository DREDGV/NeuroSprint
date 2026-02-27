export interface ReleaseEntry {
  version: string;
  date: string;
  title: string;
  status: "stable" | "alpha" | "dev";
  highlights: string[];
}

export const RELEASE_HISTORY: ReleaseEntry[] = [
  {
    version: "0.5.0-dev.2",
    date: "2026-02-27",
    title: "Технический срез v0.5.0-dev.2: кодировка, справка, прогресс-статистика",
    status: "dev",
    highlights: [
      "Исправлена битая кодировка в ключевых экранах (Home, TrainingHub, Sprint Math, Stats, Classes, AppShell).",
      "В /stats добавлен верхний блок «Прогресс за период» с личным рекордом и сравнением периодов.",
      "Страницы Stats и Classes переведены на единый role-access слой (useRoleAccess).",
      "Обновлена встроенная справка и история релизов в приложении.",
      "Синхронизированы версии package.json и package-lock.json до v0.5.0-dev.2."
    ]
  },
  {
    version: "0.5.0-dev.1",
    date: "2026-02-26",
    title: "Релиз v0.5.0-dev.1: унификация role-checks (v0.5.K)",
    status: "dev",
    highlights: [
      "Добавлены общие контракты прав buildRoleAccess/guardAccess и хук useRoleAccess.",
      "Страницы Profiles, Settings, StatsIndividual переведены на единый action-level слой прав.",
      "Синхронизированы roadmap/status/help/changelog под завершенный этап v0.5.K."
    ]
  },
  {
    version: "0.5.0-dev.0",
    date: "2026-02-25",
    title: "Sprint Math, роли, pre-session, мотивация и route-level guards",
    status: "dev",
    highlights: [
      "Активирован Sprint Math в TrainingHub и в аналитике /stats и /stats/individual.",
      "Добавлен экран pre-session: цель дня, рекомендация и быстрый переход в setup.",
      "Внедрены роли интерфейса (Учитель/Ученик/Домашний) и role-policy по действиям.",
      "Добавлен route-level guard для teacher-only разделов (/classes*, /stats/group)."
    ]
  },
  {
    version: "0.4.1",
    date: "2026-02-24",
    title: "Visual+, классы, звук и hardening",
    status: "alpha",
    highlights: [
      "Цветовые темы Шульте, advanced-настройка цветов и детские визуальные пресеты.",
      "Ручное управление классами и составом учеников, включая bulk-add.",
      "Аудио-сигналы start/end по умолчанию и дополнительные toggles."
    ]
  },
  {
    version: "0.3.0",
    date: "2026-02-24",
    title: "Групповая аналитика и сравнения",
    status: "alpha",
    highlights: [
      "Сравнения user/group/global и перцентиль ученика.",
      "Распределение уровней и динамика группы.",
      "Fixture-генератор класса и benchmark агрегаций."
    ]
  },
  {
    version: "0.2.0",
    date: "2026-02-24",
    title: "Новая IA и расширение Шульте",
    status: "alpha",
    highlights: [
      "Выделен раздел «Тренировки» и setup-поток перед запуском.",
      "Режимы Шульте: Classic+, Timed+, Reverse.",
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
      "Classic/Timed Шульте и сохранение сессий в IndexedDB.",
      "Базовая статистика по дням и PWA offline-first."
    ]
  }
];

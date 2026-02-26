export interface ReleaseEntry {
  version: string;
  date: string;
  title: string;
  status: "stable" | "alpha" | "dev";
  highlights: string[];
}

export const RELEASE_HISTORY: ReleaseEntry[] = [
  {
    version: "0.5.0-dev.1",
    date: "2026-02-26",
    title: "Релиз v0.5.0-dev.1: унификация role-checks (v0.5.K)",
    status: "dev",
    highlights: [
      "Подготовлен dev-релиз v0.5.0-dev.1 и обновлена версия приложения в шапке/справке.",
      "Справка и changelog синхронизированы: зафиксирован завершённый этап v0.5.K.",
      "Добавлены общие контракты прав `buildRoleAccess` и `guardAccess`, а также хук `useRoleAccess`.",
      "Страницы `Profiles`, `Settings`, `StatsIndividual` переведены на единый action-level слой прав.",
      "Следующий фокус итерации: v0.5.L (расширение Sprint Math аналитики на `/stats`)."
    ]
  },
  {
    version: "0.5.0-dev.0",
    date: "2026-02-25",
    title: "Sprint Math, роли, pre-session, мотивация и role-policy v0.5.J",
    status: "dev",
    highlights: [
      "Sprint Math активирован в TrainingHub и включён в расширенную статистику.",
      "Добавлен встроенный раздел «Справка» с историей версий.",
      "Усилена видимость активного пользователя в интерфейсе.",
      "Внедрены роли интерфейса: Учитель, Ученик, Домашний.",
      "Teacher-only разделы ограничены по роли: Классы и Групповая статистика.",
      "Добавлен экран «Перед тренировкой» (цель дня, рекомендация, быстрый старт в setup).",
      "Роль привязана к профилю пользователя: выбор при создании и редактирование в разделе «Профили».",
      "Добавлена мягкая мотивация: streak badges и мини-цели дня на Home и Pre-session.",
      "Этап v0.5.H: /stats получил фильтр Sprint Math подрежимов (Все/Add-Sub/Mixed) и mode-aware сводку.",
      "Этап v0.5.H: /stats/individual получил блок 7 дней vs предыдущие 7 дней для Sprint Math.",
      "Рекомендации унифицированы: pre-session и individual insights используют общий движок recommendation.ts.",
      "Этап v0.5.I: внедрена тонкая role-policy по действиям (profiles/settings/stats) для teacher/student/home.",
      "Добавлен контроль кодировки: npm run check:encoding и CI-проверка перед тестами.",
      "Demo fixture теперь создаёт активного профиля [DEMO] Учитель для стабильного admin-потока.",
      "Этап v0.5.J: teacher-only маршруты защищены единым RequirePermission guard с role-aware подсказками."
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

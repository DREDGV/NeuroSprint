export interface ReleaseEntry {
  version: string;
  date: string;
  title: string;
  status: "stable" | "alpha" | "dev";
  highlights: string[];
}

export const RELEASE_HISTORY: ReleaseEntry[] = [
  {
    version: "0.5.0-dev.5",
    date: "2026-03-03",
    title: "Технический срез v0.5.0-dev.5: стабилизация новых модулей",
    status: "dev",
    highlights: [
      "Синхронизированы mode-контракты для N-Back, Pattern, Memory Grid и Pre-session маршрутов.",
      "Исправлены launch-path для Daily Challenge: Memory Grid и Pattern Recognition открываются в корректные setup-экраны.",
      "Исправлен Pattern Recognition session-flow: старт режима pattern_multi, корректное завершение фиксированных серий и точное время сессии.",
      "Усилена защита статистики: в индивидуальном сравнении временно скрыты неподдержанные режимы, чтобы исключить некорректные метрики.",
      "Обновлены roadmap/status/changelog и подтверждены целевые проверки unit/integration + build + e2e smoke."
    ]
  },
  {
    version: "0.5.0-dev.4",
    date: "2026-03-01",
    title: "Релиз v0.5.0-dev.4: Daily Challenge в статистике и финализация этапа",
    status: "dev",
    highlights: [
      "Пост-релизное обновление v0.7.B: добавлен новый модуль N-Back Lite (1-back/2-back, 60/90 сек) с маршрутом setup -> session.",
      "Закрыт этап v0.6.F: в /stats добавлен блок выполнения Daily Challenge по периоду (7/30/90/all).",
      "Добавлена история Daily Challenge: режим, статус, прогресс попыток и дата.",
      "Расширен dailyChallengeRepository: getCompletionSummary(...) и listHistory(...).",
      "Обновлены контракты домена: DailyChallengeHistoryItem и DailyChallengeCompletionSummary.",
      "Обновлены интеграционные и unit-тесты для статистики и challenge-потока.",
      "Синхронизированы версия приложения, справка и changelog."
    ]
  },
  {
    version: "0.5.0-dev.3",
    date: "2026-02-28",
    title: "Технический срез v0.5.0-dev.3: Reaction analytics + mode-aware recommendations",
    status: "dev",
    highlights: [
      "Сессии Reaction включены в статистику: /stats, /stats/individual и /stats/group.",
      "Pre-session поддерживает module=reaction и быстрый запуск нужного подрежима через query mode.",
      "Recommendation engine для Reaction переведен в mode-aware режим (signal/stroop/pair).",
      "Добавлены объяснения рекомендаций по точности, времени реакции и тренду score.",
      "Проведен регресс и синхронизирована документация roadmap/status/changelog."
    ]
  },
  {
    version: "0.5.0-dev.2",
    date: "2026-02-27",
    title: "Технический срез v0.5.0-dev.2: UX-подсказки, Reaction beta, кодировка",
    status: "dev",
    highlights: [
      "Добавлен модуль Reaction (beta) с запуском из раздела «Тренировки».",
      "В Reaction добавлены вариации: «Сигнал», «Цвет и слово», «Пара».",
      "Добавлен единый компонент интерактивных подсказок InfoHint.",
      "Исправлена битая кодировка в ключевых экранах.",
      "В /stats добавлен блок «Прогресс за период» и сравнение периодов."
    ]
  },
  {
    version: "0.5.0-dev.1",
    date: "2026-02-26",
    title: "Релиз v0.5.0-dev.1: унификация role-checks (v0.5.K)",
    status: "dev",
    highlights: [
      "Добавлены общие контракты прав buildRoleAccess/guardAccess и хук useRoleAccess.",
      "Страницы Profiles, Settings и StatsIndividual переведены на единый action-level слой прав.",
      "Синхронизированы roadmap/status/help/changelog под завершенный этап v0.5.K."
    ]
  },
  {
    version: "0.5.0-dev.0",
    date: "2026-02-25",
    title: "Sprint Math, роли, pre-session, мотивация и route-level guards",
    status: "dev",
    highlights: [
      "Активирован Sprint Math в TrainingHub и аналитике /stats и /stats/individual.",
      "Добавлен экран pre-session: цель дня, рекомендация и быстрый переход в setup.",
      "Внедрены роли интерфейса (Учитель/Ученик/Домашний) и role-policy по действиям.",
      "Добавлен route-level guard для teacher-only разделов."
    ]
  },
  {
    version: "0.4.1",
    date: "2026-02-24",
    title: "Visual+, классы, звук и hardening",
    status: "alpha",
    highlights: [
      "Цветовые темы Шульте и advanced-настройка цветов.",
      "Ручное управление классами и составом учеников.",
      "Аудио-сигналы start/end по умолчанию и расширенные audio toggles."
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

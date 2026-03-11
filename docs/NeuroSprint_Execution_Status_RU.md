# NeuroSprint Execution Status (RU)

Обновлено: 2026-03-10
Назначение: короткий operational snapshot

## Что реально завершено

### Progress System / Phase 1 — Daily Training
Статус: завершено и интегрировано в продукт.

Что уже есть:
- сущность и БД-слой daily training;
- `dailyTrainingRepository`;
- heatmap и summary-компоненты;
- `DailyTrainingWidget` на Home;
- unit и integration тесты на daily flow.

### Progress System / Phase 2 — Levels + Achievements
Статус: завершено и интегрировано в продукт.

Что уже есть:
- XP calculator;
- `levelRepository` и `achievementRepository`;
- achievement catalog;
- `LevelProgressWidget`, `AchievementList`, `LevelUpModal`, achievement toasts;
- post-session feedback и интеграция в основной UI.

## Что уже реально есть в интерфейсе
- Home: daily training, level progress, ранние skill-guidance и roadmap-элементы.
- Stats: level progress, achievements, ранний skill roadmap / growth layer.
- Pre-session: guidance перед запуском тренировки.
- Training Hub: skill-based выбор тренажёров, featured modules, experimental block.
- Session pages: XP / achievements / result summary уже частично встроены в текущий session flow.

## Текущее фактическое состояние проекта

### Официальные production-ready модули
- Таблица Шульте
- Sprint Math
- Reaction
- N-Back Lite
- Decision Rush
- Memory Grid

### Частично внедрённые, но ещё не завершённые слои
- `Skill Guidance`
- `Skill Roadmap`
- skill-based `Training Hub`
- `Pattern Recognition` как рабочий, но не текущий приоритетный модуль

### Experimental / prototype-линия
- `Block Pattern Recall` — alpha
- `Spatial Memory` — переведён в основной каталог памяти после product-pass

## Статус по Progress System
- ✅ **Phase 1 — Daily Training**: завершена
- ✅ **Phase 2 — Levels + Achievements**: завершена
- 🟡 **Phase 3 — Skill Map + Strength/Weakness Analysis**: начата частично, но не доведена до чистого и стабильного product-layer
- ⏸️ **Phase 4 — AI Recommendations**: не начата как отдельный полноценный слой

Важно:
- текущие heuristic-рекомендации и guidance не считать завершённой AI-phase;
- roadmap проекта уже ушёл дальше исходной последовательности, поэтому фактическое состояние важнее старых phase-описаний.

## Что сейчас в работе
- Product-pass по главным экранам и системе прогресса.
- Узкое улучшение `Training Hub` как skill-based экрана выбора.
- Stabilization-pass по ранним progress/discovery слоям.

## Что пока не продвигается
- `Block Pattern Recall` — alpha.
- Публичные рейтинги и feedback-маркетплейс для тренажёров.
- Полноценный AI recommendation layer.

## Главные риски и отклонения
1. Roadmap раньше предполагал запуск `Progress System` после `Memory Match`, но по факту `Phase 1` и `Phase 2` уже реализованы.
2. `Phase 3` уже частично начата в коде, но качество слоя ещё не соответствует completed-статусу.
3. Есть риск расползания между `Memory Match`, `Training Hub`, skill-map polish и новыми discovery-идеями.
4. В проекте ещё встречаются битые строки / кодировка в отдельных местах, и это мешает считать discovery/growth слой стабильным.

## Следующие 3 шага
1. Довести `Training Hub` до цельного skill-first выбора без визуального шума.
2. Провести stabilization-pass по skill guidance / roadmap / copy quality.
3. Возвращаться к новым gameplay-веткам только после очистки текущего продуктового контура.

## Что не надо делать сейчас
- Не объявлять `Skill Map + Analysis` полностью завершённой фазой.
- Не продвигать alpha-модули в официальный progress-loop.
- Не открывать `AI Recommendations` раньше стабилизации уже внедрённых growth-слоёв.

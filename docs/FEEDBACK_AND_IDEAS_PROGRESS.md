# Прогресс разработки Feedback & Ideas

**Последнее обновление:** Все фазы ✅ завершены

---

## Полный статус

### ✅ Завершено все

1. **Фаза 1: SQL-миграция** — `supabase/migrations/002_feedback_and_ideas.sql`
   - Таблицы: `feedback_entries`, `idea_posts`, `idea_votes`
   - Индексы, ограничения, RLS-политики
   - Триггер для `vote_count`

2. **Фаза 2: Vercel Functions API** — `api/`
   - `POST /api/feedback` — отправка отзыва (антиспам, rate limiting, дедупликация)
   - `GET /api/ideas` — список идей
   - `POST /api/ideas` — создание идеи
   - `POST /api/ideas/:id/vote` — голосование
   - `DELETE /api/ideas/:id/vote` — снятие голоса
   - Обновлён `vercel.json`, `.env.example`

3. **Фаза 3: Общий клиентский слой**
   - Типы: `feedback/types.ts`, `ideas/types.ts`
   - Guest token helper: `feedback/guestToken.ts`
   - Feedback service: `feedback/feedbackService.ts`
   - Ideas service: `ideas/ideasService.ts`
   - 8 analytics events

4. **Фаза 4: Глобальная форма Отзыв**
   - `FeedbackModal` — modal/sheet с формой
   - Кнопка «Отзыв» в `AppShell`
   - Категории: Баг, Неудобно, Идея, Вопрос, Похвала
   - Comment (обязательный), email (опциональный)

5. **Фаза 5: Post-session feedback pilot**
   - Memory Match: кнопка «Оставить отзыв о тренировке»
   - Sprint Math: кнопка «Оставить отзыв о тренировке»
   - Звёздный рейтинг 1–10 (только для post-session)

6. **Фаза 6: Доска идей /ideas**
   - Страница `/ideas` — публичный список идей
   - Гостям: только чтение, CTA «Войти/Создать аккаунт»
   - Вошедшим: создание идеи, голосование/снятие голоса
   - Блок «Мои идеи» со статусом «На проверке»
   - Ссылки: AppShell, HelpPage

7. **Фаза 7: Product-pass** ✅
   - Тексты без технического жаргона
   - «Модерация» → «Проверка»
   - Пустые состояния проверены
   - Auth prompts с возвратом на /ideas
   - Финальный lint + build прошли

---

## Definition of Done — выполнено полностью

- ✅ Есть `feedback_entries`, `idea_posts`, `idea_votes` в облачной схеме
- ✅ Есть `POST /api/feedback`
- ✅ Есть `GET/POST /api/ideas` и vote endpoints
- ✅ Есть глобальная кнопка `Отзыв`
- ✅ Есть post-session feedback в `Memory Match`
- ✅ Есть post-session feedback в `Sprint Math`
- ✅ Есть страница `/ideas`
- ✅ Идеи требуют входа для создания и голосования
- ✅ Идеи публикуются только после модерации
- ✅ Есть analytics events
- ✅ Проходят `npm run lint` и `npm run build`
- ✅ Нет регрессий в auth/profiles и базовом training flow

---

## Файлы

- План: `docs/USER_FEEDBACK_AND_IDEAS_PLAN_RU.md`
- Чеклист: `docs/USER_FEEDBACK_AND_IDEAS_EXECUTION_CHECKLIST_RU.md`

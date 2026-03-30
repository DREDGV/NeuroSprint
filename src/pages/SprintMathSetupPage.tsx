import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  buildSprintMathTask,
  normalizeSprintMathSetup
} from "../features/sprint-math/contract";
import {
  getSprintMathSetup,
  resetSprintMathSetup,
  saveSprintMathSetup
} from "../features/sprint-math/setupStorage";
import { InfoHint } from "../shared/ui/InfoHint";
import type {
  SprintMathModeId,
  SprintMathSessionSec,
  SprintMathSetup,
  SprintMathTierId
} from "../features/sprint-math/contract";

interface SessionNavState {
  setup: SprintMathSetup;
}

function isSprintMathModeId(value: string | null): value is "sprint_add_sub" | "sprint_mixed" {
  return value === "sprint_add_sub" || value === "sprint_mixed";
}

function mapRouteModeToSetupMode(mode: "sprint_add_sub" | "sprint_mixed"): SprintMathModeId {
  if (mode === "sprint_mixed") {
    return "mixed";
  }
  return "add_sub";
}

export function SprintMathSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [setup, setSetup] = useState<SprintMathSetup>(() => getSprintMathSetup());

  const previewTask = useMemo(() => buildSprintMathTask(setup), [setup]);

  useEffect(() => {
    const requestedMode = searchParams.get("mode");
    if (!isSprintMathModeId(requestedMode)) {
      return;
    }

    setSetup((current) =>
      normalizeSprintMathSetup({
        ...current,
        modeId: mapRouteModeToSetupMode(requestedMode)
      })
    );
  }, [searchParams]);

  function update(next: Partial<SprintMathSetup>) {
    setSetup((current) => normalizeSprintMathSetup({ ...current, ...next }));
  }

  function startSession() {
    const normalized = normalizeSprintMathSetup(setup);
    saveSprintMathSetup(normalized);
    navigate("/training/sprint-math/session", {
      state: { setup: normalized } satisfies SessionNavState
    });
  }

  function resetDefaults() {
    setSetup(resetSprintMathSetup());
  }

  return (
    <section className="panel" data-testid="sprint-math-setup-page">
      <h2>Математический спринт</h2>
      <p className="session-intro-text">
        Тренировка устного счёта на скорость. Развивает быстроту вычислений, рабочую память и уверенность в математических операциях.
      </p>
      
      <InfoHint title="Как играть в Математический спринт" testId="sprint-setup-hint">
        <p><strong>1.</strong> Нажмите «Начать Математический спринт».</p>
        <p><strong>2.</strong> Решайте примеры как можно быстрее, вводя ответ в поле.</p>
        <p><strong>3.</strong> Подтверждайте ответ кнопкой «Проверить» или Enter.</p>
        <p><strong>4.</strong> Точность выше 85% заметно повышает итоговый score.</p>
        <hr />
        <p><strong>Что тренирует:</strong></p>
        <ul>
          <li>Скорость устных вычислений</li>
          <li>Рабочую память при удержании чисел</li>
          <li>Концентрацию и темп обработки информации</li>
        </ul>
        <p><strong>Совет:</strong> Начните с комфортного уровня и постепенно повышайте сложность. Лучше решать медленнее, но с точностью выше 90%.</p>
      </InfoHint>

      <section className="setup-block">
        <h3>Настройки сессии</h3>
        <div className="settings-form">
          <label htmlFor="sm-mode">Режим</label>
          <select
            id="sm-mode"
            value={setup.modeId}
            onChange={(event) => update({ modeId: event.target.value as SprintMathModeId })}
          >
            <option value="add_sub">Сложение и вычитание</option>
            <option value="mixed">Смешанный</option>
          </select>

          <label htmlFor="sm-tier">Уровень</label>
          <select
            id="sm-tier"
            value={setup.tierId}
            onChange={(event) => update({ tierId: event.target.value as SprintMathTierId })}
          >
            <option value="kids">Дети (7-10)</option>
            <option value="standard">Стандарт</option>
            <option value="pro">Продвинутый</option>
          </select>

          <label htmlFor="sm-sec">Длительность</label>
          <select
            id="sm-sec"
            value={setup.sessionSec}
            onChange={(event) =>
              update({ sessionSec: Number(event.target.value) as SprintMathSessionSec })
            }
          >
            <option value={30}>30 сек</option>
            <option value={60}>60 сек</option>
            <option value={90}>90 сек</option>
          </select>

          <label htmlFor="sm-max">Максимальное число</label>
          <input
            id="sm-max"
            type="number"
            min={5}
            max={200}
            step={1}
            value={setup.maxOperand}
            onChange={(event) => update({ maxOperand: Number(event.target.value) || 5 })}
          />

          <label htmlFor="sm-negative">
            <input
              id="sm-negative"
              type="checkbox"
              checked={setup.allowNegative}
              onChange={(event) => update({ allowNegative: event.target.checked })}
            />
            Разрешить отрицательные ответы
          </label>

          <label htmlFor="sm-division">
            <input
              id="sm-division"
              type="checkbox"
              checked={setup.allowDivision}
              onChange={(event) => update({ allowDivision: event.target.checked })}
              disabled={setup.tierId === "kids"}
            />
            Разрешить деление
          </label>

          <label htmlFor="sm-auto-enter">
            <input
              id="sm-auto-enter"
              type="checkbox"
              checked={setup.autoEnter}
              onChange={(event) => update({ autoEnter: event.target.checked })}
            />
            Авто-проверка (без Enter)
          </label>
        </div>
      </section>

      <section className="session-brief">
        <h3>Пример задания</h3>
        <p>{previewTask.expression} = ?</p>
        <p className="status-line">Правильный ответ: {previewTask.answer}</p>
      </section>

      <div className="action-row">
        <button type="button" className="btn-ghost" onClick={resetDefaults}>
          Сбросить настройки
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={startSession}
          data-testid="sprint-math-start-btn"
        >
          Начать Математический спринт
        </button>
      </div>
    </section>
  );
}

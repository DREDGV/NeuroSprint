import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildSprintMathTask, normalizeSprintMathSetup } from "../features/sprint-math/contract";
import { getSprintMathSetup, resetSprintMathSetup, saveSprintMathSetup } from "../features/sprint-math/setupStorage";
import type { SprintMathModeId, SprintMathSessionSec, SprintMathSetup, SprintMathTierId } from "../features/sprint-math/contract";

interface SessionNavState {
  setup: SprintMathSetup;
}

export function SprintMathSetupPage() {
  const navigate = useNavigate();
  const [setup, setSetup] = useState<SprintMathSetup>(() => getSprintMathSetup());

  const previewTask = useMemo(() => buildSprintMathTask(setup), [setup]);

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
      <h2>Sprint Math</h2>
      <p>
        Настройте сессию скоростного счета. Режим доступен по техническому маршруту и
        пока не выведен в основную навигацию.
      </p>

      <section className="setup-block">
        <h3>Настройки сессии</h3>
        <div className="settings-form">
          <label htmlFor="sm-mode">Режим</label>
          <select
            id="sm-mode"
            value={setup.modeId}
            onChange={(event) => update({ modeId: event.target.value as SprintMathModeId })}
          >
            <option value="add_sub">Сложение/вычитание</option>
            <option value="mixed">Смешанный</option>
          </select>

          <label htmlFor="sm-tier">Уровень</label>
          <select
            id="sm-tier"
            value={setup.tierId}
            onChange={(event) => update({ tierId: event.target.value as SprintMathTierId })}
          >
            <option value="kids">Kids (7-10)</option>
            <option value="standard">Standard</option>
            <option value="pro">Pro</option>
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
            Авто-Enter
          </label>
        </div>
      </section>

      <section className="session-brief">
        <h3>Превью задания</h3>
        <p>{previewTask.expression} = ?</p>
        <p className="status-line">Ответ: {previewTask.answer}</p>
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
          Начать Sprint Math
        </button>
      </div>
    </section>
  );
}

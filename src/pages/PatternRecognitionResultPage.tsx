import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getContentTypeTitle, getPatternModeTitle } from "../features/pattern-recognition/engine/patternConfig";
import type { PatternSessionMetrics, PatternSetup } from "../shared/types/pattern";

interface PatternResultNavState {
  metrics: PatternSessionMetrics;
  setup: PatternSetup;
}

interface StoredPatternResult {
  score: number;
  accuracy: number;
  durationMs: number;
  avgReactionTimeMs: number;
  streakBest: number;
  correctCount: number;
  totalQuestions: number;
  recordedAt: string;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatAccuracy(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatReaction(ms: number): string {
  return `${Math.round(ms)} мс`;
}

function formatLevel(level: PatternSetup["level"]): string {
  if (level === "kids") {
    return "Kids";
  }
  if (level === "pro") {
    return "Pro";
  }
  return "Standard";
}

function readStoredResult(key: string): StoredPatternResult | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredPatternResult>;
    if (
      typeof parsed.score !== "number" ||
      typeof parsed.accuracy !== "number" ||
      typeof parsed.durationMs !== "number" ||
      typeof parsed.avgReactionTimeMs !== "number" ||
      typeof parsed.streakBest !== "number" ||
      typeof parsed.correctCount !== "number" ||
      typeof parsed.totalQuestions !== "number"
    ) {
      return null;
    }
    return {
      score: parsed.score,
      accuracy: parsed.accuracy,
      durationMs: parsed.durationMs,
      avgReactionTimeMs: parsed.avgReactionTimeMs,
      streakBest: parsed.streakBest,
      correctCount: parsed.correctCount,
      totalQuestions: parsed.totalQuestions,
      recordedAt: typeof parsed.recordedAt === "string" ? parsed.recordedAt : ""
    };
  } catch {
    return null;
  }
}

function createStoredResult(metrics: PatternSessionMetrics): StoredPatternResult {
  return {
    score: metrics.score,
    accuracy: metrics.accuracy,
    durationMs: metrics.durationMs,
    avgReactionTimeMs: metrics.avgReactionTimeMs,
    streakBest: metrics.streakBest,
    correctCount: metrics.correctCount,
    totalQuestions: metrics.totalQuestions,
    recordedAt: new Date().toISOString()
  };
}

function buildHeroCopy(metrics: PatternSessionMetrics): { title: string; summary: string } {
  if (metrics.accuracy >= 0.9 && metrics.streakBest >= 4) {
    return {
      title: "Очень сильный раунд",
      summary: "Вы держали и точность, и ритм. Это уже не случайный ответ, а уверенное чтение закономерностей."
    };
  }
  if (metrics.accuracy >= 0.75) {
    return {
      title: "Хороший рабочий результат",
      summary: "База уже собрана: вы видите правило и чаще сохраняете точность, чем теряете её на спешке."
    };
  }
  return {
    title: "Есть база для следующего роста",
    summary: "Сейчас важнее не скорость, а чистое понимание правила. Следующий шаг — спокойнее читать последовательность до ответа."
  };
}

function buildTip(metrics: PatternSessionMetrics): { title: string; detail: string } {
  if (metrics.accuracy < 0.7) {
    return {
      title: "Сбавьте темп и считайте правило до конца",
      detail: "Сейчас полезнее делать на одну уверенную проверку больше перед выбором ответа, чем пытаться ускориться любой ценой."
    };
  }
  if (metrics.avgReactionTimeMs > 3200) {
    return {
      title: "Точность уже есть, теперь можно добавить темп",
      detail: "Вы редко теряете логику. Следующий рост придёт, если начнёте отвечать чуть раньше, не дожидаясь полной внутренней перепроверки."
    };
  }
  return {
    title: "Можно закрепить этот ритм",
    detail: "Ритм уже собран. Следующий полезный шаг — ещё один раунд в том же режиме, а нагрузку стоит поднимать только если точность держится стабильно."
  };
}

export function PatternRecognitionResultPage() {
  const location = useLocation();
  const navState = location.state as PatternResultNavState | null;
  const metrics = navState?.metrics ?? null;
  const setup = navState?.setup ?? null;
  const [lastResult, setLastResult] = useState<StoredPatternResult | null>(null);
  const [bestResultBeforeSave, setBestResultBeforeSave] = useState<StoredPatternResult | null>(null);

  useEffect(() => {
    if (!metrics) {
      return;
    }

    const previous = readStoredResult("neurosprint:pattern:last");
    const best = readStoredResult("neurosprint:pattern:best");
    setLastResult(previous);
    setBestResultBeforeSave(best);

    const current = createStoredResult(metrics);
    localStorage.setItem("neurosprint:pattern:last", JSON.stringify(current));
    if (!best || current.score > best.score) {
      localStorage.setItem("neurosprint:pattern:best", JSON.stringify(current));
    }
  }, [metrics]);

  const heroCopy = useMemo(() => (metrics ? buildHeroCopy(metrics) : null), [metrics]);
  const nextTip = useMemo(() => (metrics ? buildTip(metrics) : null), [metrics]);

  if (!metrics || !setup || !heroCopy || !nextTip) {
    return (
      <section className="panel result-panel pattern-result-panel pattern-result-page pattern-result-empty" data-testid="pattern-result-page">
        <div className="pattern-result-empty-card">
          <p className="stats-section-kicker">Результат недоступен</p>
          <h1>Сначала завершите раунд</h1>
          <p>
            Этот экран открывается только после законченной сессии Pattern Recognition. Вернитесь к
            тренажёру и пройдите раунд полностью.
          </p>
          <div className="action-row">
            <Link className="btn-primary" to="/training/pattern-recognition">
              К Распознаванию паттернов
            </Link>
            <Link className="btn-ghost" to="/training">
              К тренировкам
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const isNewBest = !bestResultBeforeSave || metrics.score > bestResultBeforeSave.score;
  const scoreDiff = lastResult ? metrics.score - lastResult.score : null;
  const bestReference = isNewBest ? createStoredResult(metrics) : bestResultBeforeSave;
  const modeTitle = getPatternModeTitle(setup.modeId);
  let comparisonCopy: {
    tone: "positive" | "warning" | "neutral";
    title: string;
    detail: string;
  };

  if (!lastResult || scoreDiff == null) {
    comparisonCopy = {
      tone: "neutral",
      title: "Первая сохранённая сессия",
      detail: "Это первая опорная точка. В фиксированных режимах следующая сессия уже даст прямое сравнение, а в adaptive полезнее смотреть серию из нескольких раундов."
    };
  } else if (scoreDiff === 0) {
    comparisonCopy = {
      tone: "neutral",
      title: "Почти вровень с прошлой попыткой",
      detail: "Результат держится стабильно. Теперь важнее выжать либо чуть выше точность, либо чуть быстрее решение."
    };
  } else if (scoreDiff > 0) {
    comparisonCopy = {
      tone: "positive",
      title: `Лучше прошлого раза на ${scoreDiff}`,
      detail: "Это хороший сигнал: текущий подход работает и его стоит закрепить ещё 1-2 спокойными раундами."
    };
  } else {
    comparisonCopy = {
      tone: "warning",
      title: `Ниже прошлого результата на ${Math.abs(scoreDiff)}`,
      detail: "Это не провал, а полезный сигнал. Обычно здесь помогает более медленный первый просмотр последовательности."
    };
  }

  return (
    <section className="panel result-panel pattern-result-panel pattern-result-page" data-testid="pattern-result-page">
      <div className="pattern-result-hero">
        <div className="pattern-result-copy">
          <p className="stats-section-kicker">Итог сессии</p>
          <h2>{heroCopy.title}</h2>
          <p className="pattern-result-lead">{heroCopy.summary}</p>
        </div>
        <div className="pattern-result-score-card">
          <span className="pattern-result-score-label">Score</span>
          <strong className="pattern-result-score-value">{metrics.score}</strong>
          <p className="pattern-result-score-meta">{modeTitle}</p>
          <div className="pattern-result-score-pills" aria-hidden="true">
            <span className="pattern-result-pill">{formatAccuracy(metrics.accuracy)}</span>
            <span className="pattern-result-pill">{formatDuration(metrics.durationMs)}</span>
            <span className="pattern-result-pill">Уровень {formatLevel(setup.level)}</span>
          </div>
        </div>
      </div>

      <div className="pattern-result-layout">
        <div className="pattern-result-main">
          <section className="pattern-result-section">
            <div className="pattern-result-section-head">
              <div>
                <p className="stats-section-kicker">Разбор</p>
                <h2>Что получилось в этом раунде</h2>
              </div>
            </div>
            <div className="pattern-result-metrics-grid">
              <article className="pattern-result-metric-card">
                <span>Верных ответов</span>
                <strong>{metrics.correctCount}/{metrics.totalQuestions}</strong>
              </article>
              <article className="pattern-result-metric-card">
                <span>Точность</span>
                <strong>{formatAccuracy(metrics.accuracy)}</strong>
              </article>
              <article className="pattern-result-metric-card">
                <span>Среднее время</span>
                <strong>{formatReaction(metrics.avgReactionTimeMs)}</strong>
              </article>
              <article className="pattern-result-metric-card">
                <span>Лучшая серия</span>
                <strong>x{metrics.streakBest}</strong>
              </article>
              <article className="pattern-result-metric-card">
                <span>Уровень</span>
                <strong>{formatLevel(setup.level)}</strong>
              </article>
              <article className="pattern-result-metric-card">
                <span>Типов паттернов</span>
                <strong>{metrics.patternTypes.length}</strong>
              </article>
            </div>
          </section>

          <div className="pattern-result-insights">
            <article className={`pattern-result-callout is-${comparisonCopy.tone}`} data-testid="pattern-result-comparison">
              <p className="stats-section-kicker">Сравнение</p>
              <h3>{comparisonCopy.title}</h3>
              <p>{comparisonCopy.detail}</p>
            </article>
            <article className="pattern-result-callout" data-testid="pattern-result-next-step">
              <p className="stats-section-kicker">Следующий шаг</p>
              <h3>{nextTip.title}</h3>
              <p>{nextTip.detail}</p>
            </article>
          </div>
        </div>

        <aside className="pattern-result-side">
          <section className="pattern-result-side-card">
            <p className="stats-section-kicker">Контекст</p>
            <h3>{modeTitle}</h3>
            <div className="pattern-result-side-pills" aria-hidden="true">
              <span className="pattern-result-pill">Уровень: {formatLevel(setup.level)}</span>
              <span className="pattern-result-pill">Вопросов: {metrics.totalQuestions}</span>
              <span className="pattern-result-pill">Контент: {getContentTypeTitle(setup.contentType)}</span>
              {setup.modeId === "pattern_multi" && <span className="pattern-result-pill">Пропусков: {setup.gaps ?? 2}</span>}
              <span className="pattern-result-pill">Подсказки: {setup.showHints ? "вкл" : "выкл"}</span>
            </div>
            <p>
              {setup.showHints
                ? "Это был более мягкий режим с подсказками. Для следующего шага можно сохранить тот же ритм или убрать часть внешней поддержки."
                : "Режим уже требует самостоятельного чтения правила. Такой раунд полезен как рабочий ориентир, но adaptive и multi-gap лучше оценивать серией, а не одной попыткой."}
            </p>
          </section>

          <section className="pattern-result-side-card">
            <p className="stats-section-kicker">Личный ориентир</p>
            <h3>{isNewBest ? "Новый лучший результат" : "Лучший результат пока выше"}</h3>
            {bestReference ? (
              <div className="pattern-result-best-block" data-testid="pattern-result-best">
                <strong>{bestReference.score}</strong>
                <span>{formatAccuracy(bestReference.accuracy)} • {formatDuration(bestReference.durationMs)}</span>
              </div>
            ) : null}
            <p>
              {isNewBest
                ? "Эту попытку уже можно считать новой опорной точкой для следующего роста."
                : "Лучший результат полезен как ориентир темпа. Не пытайтесь догнать его ценой потери точности."}
            </p>
          </section>

          <div className="action-row pattern-result-actions">
            <Link className="btn-primary" to="/training/pattern-recognition" data-testid="pattern-retry-link">
              Сыграть ещё
            </Link>
            <Link className="btn-secondary" to="/stats" data-testid="pattern-stats-link">
              К статистике
            </Link>
            <Link className="btn-ghost" to="/training">
              К тренировкам
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}

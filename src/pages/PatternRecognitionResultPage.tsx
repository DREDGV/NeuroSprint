import { useLocation, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import type { PatternSessionMetrics } from '../../shared/types/pattern';
import type { PatternSetup } from '../../shared/types/pattern';
import { getPatternModeTitle } from '../engine/patternConfig';

interface PatternResultNavState {
  metrics: PatternSessionMetrics;
  setup: PatternSetup;
}

export function PatternRecognitionResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const navState = location.state as PatternResultNavState | null;
  const metrics = navState?.metrics;
  const setup = navState?.setup;

  const { 
    bestSession, 
    lastSession, 
    scoreDiff 
  } = useMemo(() => {
    if (!metrics) {
      return { bestSession: null, lastSession: null, scoreDiff: 0 };
    }

    try {
      const storedBest = localStorage.getItem('neurosprint:pattern:best');
      const storedLast = localStorage.getItem('neurosprint:pattern:last');
      
      const best = storedBest ? JSON.parse(storedBest) : null;
      const last = storedLast ? JSON.parse(storedLast) : null;
      
      // Сохраняем текущий как последний
      localStorage.setItem('neurosprint:pattern:last', JSON.stringify(metrics));
      
      // Обновляем лучший, если текущий лучше
      if (!best || metrics.score > best.score) {
        localStorage.setItem('neurosprint:pattern:best', JSON.stringify(metrics));
      }
      
      return {
        bestSession: best,
        lastSession: last,
        scoreDiff: last ? metrics.score - last.score : 0
      };
    } catch {
      return { bestSession: null, lastSession: null, scoreDiff: 0 };
    }
  }, [metrics]);

  if (!metrics || !setup) {
    return (
      <section className="panel">
        <p className="status-line">Загрузка результатов...</p>
      </section>
    );
  }

  return (
    <section className="panel result-panel" data-testid="pattern-result-page">
      <h2>Результаты</h2>
      
      {/* Основной счет */}
      <div className="result-score-display">
        <span className="result-score-value">{metrics.score}</span>
        <span className="result-score-label">Очки</span>
      </div>

      {/* Сравнение */}
      <div className="result-comparison">
        {scoreDiff > 0 && (
          <p className="result-comparison-positive">
            📈 Лучше прошлого раза на {scoreDiff}
          </p>
        )}
        {scoreDiff < 0 && (
          <p className="result-comparison-negative">
            📉 Хуже прошлого раза на {Math.abs(scoreDiff)}
          </p>
        )}
        {scoreDiff === 0 && lastSession && (
          <p className="result-comparison-neutral">
            ➡️ Так же, как в прошлый раз
          </p>
        )}
        {!lastSession && (
          <p className="result-comparison-neutral">
            🎉 Первая тренировка!
          </p>
        )}
      </div>

      {/* Детальные метрики */}
      <section className="result-metrics">
        <h3>Метрики</h3>
        
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-value">{metrics.correctCount}/{metrics.totalQuestions}</span>
            <span className="metric-label">Правильно</span>
          </div>
          
          <div className="metric-card">
            <span className="metric-value">{Math.round(metrics.accuracy * 100)}%</span>
            <span className="metric-label">Точность</span>
          </div>
          
          <div className="metric-card">
            <span className="metric-value">{Math.round(metrics.avgReactionTimeMs)} мс</span>
            <span className="metric-label">Ср. время</span>
          </div>
          
          <div className="metric-card">
            <span className="metric-value">{metrics.streakBest}</span>
            <span className="metric-label">Лучшая серия</span>
          </div>
        </div>
      </section>

      {/* Лучший результат */}
      {bestSession && (
        <section className="result-best">
          <h3>🏆 Личный рекорд</h3>
          <p>
            <strong>{bestSession.score}</strong> очков
            {bestSession.streakBest > 0 && (
              <span> (серия x{bestSession.streakBest})</span>
            )}
          </p>
        </section>
      )}

      {/* Рекомендации */}
      <section className="result-tips">
        <h3>💡 Как улучшить результат</h3>
        {metrics.accuracy < 0.7 ? (
          <p>
            Сосредоточьтесь на точности, а не на скорости. 
            Внимательно изучайте последовательность перед ответом.
          </p>
        ) : metrics.avgReactionTimeMs > 3000 ? (
          <p>
            Вы точны, но медленны. Попробуйте отвечать быстрее, 
            доверяя первой интуиции.
          </p>
        ) : metrics.streakBest < 3 ? (
          <p>
            Поддерживайте концентрацию throughout всей сессии. 
            Каждая ошибка сбрасывает серию!
          </p>
        ) : (
          <p>
            Отличная работа! Попробуйте уровень сложнее 
            или режим «На время» для нового вызова.
          </p>
        )}
      </section>

      {/* Действия */}
      <div className="result-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigate('/training/pattern-recognition')}
          data-testid="pattern-restart-btn"
        >
          Ещё раз
        </button>
        
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate('/stats')}
          data-testid="pattern-stats-btn"
        >
          Статистика
        </button>
        
        <button
          type="button"
          className="btn-ghost"
          onClick={() => navigate('/training')}
        >
          В меню
        </button>
      </div>
    </section>
  );
}

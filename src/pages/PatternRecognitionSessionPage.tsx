import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PatternSequence, PatternOptions } from '../features/pattern-recognition/components/PatternDisplay';
import {
  generatePatternQuestion,
  generatePatternQuestions,
  calculatePatternScore,
  levelToNumber,
  numberToLevel
} from '../features/pattern-recognition/engine/patternGenerator';
import type { PatternSetup, PatternQuestion, PatternAnswer, PatternLevel } from '../shared/types/pattern';
import type { Session } from '../shared/types/domain';
import { sessionRepository } from '../entities/session/sessionRepository';
import { useActiveUser } from '../app/ActiveUserContext';

interface PatternSessionNavState {
  setup: PatternSetup;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function PatternRecognitionSessionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeUserId } = useActiveUser();
  
  const navState = location.state as PatternSessionNavState | null;
  const setup = navState?.setup;

  const [questions, setQuestions] = useState<PatternQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<PatternAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [streak, setStreak] = useState(0);
  const [currentLevel, setCurrentLevel] = useState<PatternLevel>('standard');

  // Для Progressive режима
  const [errorCount, setErrorCount] = useState(0);

  const currentQuestion = questions[currentQuestionIndex];

  // Инициализация сессии
  useEffect(() => {
    if (!setup) {
      navigate('/training/pattern-recognition');
      return;
    }

    setStartTime(Date.now());
    setQuestionStartTime(Date.now());

    // Генерируем вопросы
    if (setup.modeId === 'pattern_classic') {
      const initialQuestions = generatePatternQuestions(
        setup.questionCount,
        setup.level,
        setup.elementTypes
      );
      setQuestions(initialQuestions);
    } else if (setup.modeId === 'pattern_timed' || setup.modeId === 'pattern_progressive') {
      // Генерируем пул вопросов (будем добавлять по мере необходимости)
      const initialQuestions = generatePatternQuestions(
        50,
        setup.level,
        setup.elementTypes
      );
      setQuestions(initialQuestions);
    }
  }, [setup, navigate]);

  // Таймер для timed режима
  useEffect(() => {
    if (!setup || setup.modeId !== 'pattern_timed' || isFinished) {
      return;
    }

    const interval = setInterval(() => {
      if (startTime) {
        const elapsed = Date.now() - startTime;
        setElapsedTime(elapsed);

        if (elapsed >= setup.durationSec * 1000) {
          finishSession();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [setup, startTime, isFinished]);

  const metrics = useMemo(() => {
    const correctCount = answers.filter(a => a.isCorrect).length;
    const errors = answers.filter(a => !a.isCorrect).length;
    const accuracy = answers.length > 0 ? correctCount / answers.length : 0;
    
    const correctAnswers = answers.filter(a => a.isCorrect);
    const avgReactionTimeMs = correctAnswers.length > 0
      ? correctAnswers.reduce((sum, a) => sum + a.reactionTimeMs, 0) / correctAnswers.length
      : 0;

    const firstCorrectTimeMs = correctAnswers.length > 0
      ? Math.min(...correctAnswers.map(a => a.reactionTimeMs))
      : null;

    const patternTypes = [...new Set(questions.map(q => q.patternType))];
    const levels = questions.map(q => levelToNumber(q.level));
    const maxLevel = Math.max(...levels, 1);
    const avgLevel = levels.length > 0 
      ? levels.reduce((sum, l) => sum + l, 0) / levels.length 
      : 1;

    // Лучшая серия
    let streakBest = 0;
    let currentStreak = 0;
    for (const answer of answers) {
      if (answer.isCorrect) {
        currentStreak++;
        streakBest = Math.max(streakBest, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    const score = calculatePatternScore({
      correctCount,
      totalQuestions: answers.length,
      avgLevel,
      streakBest,
      accuracy
    });

    return {
      totalQuestions: answers.length,
      correctCount,
      errors,
      accuracy,
      durationMs: elapsedTime,
      avgReactionTimeMs,
      firstCorrectTimeMs,
      maxLevel,
      avgLevel,
      patternTypes,
      streakBest,
      score
    };
  }, [answers, questions, elapsedTime]);

  function handleAnswer(selectedIndex: number) {
    if (!currentQuestion || selectedAnswer !== null || isFinished) {
      return;
    }

    const reactionTime = questionStartTime ? Date.now() - questionStartTime : 0;
    const isCorrect = selectedIndex === currentQuestion.correctIndex;

    const answer: PatternAnswer = {
      questionId: currentQuestion.id,
      selectedIndex,
      isCorrect,
      reactionTimeMs: reactionTime,
      timestamp: Date.now()
    };

    setSelectedAnswer(selectedIndex);
    setShowResult(true);
    setAnswers(prev => [...prev, answer]);

    // Обновляем серию
    if (isCorrect) {
      setStreak(prev => prev + 1);
    } else {
      setStreak(0);
      setErrorCount(prev => prev + 1);
    }

    // Переход к следующему вопросу
    setTimeout(() => {
      if (setup?.modeId === 'pattern_progressive') {
        // Адаптация сложности
        if (streak >= 3 && currentLevel !== 'pro') {
          const nextLevel = currentLevel === 'kids' ? 'standard' : 'pro';
          setCurrentLevel(nextLevel);
        } else if (errorCount >= 2 && currentLevel !== 'kids') {
          const nextLevel = currentLevel === 'pro' ? 'standard' : 'kids';
          setCurrentLevel(nextLevel);
        }

        // Проверка окончания (3 ошибки)
        if (errorCount + 1 >= 3) {
          finishSession();
          return;
        }
      }

      // Переход к следующему вопросу
      const nextIndex = currentQuestionIndex + 1;
      
      if (setup?.modeId === 'pattern_timed') {
        // Для timed режима генерируем новые вопросы
        if (nextIndex >= questions.length - 5) {
          const newQuestions = generatePatternQuestions(
            20,
            setup.level,
            setup.elementTypes
          );
          setQuestions(prev => [...prev, ...newQuestions]);
        }
      }

      if (setup?.modeId === 'pattern_classic' && nextIndex >= questions.length) {
        finishSession();
        return;
      }

      setCurrentQuestionIndex(nextIndex);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuestionStartTime(Date.now());
    }, 800);
  }

  async function finishSession() {
    if (isFinished || !activeUserId || !setup) {
      return;
    }

    setIsFinished(true);

    // Сохраняем сессию
    const session: Session = {
      id: `pattern-${Date.now()}-${Math.random()}`,
      userId: activeUserId,
      taskId: 'pattern_recognition',
      moduleId: 'pattern_recognition',
      modeId: setup.modeId,
      mode: 'pattern_recognition',
      timestamp: new Date().toISOString(),
      localDate: new Date().toISOString().split('T')[0],
      durationMs: elapsedTime,
      score: metrics.score,
      accuracy: metrics.accuracy,
      speed: metrics.avgReactionTimeMs > 0 ? 1000 / metrics.avgReactionTimeMs : 0,
      errors: metrics.errors,
      correctCount: metrics.correctCount,
      level: levelToNumber(setup.level),
      presetId: 'pattern_v1',
      adaptiveSource: setup.modeId === 'pattern_progressive' ? 'auto' : 'manual',
      visualThemeId: 'classic',
      audioEnabledSnapshot: {
        muted: false,
        volume: 0.35,
        startEnd: true,
        click: false,
        correct: false,
        error: false
      },
      // Дополнительные метрики для Pattern Recognition
      reactionP90Ms: metrics.avgReactionTimeMs,
      trialsTotal: metrics.totalQuestions,
      bestCombo: metrics.streakBest,
      points: metrics.score
    };

    await sessionRepository.save(session);

    // Переход на экран результатов
    navigate('/training/pattern-recognition/result', {
      state: { metrics, setup }
    });
  }

  if (!setup || !currentQuestion) {
    return (
      <section className="panel session-panel">
        <p className="status-line">Загрузка...</p>
      </section>
    );
  }

  return (
    <section className="panel session-panel" data-testid="pattern-session-page">
      {/* Header */}
      <header className="session-header">
        <div className="session-timer">
          {setup.modeId === 'pattern_timed' ? (
            <span className="timer-value">{formatTime(setup.durationSec * 1000 - elapsedTime)}</span>
          ) : (
            <span className="question-counter">
              {currentQuestionIndex + 1} / {setup.modeId === 'pattern_classic' ? setup.questionCount : '∞'}
            </span>
          )}
        </div>
        
        {streak >= 2 && (
          <div className="session-streak" data-testid="pattern-streak">
            🔥 x{streak}
          </div>
        )}

        <div className="session-accuracy">
          Точность: {Math.round(metrics.accuracy * 100)}%
        </div>
      </header>

      {/* Question */}
      <div className="pattern-session-content">
        <h3 className="pattern-instruction">Что будет следующим?</h3>
        
        <PatternSequence
          sequence={currentQuestion.sequence}
          elementSize={64}
        />

        <PatternOptions
          options={currentQuestion.options}
          correctIndex={currentQuestion.correctIndex}
          onSelect={handleAnswer}
          disabled={showResult}
          selectedAnswer={selectedAnswer}
          showResult={showResult}
        />
      </div>

      {/* Footer */}
      <footer className="session-footer">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => navigate('/training/pattern-recognition')}
        >
          Выйти
        </button>
        
        {setup.modeId === 'pattern_progressive' && (
          <span className="status-line">
            Ошибок: {errorCount}/3 | Уровень: {currentLevel}
          </span>
        )}
      </footer>
    </section>
  );
}

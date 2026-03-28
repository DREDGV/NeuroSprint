import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useActiveUser } from "../app/ActiveUserContext";
import { sessionRepository } from "../entities/session/sessionRepository";
import { PatternOptions, PatternSequence } from "../features/pattern-recognition/components/PatternDisplay";
import { normalizePatternSetup } from "../features/pattern-recognition/engine/patternConfig";
import {
  calculatePatternScore,
  generatePatternQuestion,
  generatePatternQuestions,
  levelToNumber,
  resolvePatternDifficulty,
  type PatternGenerationOptions
} from "../features/pattern-recognition/engine/patternGenerator";
import { getPatternHint, type PatternHint } from "../features/pattern-recognition/engine/patternHints";
import { getPatternSetup } from "../features/pattern-recognition/setupStorage";
import { InfoHint } from "../shared/ui/InfoHint";
import type {
  PatternAnswer,
  PatternLevel,
  PatternQuestion,
  PatternSessionMetrics,
  PatternSetup
} from "../shared/types/pattern";
import type { Session } from "../shared/types/domain";

interface PatternSessionNavState {
  setup: PatternSetup;
}

function formatTime(ms: number): string {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getCorrectIndices(question: PatternQuestion): number[] {
  return Array.isArray(question.correctIndex) ? question.correctIndex : [question.correctIndex];
}

function computePatternMetrics(
  answerLog: PatternAnswer[],
  answeredQuestions: PatternQuestion[],
  durationMs: number
): PatternSessionMetrics {
  const correctCount = answerLog.filter((answer) => answer.isCorrect).length;
  const errors = answerLog.filter((answer) => !answer.isCorrect).length;
  const accuracy = answerLog.length > 0 ? correctCount / answerLog.length : 0;
  const correctAnswers = answerLog.filter((answer) => answer.isCorrect);
  const avgReactionTimeMs =
    correctAnswers.length > 0
      ? correctAnswers.reduce((sum, answer) => sum + answer.reactionTimeMs, 0) / correctAnswers.length
      : 0;
  const firstCorrectTimeMs =
    correctAnswers.length > 0 ? Math.min(...correctAnswers.map((answer) => answer.reactionTimeMs)) : null;
  const levels = answeredQuestions.map((question) => levelToNumber(question.level));
  const maxLevel = levels.length > 0 ? Math.max(...levels) : 1;
  const avgLevel = levels.length > 0 ? levels.reduce((sum, level) => sum + level, 0) / levels.length : 1;

  let streakBest = 0;
  let currentStreak = 0;
  for (const answer of answerLog) {
    if (answer.isCorrect) {
      currentStreak += 1;
      streakBest = Math.max(streakBest, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return {
    totalQuestions: answerLog.length,
    correctCount,
    errors,
    accuracy,
    durationMs,
    avgReactionTimeMs,
    firstCorrectTimeMs,
    maxLevel,
    avgLevel,
    patternTypes: [...new Set(answeredQuestions.map((question) => question.patternType))],
    streakBest,
    score: calculatePatternScore({
      correctCount,
      totalQuestions: answerLog.length,
      avgLevel,
      streakBest,
      accuracy
    })
  };
}

function buildInitialQuestions(
  setup: PatternSetup,
  baseGenerationOptions: PatternGenerationOptions
): PatternQuestion[] {
  if (
    setup.modeId === "pattern_classic" ||
    setup.modeId === "pattern_learning" ||
    setup.modeId === "pattern_multi"
  ) {
    return generatePatternQuestions(
      setup.questionCount,
      setup.level,
      setup.elementTypes,
      setup.contentType,
      {
        ...baseGenerationOptions,
        questionIndex: 0
      }
    );
  }

  if (setup.modeId === "pattern_timed") {
    return generatePatternQuestions(20, setup.level, setup.elementTypes, setup.contentType, {
      ...baseGenerationOptions,
      questionIndex: 0
    });
  }

  return [
    generatePatternQuestion(setup.level, setup.elementTypes, setup.contentType, undefined, {
      ...baseGenerationOptions,
      questionIndex: 0,
      adaptiveState: {
        streak: 0,
        errorCount: 0
      }
    })
  ];
}

export function PatternRecognitionSessionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeUserId } = useActiveUser();
  const navState = location.state as PatternSessionNavState | null;
  const [setup] = useState<PatternSetup>(() =>
    normalizePatternSetup(navState?.setup ?? getPatternSetup())
  );
  const initialGenerationOptions: PatternGenerationOptions = {
    gaps: setup.modeId === "pattern_multi" ? setup.gaps ?? 2 : 1,
    multiGap: setup.modeId === "pattern_multi",
    modeId: setup.modeId
  };

  const [questions, setQuestions] = useState<PatternQuestion[]>(() =>
    buildInitialQuestions(setup, initialGenerationOptions)
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<PatternAnswer[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [streak, setStreak] = useState(0);
  const [currentLevel, setCurrentLevel] = useState<PatternLevel>("standard");
  const [errorCount, setErrorCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintCredits, setHintCredits] = useState(3); // Лимит подсказок-ответов
  const [usedHintOnQuestion, setUsedHintOnQuestion] = useState<number | null>(null); // Индекс вопроса, где использовали подсказку

  const currentQuestion = questions[currentQuestionIndex];
  const answeredQuestions = useMemo(() => questions.slice(0, answers.length), [questions, answers.length]);
  const metrics = useMemo(
    () => computePatternMetrics(answers, answeredQuestions, elapsedTime),
    [answers, answeredQuestions, elapsedTime]
  );
  const baseGenerationOptions = useMemo<PatternGenerationOptions>(
    () => ({
      gaps: setup?.modeId === "pattern_multi" ? setup.gaps ?? 2 : 1,
      multiGap: setup?.modeId === "pattern_multi",
      modeId: setup?.modeId
    }),
    [setup]
  );
  const currentDifficulty = useMemo(() => {
    if (!setup) {
      return null;
    }

    return resolvePatternDifficulty(currentLevel, setup.contentType, {
      ...baseGenerationOptions,
      questionIndex: answers.length,
      adaptiveState: {
        streak,
        errorCount
      }
    });
  }, [answers.length, baseGenerationOptions, currentLevel, errorCount, setup, streak]);

  const currentHint: PatternHint | null = useMemo(() => {
    if (!currentQuestion) {
      return null;
    }
    return getPatternHint(currentQuestion.patternType);
  }, [currentQuestion]);

  useEffect(() => {
    if (!setup) {
      // Показываем сообщение и перенаправляем через 2 секунды
      setIsLoading(false);
      const timer = window.setTimeout(() => {
        navigate("/training/pattern-recognition");
      }, 2000);
      return () => window.clearTimeout(timer);
    }

    const now = Date.now();
    setStartTime(now);
    setQuestionStartTime(now);
    setElapsedTime(0);
    setIsFinished(false);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setSelectedAnswers([]);
    setShowResult(false);
    setStreak(0);
    setCurrentLevel(setup.level);
    setErrorCount(0);
    setIsLoading(false);

    setQuestions(buildInitialQuestions(setup, baseGenerationOptions));
  }, [baseGenerationOptions, navigate, setup]);

  useEffect(() => {
    if (!setup || setup.modeId !== "pattern_timed" || isFinished) {
      return;
    }

    const interval = setInterval(() => {
      if (!startTime) {
        return;
      }

      const duration = Date.now() - startTime;
      setElapsedTime(duration);

      if (duration >= setup.durationSec * 1000) {
        void finishSession();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isFinished, setup, startTime]);

  function evaluateAnswer(question: PatternQuestion, chosenIndices: number[]) {
    const correctIndices = getCorrectIndices(question);
    const partialCorrectCount = correctIndices.reduce(
      (count, correctIndex, slotIndex) => count + (chosenIndices[slotIndex] === correctIndex ? 1 : 0),
      0
    );

    return {
      correctIndices,
      partialCorrectCount,
      isCorrect: partialCorrectCount === correctIndices.length
    };
  }

  function handleOptionSelect(selectedIndex: number) {
    if (!currentQuestion || showResult || isFinished) {
      return;
    }

    if (currentQuestion.answersNeeded <= 1) {
      submitAnswer([selectedIndex]);
      return;
    }

    setSelectedAnswers((currentSelection) => {
      if (currentSelection.length >= currentQuestion.answersNeeded) {
        return currentSelection;
      }
      return [...currentSelection, selectedIndex];
    });
  }

  function handleRemoveSelection(slotIndex: number) {
    if (showResult || isFinished) {
      return;
    }

    setSelectedAnswers((currentSelection) =>
      currentSelection.filter((_, currentIndex) => currentIndex !== slotIndex)
    );
  }

  function handleResetSelection() {
    if (showResult || isFinished) {
      return;
    }

    setSelectedAnswers([]);
  }

  function handleConfirmSelection() {
    if (
      !currentQuestion ||
      currentQuestion.answersNeeded <= 1 ||
      selectedAnswers.length !== currentQuestion.answersNeeded ||
      showResult ||
      isFinished
    ) {
      return;
    }

    submitAnswer(selectedAnswers);
  }

  function handleUseHintAnswer() {
    if (!currentQuestion || showResult || isFinished || hintCredits <= 0) {
      return;
    }

    // Получаем правильные индексы
    const correctIndices = Array.isArray(currentQuestion.correctIndex)
      ? currentQuestion.correctIndex
      : [currentQuestion.correctIndex];

    // Заполняем ответы правильными значениями
    setSelectedAnswers(correctIndices);
    setUsedHintOnQuestion(currentQuestionIndex);

    // Отправляем ответ (но не засчитываем в серию)
    const reactionTime = questionStartTime ? Date.now() - questionStartTime : 0;
    const nextAnswer: PatternAnswer = {
      questionId: currentQuestion.id,
      selectedIndex: currentQuestion.answersNeeded <= 1 ? correctIndices[0] ?? -1 : [...correctIndices],
      isCorrect: false, // Не засчитываем как правильный ответ
      reactionTimeMs: reactionTime,
      timestamp: Date.now(),
      partialCorrectCount: currentQuestion.answersNeeded,
      answersNeeded: currentQuestion.answersNeeded
    };

    setAnswers([...answers, nextAnswer]);
    setStreak(0); // Сбрасываем серию
    setHintCredits(hintCredits - 1); // Тратим подсказку
    setShowResult(true);

    // Переход к следующему вопросу через 1.5 сек
    window.setTimeout(() => {
      goToNextQuestion();
    }, 1500);
  }

  function goToNextQuestion() {
    if (!setup) {
      return;
    }

    const nextIndex = currentQuestionIndex + 1;
    let questionPoolLength = questions.length;

    // Генерация новых вопросов для timed и progressive режимов
    if (setup.modeId === "pattern_timed" && nextIndex >= questions.length - 5) {
      const newQuestions = generatePatternQuestions(
        10,
        setup.level,
        setup.elementTypes,
        setup.contentType,
        {
          ...baseGenerationOptions,
          questionIndex: questions.length,
          adaptiveState: {
            streak,
            errorCount
          }
        }
      );
      questionPoolLength += newQuestions.length;
      setQuestions((currentQuestions) => [...currentQuestions, ...newQuestions]);
    }

    if (setup.modeId === "pattern_progressive" && nextIndex >= questions.length) {
      const nextQuestion = generatePatternQuestion(
        currentLevel,
        setup.elementTypes,
        setup.contentType,
        undefined,
        {
          ...baseGenerationOptions,
          questionIndex: nextIndex,
          adaptiveState: {
            streak,
            errorCount
          }
        }
      );
      questionPoolLength += 1;
      setQuestions((currentQuestions) => [...currentQuestions, nextQuestion]);
    }

    const hasFixedLength =
      setup.modeId === "pattern_classic" ||
      setup.modeId === "pattern_learning" ||
      setup.modeId === "pattern_multi" ||
      setup.modeId === "pattern_survival";

    if (hasFixedLength && nextIndex >= setup.questionCount) {
      void finishSession();
      return;
    }

    if (nextIndex >= questionPoolLength) {
      void finishSession();
      return;
    }

    setCurrentQuestionIndex(nextIndex);
    setSelectedAnswers([]);
    setShowResult(false);
    setQuestionStartTime(Date.now());
  }

  function submitAnswer(chosenIndices: number[]) {
    if (!currentQuestion || showResult || isFinished) {
      return;
    }

    const reactionTime = questionStartTime ? Date.now() - questionStartTime : 0;
    const evaluation = evaluateAnswer(currentQuestion, chosenIndices);
    const nextAnswer: PatternAnswer = {
      questionId: currentQuestion.id,
      selectedIndex: currentQuestion.answersNeeded <= 1 ? chosenIndices[0] ?? -1 : [...chosenIndices],
      isCorrect: evaluation.isCorrect,
      reactionTimeMs: reactionTime,
      timestamp: Date.now(),
      partialCorrectCount: evaluation.partialCorrectCount,
      answersNeeded: currentQuestion.answersNeeded
    };
    const nextAnswers = [...answers, nextAnswer];
    const nextStreak = evaluation.isCorrect ? streak + 1 : 0;
    const nextErrorCount = evaluation.isCorrect ? errorCount : errorCount + 1;

    setSelectedAnswers([...chosenIndices]);
    setShowResult(true);
    setAnswers(nextAnswers);
    setStreak(nextStreak);
    setErrorCount(nextErrorCount);

    window.setTimeout(() => {
      if (!setup) {
        return;
      }

      let nextLevel = currentLevel;
      if (setup.modeId === "pattern_progressive") {
        if (evaluation.isCorrect && nextStreak >= 3 && currentLevel !== "pro") {
          nextLevel = currentLevel === "kids" ? "standard" : "pro";
        } else if (!evaluation.isCorrect && nextErrorCount >= 2 && currentLevel !== "kids") {
          nextLevel = currentLevel === "pro" ? "standard" : "kids";
        }

        if (nextLevel !== currentLevel) {
          setCurrentLevel(nextLevel);
        }

        if (nextErrorCount >= 3) {
          void finishSession(nextAnswers);
          return;
        }
      }

      // Обновляем streak и errorCount перед переходом
      setStreak(nextStreak);
      setErrorCount(nextErrorCount);

      goToNextQuestion();
    }, 900);
  }

  async function finishSession(finalAnswers: PatternAnswer[] = answers) {
    if (isFinished || !activeUserId || !setup) {
      return;
    }

    setIsFinished(true);
    const finalDurationMs =
      startTime != null ? Math.max(1, Date.now() - startTime) : Math.max(1, elapsedTime);
    const finalQuestions = questions.slice(0, finalAnswers.length);
    const finalMetrics = computePatternMetrics(finalAnswers, finalQuestions, finalDurationMs);

    setElapsedTime(finalDurationMs);

    const session: Session = {
      id: `pattern-${Date.now()}-${Math.random()}`,
      userId: activeUserId,
      taskId: "pattern_recognition",
      moduleId: "pattern_recognition",
      modeId: setup.modeId,
      mode: "pattern_recognition",
      timestamp: new Date().toISOString(),
      localDate: new Date().toISOString().split("T")[0],
      durationMs: finalDurationMs,
      score: finalMetrics.score,
      accuracy: finalMetrics.accuracy,
      speed: finalMetrics.avgReactionTimeMs > 0 ? 1000 / finalMetrics.avgReactionTimeMs : 0,
      errors: finalMetrics.errors,
      correctCount: finalMetrics.correctCount,
      level: levelToNumber(setup.level),
      presetId: "legacy",
      adaptiveSource: setup.modeId === "pattern_progressive" ? "auto" : "manual",
      visualThemeId: "classic_bw",
      audioEnabledSnapshot: {
        muted: false,
        volume: 0.35,
        startEnd: true,
        click: false,
        correct: false,
        error: false
      },
      difficulty: {
        gridSize: 5,
        numbersCount: 25,
        mode: "pattern_recognition"
      },
      reactionP90Ms: finalMetrics.avgReactionTimeMs,
      trialsTotal: finalMetrics.totalQuestions,
      bestCombo: finalMetrics.streakBest,
      points: finalMetrics.score
    };

    await sessionRepository.save(session);

    navigate("/training/pattern-recognition/result", {
      state: { metrics: finalMetrics, setup }
    });
  }

  if (isLoading) {
    return (
      <section className="panel session-panel">
        <p className="status-line">Загрузка...</p>
      </section>
    );
  }

  if (!setup || !currentQuestion) {
    return (
      <section className="panel session-panel">
        <div className="pattern-session-empty">
          <h2>Сессия не найдена</h2>
          <p>Откройте эту страницу из меню Pattern Recognition или начните новую сессию.</p>
          <p className="status-line">Перенаправление...</p>
        </div>
      </section>
    );
  }

  const isTimedMode = setup.modeId === "pattern_timed";
  const visibleQuestionTotal =
    setup.modeId === "pattern_progressive" || setup.modeId === "pattern_timed" ? "∞" : String(setup.questionCount);
  const isMultiAnswerQuestion = currentQuestion.answersNeeded > 1;
  const isSelectionFull = isMultiAnswerQuestion && selectedAnswers.length >= currentQuestion.answersNeeded;

  // Keyboard navigation
  useEffect(() => {
    if (!currentQuestion || showResult || isFinished) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      // Number keys 1-9 for options
      if (event.key >= "1" && event.key <= "9") {
        const optionIndex = parseInt(event.key, 10) - 1;
        if (optionIndex < currentQuestion.options.length) {
          handleOptionSelect(optionIndex);
        }
      }
      // Enter/Space to confirm multi-answer selection
      if ((event.key === "Enter" || event.key === " ") && isMultiAnswerQuestion) {
        event.preventDefault();
        handleConfirmSelection();
      }
      // Escape to reset selection
      if (event.key === "Escape" && isMultiAnswerQuestion) {
        handleResetSelection();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentQuestion, showResult, isFinished, isMultiAnswerQuestion, selectedAnswers, handleOptionSelect, handleConfirmSelection, handleResetSelection]);

  return (
    <section className="panel session-panel" data-testid="pattern-session-page">
      <header className="session-header">
        <div className="session-timer">
          {isTimedMode ? (
            <span className="timer-value">{formatTime(setup.durationSec * 1000 - elapsedTime)}</span>
          ) : (
            <span className="question-counter">
              {currentQuestionIndex + 1} / {visibleQuestionTotal}
            </span>
          )}
        </div>

        {streak >= 2 && (
          <div className="session-streak" data-testid="pattern-streak">
            x{streak}
          </div>
        )}

        <div className="session-hints">
          <span className="hint-credits">
            💡×{hintCredits}
          </span>
        </div>

        <div className="session-accuracy">Точность: {Math.round(metrics.accuracy * 100)}%</div>
      </header>

      {!isTimedMode && setup.modeId !== "pattern_progressive" && (
        <div className="session-progress-bar">
          <div
            className="session-progress-fill"
            style={{ width: `${((currentQuestionIndex + 1) / setup.questionCount) * 100}%` }}
          />
        </div>
      )}

      <div className="pattern-session-content">
        <div className="pattern-instruction-row">
          <h3 className="pattern-instruction">
            {isMultiAnswerQuestion ? "Заполните все пропуски по порядку" : "Что будет следующим?"}
          </h3>
          <button
            type="button"
            className="btn-icon hint-btn"
            onClick={() => setShowHint(!showHint)}
            title="Показать подсказку"
            data-testid="pattern-hint-btn"
          >
            📖
          </button>
        </div>

        {currentHint && showHint && (
          <InfoHint title={currentHint.title} testId="pattern-hint-content">
            <p><strong>Правило:</strong> {currentHint.rule}</p>
            <p><strong>Пример:</strong> {currentHint.example}</p>
            <p><strong>Совет:</strong> {currentHint.tip}</p>
          </InfoHint>
        )}

        {currentDifficulty && (
          <p className="status-line" data-testid="pattern-difficulty-copy">
            {currentDifficulty.description}
          </p>
        )}

        <PatternSequence
          sequence={currentQuestion.sequence}
          options={currentQuestion.options}
          selectedAnswers={selectedAnswers}
          correctIndex={currentQuestion.correctIndex}
          gaps={currentQuestion.gaps}
          elementSize={48}
          patternType={currentQuestion.patternType}
          showHint={setup.showHints || setup.modeId === "pattern_learning"}
          showResult={showResult}
          onRemoveSelection={isMultiAnswerQuestion ? handleRemoveSelection : undefined}
        />

        <PatternOptions
          options={currentQuestion.options}
          correctIndex={currentQuestion.correctIndex}
          onSelect={handleOptionSelect}
          disabled={showResult || isSelectionFull}
          selectedAnswers={selectedAnswers}
          showResult={showResult}
        />

        {!showResult && hintCredits > 0 && (
          <div className="pattern-hint-answer-panel">
            <button
              type="button"
              className="btn-ghost hint-answer-btn"
              onClick={handleUseHintAnswer}
              disabled={isMultiAnswerQuestion && selectedAnswers.length > 0}
              data-testid="pattern-hint-answer-btn"
            >
              💡 Использовать подсказку ({hintCredits} ост.)
            </button>
            <p className="pattern-hint-answer-tip">
              Покажет правильный ответ, но сбросит серию и не засчитается в точность
            </p>
          </div>
        )}

        {isMultiAnswerQuestion && (
          <div className="pattern-selection-panel" data-testid="pattern-selection-panel">
            <div className="pattern-selection-status" data-testid="pattern-selection-status">
              Выбрано {selectedAnswers.length} из {currentQuestion.answersNeeded}
            </div>
            <div className="pattern-selection-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={handleResetSelection}
                disabled={selectedAnswers.length === 0 || showResult}
                data-testid="pattern-reset-selection"
              >
                Сбросить
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmSelection}
                disabled={selectedAnswers.length !== currentQuestion.answersNeeded || showResult}
                data-testid="pattern-confirm-selection"
              >
                Подтвердить
              </button>
            </div>
            <p className="pattern-selection-tip">Нажмите на заполненный слот, если хотите заменить ответ.</p>
          </div>
        )}
      </div>

      <footer className="session-footer">
        <button type="button" className="btn-ghost" onClick={() => navigate("/training/pattern-recognition")}>
          Выйти
        </button>

        {setup.modeId === "pattern_progressive" && (
          <span className="status-line">
            Ошибок: {errorCount}/3 | Уровень: {currentLevel}
            {currentDifficulty ? ` | Этап: ${currentDifficulty.stageLabel}` : ""}
          </span>
        )}

        {setup.modeId === "pattern_learning" && showResult && currentQuestion.explanation && (
          <div className="pattern-explanation" data-testid="pattern-explanation">
            {currentQuestion.explanation}
          </div>
        )}
      </footer>
    </section>
  );
}

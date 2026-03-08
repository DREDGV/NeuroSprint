import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import { sessionRepository } from "../entities/session/sessionRepository";
import { DEFAULT_AUDIO_SETTINGS } from "../shared/lib/audio/audioSettings";
import { toLocalDateKey } from "../shared/lib/date/date";
import { createId } from "../shared/lib/id";
import { SessionResultSummary } from "../shared/ui/SessionResultSummary";
import type { Session } from "../shared/types/domain";

type MatchDifficulty = "easy" | "medium" | "hard";
type MatchPhase = "setup" | "preview" | "play" | "result";
type FeedbackTone = "match" | "mismatch" | "neutral";

interface MatchConfig {
  label: string;
  description: string;
  pairs: number;
  columns: 4 | 6;
  previewSec: number;
  level: number;
}

interface MatchResult {
  durationMs: number;
  accuracy: number;
  speed: number;
  score: number;
}

interface ResultFeedback {
  title: string;
  tip: string;
  nextStep: string;
}

interface MemoryCard {
  id: string;
  label: string;
  emoji: string;
  tint: string;
  surface: string;
}

const CARD_LIBRARY: MemoryCard[] = [
  { id: "books", label: "Книги", emoji: "📚", tint: "#2c8a6c", surface: "#e9fbf3" },
  { id: "board", label: "Доска", emoji: "🧮", tint: "#2383d8", surface: "#edf6ff" },
  { id: "globe", label: "Глобус", emoji: "🌍", tint: "#f3aa2d", surface: "#fff7e7" },
  { id: "lightbulb", label: "Идея", emoji: "💡", tint: "#f8c339", surface: "#fff8df" },
  { id: "trophy", label: "Кубок", emoji: "🏆", tint: "#d89b17", surface: "#fff4dc" },
  { id: "microscope", label: "Наука", emoji: "🔬", tint: "#f26f61", surface: "#fff0ee" },
  { id: "flask", label: "Колба", emoji: "🧪", tint: "#33a6d8", surface: "#ecf9ff" },
  { id: "owl", label: "Сова", emoji: "🦉", tint: "#6f5de5", surface: "#f3efff" },
  { id: "atom", label: "Атом", emoji: "⚛️", tint: "#2bb6b0", surface: "#e9fffb" },
  { id: "scroll", label: "Свиток", emoji: "📜", tint: "#d87c3f", surface: "#fff1e6" },
  { id: "medal", label: "Медаль", emoji: "🎖️", tint: "#ffb62a", surface: "#fff7df" },
  { id: "bell", label: "Звонок", emoji: "🔔", tint: "#ff9f37", surface: "#fff1df" },
  { id: "apple", label: "Яблоко", emoji: "🍎", tint: "#f15454", surface: "#fff0f0" },
  { id: "dino", label: "Динозавр", emoji: "🦖", tint: "#55b855", surface: "#eefbea" },
  { id: "planet", label: "Планета", emoji: "🪐", tint: "#8b62eb", surface: "#f3eeff" },
  { id: "rocket", label: "Ракета", emoji: "🚀", tint: "#f2644d", surface: "#fff0ed" },
  { id: "brain", label: "Мозг", emoji: "🧠", tint: "#f07ec2", surface: "#fff0fb" },
  { id: "hourglass", label: "Часы", emoji: "⏳", tint: "#8f63e6", surface: "#f3efff" },
  { id: "robot", label: "Робот", emoji: "🤖", tint: "#2c8fd6", surface: "#eef7ff" },
  { id: "hearts", label: "Сердце", emoji: "💖", tint: "#ef5d8f", surface: "#fff0f5" },
  { id: "frog", label: "Лягушка", emoji: "🐸", tint: "#4dbb6a", surface: "#eefbea" },
  { id: "duck", label: "Утка", emoji: "🦆", tint: "#ffbe32", surface: "#fff7e0" },
  { id: "ball", label: "Мяч", emoji: "⚽", tint: "#697988", surface: "#f3f6f8" },
  { id: "star", label: "Звезда", emoji: "⭐", tint: "#f3a823", surface: "#fff6df" },
  { id: "puzzle", label: "Пазл", emoji: "🧩", tint: "#4ab8d8", surface: "#eefbff" },
  { id: "burger", label: "Бургер", emoji: "🍔", tint: "#d98b2d", surface: "#fff3e2" },
  { id: "music", label: "Музыка", emoji: "🎹", tint: "#ffbf2d", surface: "#fff7df" },
  { id: "paint", label: "Краски", emoji: "🎨", tint: "#37a7c7", surface: "#eefbff" },
  { id: "computer", label: "Код", emoji: "💻", tint: "#8d64e8", surface: "#f2efff" },
  { id: "math", label: "Счёт", emoji: "➗", tint: "#2f88de", surface: "#edf6ff" },
  { id: "backpack", label: "Рюкзак", emoji: "🎒", tint: "#2e8dd9", surface: "#eef6ff" },
  { id: "book", label: "Учёба", emoji: "📖", tint: "#7a64e2", surface: "#f2efff" }
];

const PREVIEW_SYMBOLS = CARD_LIBRARY.slice(0, 6);
const DIFFICULTY_CONFIG: Record<MatchDifficulty, MatchConfig> = {
  easy: {
    label: "Легко (4x4)",
    description: "Небольшое поле и длинный предпросмотр. Подходит для первого знакомства.",
    pairs: 8,
    columns: 4,
    previewSec: 6,
    level: 1
  },
  medium: {
    label: "Средне (6x6)",
    description: "Полное поле 6x6 и обычный темп. Нужно удерживать больше позиций и быстрее принимать решения.",
    pairs: 18,
    columns: 6,
    previewSec: 4,
    level: 5
  },
  hard: {
    label: "Сложно (6x6 быстро)",
    description: "Большое поле и короткий предпросмотр. Ошибки сразу бьют по темпу и score.",
    pairs: 18,
    columns: 6,
    previewSec: 2,
    level: 8
  }
};

function shuffle<T>(source: T[]): T[] {
  const copy = [...source];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function buildDeck(pairs: number): MemoryCard[] {
  const selected = shuffle(CARD_LIBRARY).slice(0, pairs);
  return shuffle([...selected, ...selected]);
}

function formatSeconds(value: number): string {
  return `${Math.max(0, value)} сек`;
}

function pickBestSession(sessions: Session[]): Session | null {
  if (sessions.length === 0) {
    return null;
  }
  return sessions.reduce((best, current) => (current.score > best.score ? current : best));
}

function calculateAccuracy(moves: number, matchedPairs: number): number {
  if (moves === 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, matchedPairs / moves));
}

function calculateScore(speed: number, accuracy: number, errors: number): number {
  return Math.max(0, Math.round(speed * 8 * (0.7 + 0.3 * accuracy) - errors * 4));
}

function buildResult(durationMs: number, moves: number, matchedPairs: number, errors: number): MatchResult {
  const safeDurationMs = Math.max(1, durationMs);
  const accuracy = calculateAccuracy(moves, matchedPairs);
  const speed = matchedPairs / (safeDurationMs / 60_000);
  const score = calculateScore(speed, accuracy, errors);

  return {
    durationMs: safeDurationMs,
    accuracy,
    speed,
    score
  };
}

function buildSession(
  userId: string,
  config: MatchConfig,
  result: MatchResult,
  moves: number,
  errors: number
): Session {
  const now = new Date();
  const matchedPairs = Math.max(0, moves - errors);

  return {
    id: createId(),
    userId,
    taskId: "memory_match",
    mode: "memory_match",
    moduleId: "memory_match",
    modeId: "memory_match_classic",
    level: config.level,
    presetId: "legacy",
    adaptiveSource: "manual",
    timestamp: now.toISOString(),
    localDate: toLocalDateKey(now),
    durationMs: result.durationMs,
    score: result.score,
    accuracy: result.accuracy,
    speed: result.speed,
    errors,
    correctCount: matchedPairs,
    effectiveCorrect: matchedPairs - errors * 0.5,
    audioEnabledSnapshot: DEFAULT_AUDIO_SETTINGS,
    difficulty: {
      gridSize: config.columns,
      numbersCount: config.pairs,
      mode: "memory_match"
    }
  };
}

function filterComparableSessions(sessions: Session[], config: MatchConfig): Session[] {
  return sessions.filter(
    (entry) =>
      entry.moduleId === "memory_match" &&
      entry.modeId === "memory_match_classic" &&
      entry.difficulty?.gridSize === config.columns &&
      entry.difficulty?.numbersCount === config.pairs
  );
}

function getCardPositionLabel(index: number, columns: number): string {
  const row = Math.floor(index / columns) + 1;
  const column = (index % columns) + 1;
  return `${row} ряд, ${column} колонка`;
}

function buildResultFeedback(result: MatchResult, errors: number, difficulty: MatchDifficulty): ResultFeedback {
  if (result.accuracy >= 0.95 && errors === 0) {
    return {
      title: "Очень сильный раунд",
      tip: "Вы закрыли поле без ошибок и не потеряли темп. Это уже выглядит как уверенное владение модулем.",
      nextStep:
        difficulty === "easy"
          ? "Повторите ещё 1 раунд и переходите на среднюю сложность."
          : difficulty === "medium"
            ? "Можно пробовать hard или закрепить medium ещё одним чистым раундом."
            : "Сохраните этот темп ещё в одном раунде: hard уже поддаётся."
    };
  }

  if (result.accuracy >= 0.8) {
    return {
      title: "Хороший устойчивый раунд",
      tip: "База уже есть: вы находите пары без большого числа лишних ходов и держите рабочий темп.",
      nextStep:
        difficulty === "hard"
          ? "Сделайте ещё один раунд на hard и попробуйте сократить 1-2 лишние ошибки."
          : "Повторите этот же уровень и попробуйте улучшить либо темп, либо точность, но не оба сразу."
    };
  }

  return {
    title: "Базу уже видно, но точность ещё плавает",
    tip: "Сейчас важнее не спешить, а стабильно помнить последние открытые позиции и не дублировать ошибки.",
    nextStep:
      difficulty === "easy"
        ? "Сыграйте ещё 1-2 спокойных раунда на easy, пока ошибки не станут редкими."
        : "Снизьте темп и сначала собирайте знакомые пары из последних промахов."
  };
}

export function MemoryMatchPage() {
  const { activeUserId, activeUserName } = useActiveUserDisplayName();
  const [difficulty, setDifficulty] = useState<MatchDifficulty>("easy");
  const [phase, setPhase] = useState<MatchPhase>("setup");
  const [roundKey, setRoundKey] = useState(0);
  const [deck, setDeck] = useState<MemoryCard[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [errors, setErrors] = useState(0);
  const [locked, setLocked] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [previewRemainingSec, setPreviewRemainingSec] = useState(0);
  const [feedbackText, setFeedbackText] = useState("Соберите все пары без лишних ошибок.");
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("neutral");
  const [lastMismatch, setLastMismatch] = useState<number[]>([]);
  const [lastMismatchSymbols, setLastMismatchSymbols] = useState<string[]>([]);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previousSession, setPreviousSession] = useState<Session | null>(null);
  const [bestSession, setBestSession] = useState<Session | null>(null);
  const [baselineBestSession, setBaselineBestSession] = useState<Session | null>(null);

  const previewTimerRef = useRef<number | null>(null);
  const mismatchTimerRef = useRef<number | null>(null);
  const compareTimerRef = useRef<number | null>(null);

  const hasActiveUser = Boolean(activeUserId);
  const config = DIFFICULTY_CONFIG[difficulty];
  const matchedPairs = Math.floor(matched.size / 2);
  const totalPairs = config.pairs;
  const pairsLeft = Math.max(0, totalPairs - matchedPairs);
  const accuracy = useMemo(() => calculateAccuracy(moves, matchedPairs), [matchedPairs, moves]);
  const liveScore = useMemo(
    () => calculateScore(matchedPairs / (Math.max(1, elapsedMs) / 60_000), accuracy, errors),
    [accuracy, elapsedMs, errors, matchedPairs]
  );
  const shownCards = phase === "preview" ? deck.map((_, index) => index) : flipped;
  const isComplete = deck.length > 0 && matched.size === deck.length;
  const resultSummary = result ?? buildResult(elapsedMs, moves, matchedPairs, errors);
  const resultFeedback = useMemo(
    () => buildResultFeedback(resultSummary, errors, difficulty),
    [difficulty, errors, resultSummary]
  );
  const isNewBest = useMemo(() => {
    if (!saved || saveError || !hasActiveUser) {
      return false;
    }
    if (!baselineBestSession) {
      return true;
    }
    return resultSummary.score > baselineBestSession.score;
  }, [baselineBestSession, hasActiveUser, resultSummary.score, saveError, saved]);
  const tiedBest = useMemo(() => {
    if (!saved || saveError || !hasActiveUser || !baselineBestSession) {
      return false;
    }
    return resultSummary.score === baselineBestSession.score;
  }, [baselineBestSession, hasActiveUser, resultSummary.score, saveError, saved]);
  const focusTitle = phase === "preview" ? "Сейчас главное" : "Что делать сейчас";
  const focusText =
    phase === "preview"
      ? `За ${config.previewSec} сек выберите взглядом 3-4 самые заметные пары и запомните их места.`
      : pairsLeft === 0
        ? "Поле собрано. Осталось дождаться итога раунда."
        : lastMismatchSymbols.length === 2
          ? `Вернитесь к последней трудной паре: ${lastMismatchSymbols[0]} и ${lastMismatchSymbols[1]}.`
          : `Осталось ${pairsLeft} пар. Сначала ищите карточки, которые вы уже видели совсем недавно.`;
  const boardCardSize = config.columns === 4 ? "clamp(68px, 11vw, 124px)" : "clamp(44px, 7vw, 88px)";
  const boardGridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${config.columns}, ${boardCardSize})`
  };
  const boardTitle = phase === "preview" ? "Сначала запомните поле" : "Теперь спокойно собирайте пары";
  const canInteract = phase === "play" && !locked;
  const boardHint =
    phase === "preview"
      ? "Карточки пока открыты только для запоминания. Нажимать ещё не нужно."
      : "Открывайте по две карточки. После промаха сначала возвращайтесь к последней трудной паре.";

  useEffect(() => {
    return () => {
      if (previewTimerRef.current != null) {
        window.clearInterval(previewTimerRef.current);
      }
      if (mismatchTimerRef.current != null) {
        window.clearTimeout(mismatchTimerRef.current);
      }
      if (compareTimerRef.current != null) {
        window.clearTimeout(compareTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (phase !== "preview") {
      return;
    }

    const previewEndsAt = Date.now() + config.previewSec * 1000;
    setPreviewRemainingSec(config.previewSec);
    setFeedbackTone("neutral");
    setFeedbackText(`Запоминайте позиции. Карточки закроются через ${config.previewSec} сек.`);

    previewTimerRef.current = window.setInterval(() => {
      const remainingMs = Math.max(0, previewEndsAt - Date.now());
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setPreviewRemainingSec(remainingSec);

      if (remainingMs <= 0) {
        if (previewTimerRef.current != null) {
          window.clearInterval(previewTimerRef.current);
          previewTimerRef.current = null;
        }
        setFlipped([]);
        setLocked(false);
        setPhase("play");
        setStartedAt(Date.now());
        setFeedbackText("Поле открыто: теперь можно нажимать по две карточки и держать в памяти последние ошибки.");
      }
    }, 100);

    return () => {
      if (previewTimerRef.current != null) {
        window.clearInterval(previewTimerRef.current);
        previewTimerRef.current = null;
      }
    };
  }, [config.previewSec, phase, roundKey]);

  useEffect(() => {
    if (phase !== "play" || startedAt == null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 200);

    return () => window.clearInterval(intervalId);
  }, [phase, startedAt]);

  useEffect(() => {
    if (phase !== "play" || !isComplete || startedAt == null || result) {
      return;
    }

    const durationMs = Date.now() - startedAt;
    setElapsedMs(durationMs);
    setStartedAt(null);
    setLocked(true);
    setFeedbackTone("match");
    setFeedbackText("Все пары собраны. Подводим итог.");
    setResult(buildResult(durationMs, moves, matchedPairs, errors));
    setPhase("result");
  }, [errors, isComplete, matchedPairs, moves, phase, result, startedAt]);

  useEffect(() => {
    if (!activeUserId || phase !== "result" || !result || saved) {
      return;
    }

    let cancelled = false;
    setSaveError(null);

    void (async () => {
      try {
        const history = await sessionRepository.listByUser(activeUserId);
        if (cancelled) {
          return;
        }

        const comparableHistory = filterComparableSessions(history, config);
        const previous = comparableHistory[0] ?? null;
        const best = pickBestSession(comparableHistory);
        setPreviousSession(previous);
        setBestSession(best);
        setBaselineBestSession(best);

        const nextSession = buildSession(activeUserId, config, result, moves, errors);
        await sessionRepository.save(nextSession);
        if (cancelled) {
          return;
        }

        setBestSession(best && best.score >= nextSession.score ? best : nextSession);
        setSaved(true);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setSaveError(error instanceof Error ? error.message : "Не удалось сохранить результат.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeUserId, config, errors, moves, phase, result, saved]);

  function clearRoundTimers(): void {
    if (previewTimerRef.current != null) {
      window.clearInterval(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (mismatchTimerRef.current != null) {
      window.clearTimeout(mismatchTimerRef.current);
      mismatchTimerRef.current = null;
    }
    if (compareTimerRef.current != null) {
      window.clearTimeout(compareTimerRef.current);
      compareTimerRef.current = null;
    }
  }

  function startSession(): void {
    clearRoundTimers();

    const nextDeck = buildDeck(config.pairs);
    setRoundKey((value) => value + 1);
    setDeck(nextDeck);
    setFlipped(nextDeck.map((_, index) => index));
    setMatched(new Set());
    setMoves(0);
    setErrors(0);
    setLocked(true);
    setElapsedMs(0);
    setStartedAt(null);
    setPreviewRemainingSec(config.previewSec);
    setResult(null);
    setSaved(false);
    setSaveError(null);
    setPreviousSession(null);
    setBestSession(null);
    setBaselineBestSession(null);
    setLastMismatch([]);
    setLastMismatchSymbols([]);
    setFeedbackTone("neutral");
    setFeedbackText(`Запоминайте расположение карт. Время предпросмотра: ${config.previewSec} сек.`);
    setPhase("preview");
  }

  function resetToSetup(): void {
    clearRoundTimers();
    setPhase("setup");
    setDeck([]);
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setErrors(0);
    setLocked(false);
    setElapsedMs(0);
    setStartedAt(null);
    setPreviewRemainingSec(0);
    setFeedbackText("Соберите все пары без лишних ошибок.");
    setFeedbackTone("neutral");
    setLastMismatch([]);
    setLastMismatchSymbols([]);
    setResult(null);
    setSaved(false);
    setSaveError(null);
    setPreviousSession(null);
    setBestSession(null);
    setBaselineBestSession(null);
  }

  function onCardClick(index: number): void {
    if (phase !== "play" || locked || matched.has(index) || flipped.includes(index)) {
      return;
    }

    const nextFlipped = [...flipped, index];
    setFlipped(nextFlipped);

    if (nextFlipped.length < 2) {
      setFeedbackTone("neutral");
      setFeedbackText("Выберите вторую карточку и проверьте, совпадает ли символ.");
      return;
    }

    setMoves((value) => value + 1);
    setLocked(true);

    const [first, second] = nextFlipped;
    const isMatch = deck[first]?.id === deck[second]?.id;

    compareTimerRef.current = window.setTimeout(() => {
      if (isMatch) {
        const remainingPairs = Math.max(0, totalPairs - (matchedPairs + 1));
        setMatched((prev) => new Set([...prev, first, second]));
        setFeedbackTone("match");
        setFeedbackText(
          remainingPairs === 0
            ? `Пара «${deck[first]?.label}» найдена. Это последняя пара раунда.`
            : `Пара «${deck[first]?.label}» найдена. Осталось ${remainingPairs} пар.`
        );
        setLastMismatch([]);
        setLastMismatchSymbols([]);
      } else {
        const firstPosition = getCardPositionLabel(first, config.columns);
        const secondPosition = getCardPositionLabel(second, config.columns);
        setErrors((value) => value + 1);
        setFeedbackTone("mismatch");
        setFeedbackText(
          `Не совпало: «${deck[first]?.label}» и «${deck[second]?.label}». Запомните ${firstPosition} и ${secondPosition}.`
        );
        setLastMismatch([first, second]);
        setLastMismatchSymbols([deck[first]?.label ?? "", deck[second]?.label ?? ""]);
      }

      mismatchTimerRef.current = window.setTimeout(() => {
        setFlipped([]);
        setLastMismatch([]);
        setLocked(false);
      }, isMatch ? 260 : 700);
    }, 320);
  }

  return (
    <section className="panel" data-testid="memory-match-page">
      <h2>Memory Match</h2>
      <p>
        Новый тренажёр на зрительную память и удержание позиций. Цель — быстро найти все пары и не
        тратить попытки на повтор одних и тех же ошибок.
      </p>
      <p className="status-line">
        Активный пользователь: <strong>{activeUserName}</strong>
      </p>

      {phase === "setup" ? (
        <div className="memory-match-setup-shell">
          <div className="setup-block memory-match-hero" data-testid="memory-match-setup-summary">
            <p className="stats-section-kicker">Перед стартом</p>
            <h3>Запомните пары, а потом соберите поле без спешки и лишних промахов</h3>
            <p className="memory-match-hero-text">
              Memory Match должен ощущаться как короткий, понятный раунд: увидел поле, запомнил опоры,
              собрал пары, понял свой результат.
            </p>
            <div className="memory-match-preview-strip" aria-hidden="true">
              {PREVIEW_SYMBOLS.map((card) => (
                <span key={`memory-match-preview-${card.id}`} className="memory-match-preview-icon">
                  {card.emoji}
                </span>
              ))}
            </div>
            <div className="stats-grid compact memory-match-setup-grid">
              <div className="stat-card">
                <div className="stat-card-content">
                  <span className="stat-card-label">Что тренируем</span>
                  <span className="stat-card-value">Память на позиции</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-content">
                  <span className="stat-card-label">Главная цель</span>
                  <span className="stat-card-value">Все пары без лишних ходов</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-content">
                  <span className="stat-card-label">Хороший раунд</span>
                  <span className="stat-card-value">Точность выше 80%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="setup-block memory-match-round-plan">
            <h3>Как проходит раунд</h3>
            <ol className="memory-match-checklist">
              <li>Сначала быстро найдите взглядом 3-4 самые понятные пары.</li>
              <li>После закрытия поля открывайте только по две карточки за ход.</li>
              <li>Если ошиблись, запоминайте не значок, а место на поле.</li>
            </ol>
            <div className="memory-match-setup-meta">
              <p><strong>Сложность:</strong> {config.description}</p>
              <p><strong>Поле:</strong> {config.columns}x{config.columns}</p>
              <p><strong>Пар карточек:</strong> {config.pairs}</p>
              <p><strong>Предпросмотр:</strong> {config.previewSec} сек</p>
              <p className="comparison-note">
                Сравнение предыдущего и лучшего результата идёт только внутри этой же сложности.
              </p>
              {!hasActiveUser ? (
                <p className="error-text">Сначала выберите активного пользователя, иначе раунд не сохранится.</p>
              ) : null}
            </div>
          </div>

          <div className="memory-match-setup-controls">
            <div className="segmented-row memory-match-difficulty-row">
              {(["easy", "medium", "hard"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  className={difficulty === level ? "btn-secondary is-active" : "btn-secondary"}
                  onClick={() => setDifficulty(level)}
                  data-testid={`memory-match-difficulty-${level}`}
                >
                  {DIFFICULTY_CONFIG[level].label}
                </button>
              ))}
            </div>

            <div className="action-row memory-match-setup-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={startSession}
                data-testid="memory-match-start"
                disabled={!hasActiveUser}
              >
                Начать тренировку
              </button>
              <Link className="btn-ghost" to="/training">
                К тренировкам
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "preview" || phase === "play" ? (
        <div className={`memory-match-session-shell phase-${phase}`} data-testid="memory-match-session-shell" data-phase={phase}>
          <div className="memory-match-hud" data-testid="memory-match-live-summary">
            <div className="memory-match-hud-top">
              <div>
                <p className="stats-section-kicker">{phase === "preview" ? "Запоминание" : "Игровой ход"}</p>
                <h3>{boardTitle}</h3>
                <p>{boardHint}</p>
              </div>
              <div className="memory-match-hud-actions">
                <button type="button" className="btn-secondary" onClick={startSession} data-testid="memory-match-restart">
                  Начать заново
                </button>
                <button type="button" className="btn-ghost" onClick={resetToSetup}>
                  Сменить уровень
                </button>
              </div>
            </div>

            <div className="memory-match-hud-metrics">
              <div className="memory-match-hud-card">
                <span className="memory-match-hud-label">Стадия</span>
                <strong className="memory-match-hud-value">
                  {phase === "preview" ? `Запоминание ${previewRemainingSec}с` : "Поиск пар"}
                </strong>
              </div>
              <div className="memory-match-hud-card">
                <span className="memory-match-hud-label">Время</span>
                <strong className="memory-match-hud-value">{formatSeconds(Math.floor(elapsedMs / 1000))}</strong>
              </div>
              <div className="memory-match-hud-card">
                <span className="memory-match-hud-label">Собрано</span>
                <strong className="memory-match-hud-value">{matchedPairs}/{totalPairs} пар</strong>
              </div>
              <div className="memory-match-hud-card">
                <span className="memory-match-hud-label">Ошибки</span>
                <strong className="memory-match-hud-value">{errors}</strong>
              </div>
              <div className="memory-match-hud-card">
                <span className="memory-match-hud-label">Точность</span>
                <strong className="memory-match-hud-value">{Math.round(accuracy * 100)}%</strong>
              </div>
              <div className="memory-match-hud-card is-accent">
                <span className="memory-match-hud-label">Следующий ориентир</span>
                <strong className="memory-match-hud-value">
                  {phase === "preview" ? "Запомнить 3-4 пары" : `${pairsLeft} пар осталось`}
                </strong>
              </div>
            </div>
          </div>

          <div className="memory-match-board-layout">
            <div className="memory-match-board-panel">
              <div className="memory-match-board-header">
                <div>
                  <p className="stats-section-kicker">Поле раунда</p>
                  <h3>{config.label}</h3>
                </div>
                <p className="comparison-note memory-match-board-note">{boardHint}</p>
              </div>

              <div
                className={`memory-match-grid ${phase === "preview" ? "is-preview" : ""} ${config.columns === 6 ? "is-compact-board" : "is-standard-board"}`}
                style={boardGridStyle}
                data-testid="memory-match-grid"
              >
                {deck.map((card, index) => {
                  const isShown = shownCards.includes(index) || matched.has(index);
                  const isMismatch = lastMismatch.includes(index);
                  const positionLabel = getCardPositionLabel(index, config.columns);
                  const classNames = ["memory-match-card"];
                  if (canInteract && !matched.has(index)) {
                    classNames.push("is-interactive");
                  }
                  if (isShown) {
                    classNames.push("is-open");
                  } else {
                    classNames.push("is-facedown");
                  }
                  if (matched.has(index)) {
                    classNames.push("is-matched");
                  }
                  if (isMismatch) {
                    classNames.push("is-mismatch");
                  }
                  const cardStyle = {
                    "--memory-card-surface": card.surface,
                    "--memory-card-accent": card.tint
                  } as CSSProperties;

                  return (
                    <button
                      key={`card-${index}`}
                      type="button"
                      className={classNames.join(" ")}
                      style={cardStyle}
                      onClick={() => onCardClick(index)}
                      disabled={matched.has(index)}
                      aria-disabled={!canInteract || matched.has(index)}
                      aria-label={
                        isShown
                          ? `Карточка ${positionLabel}, открыта, значок ${card.label}`
                          : matched.has(index)
                            ? `Карточка ${positionLabel}, пара уже найдена`
                            : `Карточка ${positionLabel}, закрыта`
                      }
                      aria-pressed={isShown}
                      data-card-key={card.id}
                      data-testid={`memory-match-card-${index}`}
                    >
                      <span className="memory-match-card-face">
                        {isShown ? (
                          <>
                            <span className="memory-match-card-figure">
                              <span className="memory-match-card-icon" aria-hidden="true">{card.emoji}</span>
                            </span>
                            <span className="memory-match-card-caption">{card.label}</span>
                          </>
                        ) : (
                          <span className="memory-match-card-back" aria-hidden="true">
                            <span className="memory-match-card-back-symbol">◈</span>
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <aside className="memory-match-side-panel">
              <div className="setup-block memory-match-focus" data-testid="memory-match-focus">
                <p className="stats-section-kicker">{phase === "preview" ? "Сейчас" : "Подсказка"}</p>
                <h3>{focusTitle}</h3>
                <p>{focusText}</p>
              </div>

              <div className={`setup-block memory-match-status memory-match-status-${feedbackTone}`}>
                <p><strong>{phase === "preview" ? "Подготовка" : "Обратная связь"}:</strong> {feedbackText}</p>
                {phase === "play" ? <p>Промежуточный score: <strong>{liveScore}</strong></p> : null}
                {phase === "play" && lastMismatchSymbols.length === 2 ? (
                  <p className="comparison-note" data-testid="memory-match-review-note">
                    Последняя трудная пара: {lastMismatchSymbols[0]} и {lastMismatchSymbols[1]}.
                  </p>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      ) : null}

      {phase === "result" ? (
        <>
          <div className="setup-block memory-match-result-hero" data-testid="memory-match-result-hero">
            <p className="stats-section-kicker">Итог раунда</p>
            <h3>{resultFeedback.title}</h3>
            <p>{resultFeedback.nextStep}</p>
          </div>
          <SessionResultSummary
            testId="memory-match-result"
            title="Результаты Memory Match"
            metrics={[
              { label: "Время", value: formatSeconds(Math.round(resultSummary.durationMs / 1000)) },
              { label: "Попытки", value: String(moves) },
              { label: "Ошибки", value: String(errors) },
              { label: "Точность", value: `${Math.round(resultSummary.accuracy * 100)}%` },
              { label: "Скорость", value: `${resultSummary.speed.toFixed(1)} пар/мин` },
              { label: "Score", value: String(resultSummary.score) }
            ]}
            previousSummary={
              previousSession
                ? `Прошлый результат на этой же сложности: ${previousSession.score} score за ${Math.round(previousSession.durationMs / 1000)} сек.`
                : `Это первый сохранённый раунд на сложности ${config.label}.`
            }
            bestSummary={
              bestSession
                ? `Лучший результат на этой же сложности: ${bestSession.score} score.`
                : null
            }
            tip={resultFeedback.tip}
            saveSummary={
              !hasActiveUser
                ? "Результат не сохранён: сначала выберите активного пользователя."
                : saveError
                  ? "Сохранить результат не удалось. Можно сразу сыграть ещё раз."
                  : saved
                    ? "Результат сохранён локально как отдельная сессия Memory Match."
                    : "Сохраняем результат локально..."
            }
            saveState={
              !hasActiveUser
                ? undefined
                : saveError
                  ? { text: saveError, testId: "memory-match-save-error" }
                  : saved
                    ? { text: "Сессия сохранена.", testId: "memory-match-save-ok" }
                    : { text: "Сохраняем сессию...", testId: "memory-match-save-pending" }
            }
            extraNotes={[
              `Сложность раунда: ${config.label}. Сравнение идёт только внутри этой сложности.`,
              isNewBest
                ? "Новый личный рекорд на этой сложности."
                : tiedBest
                  ? "Вы повторили свой лучший результат на этой сложности."
                  : "Личный рекорд на этой сложности пока не обновлён.",
              errors > 0
                ? "Если ошиблись, в следующем раунде сначала ищите пары из последних промахов."
                : "Раунд без ошибок: теперь можно улучшать темп без потери точности."
            ]}
            retryLabel="Сыграть ещё"
            statsLabel="К тренировкам"
            statsTo="/training"
            onRetry={startSession}
          />
        </>
      ) : null}
    </section>
  );
}











import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import {
  sessionRepository,
  type SessionSaveResult
} from "../entities/session/sessionRepository";
import {
  hasTrainerFeedbackBeenHandled,
  markTrainerFeedbackHandled,
  saveTrainerFeedback
} from "../entities/trainer-feedback/trainerFeedbackRepository";
import { DEFAULT_AUDIO_SETTINGS } from "../shared/lib/audio/audioSettings";
import { toLocalDateKey } from "../shared/lib/date/date";
import { createId } from "../shared/lib/id";
import { buildSessionProgressNotes } from "../shared/lib/progress/sessionProgressFeedback";
import { MemoryCardVisual } from "../shared/ui/MemoryMatchCards";
import { TrainerFeedbackCard } from "../shared/ui/TrainerFeedbackCard";
import type { Session } from "../shared/types/domain";
import { SessionRewardQueue } from "../widgets/SessionRewardQueue";

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

interface ResultInsight {
  title: string;
  summary: string;
  tone: "strong" | "steady" | "recover";
}

interface ResultComparison {
  title: string;
  summary: string;
  detail: string;
}

interface LivePrompt {
  eyebrow: string;
  title: string;
  text: string;
}

interface MemoryCard {
  id: string;
  label: string;
  emoji: string;
  tint: string;
  surface: string;
}

const CARD_LIBRARY: MemoryCard[] = [
  { id: "apple", label: "Яблоко", emoji: "🍎", tint: "#ef6358", surface: "#fff0ef" },
  { id: "bus", label: "Автобус", emoji: "🚌", tint: "#f2b12e", surface: "#fff7e5" },
  { id: "books", label: "Книги", emoji: "📚", tint: "#dd6a54", surface: "#fff1ec" },
  { id: "backpack", label: "Рюкзак", emoji: "🎒", tint: "#4b95d9", surface: "#eef6ff" },
  { id: "pencil", label: "Карандаш", emoji: "✏️", tint: "#f2a23b", surface: "#fff4e5" },
  { id: "trophy", label: "Кубок", emoji: "🏆", tint: "#e4a328", surface: "#fff6df" },
  { id: "clock", label: "Часы", emoji: "⏰", tint: "#6e89d9", surface: "#eef3ff" },
  { id: "flask", label: "Колба", emoji: "🧪", tint: "#7ab85a", surface: "#f2faed" },
  { id: "board", label: "Доска", emoji: "🧮", tint: "#5ea86a", surface: "#eef9ef" },
  { id: "crayons", label: "Цвета", emoji: "🖍️", tint: "#74b65f", surface: "#f0faeb" },
  { id: "glue", label: "Клей", emoji: "🧴", tint: "#f1b252", surface: "#fff5e8" },
  { id: "bell", label: "Звонок", emoji: "🔔", tint: "#efb13d", surface: "#fff5e5" },
  { id: "math", label: "Счёт", emoji: "➗", tint: "#8f9bb3", surface: "#f4f6fa" },
  { id: "paint", label: "Краски", emoji: "🎨", tint: "#5db0d7", surface: "#eef9ff" },
  { id: "notebook", label: "Тетрадь", emoji: "📓", tint: "#6a9ee0", surface: "#edf4ff" },
  { id: "hourglass", label: "Таймер", emoji: "⏳", tint: "#d7a357", surface: "#fff4e7" },
  { id: "magnifier", label: "Лупа", emoji: "🔎", tint: "#72a8d9", surface: "#eef6ff" },
  { id: "folder", label: "Оценка", emoji: "📁", tint: "#e7b34c", surface: "#fff6e6" }
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

function formatCompactSeconds(value: number): string {
  return `${Math.max(0, value)}с`;
}

function formatPairCount(value: number): string {
  const abs = Math.abs(value) % 100;
  const last = abs % 10;

  if (abs > 10 && abs < 20) {
    return `${value} пар`;
  }

  if (last === 1) {
    return `${value} пара`;
  }

  if (last >= 2 && last <= 4) {
    return `${value} пары`;
  }

  return `${value} пар`;
}

function formatRemainingPairs(value: number): string {
  if (value <= 0) {
    return "Пары собраны";
  }

  if (value === 1) {
    return "Осталась 1 пара";
  }

  return `Осталось ${formatPairCount(value)}`;
}

function formatErrorCount(value: number): string {
  const abs = Math.abs(value) % 100;
  const last = abs % 10;

  if (value === 0) {
    return "без ошибок";
  }

  if (abs > 10 && abs < 20) {
    return `${value} ошибок`;
  }

  if (last === 1) {
    return `${value} ошибка`;
  }

  if (last >= 2 && last <= 4) {
    return `${value} ошибки`;
  }

  return `${value} ошибок`;
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

function formatSignedValue(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function buildResultInsight(result: MatchResult, errors: number): ResultInsight {
  if (result.accuracy >= 0.95 && errors === 0) {
    return {
      title: "Раунд прошёл очень чисто",
      summary: "Вы держали поле под контролем и не теряли темп на лишних открытиях.",
      tone: "strong"
    };
  }

  if (result.accuracy >= 0.8) {
    return {
      title: "Раунд уже выглядит устойчиво",
      summary: "База есть: вы удерживаете карту поля и не распадаетесь после первых ходов.",
      tone: "steady"
    };
  }

  return {
    title: "База уже собирается, но нужна стабилизация",
    summary: "Сейчас важнее играть спокойнее и закрывать знакомые пары без спешки.",
    tone: "recover"
  };
}

function buildResultComparison(result: MatchResult, previousSession: Session | null): ResultComparison {
  if (!previousSession) {
    return {
      title: "Это первый сохранённый раунд",
      summary: "Теперь у вас есть честная стартовая точка на этой сложности.",
      detail: "Следующий раунд уже можно сравнивать по времени, точности и score."
    };
  }

  const scoreDelta = result.score - previousSession.score;
  const durationDeltaSec = Math.round((result.durationMs - previousSession.durationMs) / 1000);

  if (scoreDelta > 0) {
    return {
      title: "Вы стали лучше прошлого раза",
      summary: `Score изменился на ${formatSignedValue(scoreDelta)}.`,
      detail:
        durationDeltaSec < 0
          ? `Идёте быстрее на ${Math.abs(durationDeltaSec)} сек при той же сложности.`
          : durationDeltaSec > 0
            ? `Раунд занял на ${durationDeltaSec} сек больше, но score всё равно вырос.`
            : "Темп остался тем же, а score вырос за счёт более чистой игры."
    };
  }

  if (scoreDelta < 0) {
    return {
      title: "Сейчас слабее прошлого результата",
      summary: `Score изменился на ${formatSignedValue(scoreDelta)}.`,
      detail:
        durationDeltaSec > 0
          ? `Раунд занял на ${durationDeltaSec} сек больше. Начните следующий круг с более спокойного темпа.`
          : "Лучше вернуться к темпу прошлого удачного раунда и не форсировать поиск новых пар."
    };
  }

  return {
    title: "Вы держитесь на уровне прошлого раунда",
    summary: "Score остался тем же на этой сложности.",
    detail:
      durationDeltaSec < 0
        ? `При этом вы закончили быстрее на ${Math.abs(durationDeltaSec)} сек.`
        : durationDeltaSec > 0
          ? `Раунд занял на ${durationDeltaSec} сек больше, но результат сохранился.`
          : "Это хороший знак: база уже начинает стабилизироваться."
  };
}

function buildNextRoundGoal(
  difficulty: MatchDifficulty,
  result: MatchResult,
  errors: number
): { label: string; detail: string } {
  if (difficulty === "easy" && result.accuracy >= 0.9 && errors <= 1) {
    return {
      label: "Следующий шаг: ещё один чистый easy и можно пробовать medium",
      detail: "Если в следующем раунде снова мало ошибок, переход на среднюю сложность уже будет честным."
    };
  }

  if (difficulty === "medium" && result.accuracy >= 0.85 && errors <= 2) {
    return {
      label: "Следующий шаг: закрепить medium или аккуратно зайти в hard",
      detail: "Лучший выбор сейчас — ещё один уверенный medium. Если хочется вызова, можно протестировать hard одним коротким раундом."
    };
  }

  if (difficulty === "hard" && result.accuracy >= 0.8) {
    return {
      label: "Следующий шаг: сохранить этот темп на hard",
      detail: "Не усложняйте задачу. Сейчас ценнее повторить такой же собранный раунд ещё раз."
    };
  }

  return {
    label: `Следующий шаг: повторить ${difficulty} без спешки`,
    detail: "Сначала закрепите карту поля и сократите 1-2 лишние ошибки. Потом уже добавляйте скорость."
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
  const [previewRemainingMs, setPreviewRemainingMs] = useState(0);
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
  const [sessionProgress, setSessionProgress] = useState<SessionSaveResult | null>(null);
  const [feedbackHandled, setFeedbackHandled] = useState(false);

  const previewTimerRef = useRef<number | null>(null);
  const mismatchTimerRef = useRef<number | null>(null);
  const compareTimerRef = useRef<number | null>(null);

  const hasActiveUser = Boolean(activeUserId);
  const config = DIFFICULTY_CONFIG[difficulty];
  const matchedPairs = Math.floor(matched.size / 2);
  const totalPairs = config.pairs;
  const pairsLeft = Math.max(0, totalPairs - matchedPairs);
  const accuracy = useMemo(() => calculateAccuracy(moves, matchedPairs), [matchedPairs, moves]);
  const accuracyLabel = moves === 0 ? "—" : `${Math.round(accuracy * 100)}%`;
  const previewProgressPercent = useMemo(() => {
    if (config.previewSec <= 0) {
      return 0;
    }

    const totalPreviewMs = config.previewSec * 1000;
    const completed = totalPreviewMs - previewRemainingMs;
    return Math.max(0, Math.min(100, Math.round((completed / totalPreviewMs) * 100)));
  }, [config.previewSec, previewRemainingMs]);
  const roundProgressPercent = totalPairs === 0 ? 0 : Math.round((matchedPairs / totalPairs) * 100);
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
  const livePrompt = useMemo<LivePrompt>(() => {
    if (phase === "preview") {
      if (previewRemainingSec <= 1) {
        return {
          eyebrow: "Финиш запоминания",
          title: "Закрепите последние опоры",
          text: "Сейчас полезнее удержать 1-2 точные пары, чем пытаться помнить всё поле."
        };
      }

      if (previewRemainingSec <= Math.max(1, Math.ceil(config.previewSec / 2))) {
        return {
          eyebrow: "Фокус",
          title: "Разложите пары по зонам",
          text: "Держите в памяти по одной опоре сверху, в центре и снизу: так после старта легче войти в ритм."
        };
      }

      return {
        eyebrow: "Фокус",
        title: "Выберите 3-4 опоры",
        text: "Запоминайте не только символы, а конкретные места на поле."
      };
    }

    if (pairsLeft === 0) {
      return {
        eyebrow: "Финиш",
        title: "Поле собрано",
        text: "Итог уже считается. Сохраните в памяти, что сработало лучше всего в этом раунде."
      };
    }

    if (lastMismatchSymbols.length === 2) {
      return {
        eyebrow: "Следующий ход",
        title: "Вернитесь к последнему промаху",
        text: `Вспомните, где лежат «${lastMismatchSymbols[0]}» и «${lastMismatchSymbols[1]}», и закройте эту пару без лишнего поиска.`
      };
    }

    if (pairsLeft <= 2) {
      return {
        eyebrow: "Финиш",
        title: "Доиграйте без риска",
        text: "Осталось совсем немного. Сначала используйте свежую память, потом открывайте новую зону."
      };
    }

    if (moves >= 4 && accuracy < 0.65) {
      return {
        eyebrow: "Коррекция",
        title: "Сбавьте темп",
        text: "После промаха не сканируйте всё поле. Сначала добирайте карточки из последних двух ходов."
      };
    }

    if (moves >= 3 && accuracy >= 0.85) {
      return {
        eyebrow: "Темп",
        title: "Ритм хороший",
        text: "Сохраняйте тот же порядок: сначала свежие следы, потом новая зона."
      };
    }

    return {
      eyebrow: "Следующий ход",
      title: "Ищите недавние открытия",
      text: "Начинайте новый ход с карточек, которые уже мелькали в последних попытках."
    };
  }, [accuracy, config.previewSec, lastMismatchSymbols, moves, pairsLeft, phase, previewRemainingSec]);
  const focusTitle =
    phase === "preview"
      ? "Как запоминать"
      : lastMismatchSymbols.length === 2
        ? "Последний промах"
        : pairsLeft <= 2
          ? "Спокойный финиш"
          : accuracy >= 0.8 && moves >= 2
            ? "Сохраняйте ритм"
            : "Играйте от памяти";
  const focusText =
    phase === "preview"
      ? "Выберите верхнюю, центральную и нижнюю часть поля и привяжите к ним заметные пары. Так карта держится устойчивее."
      : pairsLeft === 0
        ? "Раунд завершён. Посмотрите на поле и отметьте, что помогло пройти его чище."
        : lastMismatchSymbols.length === 2
          ? "После промаха выгоднее вернуться к той же зоне поля, чем снова искать наугад."
          : accuracy >= 0.8 && moves >= 2
            ? "Если темп уже устойчивый, не меняйте стратегию. Сначала закрывайте знакомые пары, потом открывайте новую область."
            : "Открывайте только одну новую область за ход. Так легче удерживать в памяти последние позиции.";
  const boardGridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))`,
    maxWidth: config.columns === 4 ? "min(100%, 560px)" : "min(100%, 640px)"
  };
  const boardTitle =
    phase === "preview"
      ? "Запомните пары"
      : phase === "play"
        ? "Соберите все пары"
        : "Раунд завершён";
  const canInteract = phase === "play" && !locked;
  const sessionPhaseLabel = phase === "preview" ? "Запоминайте" : phase === "play" ? "Собирайте пары" : "Итог";
  const stageSummaryText =
    phase === "preview"
      ? `Старт через ${formatCompactSeconds(previewRemainingSec)}`
      : phase === "play"
        ? formatRemainingPairs(pairsLeft)
        : "Раунд завершён";
  const boardHint =
    phase === "preview"
      ? "Держите в памяти 3-4 опоры и их места."
      : phase === "play"
        ? "Один ход = две карточки. После промаха сначала вернитесь к знакомой зоне."
        : "Поле собрано. Сохраните в памяти, какие решения дали лучший темп.";
  const boardNote =
    phase === "preview"
      ? "Поле пока открыто целиком."
      : phase === "play"
        ? "Открывайте только закрытые карточки."
        : "Карточки оставлены открытыми, чтобы можно было спокойно соотнести итог с картой поля.";
  const feedbackHeading =
    phase === "preview"
      ? "Поле открыто"
      : phase === "result"
        ? "Раунд сохранён в контексте"
        : feedbackTone === "match"
        ? "Пара найдена"
        : feedbackTone === "mismatch"
          ? "Промах тоже полезен"
          : "Раунд идёт спокойно";
  const feedbackMeta =
    phase === "preview"
      ? `${formatPairCount(totalPairs)} на поле • предпросмотр ${formatCompactSeconds(previewRemainingSec)}`
      : phase === "result"
        ? `Score ${resultSummary.score} • ${formatSeconds(Math.round(resultSummary.durationMs / 1000))}`
        : moves === 0
        ? "Сделайте первый ход, чтобы увидеть темп и точность."
        : `${formatErrorCount(errors)} • текущий score ${liveScore}`;
  const resultHeadline =
    isNewBest
      ? "Новый лучший результат на этой сложности"
      : tiedBest
        ? "Вы повторили свой лучший результат"
        : resultFeedback.nextStep;
  const resultInsight = useMemo(() => buildResultInsight(resultSummary, errors), [errors, resultSummary]);
  const resultComparison = useMemo(
    () => buildResultComparison(resultSummary, previousSession),
    [previousSession, resultSummary]
  );
  const nextRoundGoal = useMemo(
    () => buildNextRoundGoal(difficulty, resultSummary, errors),
    [difficulty, errors, resultSummary]
  );
  const previousSummaryText = previousSession
    ? `Прошлый результат на этой сложности: ${previousSession.score} score за ${Math.round(previousSession.durationMs / 1000)} сек.`
    : `Это первый сохранённый раунд на сложности ${config.label}.`;
  const bestSummaryText = bestSession
    ? `Лучший результат сейчас: ${bestSession.score} score.`
    : "Личный лучший результат появится после первого сохранения.";
  const saveState =
    !hasActiveUser
      ? undefined
      : saveError
        ? { text: saveError, testId: "memory-match-save-error" }
        : saved
          ? { text: "Сессия сохранена.", testId: "memory-match-save-ok" }
          : { text: "Сохраняем сессию...", testId: "memory-match-save-pending" };
  const saveSummaryText = !hasActiveUser
    ? "Результат не сохранён: сначала выберите активного пользователя."
    : saveError
      ? "Сохранить результат не удалось. Можно сразу сыграть ещё раз."
      : saved
        ? "Результат сохранён локально как отдельная сессия Memory Match."
        : "Сохраняем результат локально...";
  const feedbackLocalDate = useMemo(() => toLocalDateKey(new Date()), [phase, roundKey]);
  const inlineRecommendations = [
    resultFeedback.tip,
    errors > 0
      ? "В следующем раунде сначала возвращайтесь к местам последних промахов, а не открывайте новые зоны вслепую."
      : "Раунд без ошибок: теперь можно добавлять темп, не жертвуя точностью."
  ];

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
    setPreviewRemainingMs(config.previewSec * 1000);
    setFeedbackTone("neutral");
    setFeedbackText(`Запоминайте позиции. Карточки закроются через ${config.previewSec} сек.`);

    previewTimerRef.current = window.setInterval(() => {
      const remainingMs = Math.max(0, previewEndsAt - Date.now());
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setPreviewRemainingSec(remainingSec);
      setPreviewRemainingMs(remainingMs);

      if (remainingMs <= 0) {
        if (previewTimerRef.current != null) {
          window.clearInterval(previewTimerRef.current);
          previewTimerRef.current = null;
        }
        setFlipped([]);
        setLocked(false);
        setPhase("play");
        setStartedAt(Date.now());
        setPreviewRemainingMs(0);
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
        setSessionProgress(null);

        const nextSession = buildSession(activeUserId, config, result, moves, errors);
        const saveResult = await sessionRepository.save(nextSession);
        if (cancelled) {
          return;
        }

        setBestSession(best && best.score >= nextSession.score ? best : nextSession);
        setSessionProgress(saveResult);
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

  useEffect(() => {
    if (!activeUserId || phase !== "result") {
      setFeedbackHandled(false);
      return;
    }

    setFeedbackHandled(hasTrainerFeedbackBeenHandled(activeUserId, "memory_match", feedbackLocalDate));
  }, [activeUserId, feedbackLocalDate, phase]);

  function handleDismissTrainerFeedback(): void {
    if (!activeUserId) {
      return;
    }

    markTrainerFeedbackHandled(activeUserId, "memory_match", feedbackLocalDate);
    setFeedbackHandled(true);
  }

  function handleSubmitTrainerFeedback(payload: { sentiment: "liked" | "okay" | "not_for_me"; reasons: string[]; comment: string }): void {
    if (!activeUserId) {
      return;
    }

    saveTrainerFeedback({
      userId: activeUserId,
      moduleId: "memory_match",
      modeId: "memory_match_classic",
      sentiment: payload.sentiment,
      reasons: payload.reasons,
      comment: payload.comment
    });
    markTrainerFeedbackHandled(activeUserId, "memory_match", feedbackLocalDate);
    setFeedbackHandled(true);
  }

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
    setPreviewRemainingMs(config.previewSec * 1000);
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
    setPreviewRemainingMs(0);
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
              : `Пара «${deck[first]?.label}» найдена. ${formatRemainingPairs(remainingPairs)}.`
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
    <section className="panel memory-match-page" data-testid="memory-match-page">
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
                  <MemoryCardVisual id={card.id} className="memory-match-preview-art" />
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

      {phase === "preview" || phase === "play" || phase === "result" ? (
        <div className={`memory-match-session-shell phase-${phase}`} data-testid="memory-match-session-shell" data-phase={phase}>
          {phase === "result" ? (
            <div className="setup-block memory-match-result-hero memory-match-inline-summary" data-testid="memory-match-result-hero">
              <div className="memory-match-inline-summary-head">
                <div>
                  <p className="stats-section-kicker">Итог раунда</p>
                  <h3>{resultFeedback.title}</h3>
                  <p>{resultHeadline}</p>
                </div>
                <div className="memory-match-inline-summary-badges" aria-hidden="true">
                  <span className="memory-match-summary-pill">{formatSeconds(Math.round(resultSummary.durationMs / 1000))}</span>
                  <span className="memory-match-summary-pill">{Math.round(resultSummary.accuracy * 100)}%</span>
                  <span className="memory-match-summary-pill">Score {resultSummary.score}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="memory-match-hud" data-testid="memory-match-live-summary">
              <div className="memory-match-hud-top">
                <div className="memory-match-hud-copy">
                  <p className="stats-section-kicker">{phase === "preview" ? "Подготовка" : "Раунд"}</p>
                  <h3>{boardTitle}</h3>
                  <p>{boardHint}</p>
                </div>
              </div>

              <div className="memory-match-hud-pills" aria-hidden="true">
                  <span className="memory-match-summary-pill">{formatPairCount(totalPairs)}</span>
                  <span className="memory-match-summary-pill">{config.label}</span>
                  <span className="memory-match-summary-pill">{stageSummaryText}</span>
                </div>

              <div className="memory-match-hud-metrics">
                <div className="memory-match-hud-card is-phase">
                  <span className="memory-match-hud-label">Сейчас</span>
                  <strong className="memory-match-hud-value">{sessionPhaseLabel}</strong>
                  <span className="memory-match-hud-meta">
                    {phase === "preview" ? `${formatCompactSeconds(previewRemainingSec)} до старта` : formatRemainingPairs(pairsLeft)}
                  </span>
                </div>
                <div className="memory-match-hud-card">
                  <span className="memory-match-hud-label">Собрано</span>
                  <strong className="memory-match-hud-value">{matchedPairs}/{totalPairs}</strong>
                  <span className="memory-match-hud-meta">
                    {pairsLeft === totalPairs ? "пока без найденных пар" : formatRemainingPairs(pairsLeft)}
                  </span>
                </div>
                <div className="memory-match-hud-card">
                  <span className="memory-match-hud-label">Время</span>
                  <strong className="memory-match-hud-value">{formatSeconds(Math.floor(elapsedMs / 1000))}</strong>
                  <span className="memory-match-hud-meta">
                    {phase === "preview" ? "таймер раунда стартует после закрытия поля" : "идёт с первого игрового хода"}
                  </span>
                </div>
                <div className="memory-match-hud-card">
                  <span className="memory-match-hud-label">Точность</span>
                  <strong className="memory-match-hud-value">{accuracyLabel}</strong>
                  <span className="memory-match-hud-meta">
                    {moves === 0 ? "оценим после первого полного хода" : formatErrorCount(errors)}
                  </span>
                </div>
              </div>

              <div className="memory-match-guidance" data-tone={feedbackTone}>
                <div className="memory-match-guidance-copy">
                  <span className="memory-match-guidance-label">{livePrompt.eyebrow}</span>
                  <strong className="memory-match-guidance-title">{livePrompt.title}</strong>
                  <p>{livePrompt.text}</p>
                </div>
                <div className="memory-match-guidance-progress" aria-hidden="true">
                  <span className="memory-match-guidance-progress-label">
                    {phase === "preview" ? "Предпросмотр" : "Прогресс раунда"}
                  </span>
                  <div className="memory-match-progress-track">
                    <span
                      className={`memory-match-progress-fill ${phase === "preview" ? "is-preview" : "is-play"}`}
                      style={{ width: `${phase === "preview" ? previewProgressPercent : roundProgressPercent}%` }}
                    />
                  </div>
                  <span className="memory-match-guidance-progress-note">
                    {phase === "preview"
                      ? `${formatCompactSeconds(previewRemainingSec)} до старта`
                      : `${roundProgressPercent}% поля собрано`}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="memory-match-board-layout">
            <div className={`memory-match-board-panel ${phase === "result" ? "is-result-board" : ""}`}>
              <div className="memory-match-board-header">
                <div>
                  <h3>{config.label}</h3>
                </div>
                <div className="memory-match-board-toolbar">
                  <div className="memory-match-board-badges" aria-hidden="true">
                    <span className="memory-match-board-badge">{config.columns}x{config.columns}</span>
                    <span className="memory-match-board-badge">{formatPairCount(config.pairs)}</span>
                  </div>
                  {phase !== "result" ? (
                    <div className="memory-match-board-actions">
                      <button
                        type="button"
                        className="btn-secondary memory-match-action-btn is-primary"
                        onClick={startSession}
                        data-testid="memory-match-restart"
                      >
                        Начать заново
                      </button>
                      <button
                        type="button"
                        className="btn-ghost memory-match-action-btn"
                        onClick={resetToSetup}
                      >
                        Сменить уровень
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <p className="comparison-note memory-match-board-note">{boardNote}</p>

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
                              <span className="memory-match-card-icon" aria-hidden="true">
                                <MemoryCardVisual id={card.id} />
                              </span>
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
              {phase === "result" ? (
                <div className="setup-block memory-match-inline-result" data-testid="memory-match-result">
                  <p className="stats-section-kicker">Подробно</p>
                  <h3>Точные итоги и что делать дальше</h3>

                  <div className="memory-match-inline-result-metrics">
                    <div className="memory-match-inline-result-metric">
                      <span>Время</span>
                      <strong>{formatSeconds(Math.round(resultSummary.durationMs / 1000))}</strong>
                    </div>
                    <div className="memory-match-inline-result-metric">
                      <span>Ходы</span>
                      <strong>{moves}</strong>
                    </div>
                    <div className="memory-match-inline-result-metric">
                      <span>Ошибки</span>
                      <strong>{errors}</strong>
                    </div>
                    <div className="memory-match-inline-result-metric">
                      <span>Точность</span>
                      <strong>{Math.round(resultSummary.accuracy * 100)}%</strong>
                    </div>
                    <div className="memory-match-inline-result-metric">
                      <span>Скорость</span>
                      <strong>{resultSummary.speed.toFixed(1)} пар/мин</strong>
                    </div>
                    <div className="memory-match-inline-result-metric is-score">
                      <span>Score</span>
                      <strong>{resultSummary.score}</strong>
                    </div>
                  </div>

                  <div className="memory-match-inline-result-callouts">
                    <article
                      className={`memory-match-inline-result-callout is-${resultInsight.tone}`}
                      data-testid="memory-match-result-insight"
                    >
                      <p className="stats-section-kicker">Что значит этот раунд</p>
                      <h4>{resultInsight.title}</h4>
                      <p>{resultInsight.summary}</p>
                    </article>

                    <article className="memory-match-inline-result-callout" data-testid="memory-match-result-next-step">
                      <p className="stats-section-kicker">Что делать дальше</p>
                      <h4>{nextRoundGoal.label}</h4>
                      <p>{nextRoundGoal.detail}</p>
                    </article>
                  </div>

                  <div className="memory-match-inline-result-copy">
                    <article className="memory-match-inline-result-note" data-testid="memory-match-result-comparison">
                      <strong>{resultComparison.title}</strong>
                      <p>{resultComparison.summary}</p>
                      <p>{resultComparison.detail}</p>
                    </article>
                    <p>{previousSummaryText}</p>
                    <p>{bestSummaryText}</p>
                    {inlineRecommendations.map((note) => (
                      <p key={note} className="memory-match-inline-result-note">
                        {note}
                      </p>
                    ))}
                    {buildSessionProgressNotes(sessionProgress).map((note) => (
                      <p key={note} className="memory-match-inline-result-note">
                        {note}
                      </p>
                    ))}
                  </div>

                  {saveState ? (
                    <p className="memory-match-inline-result-save" data-testid={saveState.testId}>
                      {saveState.text}
                    </p>
                  ) : null}
                  <p className="comparison-note memory-match-inline-result-save-note">{saveSummaryText}</p>

                  {hasActiveUser && !feedbackHandled ? (
                    <TrainerFeedbackCard
                      title="Как вам этот раунд Memory Match?"
                      subtitle="Короткий отзыв поможет нам спокойнее доводить модуль без навязчивых popup-окон."
                      onDismiss={handleDismissTrainerFeedback}
                      onSubmit={handleSubmitTrainerFeedback}
                    />
                  ) : null}

                  <div className="action-row memory-match-inline-result-actions">
                    <button type="button" className="btn-secondary" onClick={startSession} data-testid="memory-match-result-retry-btn">
                      Сыграть ещё
                    </button>
                    <button type="button" className="btn-ghost" onClick={resetToSetup}>
                      Сменить уровень
                    </button>
                    <Link className="btn-ghost" to="/training" data-testid="memory-match-result-stats-link">
                      К тренировкам
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="setup-block memory-match-focus" data-testid="memory-match-focus">
                    <p className="stats-section-kicker">{phase === "preview" ? "Стратегия" : "Опора"}</p>
                    <h3>{focusTitle}</h3>
                    <p>{focusText}</p>
                  </div>

                  <div
                    className={`setup-block memory-match-status memory-match-status-${feedbackTone}`}
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <p className="memory-match-status-kicker">{phase === "preview" ? "Подготовка" : "Обратная связь"}</p>
                    <h3>{feedbackHeading}</h3>
                    <p>{feedbackText}</p>
                    <p className="memory-match-status-meta">{feedbackMeta}</p>
                    {phase === "play" && lastMismatchSymbols.length === 2 ? (
                      <p className="comparison-note" data-testid="memory-match-review-note">
                        Последняя трудная пара: {lastMismatchSymbols[0]} и {lastMismatchSymbols[1]}.
                      </p>
                    ) : null}
                  </div>
                </>
              )}
            </aside>
          </div>
        </div>
      ) : null}

      <SessionRewardQueue
        levelUp={sessionProgress?.levelUp}
        nextGoalSummary={sessionProgress?.nextGoal?.primaryGoal.summary}
        achievements={sessionProgress?.unlockedAchievements}
        userId={activeUserId}
        localDate={toLocalDateKey(new Date())}
      />
    </section>
  );
}









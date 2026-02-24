import { db } from "../../../db/database";
import { toLocalDateKey } from "../date/date";
import { createId } from "../id";
import { calcClassicMetrics, calcTimedMetrics } from "../scoring/scoring";
import type {
  AdaptiveSource,
  ClassGroup,
  GridSize,
  GroupMember,
  Mode,
  Session,
  SpawnStrategy,
  TimeLimitSec,
  TrainingModeId,
  TrainingPresetId,
  User,
  UserModeProfile
} from "../../types/domain";

const DEMO_PREFIX = "[DEMO]";

const MODE_IDS: TrainingModeId[] = ["classic_plus", "timed_plus", "reverse"];

export interface DemoClassroomFixtureOptions {
  groupsCount?: number;
  studentsPerGroup?: number;
  days?: number;
  replaceExistingDemoData?: boolean;
  seed?: number;
}

export interface DemoClassroomFixtureSummary {
  usersCreated: number;
  groupsCreated: number;
  sessionsCreated: number;
  profilesCreated: number;
  activeUserId: string | null;
}

function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toInt(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}

function randRange(rand: () => number, min: number, max: number): number {
  return min + (max - min) * rand();
}

function randInt(rand: () => number, min: number, max: number): number {
  return Math.floor(randRange(rand, min, max + 1));
}

function demoUserName(index: number): string {
  return `${DEMO_PREFIX} Ученик ${String(index + 1).padStart(2, "0")}`;
}

function demoGroupName(index: number): string {
  return `${DEMO_PREFIX} Класс ${String.fromCharCode(65 + index)}`;
}

function isDemoName(name: string): boolean {
  return name.startsWith(DEMO_PREFIX);
}

function levelToGridSize(level: number): GridSize {
  if (level <= 2) {
    return 4;
  }
  if (level <= 6) {
    return 5;
  }
  return 6;
}

function levelToTimedLimit(level: number): TimeLimitSec {
  if (level >= 9) {
    return 30;
  }
  if (level >= 7) {
    return 45;
  }
  if (level <= 2) {
    return 90;
  }
  return 60;
}

function levelToPenalty(level: number): number {
  if (level <= 2) {
    return 0.25;
  }
  if (level <= 6) {
    return 0.5;
  }
  return 0.75;
}

function levelToPreset(level: number): TrainingPresetId {
  if (level <= 2) {
    return "easy";
  }
  if (level <= 6) {
    return "standard";
  }
  return "intense";
}

function modeToSessionMode(modeId: TrainingModeId): Mode {
  if (modeId === "timed_plus") {
    return "timed";
  }
  if (modeId === "reverse") {
    return "reverse";
  }
  return "classic";
}

function modeToSpawnStrategy(
  modeId: TrainingModeId,
  rand: () => number
): SpawnStrategy | undefined {
  if (modeId !== "timed_plus") {
    return undefined;
  }
  return rand() > 0.55 ? "random_cell" : "same_cell";
}

function getClassicDurationMs(
  modeId: TrainingModeId,
  level: number,
  gridSize: GridSize,
  rand: () => number
): number {
  const base =
    gridSize === 4 ? 33_000 : gridSize === 5 ? 46_000 : 68_000;
  const levelFactor = (11 - level) / 10;
  const modeFactor = modeId === "reverse" ? 1.12 : 1;
  const jitter = randRange(rand, -6_000, 7_000);
  const raw = base * (0.75 + levelFactor * 0.55) * modeFactor + jitter;
  return toInt(raw, 14_000, 180_000);
}

function getClassicErrors(level: number, rand: () => number): number {
  const raw = (10 - level) * 0.28 + randRange(rand, -0.4, 2.2);
  return toInt(raw, 0, 8);
}

function getTimedValues(
  level: number,
  timeLimitSec: TimeLimitSec,
  rand: () => number
): { correctCount: number; errors: number } {
  const perMinute = 14 + level * 2.2 + randRange(rand, -3.5, 4.5);
  const correctCount = toInt((perMinute * timeLimitSec) / 60, 5, 120);
  const rawErrors = (10 - level) * 0.35 + randRange(rand, -0.6, 2.3);
  const errors = toInt(rawErrors, 0, 15);
  return { correctCount, errors };
}

function randomLocalTimestamp(
  day: Date,
  modeId: TrainingModeId,
  rand: () => number
): string {
  const hourBase =
    modeId === "classic_plus" ? 9 : modeId === "timed_plus" ? 13 : 17;
  const date = new Date(day);
  date.setHours(hourBase + randInt(rand, 0, 2), randInt(rand, 0, 59), randInt(rand, 0, 59), 0);
  return date.toISOString();
}

async function clearDemoFixtureData(): Promise<void> {
  const demoUsers = await db.users.filter((entry) => isDemoName(entry.name)).toArray();
  const demoGroups = await db.classGroups
    .filter((entry) => isDemoName(entry.name))
    .toArray();

  const userIds = demoUsers.map((entry) => entry.id);
  const groupIds = demoGroups.map((entry) => entry.id);

  await db.transaction(
    "rw",
    [db.users, db.sessions, db.userModeProfiles, db.classGroups, db.groupMembers],
    async () => {
      for (const userId of userIds) {
        await db.sessions.where("userId").equals(userId).delete();
        await db.userModeProfiles.where("userId").equals(userId).delete();
        await db.groupMembers.where("userId").equals(userId).delete();
        await db.users.delete(userId);
      }

      for (const groupId of groupIds) {
        await db.groupMembers.where("groupId").equals(groupId).delete();
        await db.classGroups.delete(groupId);
      }
    }
  );
}

export async function generateDemoClassroomFixture(
  options: DemoClassroomFixtureOptions = {}
): Promise<DemoClassroomFixtureSummary> {
  const groupsCount = toInt(options.groupsCount ?? 2, 1, 8);
  const studentsPerGroup = toInt(options.studentsPerGroup ?? 15, 1, 40);
  const days = toInt(options.days ?? 14, 3, 45);
  const replaceExistingDemoData = options.replaceExistingDemoData ?? true;
  const rand = createSeededRandom(options.seed ?? 20260224);

  if (replaceExistingDemoData) {
    await clearDemoFixtureData();
  }

  const now = new Date();
  const groups: ClassGroup[] = [];
  const users: User[] = [];
  const groupMembers: GroupMember[] = [];
  const profiles: UserModeProfile[] = [];
  const sessions: Session[] = [];

  let studentCounter = 0;

  for (let groupIndex = 0; groupIndex < groupsCount; groupIndex += 1) {
    const group: ClassGroup = {
      id: createId(),
      name: demoGroupName(groupIndex),
      createdAt: now.toISOString()
    };
    groups.push(group);

    for (let i = 0; i < studentsPerGroup; i += 1) {
      const user: User = {
        id: createId(),
        name: demoUserName(studentCounter),
        createdAt: now.toISOString()
      };
      users.push(user);
      groupMembers.push({
        id: createId(),
        groupId: group.id,
        userId: user.id,
        joinedAt: now.toISOString()
      });

      const progressRank = studentCounter / Math.max(1, groupsCount * studentsPerGroup - 1);
      const level = toInt(2 + progressRank * 7 + randRange(rand, -1.2, 1.2), 1, 10);
      const presetId = levelToPreset(level);
      const adaptiveSource: AdaptiveSource = "auto";

      MODE_IDS.forEach((modeId) => {
        profiles.push({
          id: createId(),
          userId: user.id,
          moduleId: "schulte",
          modeId,
          level,
          autoAdjust: true,
          manualLevel: null,
          lastDecisionReason: "Сгенерировано демо-фикстурой.",
          lastEvaluatedAt: now.toISOString(),
          updatedAt: now.toISOString()
        });
      });

      for (let dayOffset = days - 1; dayOffset >= 0; dayOffset -= 1) {
        const dayDate = new Date(now);
        dayDate.setHours(0, 0, 0, 0);
        dayDate.setDate(dayDate.getDate() - dayOffset);

        MODE_IDS.forEach((modeId) => {
          const mode = modeToSessionMode(modeId);
          const gridSize = levelToGridSize(level);
          const numbersCount = gridSize * gridSize;
          const timestamp = randomLocalTimestamp(dayDate, modeId, rand);
          const localDate = toLocalDateKey(timestamp);

          if (modeId === "timed_plus") {
            const timeLimitSec = levelToTimedLimit(level);
            const errorPenalty = levelToPenalty(level);
            const { correctCount, errors } = getTimedValues(level, timeLimitSec, rand);
            const timed = calcTimedMetrics({
              correctCount,
              errors,
              timeLimitSec,
              errorPenalty
            });

            sessions.push({
              id: createId(),
              userId: user.id,
              taskId: "schulte",
              mode,
              moduleId: "schulte",
              modeId,
              level,
              presetId,
              adaptiveSource,
              timestamp,
              localDate,
              durationMs: timeLimitSec * 1000,
              score: timed.score,
              accuracy: timed.accuracy,
              speed: timed.speed,
              errors,
              correctCount,
              effectiveCorrect: timed.effectiveCorrect,
              difficulty: {
                gridSize,
                numbersCount,
                mode,
                timeLimitSec,
                errorPenalty,
                hintsEnabled: level <= 2,
                spawnStrategy: modeToSpawnStrategy(modeId, rand)
              }
            });
            return;
          }

          const durationMs = getClassicDurationMs(modeId, level, gridSize, rand);
          const errors = getClassicErrors(level, rand);
          const classic = calcClassicMetrics({
            durationMs,
            errors,
            numbersCount
          });

          sessions.push({
            id: createId(),
            userId: user.id,
            taskId: "schulte",
            mode,
            moduleId: "schulte",
            modeId,
            level,
            presetId,
            adaptiveSource,
            timestamp,
            localDate,
            durationMs,
            score: classic.score,
            accuracy: classic.accuracy,
            speed: classic.speed,
            errors,
            difficulty: {
              gridSize,
              numbersCount,
              mode,
              hintsEnabled: level <= 2
            }
          });
        });
      }

      studentCounter += 1;
    }
  }

  await db.transaction(
    "rw",
    [db.users, db.classGroups, db.groupMembers, db.userModeProfiles, db.sessions],
    async () => {
      await db.classGroups.bulkAdd(groups);
      await db.users.bulkAdd(users);
      await db.groupMembers.bulkAdd(groupMembers);
      await db.userModeProfiles.bulkAdd(profiles);
      await db.sessions.bulkAdd(sessions);
    }
  );

  return {
    usersCreated: users.length,
    groupsCreated: groups.length,
    sessionsCreated: sessions.length,
    profilesCreated: profiles.length,
    activeUserId: users[0]?.id ?? null
  };
}

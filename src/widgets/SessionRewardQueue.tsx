import { useEffect, useMemo, useState } from "react";
import { markLevelUpCelebrated } from "../shared/lib/progress/levelCelebration";
import { AchievementUnlockedToast, LevelUpModal } from "./LevelUpModal";

interface AchievementToastItem {
  id: string;
  title: string;
  icon: string;
}

interface SessionRewardQueueProps {
  levelUp?: {
    fromLevel: number;
    toLevel: number;
  } | null;
  nextGoalSummary?: string;
  achievements?: AchievementToastItem[];
  userId?: string | null;
  localDate?: string;
}

type RewardQueueItem =
  | {
      kind: "level";
      id: string;
      fromLevel: number;
      toLevel: number;
      nextGoalSummary?: string;
    }
  | {
      kind: "achievement";
      id: string;
      title: string;
      icon: string;
      progressText?: string;
    };

export function SessionRewardQueue({
  levelUp = null,
  nextGoalSummary,
  achievements = [],
  userId,
  localDate
}: SessionRewardQueueProps) {
  const queueItems = useMemo<RewardQueueItem[]>(() => {
    const items: RewardQueueItem[] = [];

    if (levelUp) {
      items.push({
        kind: "level",
        id: `level:${levelUp.fromLevel}:${levelUp.toLevel}`,
        fromLevel: levelUp.fromLevel,
        toLevel: levelUp.toLevel,
        nextGoalSummary
      });
    }

    achievements.forEach((achievement, index) => {
      items.push({
        kind: "achievement",
        id: achievement.id,
        title: achievement.title,
        icon: achievement.icon,
        progressText: achievements.length > 1 ? `${index + 1}/${achievements.length}` : undefined
      });
    });

    return items;
  }, [achievements, levelUp, nextGoalSummary]);

  const queueKey = useMemo(
    () => queueItems.map((item) => item.id).join("|"),
    [queueItems]
  );
  const [activeQueueKey, setActiveQueueKey] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!queueKey || queueKey === activeQueueKey) {
      return;
    }

    if (levelUp && userId && localDate) {
      markLevelUpCelebrated(userId, localDate);
    }

    setActiveQueueKey(queueKey);
    setCurrentIndex(0);
  }, [activeQueueKey, levelUp, localDate, queueKey, userId]);

  if (!queueKey || activeQueueKey !== queueKey || currentIndex >= queueItems.length) {
    return null;
  }

  const currentItem = queueItems[currentIndex];

  if (currentItem.kind === "level") {
    return (
      <LevelUpModal
        key={`${activeQueueKey}:${currentItem.id}`}
        fromLevel={currentItem.fromLevel}
        toLevel={currentItem.toLevel}
        nextGoalSummary={currentItem.nextGoalSummary}
        testId="level-up-modal"
        onClose={() => {
          setCurrentIndex((index) => index + 1);
        }}
      />
    );
  }

  return (
    <AchievementUnlockedToast
      key={`${activeQueueKey}:${currentItem.id}`}
      achievementTitle={currentItem.title}
      achievementIcon={currentItem.icon}
      progressText={currentItem.progressText}
      testId="achievement-toast"
      onClose={() => {
        setCurrentIndex((index) => index + 1);
      }}
    />
  );
}

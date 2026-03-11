import type {
  SkillTrainingRecommendation,
  SkillProfileId,
  TrainingModuleId
} from "../../types/domain";

const SKILL_TO_MODULES: Record<SkillProfileId, TrainingModuleId[]> = {
  attention: ["schulte"],
  memory: ["memory_grid", "memory_match", "n_back"],
  reaction: ["reaction", "sprint_math"],
  math: ["sprint_math"],
  logic: ["decision_rush", "pattern_recognition"]
};

const RECOMMENDATIONS_BY_LEVEL: Record<
  "weak" | "medium" | "strong",
  Record<SkillProfileId, { title: string; description: string; modules: TrainingModuleId[]; frequency: number }>
> = {
  weak: {
    attention: {
      title: "Базовое внимание",
      description: "Начните с коротких сессий на концентрацию и устойчивость фокуса.",
      modules: ["schulte"],
      frequency: 5
    },
    memory: {
      title: "Основа памяти",
      description: "Сначала укрепите зрительную и рабочую память на понятных упражнениях.",
      modules: ["memory_grid"],
      frequency: 5
    },
    reaction: {
      title: "Базовая скорость",
      description: "Тренируйте быстрый и точный отклик на простых сигналах.",
      modules: ["reaction"],
      frequency: 5
    },
    math: {
      title: "Базовый счёт",
      description: "Верните уверенность в устных вычислениях через короткие регулярные раунды.",
      modules: ["sprint_math"],
      frequency: 4
    },
    logic: {
      title: "Основа логики",
      description: "Начните с коротких задач на выбор правильного решения и закономерности.",
      modules: ["decision_rush"],
      frequency: 4
    }
  },
  medium: {
    attention: {
      title: "Устойчивый фокус",
      description: "Усложняйте упражнения и учитесь дольше удерживать внимание без потери темпа.",
      modules: ["schulte"],
      frequency: 4
    },
    memory: {
      title: "Рабочая память",
      description: "Подключайте режимы, где нужно удерживать и быстро сопоставлять информацию.",
      modules: ["memory_match", "n_back"],
      frequency: 4
    },
    reaction: {
      title: "Точная скорость",
      description: "Комбинируйте скорость реакции с контролем ошибок и ритма.",
      modules: ["reaction", "sprint_math"],
      frequency: 4
    },
    math: {
      title: "Уверенный счёт",
      description: "Переходите к более плотным сериям и смешанным вычислениям.",
      modules: ["sprint_math"],
      frequency: 3
    },
    logic: {
      title: "Стратегическое мышление",
      description: "Развивайте скорость принятия решений и работу с закономерностями.",
      modules: ["decision_rush", "pattern_recognition"],
      frequency: 3
    }
  },
  strong: {
    attention: {
      title: "Мастерство внимания",
      description: "Поддерживайте форму через интенсивные короткие сессии и более сложные таблицы.",
      modules: ["schulte"],
      frequency: 3
    },
    memory: {
      title: "Сильная память",
      description: "Закрепляйте высокий уровень на сложных сериях и длинных удержаниях.",
      modules: ["memory_match", "n_back"],
      frequency: 3
    },
    reaction: {
      title: "Пиковая реакция",
      description: "Работайте на скорости, но не теряйте точность и качество отклика.",
      modules: ["reaction", "sprint_math"],
      frequency: 3
    },
    math: {
      title: "Ментальная арифметика",
      description: "Поддерживайте высокий уровень через быстрые и точные вычисления под нагрузкой.",
      modules: ["sprint_math"],
      frequency: 2
    },
    logic: {
      title: "Сильная логика",
      description: "Закрепляйте навык на более сложных логических и скоростных режимах.",
      modules: ["decision_rush", "pattern_recognition"],
      frequency: 2
    }
  }
};

function generateSkillRecommendation(
  skillId: SkillProfileId,
  level: "weak" | "medium" | "strong",
  priority: number
): SkillTrainingRecommendation {
  const config = RECOMMENDATIONS_BY_LEVEL[level][skillId];

  return {
    skillId,
    level,
    trainingModules: config.modules,
    title: config.title,
    description: config.description,
    priority
  };
}

export function generateSkillRecommendations(
  skillScores: Record<SkillProfileId, number>
): SkillTrainingRecommendation[] {
  const skills = Object.keys(skillScores) as SkillProfileId[];
  const sortedSkills = [...skills].sort((a, b) => skillScores[a] - skillScores[b]);

  return sortedSkills.map((skillId, index) => {
    const score = skillScores[skillId];
    const level = getSkillLevel(score);
    return generateSkillRecommendation(skillId, level, index + 1);
  });
}

function getSkillLevel(score: number): "weak" | "medium" | "strong" {
  if (score < 40) return "weak";
  if (score < 70) return "medium";
  return "strong";
}

export function getTop3Recommendations(
  skillScores: Record<SkillProfileId, number>
): SkillTrainingRecommendation[] {
  return generateSkillRecommendations(skillScores).slice(0, 3);
}

export function getRecommendationsForSkill(
  skillId: SkillProfileId,
  score: number
): SkillTrainingRecommendation {
  return generateSkillRecommendation(skillId, getSkillLevel(score), 1);
}

export function getRecommendedFrequency(skillId: SkillProfileId, score: number): number {
  return RECOMMENDATIONS_BY_LEVEL[getSkillLevel(score)][skillId].frequency;
}

export function getModulesForSkill(skillId: SkillProfileId): TrainingModuleId[] {
  return SKILL_TO_MODULES[skillId] || [];
}

export const skillRecommendationService = {
  generateSkillRecommendations,
  getTop3Recommendations,
  getRecommendationsForSkill,
  getRecommendedFrequency,
  getModulesForSkill
};

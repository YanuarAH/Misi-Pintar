export type MissionRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  story: string;
  learning_objectives: string[];
  order_index: number;
  is_published: boolean;
  /** public = belajar mandiri setingkat; class_only = kelas dengan tingkat dan mapel yang cocok. */
  audience: "public" | "class_only";
  grade_level: number | null;
  subject_slug: string | null;
  topic_slug: string | null;
  author_id: string | null;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
};

export type QuestionRow = {
  id: string;
  mission_id: string;
  image_id: string | null;
  question_type: "multiple_choice" | "numeric";
  prompt: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string;
  hint: string;
  difficulty: "mudah" | "sedang" | "tantangan";
  answer_unit: string;
  topic: string;
  slot_index: number;
  variant_index: number;
  order_index: number;
  archived_at: Date | null;
};

export type AttemptRow = {
  id: string;
  student_id: string;
  mission_id: string;
  score: number;
  correct_count: number;
  total_questions: number;
  xp_earned: number;
  question_ids: string[];
  mode: "mission" | "practice";
  source_attempt_id: string | null;
  started_at: Date;
  completed_at: Date | null;
};

export type MissionCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  orderIndex: number;
  gradeLevel: number | null;
  subjectSlug: string | null;
  subjectLabel: string | null;
  topicLabel: string | null;
  questionCount: number;
  isPublished: boolean;
  audience: "public" | "class_only";
  unlocked: boolean;
  completed: boolean;
  bestScore: number | null;
  lastScore: number | null;
  attemptCount: number;
  openAttemptId: string | null;
};

export type PlayQuestion = {
  id: string;
  type: "multiple_choice" | "numeric";
  prompt: string;
  /** URL gambar soal (route terproteksi) atau null. */
  imageUrl: string | null;
  options: string[];
  hint: string;
  difficulty: "mudah" | "sedang" | "tantangan";
  answerUnit: string;
  orderIndex: number;
};

export type AnswerFeedback = {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  alreadyAnswered?: boolean;
};

export type AttemptResult = {
  attempt: AttemptRow;
  mission: {
    id: string;
    slug: string;
    title: string;
    orderIndex: number;
    gradeLevel: number | null;
    subjectLabel: string | null;
    objectives: string[];
  };
  student: { displayName: string; avatarKey: string };
  answers: {
    questionId: string;
    prompt: string;
    topic: string;
    difficulty: string;
    isCorrect: boolean;
    submittedAnswer: string;
    correctAnswer: string;
    explanation: string;
    answerUnit: string;
    orderIndex: number;
  }[];
  earnedAchievements: { key: string; earnedAt: Date }[];
  nextMission: { slug: string; title: string; unlocked: boolean } | null;
  accuracy: number;
  /** 'practice' = latihan soal yang salah; tidak memberi XP dan tidak membuka misi. */
  mode: "mission" | "practice";
  sourceAttemptId: string | null;
  /** Soal yang salah pada percobaan ini; dasar tombol "Latih soal yang salah". */
  wrongQuestionIds: string[];
  xpTotal: number;
  /** XP penuh yang layak didapat dari hasil percobaan ini. */
  xpPotential: number;
  /** Rekor XP terbaik dari percobaan lain pada misi yang sama. */
  previousBestXp: number;
};

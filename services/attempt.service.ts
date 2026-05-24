import { prisma } from "@/lib/prisma";
import * as QuestionService from "./question.service";
import * as ActivityService from "./activity.service";
import * as RatingService from "./rating.service";
import { DAILY_PICK_RATING_WEIGHT } from "@/lib/ratingFormula";

export interface SubmitAttemptInput {
  userId: string;
  questionId: string;
  contestId?: string;
  selectedOption?: string;    // single-correct MCQ: "a" | "b" | "c" | "d"
  selectedOptions?: string[]; // multi-correct MCQ
  numericalInput?: number;
  timeTakenSec?: number;
  sessionType?: string;
  hintsUsed?: number;         // count of non-last hints unlocked before submitting
  skipRating?: boolean;       // client hint for practice retry (server also enforces)
}

export async function submit(input: SubmitAttemptInput) {
  const question = await prisma.question.findUnique({
    where: { id: input.questionId },
    select: {
      correct: true,
      correctOptions: true,
      options: true,
      difficulty: true,
      avgTimeSec: true,
    },
  });
  if (!question) throw new Error("Question not found");

  const isNumerical = isNumericalQuestion(question.options);
  const isCorrect = gradeAttempt(question, input, isNumerical);

  // Any prior attempt locks rating — only the first submission counts
  const priorAttempts = await prisma.attempt.count({
    where: { userId: input.userId, questionId: input.questionId },
  });
  const isFirstAttempt = priorAttempts === 0;
  const ratingLocked = !isFirstAttempt || Boolean(input.skipRating);

  const singleOption =
    input.selectedOption ?? input.selectedOptions?.[0] ?? null;

  const attempt = await prisma.attempt.create({
    data: {
      userId: input.userId,
      questionId: input.questionId,
      contestId: input.contestId ?? null,
      selectedOption: singleOption,
      numericalInput: input.numericalInput ?? null,
      isCorrect,
      timeTakenSec: input.timeTakenSec ?? null,
      sessionType: input.sessionType ?? "practice",
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { rating: true },
  });
  const currentRating = user?.rating ?? 1200;

  if (ratingLocked) {
    await Promise.all([
      QuestionService.incrementAttemptCount(input.questionId, isCorrect),
      ActivityService.recordAttempt(input.userId, isCorrect, input.timeTakenSec ?? 0),
    ]);
    return {
      ...attempt,
      ratingDelta: 0,
      newRating: currentRating,
      firstAttempt: false,
      ratingLocked: true,
      isCorrect,
    };
  }

  const isDailyPick = input.sessionType === "daily_pick";
  const delta = RatingService.computeDelta({
    userRating: currentRating,
    difficulty: question.difficulty,
    isCorrect,
    isNumerical,
    timeTakenSec: input.timeTakenSec ?? null,
    avgTimeSec: question.avgTimeSec ?? null,
    hintsUsed: input.hintsUsed ?? 0,
    ratingWeight: isDailyPick ? DAILY_PICK_RATING_WEIGHT : 1,
  });

  const [ratingResult] = await Promise.all([
    RatingService.applyPracticeRating(input.userId, delta),
    QuestionService.incrementAttemptCount(input.questionId, isCorrect),
    ActivityService.recordAttempt(input.userId, isCorrect, input.timeTakenSec ?? 0),
    prisma.user.update({
      where: { id: input.userId },
      data: { totalSolved: { increment: 1 } },
    }),
  ]);

  return {
    ...attempt,
    ratingDelta: ratingResult.actualDelta,
    newRating: ratingResult.newRating,
    firstAttempt: true,
    ratingLocked: false,
    isCorrect,
  };
}

export async function findByUser(
  userId: string,
  limit = 20,
  offset = 0,
  questionId?: string
) {
  const where = { userId, ...(questionId ? { questionId } : {}) };
  const [items, total] = await Promise.all([
    prisma.attempt.findMany({
      where,
      include: {
        question: {
          select: { id: true, subject: true, chapter: true, difficulty: true, body: true },
        },
      },
      orderBy: { attemptedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.attempt.count({ where }),
  ]);
  return { items, total };
}

function isNumericalQuestion(options: unknown): boolean {
  return !Array.isArray(options) || (options as unknown[]).length === 0;
}

function gradeAttempt(
  question: { correct: string; correctOptions: unknown; options: unknown },
  input: SubmitAttemptInput,
  isNumerical: boolean
): boolean {
  if (isNumerical) {
    if (input.numericalInput === undefined) return false;
    const answer = parseFloat(question.correct);
    if (isNaN(answer)) return false;
    return Math.abs(input.numericalInput - answer) < 0.01;
  }

  const correctOpts = question.correctOptions;
  if (Array.isArray(correctOpts) && correctOpts.length > 0) {
    const correct = correctOpts as string[];
    const selected = input.selectedOptions ?? (input.selectedOption ? [input.selectedOption] : []);
    if (correct.length !== selected.length) return false;
    return [...selected].sort().join(",") === [...correct].sort().join(",");
  }

  const answer = input.selectedOption ?? input.selectedOptions?.[0];
  return answer === question.correct;
}

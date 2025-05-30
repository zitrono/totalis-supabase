/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { createMonitoringContext } from "../_shared/monitoring.ts";

interface CheckinRequest {
  action: "start" | "answer" | "complete" | "abandon";
  categoryId?: string; // Support both camelCase
  category_id?: string; // and snake_case
  checkinId?: string;
  checkin_id?: string;
  questionId?: string;
  question_id?: string;
  answer?: any;
  proposals?: any;
}

interface CheckinQuestion {
  id: string;
  text: string;
  type: "text" | "number" | "boolean" | "scale" | "multiple_choice";
  options?: string[];
  min?: number;
  max?: number;
  required?: boolean;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const monitoring = createMonitoringContext("checkin");

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    // Get authenticated user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    const body = await req.json() as CheckinRequest;
    const { action } = body;

    // Track function start
    monitoring.trackStart(user.id);

    let result;

    switch (action) {
      case "start":
        result = await startCheckin(
          supabase,
          user.id,
          body,
          monitoring,
        );
        break;

      case "answer":
        result = await submitAnswer(supabase, user.id, body);
        break;

      case "complete":
        result = await completeCheckin(supabase, user.id, body);
        break;

      case "abandon":
        result = await abandonCheckin(supabase, user.id, body);
        break;

      default:
        throw new Error(
          "Invalid action. Must be one of: start, answer, complete, abandon",
        );
    }

    // Track success
    monitoring.trackSuccess(user.id, { action, ...result });

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    monitoring.trackError(
      error instanceof Error ? error : new Error(String(error)),
    );
    console.error("Check-in error:", error);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

async function startCheckin(
  supabase: any,
  userId: string,
  body: CheckinRequest,
  monitoring: any,
) {
  // Support both camelCase and snake_case
  const categoryId = body.categoryId || body.category_id;

  if (!categoryId) {
    throw new Error("categoryId or category_id is required");
  }

  // Verify category exists
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("*")
    .eq("id", categoryId)
    .single();

  if (categoryError || !category) {
    throw new Error("Category not found");
  }

  // Check for existing in-progress checkin for this category
  const { data: existingCheckin } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("category_id", categoryId)
    .eq("status", "in_progress")
    .single();

  if (existingCheckin) {
    // Resume existing checkin
    const { data: answers } = await supabase
      .from("checkin_answers")
      .select("question_id, answer")
      .eq("checkin_id", existingCheckin.id);

    const questions = existingCheckin.metadata?.template_questions ||
      generateInitialQuestions(category, []);
    const answeredIds = answers?.map((a: any) => a.question_id) || [];
    const currentQuestionIndex = questions.findIndex((q: CheckinQuestion) =>
      !answeredIds.includes(q.id)
    );

    return {
      checkIn: existingCheckin,
      checkin: existingCheckin, // For compatibility
      questions,
      currentQuestion: questions[currentQuestionIndex] || questions[0],
      currentQuestionIndex,
      resumed: true,
      answers: answers || [],
    };
  }

  // Get user's profile to find coach_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("coach_id")
    .eq("user_id", userId)
    .single();

  // Get user's recent check-ins for context
  const { data: recentCheckins } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("category_id", categoryId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(3);

  // Generate initial questions based on category
  const questions = generateInitialQuestions(category, recentCheckins || []);

  // Create new check-in record
  const { data: checkIn, error: checkInError } = await supabase
    .from("checkins")
    .insert({
      user_id: userId,
      category_id: categoryId,
      coach_id: profile?.coach_id || null,
      status: "in_progress",
      metadata: {
        template_questions: questions,
      },
    })
    .select()
    .single();

  if (checkInError) {
    throw checkInError;
  }

  // Create initial message
  const { data: message } = await supabase
    .from("messages")
    .insert({
      user_id: userId,
      category_id: categoryId,
      role: "assistant",
      content: questions[0].text,
      content_type: "checkin",
      metadata: {
        type: "start",
        checkin_id: checkIn.id,
        question_number: 1,
      },
    })
    .select()
    .single();

  return {
    checkIn,
    checkin: checkIn, // For compatibility
    questions,
    currentQuestion: questions[0],
    currentQuestionIndex: 0,
    message,
    category: {
      id: category.id,
      name: category.name,
      max_questions: category.max_questions || 5,
    },
    resumed: false,
    answers: [],
  };
}

async function submitAnswer(
  supabase: any,
  userId: string,
  body: CheckinRequest,
) {
  // Support both camelCase and snake_case
  const checkinId = body.checkinId || body.checkin_id;
  const questionId = body.questionId || body.question_id;
  const { answer } = body;

  if (!checkinId || !questionId || answer === undefined) {
    throw new Error(
      "checkinId/checkin_id, questionId/question_id, and answer are required",
    );
  }

  // Verify checkin belongs to user and is in progress
  const { data: checkin, error: checkError } = await supabase
    .from("checkins")
    .select("id, metadata")
    .eq("id", checkinId)
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .single();

  if (checkError || !checkin) {
    throw new Error("Invalid or completed checkin");
  }

  // Get question details from template
  const questions = checkin.metadata?.template_questions || [];
  const question = questions.find((q: CheckinQuestion) => q.id === questionId);

  if (!question) {
    throw new Error("Invalid question_id");
  }

  // Validate answer based on question type
  validateAnswer(question, answer);

  // Store answer
  const { error: insertError } = await supabase
    .from("checkin_answers")
    .insert({
      checkin_id: checkinId,
      question_id: questionId,
      question_text: question.text,
      answer: { value: answer },
      answer_type: question.type,
    });

  if (insertError) {
    throw new Error("Failed to save answer");
  }

  // Get all answered questions
  const { data: answeredQuestions } = await supabase
    .from("checkin_answers")
    .select("question_id, answer")
    .eq("checkin_id", checkinId);

  const answeredIds = answeredQuestions?.map((a: any) => a.question_id) || [];
  const remainingQuestions = questions.filter((q: CheckinQuestion) =>
    !answeredIds.includes(q.id)
  );

  // Find next question
  const nextQuestion = remainingQuestions[0] || null;
  const currentQuestionIndex = nextQuestion
    ? questions.findIndex((q: CheckinQuestion) => q.id === nextQuestion.id)
    : questions.length;

  return {
    success: true,
    remainingQuestions: remainingQuestions.length,
    remaining_questions: remainingQuestions.length, // For compatibility
    nextQuestion,
    next_question: nextQuestion, // For compatibility
    currentQuestionIndex,
    isComplete: remainingQuestions.length === 0,
    is_complete: remainingQuestions.length === 0, // For compatibility
  };
}

async function completeCheckin(
  supabase: any,
  userId: string,
  body: CheckinRequest,
) {
  // Support both camelCase and snake_case
  const checkinId = body.checkinId || body.checkin_id;
  const { proposals } = body;

  if (!checkinId) {
    throw new Error("checkinId or checkin_id is required");
  }

  // Verify checkin belongs to user and is in progress
  const { data: checkin, error: checkError } = await supabase
    .from("checkins")
    .select("id, category_id")
    .eq("id", checkinId)
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .single();

  if (checkError || !checkin) {
    throw new Error("Invalid or already completed checkin");
  }

  // Get all answers for wellness level calculation
  const { data: answers } = await supabase
    .from("checkin_answers")
    .select("answer")
    .eq("checkin_id", checkinId);

  // Calculate wellness level based on answers
  let wellnessLevel = 5; // Default
  if (answers && answers.length > 0) {
    const numericAnswers = answers
      .map((a: any) => a.answer?.value)
      .filter((v: any) => typeof v === "number");

    if (numericAnswers.length > 0) {
      wellnessLevel = Math.round(
        numericAnswers.reduce((sum: number, val: number) => sum + val, 0) /
          numericAnswers.length,
      );
    }
  }

  // Update checkin status
  const { error: updateError } = await supabase
    .from("checkins")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      wellness_level: wellnessLevel,
      proposals: proposals || null,
    })
    .eq("id", checkinId);

  if (updateError) {
    throw new Error("Failed to complete checkin");
  }

  // Generate recommendations if proposals provided
  const createdRecommendations = [];
  if (proposals && Array.isArray(proposals)) {
    for (const proposal of proposals) {
      const { data: rec } = await supabase
        .from("recommendations")
        .insert({
          user_id: userId,
          category_id: checkin.category_id,
          title: proposal.title || "Wellness Tip",
          content: proposal.content || proposal,
          level: proposal.level || 1,
          importance: proposal.importance || 5,
          metadata: {
            source: "checkin",
            checkin_id: checkinId,
          },
        })
        .select()
        .single();

      if (rec) createdRecommendations.push(rec);
    }
  }

  // Get final checkin data
  const { data: completedCheckin } = await supabase
    .from("checkins")
    .select("*")
    .eq("id", checkinId)
    .single();

  return {
    success: true,
    checkin: completedCheckin,
    checkinId,
    checkin_id: checkinId, // For compatibility
    completedAt: completedCheckin.completed_at,
    completed_at: completedCheckin.completed_at, // For compatibility
    recommendations: createdRecommendations,
    insights: {
      totalQuestionsAnswered: answers?.length || 0,
      total_questions_answered: answers?.length || 0, // For compatibility
      wellnessLevel,
      wellness_level: wellnessLevel, // For compatibility
      categoryId: checkin.category_id,
      category_id: checkin.category_id, // For compatibility
    },
  };
}

async function abandonCheckin(
  supabase: any,
  userId: string,
  body: CheckinRequest,
) {
  // Support both camelCase and snake_case
  const checkinId = body.checkinId || body.checkin_id;

  if (!checkinId) {
    throw new Error("checkinId or checkin_id is required");
  }

  const { error: updateError } = await supabase
    .from("checkins")
    .update({
      status: "abandoned",
      completed_at: new Date().toISOString(),
    })
    .eq("id", checkinId)
    .eq("user_id", userId)
    .eq("status", "in_progress");

  if (updateError) {
    throw new Error("Failed to abandon checkin");
  }

  return {
    success: true,
    checkinId,
    checkin_id: checkinId, // For compatibility
  };
}

function validateAnswer(question: CheckinQuestion, answer: any) {
  switch (question.type) {
    case "boolean":
      if (typeof answer !== "boolean") {
        throw new Error("Answer must be true or false");
      }
      break;

    case "number":
    case "scale":
      if (typeof answer !== "number") {
        throw new Error("Answer must be a number");
      }
      if (question.min !== undefined && answer < question.min) {
        throw new Error(`Answer must be at least ${question.min}`);
      }
      if (question.max !== undefined && answer > question.max) {
        throw new Error(`Answer must be at most ${question.max}`);
      }
      break;

    case "multiple_choice":
      if (question.options && !question.options.includes(answer)) {
        throw new Error("Invalid option selected");
      }
      break;

    case "text":
      if (typeof answer !== "string" || answer.trim() === "") {
        throw new Error("Answer must be non-empty text");
      }
      break;
  }
}

function generateInitialQuestions(
  category: any,
  recentCheckins: any[],
): CheckinQuestion[] {
  // Generate unique question IDs
  const createQuestionId = (index: number) =>
    `q_${category.id}_${Date.now()}_${index}`;

  // Mock questions based on category
  const questionTemplates: Record<string, CheckinQuestion[]> = {
    "Physical Health": [
      {
        id: createQuestionId(1),
        text:
          "How would you rate your physical energy today on a scale of 1-10?",
        type: "scale",
        min: 1,
        max: 10,
        required: true,
      },
      {
        id: createQuestionId(2),
        text: "What physical activities have you done recently?",
        type: "text",
        required: true,
      },
      {
        id: createQuestionId(3),
        text: "Are there any physical discomforts you're experiencing?",
        type: "text",
        required: false,
      },
    ],
    "Mental Health": [
      {
        id: createQuestionId(1),
        text: "How are you feeling emotionally right now?",
        type: "text",
        required: true,
      },
      {
        id: createQuestionId(2),
        text: "Rate your stress levels today from 1-10",
        type: "scale",
        min: 1,
        max: 10,
        required: true,
      },
      {
        id: createQuestionId(3),
        text: "What's been on your mind lately?",
        type: "text",
        required: false,
      },
    ],
    "Social Wellness": [
      {
        id: createQuestionId(1),
        text: "How connected do you feel to others today?",
        type: "scale",
        min: 1,
        max: 10,
        required: true,
      },
      {
        id: createQuestionId(2),
        text: "Have you had any meaningful interactions recently?",
        type: "boolean",
        required: true,
      },
      {
        id: createQuestionId(3),
        text: "Is there anything in your relationships you'd like to improve?",
        type: "text",
        required: false,
      },
    ],
    "Personal Growth": [
      {
        id: createQuestionId(1),
        text: "What progress have you made toward your goals recently?",
        type: "text",
        required: true,
      },
      {
        id: createQuestionId(2),
        text: "Rate your satisfaction with your personal growth (1-10)",
        type: "scale",
        min: 1,
        max: 10,
        required: true,
      },
      {
        id: createQuestionId(3),
        text: "What area of growth feels most important right now?",
        type: "text",
        required: false,
      },
    ],
  };

  // Default questions if category not found
  const defaultQuestions: CheckinQuestion[] = [
    {
      id: createQuestionId(1),
      text: `How are you doing with ${category.name} today?`,
      type: "text",
      required: true,
    },
    {
      id: createQuestionId(2),
      text: "Rate your wellness in this area from 1-10",
      type: "scale",
      min: 1,
      max: 10,
      required: true,
    },
    {
      id: createQuestionId(3),
      text: "What's been going well in this area?",
      type: "text",
      required: false,
    },
    {
      id: createQuestionId(4),
      text: "What challenges are you facing?",
      type: "text",
      required: false,
    },
    {
      id: createQuestionId(5),
      text: "What would help you feel better about this?",
      type: "text",
      required: false,
    },
  ];

  let questions = questionTemplates[category.name] || defaultQuestions;

  // Add personalization based on recent check-ins
  if (recentCheckins.length > 0) {
    const lastCheckin = recentCheckins[0];
    if (lastCheckin.wellness_level && lastCheckin.wellness_level < 5) {
      questions = [
        {
          id: createQuestionId(0),
          text:
            "I noticed things were challenging last time. How are you feeling now?",
          type: "text",
          required: true,
        },
        ...questions,
      ];
    }
  }

  return questions.slice(0, category.max_questions || 5);
}

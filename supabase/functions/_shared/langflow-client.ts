import {
  AnalyticsSummary,
  ChatMessage,
  Recommendation,
  UserContext,
} from "./types.ts";

export class LangflowClient {
  private endpoint: string;
  private apiKey: string | undefined;

  constructor(endpoint?: string) {
    this.endpoint = endpoint || Deno.env.get("LANGFLOW_ENDPOINT") ||
      "http://localhost:7860/api/v1/run";
    this.apiKey = Deno.env.get("LANGFLOW_API_KEY");
  }

  async getRecommendations(context: UserContext): Promise<Recommendation[]> {
    if (!this.apiKey) {
      return this.generateContextualRecommendations(context);
    }

    try {
      const response = await this.callLangflow("recommendations", {
        user_context: context,
        request_type: "get_recommendations",
      });

      if (response.recommendations) {
        return response.recommendations;
      }
    } catch (error) {
      console.error("Langflow API error:", error);
    }

    // Fallback to contextual recommendations
    return this.generateContextualRecommendations(context);
  }

  async processCheckIn(
    question: string,
    previousResponses: string[],
    context: UserContext,
  ): Promise<string> {
    if (!this.apiKey) {
      return this.generateCheckInQuestion(question, previousResponses, context);
    }

    try {
      const response = await this.callLangflow("checkin", {
        current_question: question,
        previous_responses: previousResponses,
        user_context: context,
        request_type: "process_checkin",
      });

      if (response.next_question) {
        return response.next_question;
      }
    } catch (error) {
      console.error("Langflow API error:", error);
    }

    // Fallback to contextual question generation
    return this.generateCheckInQuestion(question, previousResponses, context);
  }

  async getChatResponse(
    message: string,
    history: ChatMessage[],
    context: UserContext,
  ): Promise<string> {
    // First try OpenAI if available
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (openAiKey) {
      try {
        return await this.getOpenAIChatResponse(message, history, context, openAiKey);
      } catch (error) {
        console.error("OpenAI API error:", error);
      }
    }

    // Then try Langflow
    if (this.apiKey) {
      try {
        const response = await this.callLangflow("chat", {
          message,
          chat_history: history,
          user_context: context,
          request_type: "chat_response",
        });

        if (response.response) {
          return response.response;
        }
      } catch (error) {
        console.error("Langflow API error:", error);
      }
    }

    // Fallback to contextual response
    return this.generateContextualChatResponse(message, history, context);
  }

  async getAnalyticsInsights(summary: AnalyticsSummary): Promise<string[]> {
    if (!this.apiKey) {
      return this.generateAnalyticsInsights(summary);
    }

    try {
      const response = await this.callLangflow("analytics", {
        analytics_summary: summary,
        request_type: "get_insights",
      });

      if (response.insights) {
        return response.insights;
      }
    } catch (error) {
      console.error("Langflow API error:", error);
    }

    // Fallback to generated insights
    return this.generateAnalyticsInsights(summary);
  }

  private async callLangflow(flowId: string, data: any): Promise<any> {
    if (!this.apiKey) {
      throw new Error("Langflow API key not configured");
    }

    const response = await fetch(`${this.endpoint}/${flowId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input_value: data,
        output_type: "json",
      }),
    });

    if (!response.ok) {
      throw new Error(`Langflow API error: ${response.status}`);
    }

    const result = await response.json();
    return result.output || result;
  }

  private async getOpenAIChatResponse(
    message: string,
    history: ChatMessage[],
    context: UserContext,
    apiKey: string
  ): Promise<string> {
    const messages = [
      {
        role: "system",
        content: `You are a supportive wellness coach. The user has been using the Totalis wellness app.
Context:
- User has checked in to these categories recently: ${context.recent_categories.join(", ")}
- Number of recent check-ins: ${context.check_in_history.length}

Be empathetic, supportive, and encouraging. Keep responses concise but meaningful.`
      },
      ...history.map(msg => ({
        role: msg.is_user ? "user" : "assistant",
        content: msg.message
      })),
      {
        role: "user",
        content: message
      }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages,
        temperature: 0.8,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private generateContextualRecommendations(context: UserContext): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const recentCategories = context.recent_categories || [];
    
    // Base recommendation on check-in history
    if (context.check_in_history.length === 0) {
      recommendations.push({
        user_id: context.user_id,
        title: "Start Your Wellness Journey",
        insight: "Regular check-ins help you track and improve your wellness",
        why: "Self-reflection is the first step toward positive change",
        action: "Complete your first check-in in any wellness category",
        category_id: "",
        importance: 10,
        relevance: "Getting started is the most important step",
      });
    }

    // Category-specific recommendations
    if (recentCategories.includes("stress") || recentCategories.includes("mental_health")) {
      recommendations.push({
        user_id: context.user_id,
        title: "Practice Mindful Breathing",
        insight: "Simple breathing exercises can significantly reduce stress",
        why: "Deep breathing activates your body's relaxation response",
        action: "Try the 4-7-8 breathing technique for 5 minutes",
        category_id: recentCategories[0] || "",
        importance: 8,
        relevance: "Based on your recent mental health focus",
      });
    }

    if (recentCategories.includes("sleep") || recentCategories.includes("rest")) {
      recommendations.push({
        user_id: context.user_id,
        title: "Establish a Sleep Routine",
        insight: "Consistent sleep patterns improve overall wellness",
        why: "Your body thrives on regular sleep-wake cycles",
        action: "Set a consistent bedtime and wake time for this week",
        category_id: recentCategories[0] || "",
        importance: 7,
        relevance: "Supporting your sleep quality goals",
      });
    }

    // General wellness recommendations
    recommendations.push({
      user_id: context.user_id,
      title: "Stay Hydrated",
      insight: "Proper hydration affects energy, mood, and focus",
      why: "Even mild dehydration can impact your well-being",
      action: "Drink a glass of water right now and set reminders for throughout the day",
      category_id: "",
      importance: 6,
      relevance: "Fundamental for overall wellness",
    });

    return recommendations.slice(0, 3);
  }

  private generateCheckInQuestion(
    question: string,
    previousResponses: string[],
    context: UserContext,
  ): string {
    const questionIndex = previousResponses.length;

    const questions = [
      "How are you feeling right now on a scale of 1-10?",
      "What's the main thing affecting how you feel today?",
      "What would help you feel better right now?",
      "Is there anything specific you'd like support with?",
      "What's one positive thing you can do for yourself today?",
    ];

    if (questionIndex < questions.length) {
      return questions[questionIndex];
    }

    return "Thank you for sharing. Your responses help us provide better support. How do you feel after this reflection?";
  }

  private generateContextualChatResponse(
    message: string,
    history: ChatMessage[],
    context: UserContext,
  ): string {
    const lowerMessage = message.toLowerCase();

    // Greeting responses
    if (lowerMessage.match(/^(hi|hello|hey|good morning|good afternoon)/)) {
      return "Hello! I'm here to support your wellness journey. How are you feeling today?";
    }

    // Feeling-based responses
    if (lowerMessage.includes("tired") || lowerMessage.includes("exhausted")) {
      return "I hear that you're feeling tired. Rest is so important for our well-being. Have you been able to get quality sleep lately? Sometimes even a short break can help restore some energy.";
    }

    if (lowerMessage.includes("stressed") || lowerMessage.includes("anxious")) {
      return "It sounds like you're dealing with some stress. That can be really challenging. Would you like to try a quick breathing exercise together, or would you prefer to talk about what's on your mind?";
    }

    if (lowerMessage.includes("happy") || lowerMessage.includes("good") || lowerMessage.includes("great")) {
      return "That's wonderful to hear! It's important to acknowledge and celebrate when we're feeling good. What's contributing to these positive feelings?";
    }

    // Question responses
    if (lowerMessage.includes("how") && lowerMessage.includes("you")) {
      return "Thank you for asking! I'm here to support you. How can I help you with your wellness journey today?";
    }

    if (lowerMessage.includes("help") || lowerMessage.includes("support")) {
      return "I'm here to help! You can share what's on your mind, explore wellness categories, or complete a check-in to track how you're doing. What would be most helpful for you right now?";
    }

    // Default supportive response
    const supportiveResponses = [
      "Thank you for sharing that with me. Your feelings are valid and it's great that you're taking time to reflect on them.",
      "I appreciate you opening up. Remember that every step you take toward wellness matters, no matter how small.",
      "That's an important insight. How does it feel to express this?",
      "I hear you. Taking care of your wellness is a journey, and you're not alone in it.",
      "Your self-awareness is really valuable. What do you think would be a good next step for you?",
    ];

    const index = (message.length + history.length) % supportiveResponses.length;
    return supportiveResponses[index];
  }

  private generateAnalyticsInsights(summary: AnalyticsSummary): string[] {
    const insights: string[] = [];

    // Streak insights
    if (summary.streak_days > 7) {
      insights.push(
        `Excellent consistency! Your ${summary.streak_days}-day check-in streak shows real commitment to your wellness.`,
      );
    } else if (summary.streak_days > 3) {
      insights.push(
        `Good momentum! You've checked in for ${summary.streak_days} days in a row. Keep it up!`,
      );
    }

    // Completion rate insights
    if (summary.total_check_ins > 0) {
      const completionRate = (summary.completed_check_ins / summary.total_check_ins) * 100;
      if (completionRate >= 80) {
        insights.push(
          `Outstanding! You've completed ${completionRate.toFixed(0)}% of your check-ins. This dedication is building strong wellness habits.`,
        );
      } else if (completionRate >= 50) {
        insights.push(
          `You're making progress with a ${completionRate.toFixed(0)}% completion rate. Every check-in counts!`,
        );
      }
    }

    // Category focus insights
    if (summary.top_categories.length > 0) {
      const topCategory = summary.top_categories[0];
      insights.push(
        `You've been focusing on ${topCategory.category_name} with ${topCategory.count} check-ins. This focused attention helps deepen your self-awareness.`,
      );

      if (summary.top_categories.length > 2) {
        insights.push(
          `You're taking a holistic approach by engaging with ${summary.top_categories.length} different wellness areas. This balanced perspective is valuable.`,
        );
      }
    }

    // Encouragement for new users
    if (summary.total_check_ins < 5) {
      insights.push(
        "You're just getting started on your wellness journey. Each check-in helps you understand yourself better.",
      );
    }

    return insights;
  }
}

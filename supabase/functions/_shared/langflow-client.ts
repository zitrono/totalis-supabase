import { UserContext, Recommendation, ChatMessage, AnalyticsSummary } from './types.ts';

export class LangflowClient {
  private endpoint: string;
  
  constructor(endpoint?: string) {
    this.endpoint = endpoint || Deno.env.get('LANGFLOW_ENDPOINT') || 'http://localhost:7860/api/v1/run';
  }

  async getRecommendations(context: UserContext): Promise<Recommendation[]> {
    // TODO: Integrate with Langflow API
    // For now, return mocked recommendations based on context
    return this.mockRecommendations(context);
  }

  async processCheckIn(question: string, previousResponses: string[], context: UserContext): Promise<string> {
    // TODO: Integrate with Langflow API
    // For now, return mocked follow-up questions
    return this.mockCheckInResponse(question, previousResponses, context);
  }

  async getChatResponse(message: string, history: ChatMessage[], context: UserContext): Promise<string> {
    // TODO: Integrate with Langflow API
    // For now, return mocked supportive response
    return this.mockChatResponse(message, history, context);
  }

  async getAnalyticsInsights(summary: AnalyticsSummary): Promise<string[]> {
    // TODO: Integrate with Langflow API
    // For now, return mocked insights
    return this.mockAnalyticsInsights(summary);
  }

  // Mock implementations
  private mockRecommendations(context: UserContext): Recommendation[] {
    const recommendations: Recommendation[] = [
      {
        userId: context.userId,
        title: "Practice Mindful Breathing",
        insight: "Your recent check-ins show elevated stress levels",
        why: "Breathing exercises can help reduce stress and improve focus",
        action: "Take 5 minutes to practice the 4-7-8 breathing technique",
        categoryId: context.recentCategories[0] || '',
        importance: 9,
        relevance: "Based on your recent Stress Management check-in"
      },
      {
        userId: context.userId,
        title: "Schedule a Digital Detox",
        insight: "You've been consistently active late at night",
        why: "Reducing screen time before bed improves sleep quality",
        action: "Set a phone curfew 1 hour before bedtime tonight",
        categoryId: context.recentCategories[1] || '',
        importance: 7,
        relevance: "Aligned with your Sleep Quality goals"
      },
      {
        userId: context.userId,
        title: "Connect with a Friend",
        insight: "Social connections boost mental well-being",
        why: "Maintaining relationships is crucial for emotional health",
        action: "Send a message to someone you haven't talked to recently",
        categoryId: context.recentCategories[2] || '',
        importance: 6,
        relevance: "Supports your Relationships focus area"
      }
    ];

    return recommendations.slice(0, Math.min(3, context.recentCategories.length || 1));
  }

  private mockCheckInResponse(question: string, previousResponses: string[], context: UserContext): string {
    if (previousResponses.length === 0) {
      return "How would you rate your current stress level on a scale of 1-10?";
    } else if (previousResponses.length === 1) {
      return "What specific situation or thought is contributing most to this feeling?";
    } else if (previousResponses.length === 2) {
      return "What's one small step you could take today to address this?";
    } else {
      return "Thank you for sharing. Remember, small steps lead to big changes. How do you feel after this reflection?";
    }
  }

  private mockChatResponse(message: string, history: ChatMessage[], context: UserContext): string {
    const supportiveResponses = [
      "I understand how you're feeling. It's completely normal to experience these emotions. What matters most right now is that you're taking steps to address them.",
      "Thank you for sharing this with me. Your awareness of these feelings is already a positive step forward. How can I support you further?",
      "That sounds challenging. Remember that progress isn't always linear, and it's okay to have difficult days. What has helped you cope in similar situations before?",
      "I hear you. Taking time to check in with yourself like this shows real strength. What would make you feel even a little bit better right now?",
      "Your feelings are valid. It takes courage to acknowledge what you're going through. Let's work together to find strategies that work for you."
    ];

    // Simple logic to pick a response based on message length and history
    const index = (message.length + history.length) % supportiveResponses.length;
    return supportiveResponses[index];
  }

  private mockAnalyticsInsights(summary: AnalyticsSummary): string[] {
    const insights: string[] = [];

    if (summary.streakDays > 7) {
      insights.push(`Great job! You've maintained a ${summary.streakDays}-day check-in streak.`);
    }

    if (summary.completedCheckIns > 10) {
      insights.push(`You've completed ${summary.completedCheckIns} check-ins. Your consistency is building positive habits.`);
    }

    if (summary.topCategories.length > 0) {
      insights.push(`You've been focusing on ${summary.topCategories[0].categoryName} most frequently. This shows good self-awareness.`);
    }

    if (summary.totalCheckIns > 0) {
      const completionRate = (summary.completedCheckIns / summary.totalCheckIns) * 100;
      insights.push(`Your check-in completion rate is ${completionRate.toFixed(0)}%. Every check-in is a step forward!`);
    }

    return insights;
  }
}
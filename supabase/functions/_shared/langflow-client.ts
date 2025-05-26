import {
  AnalyticsSummary,
  ChatMessage,
  Recommendation,
  UserContext,
  CheckInQuestion,
  AIResponse,
  CheckInSummary,
} from "./types.ts";

export class LangflowClient {
  private endpoint: string;

  constructor(endpoint?: string) {
    this.endpoint = endpoint || Deno.env.get("LANGFLOW_ENDPOINT") ||
      "http://localhost:7860/api/v1/run";
  }

  async getRecommendations(context: UserContext): Promise<Recommendation[]> {
    // TODO: Integrate with Langflow API
    // Mock delay to simulate API call
    await this.delay(Math.random() * 500 + 200);
    return this.mockRecommendations(context);
  }

  async processCheckIn(
    question: string,
    previousResponses: string[],
    context: UserContext,
  ): Promise<CheckInQuestion> {
    // TODO: Integrate with Langflow API
    await this.delay(Math.random() * 300 + 100);
    return this.mockCheckInResponse(question, previousResponses, context);
  }

  async getChatResponse(
    message: string,
    history: ChatMessage[],
    context: UserContext,
  ): Promise<AIResponse> {
    // TODO: Integrate with Langflow API
    await this.delay(Math.random() * 800 + 400);
    return this.mockChatResponse(message, history, context);
  }

  async generateCheckInSummary(
    responses: string[],
    categoryName: string,
    context: UserContext,
  ): Promise<CheckInSummary> {
    // TODO: Integrate with Langflow API
    await this.delay(Math.random() * 600 + 300);
    return this.mockCheckInSummary(responses, categoryName, context);
  }

  getAnalyticsInsights(summary: AnalyticsSummary): string[] {
    // TODO: Integrate with Langflow API
    return this.mockAnalyticsInsights(summary);
  }

  // Real Langflow integration (placeholder)
  private async callLangflow(
    flowId: string, 
    inputs: Record<string, any>
  ): Promise<any> {
    const response = await fetch(`${this.endpoint}/${flowId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LANGFLOW_API_KEY')}`,
      },
      body: JSON.stringify({
        inputs,
        tweaks: {},
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Langflow API error: ${response.statusText}`);
    }
    
    return await response.json();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
        categoryId: context.recentCategories[0] || "",
        importance: 9,
        relevance: "Based on your recent Stress Management check-in",
      },
      {
        userId: context.userId,
        title: "Schedule a Digital Detox",
        insight: "You've been consistently active late at night",
        why: "Reducing screen time before bed improves sleep quality",
        action: "Set a phone curfew 1 hour before bedtime tonight",
        categoryId: context.recentCategories[1] || "",
        importance: 7,
        relevance: "Aligned with your Sleep Quality goals",
      },
      {
        userId: context.userId,
        title: "Connect with a Friend",
        insight: "Social connections boost mental well-being",
        why: "Maintaining relationships is crucial for emotional health",
        action: "Send a message to someone you haven't talked to recently",
        categoryId: context.recentCategories[2] || "",
        importance: 6,
        relevance: "Supports your Relationships focus area",
      },
    ];

    return recommendations.slice(
      0,
      Math.min(3, context.recentCategories.length || 1),
    );
  }

  private mockCheckInResponse(
    _question: string,
    previousResponses: string[],
    context: UserContext,
  ): CheckInQuestion {
    const questionBank = {
      stress: [
        "How would you rate your current stress level on a scale of 1-10?",
        "What specific situation or thought is contributing most to this feeling?",
        "When did you first notice feeling this way today?",
        "What physical sensations are you experiencing right now?",
        "What's one small step you could take right now to feel a bit better?"
      ],
      mood: [
        "How would you describe your overall mood today?",
        "What emotions have been most present for you recently?",
        "Have there been any specific triggers for these feelings?",
        "What activities usually help lift your spirits?",
        "How has your mood affected your daily activities?"
      ],
      sleep: [
        "How many hours did you sleep last night?",
        "How would you rate the quality of your sleep?",
        "What time did you go to bed and wake up?",
        "Did anything interrupt your sleep?",
        "How do you feel physically right now?"
      ],
      default: [
        "How are you feeling right now in this moment?",
        "What's been on your mind lately?",
        "What would you like to focus on today?",
        "How has this area of your life been for you recently?",
        "What support would be most helpful right now?"
      ]
    };

    const categoryType = this.getCategoryType(context.recentCategories[0] || '');
    const questions = questionBank[categoryType] || questionBank.default;
    
    const questionIndex = Math.min(previousResponses.length, questions.length - 1);
    const isComplete = previousResponses.length >= 3;
    
    return {
      question: questions[questionIndex],
      questionNumber: previousResponses.length + 1,
      totalQuestions: questions.length,
      isComplete,
      responseType: this.getResponseType(previousResponses.length)
    };
  }

  private mockChatResponse(
    message: string,
    history: ChatMessage[],
    context: UserContext,
  ): AIResponse {
    const messageType = this.analyzeMessageType(message);
    const coachPersonality = this.getCoachPersonality(context.coachId || '');
    
    let response: string;
    let suggestions: string[] = [];
    
    switch (messageType) {
      case 'distress':
        response = this.generateSupportiveResponse(message, coachPersonality);
        suggestions = [
          "Tell me more about what's happening",
          "What has helped you in similar situations?",
          "Would you like to do a quick check-in?"
        ];
        break;
      case 'progress':
        response = this.generateEncouragingResponse(message, coachPersonality);
        suggestions = [
          "What strategies worked best for you?",
          "How can we build on this success?",
          "What's your next goal?"
        ];
        break;
      case 'question':
        response = this.generateInformativeResponse(message, coachPersonality);
        suggestions = [
          "Would you like specific strategies?",
          "Should we explore this topic deeper?",
          "Want to try a guided exercise?"
        ];
        break;
      default:
        response = this.generateGeneralResponse(message, coachPersonality);
        suggestions = [
          "How are you feeling about this?",
          "What would be helpful right now?",
          "Tell me more"
        ];
    }

    return {
      text: response,
      suggestions,
      confidence: 0.85,
      processingTimeMs: Math.floor(Math.random() * 500 + 200),
      coachPersonality,
      followUp: this.shouldSuggestFollowUp(message, history)
    };
  }

  private mockCheckInSummary(
    responses: string[],
    categoryName: string,
    context: UserContext,
  ): CheckInSummary {
    const overallLevel = this.calculateWellnessLevel(responses);
    const insights = this.generateInsights(responses, categoryName, overallLevel);
    const recommendations = this.generateCheckInRecommendations(responses, categoryName, overallLevel);
    
    return {
      wellnessLevel: overallLevel,
      insights,
      summary: this.generateSummaryText(responses, categoryName, overallLevel),
      recommendations,
      improvementTips: this.generateImprovementTips(categoryName, overallLevel),
      nextCheckInSuggestion: this.getNextCheckInSuggestion(categoryName, overallLevel)
    };
  }

  private mockAnalyticsInsights(summary: AnalyticsSummary): string[] {
    const insights: string[] = [];

    if (summary.streakDays > 7) {
      insights.push(
        `Great job! You've maintained a ${summary.streakDays}-day check-in streak.`,
      );
    }

    if (summary.completedCheckIns > 10) {
      insights.push(
        `You've completed ${summary.completedCheckIns} check-ins. Your consistency is building positive habits.`,
      );
    }

    if (summary.topCategories.length > 0) {
      insights.push(
        `You've been focusing on ${
          summary.topCategories[0].categoryName
        } most frequently. This shows good self-awareness.`,
      );
    }

    if (summary.totalCheckIns > 0) {
      const completionRate =
        (summary.completedCheckIns / summary.totalCheckIns) * 100;
      insights.push(
        `Your check-in completion rate is ${
          completionRate.toFixed(0)
        }%. Every check-in is a step forward!`,
      );
    }

    return insights;
  }

  // Helper methods for enhanced mocking
  private getCategoryType(categoryId: string): string {
    const categoryMap: Record<string, string> = {
      'stress': 'stress',
      'anxiety': 'stress', 
      'mood': 'mood',
      'mental': 'mood',
      'sleep': 'sleep',
      'rest': 'sleep'
    };
    
    for (const [key, type] of Object.entries(categoryMap)) {
      if (categoryId.toLowerCase().includes(key)) {
        return type;
      }
    }
    return 'default';
  }

  private getResponseType(questionNumber: number): 'scale' | 'text' | 'choice' {
    if (questionNumber === 0) return 'scale';
    if (questionNumber % 2 === 1) return 'text';
    return 'choice';
  }

  private analyzeMessageType(message: string): 'distress' | 'progress' | 'question' | 'general' {
    const distressWords = ['stressed', 'anxious', 'worried', 'scared', 'overwhelmed', 'sad', 'depressed'];
    const progressWords = ['better', 'improved', 'good', 'great', 'progress', 'success'];
    const questionWords = ['how', 'what', 'why', 'when', 'where', '?'];
    
    const lowerMessage = message.toLowerCase();
    
    if (distressWords.some(word => lowerMessage.includes(word))) return 'distress';
    if (progressWords.some(word => lowerMessage.includes(word))) return 'progress';
    if (questionWords.some(word => lowerMessage.includes(word))) return 'question';
    return 'general';
  }

  private getCoachPersonality(coachId: string): string {
    const personalities = ['empathetic', 'encouraging', 'wise', 'gentle', 'supportive'];
    return personalities[coachId.length % personalities.length] || 'supportive';
  }

  private generateSupportiveResponse(message: string, personality: string): string {
    const responses = {
      empathetic: [
        "I can really hear the difficulty you're experiencing right now. It takes courage to share what you're going through.",
        "Thank you for trusting me with these feelings. What you're experiencing is completely valid and understandable.",
        "I'm here with you in this moment. These feelings are tough, but you don't have to face them alone."
      ],
      encouraging: [
        "I know this feels overwhelming right now, but I believe in your strength to work through this.",
        "You've overcome challenges before, and you have that same resilience within you now.",
        "Every step you take, including reaching out like this, shows your commitment to your wellbeing."
      ],
      wise: [
        "Difficult emotions like these are often signals that something needs our attention. What might this feeling be trying to tell you?",
        "In my experience, acknowledging these feelings is the first step toward understanding and healing.",
        "Sometimes our greatest growth comes from sitting with discomfort and learning what it has to teach us."
      ]
    };
    
    const responseArray = responses[personality] || responses.empathetic;
    return responseArray[Math.floor(Math.random() * responseArray.length)];
  }

  private generateEncouragingResponse(message: string, personality: string): string {
    const responses = [
      "That's wonderful progress! It's clear you're putting in the work and it's paying off.",
      "I'm so glad to hear about this positive shift. What do you think made the biggest difference?",
      "This is exactly the kind of momentum that creates lasting change. How does it feel to notice this improvement?",
      "Your dedication to your wellbeing is really showing. This success is well-deserved!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateInformativeResponse(message: string, personality: string): string {
    const responses = [
      "That's a thoughtful question. Let me share some insights that might help you understand this better.",
      "I appreciate your curiosity about this. Here's what research and experience suggest might be helpful.",
      "Great question! This is something many people wonder about. Let me offer some perspective.",
      "I'm glad you asked about this. Understanding these patterns can be really empowering."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateGeneralResponse(message: string, personality: string): string {
    const responses = [
      "Thank you for sharing that with me. I'm here to listen and support you however I can.",
      "I appreciate you taking the time to check in. How can I best support you right now?",
      "It sounds like you have a lot on your mind. Would it be helpful to explore any of this together?",
      "I'm grateful you're opening up about this. What feels most important to focus on today?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private shouldSuggestFollowUp(message: string, history: ChatMessage[]): boolean {
    return history.length >= 2 && Math.random() > 0.7;
  }

  private calculateWellnessLevel(responses: string[]): number {
    // Simple scoring based on response sentiment and length
    let score = 5.0; // baseline
    
    for (const response of responses) {
      const length = response.length;
      const hasPositiveWords = /good|great|better|fine|okay|well/i.test(response);
      const hasNegativeWords = /bad|awful|terrible|stressed|anxious|sad/i.test(response);
      
      if (hasPositiveWords) score += 1.5;
      if (hasNegativeWords) score -= 1.5;
      if (length > 50) score += 0.5; // more detailed responses indicate engagement
    }
    
    return Math.max(0, Math.min(10, Number(score.toFixed(1))));
  }

  private generateInsights(responses: string[], categoryName: string, level: number): string[] {
    const insights = [];
    
    if (level >= 7) {
      insights.push(`You're doing well in ${categoryName}. Your responses show positive patterns.`);
    } else if (level >= 4) {
      insights.push(`There's room for growth in ${categoryName}. Small steps can make a big difference.`);
    } else {
      insights.push(`${categoryName} needs some extra attention right now. That's completely okay and normal.`);
    }
    
    if (responses.some(r => r.length > 30)) {
      insights.push("Your thoughtful responses show good self-awareness.");
    }
    
    return insights;
  }

  private generateSummaryText(responses: string[], categoryName: string, level: number): string {
    return `Based on your check-in for ${categoryName}, your current wellness level is ${level}/10. ` +
           `Your responses indicate ${level >= 6 ? 'positive momentum' : 'areas that could benefit from attention'}. ` +
           `Remember that every check-in is a step toward greater self-awareness and wellbeing.`;
  }

  private generateCheckInRecommendations(responses: string[], categoryName: string, level: number): string[] {
    const recommendations = [];
    
    if (level < 5) {
      recommendations.push(`Consider setting aside 10 minutes today for ${categoryName.toLowerCase()} focused activities.`);
      recommendations.push("Practice the 5-4-3-2-1 grounding technique when you feel overwhelmed.");
    } else {
      recommendations.push(`Keep up the good work with ${categoryName.toLowerCase()}!`);
      recommendations.push("Consider sharing your successful strategies with others.");
    }
    
    return recommendations;
  }

  private generateImprovementTips(categoryName: string, level: number): string[] {
    const tipBank = {
      stress: [
        "Try the 4-7-8 breathing technique: inhale for 4, hold for 7, exhale for 8",
        "Take a 5-minute walk outside or by a window",
        "Practice progressive muscle relaxation starting with your toes"
      ],
      mood: [
        "Write down three things you're grateful for today",
        "Listen to music that usually lifts your spirits",
        "Connect with a friend or family member"
      ],
      sleep: [
        "Create a consistent bedtime routine",
        "Avoid screens for 1 hour before bed",
        "Keep your bedroom cool and dark"
      ],
      default: [
        "Take three deep breaths and focus on the present moment",
        "Do something kind for yourself today",
        "Remember that this feeling is temporary"
      ]
    };
    
    const categoryType = this.getCategoryType(categoryName);
    return tipBank[categoryType] || tipBank.default;
  }

  private getNextCheckInSuggestion(categoryName: string, level: number): string {
    if (level < 4) {
      return `Consider checking in with ${categoryName} again tomorrow to track your progress.`;
    } else if (level < 7) {
      return `A follow-up check-in in 2-3 days would help maintain momentum with ${categoryName}.`;
    } else {
      return `You're doing great with ${categoryName}! Check in again in a week to celebrate your progress.`;
    }
  }
}

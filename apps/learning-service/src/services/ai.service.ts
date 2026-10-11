import axios from 'axios';
import { config } from '../config';
import { QuizQuestion } from '@cloudlab/shared-types';

export class AIService {
  private static readonly SYSTEM_PROMPT = `
    You are an expert educational content creator for a high-end Cloud & DevOps training platform called CloudLab.
    Your task is to generate high-quality multiple-choice questions (MCQs) based on lesson content.
    Target audience: Professional engineers learning Cloud/DevOps.
    Difficulty: Bloom's Taxonomy Apply/Analyze level.
  `;

  /**
   * Call OpenAI-compatible API to generate quiz questions
   */
  private static async callOpenAI(prompt: string): Promise<QuizQuestion[]> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: config.llm.model,
        messages: [
          { role: 'system', content: this.SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${config.llm.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const parsed = JSON.parse(content);
    return parsed.questions || parsed;
  }

  /**
   * Call Google Gemini API to generate quiz questions
   */
  private static async callGemini(prompt: string): Promise<QuizQuestion[]> {
    const fullPrompt = `${this.SYSTEM_PROMPT}\n\n${prompt}`;
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.llm.model}:generateContent?key=${config.llm.apiKey}`,
      {
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.candidates[0].content.parts[0].text;
    // Gemini might wrap JSON in markdown code blocks, so clean it
    const jsonMatch = content.match(/```json?\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    const parsed = JSON.parse(jsonText);
    return parsed.questions || parsed;
  }

  /**
   * Universal LLM caller - routes to the correct provider
   */
  private static async callLLM(prompt: string): Promise<QuizQuestion[]> {
    const provider = config.llm.provider.toLowerCase();
    
    if (provider === 'gemini' || provider === 'google') {
      return this.callGemini(prompt);
    } else if (provider === 'openai') {
      return this.callOpenAI(prompt);
    } else {
      throw new Error(`Unsupported LLM provider: ${provider}. Use 'openai' or 'gemini'.`);
    }
  }

  static async generateModuleQuiz(
    moduleTitle: string,
    lessonsContent: string,
    questionCount: number = 5
  ): Promise<QuizQuestion[]> {
    if (!config.llm.apiKey) {
      console.warn('⚠️ [AI Service] LLM API Key missing. Returning mock questions.');
      const mockQuestions = this.generateMockQuestions(moduleTitle, questionCount);
      console.log(`✅ [AI Service] Generated ${mockQuestions.length} mock questions for: ${moduleTitle}`);
      return mockQuestions;
    }

    const prompt = `
      Module: ${moduleTitle}
      Content:
      ${lessonsContent}

      Generate ${questionCount} multiple-choice questions in JSON format.
      Each question must have:
      - id: unique string
      - question: the text of the question
      - options: an array of 4 distinct strings
      - correctIndex: 0-3
      - explanation: a detailed technical explanation of why the correct answer is right and why others are wrong.

      Return ONLY a JSON array of questions or an object with a "questions" array.
      Example format:
      {
        "questions": [
          {
            "id": "q1",
            "question": "What is Docker?",
            "options": ["A container platform", "A VM", "An OS", "A database"],
            "correctIndex": 0,
            "explanation": "Docker is a container platform..."
          }
        ]
      }
    `;

    try {
      return await this.callLLM(prompt);
    } catch (err: any) {
      console.error('❌ [AI Service] LLM call failed:', err.response?.data || err.message);
      return this.generateMockQuestions(moduleTitle, questionCount);
    }
  }

  static async generateCourseFinalQuiz(
    courseTitle: string,
    allLessonsContent: string,
    existingQuestions: QuizQuestion[],
    questionCount: number = 10
  ): Promise<QuizQuestion[]> {
    if (!config.llm.apiKey) {
      return this.generateMockQuestions(courseTitle, questionCount);
    }

    const prompt = `
      Course: ${courseTitle}
      Content:
      ${allLessonsContent}

      Existing Questions (DO NOT REPEAT THESE):
      ${JSON.stringify(existingQuestions.map(q => q.question))}

      Generate ${questionCount} COMPREHENSIVE final exam questions in JSON format.
      Return ONLY a JSON array of questions or an object with a "questions" array.
    `;

    try {
      return await this.callLLM(prompt);
    } catch (err: any) {
      console.error('❌ [AI Service] LLM call failed:', err.response?.data || err.message);
      return this.generateMockQuestions(courseTitle, questionCount);
    }
  }

  private static generateMockQuestions(title: string, count: number): QuizQuestion[] {
    const mocks: QuizQuestion[] = [];
    for (let i = 1; i <= count; i++) {
      mocks.push({
        id: `mock-q-${i}`,
        question: `[MOCK] ${title} - Assessment Question ${i}`,
        options: [
          'Option A',
          'Option B',
          'Option C',
          'Option D'
        ],
        correctIndex: Math.floor(Math.random() * 4), // Random correct answer
        explanation: 'This is a mock explanation generated because the LLM API key is not configured.'
      });
    }
    return mocks;
  }
}

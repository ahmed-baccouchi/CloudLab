import axios from 'axios';
import { config } from '../config';
import { AiChatMessageDto, AiChatRequestDto, AiChatResponseDto } from '@cloudlab/shared-types';

export interface AIServiceProvider {
  generateResponse(messages: AiChatMessageDto[], context?: any): Promise<string>;
}

const SYSTEM_PROMPT = `You are CloudLab AI, an intelligent educational assistant built into CloudLab — an educational cloud & DevOps training platform with microservices architecture.
Your job is to assist students, instructors, and developers with:
1. Understanding CloudLab features (Courses, Tracks, Microservices, Projects, Squads, Forum, Announcements).
2. Explaining Cloud Computing & DevOps topics (Docker, Kubernetes, CI/CD, AWS, Microservices, Node.js, Express, React, REST APIs, Databases).
3. Helping students troubleshoot code, debugging error messages, and designing clean software architectures.
Be encouraging, clear, concise, and format code snippets nicely with markdown when applicable.`;

export class GeminiAIProvider implements AIServiceProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateResponse(messages: AiChatMessageDto[], _context?: any): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    // Convert chat history into Gemini contents format
    const contents = [
      {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT }],
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I am CloudLab AI, ready to assist with CloudLab, DevOps, Cloud Computing, and Programming questions!' }],
      },
      ...messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    ];

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await axios.post(
      endpoint,
      { contents },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );

    const candidates = response.data?.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content?.parts?.length > 0) {
      return candidates[0].content.parts[0].text;
    }

    throw new Error('No candidate content received from Gemini API');
  }
}

export class FallbackAIProvider implements AIServiceProvider {
  async generateResponse(messages: AiChatMessageDto[], _context?: any): Promise<string> {
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop()?.content.toLowerCase() || '';

    if (lastUserMessage.includes('project') || lastUserMessage.includes('create project') || lastUserMessage.includes('squad')) {
      return `To create or manage projects in **CloudLab**:
1. Navigate to **Projects** in the top navigation bar.
2. Click **+ New Project** to open the project wizard.
3. Select your target framework, difficulty level, and squad capacity.
4. Once created, CloudLab AI automatically generates a milestone execution plan!`;
    }

    if (lastUserMessage.includes('course') || lastUserMessage.includes('track') || lastUserMessage.includes('learn')) {
      return `CloudLab offers interactive courses in **Courses & Tracks**:
- **DevOps Foundations**: Docker, Kubernetes, CI/CD pipelines.
- **Backend Microservices**: Node.js, Express, REST APIs, MySQL.
- **Frontend Architecture**: React, Vite, State Management.
Check out **Courses & Tracks** from the navbar to start learning!`;
    }

    if (lastUserMessage.includes('docker') || lastUserMessage.includes('container')) {
      return `**Docker Quick Guide in CloudLab**:
- **Build image**: \`docker build -t cloudlab-service .\`
- **Run container**: \`docker run -p 4000:4000 cloudlab-service\`
- **Docker Compose**: Use \`docker-compose up -d\` to run MySQL, Redis, and RabbitMQ together!`;
    }

    if (lastUserMessage.includes('kubernetes') || lastUserMessage.includes('k8s')) {
      return `**Kubernetes Concepts**:
- **Pods**: Smallest deployable unit running container(s).
- **Services**: Stable network endpoint for routing traffic to pods (ClusterIP, NodePort, LoadBalancer).
- **Deployments**: Manages replica sets and declarative app updates.`;
    }

    if (lastUserMessage.includes('hello') || lastUserMessage.includes('hi') || lastUserMessage.includes('help')) {
      return `Hello! 👋 I am your **CloudLab AI Assistant**. You can ask me about:
- CloudLab platform features (Projects, Courses, Forum, Announcements)
- Docker, Kubernetes, Microservices & CI/CD
- Code debugging & web development questions! How can I assist you today?`;
    }

    return `Thank you for your question regarding "${lastUserMessage.substring(0, 40)}..."!
As your CloudLab AI Assistant, I recommend checking our **Forum** or **Courses & Tracks** for deep-dive tutorials on this topic. Feel free to ask more specific questions about Docker, Kubernetes, Node.js, or CloudLab projects!`;
  }
}

export class AIService {
  private provider: AIServiceProvider;

  constructor() {
    if (config.ai.apiKey) {
      this.provider = new GeminiAIProvider(config.ai.apiKey, config.ai.model);
    } else {
      console.log('ℹ️ [AIService] No AI_API_KEY provided. Using Fallback Local AI Provider.');
      this.provider = new FallbackAIProvider();
    }
  }

  async handleChat(dto: AiChatRequestDto): Promise<AiChatResponseDto> {
    if (!dto.messages || dto.messages.length === 0) {
      throw new Error('Messages array cannot be empty');
    }

    let responseText = '';
    try {
      responseText = await this.provider.generateResponse(dto.messages, dto.context);
    } catch (err: any) {
      console.warn('⚠️ [AIService] Primary AI provider failed. Using Fallback Provider:', err.message);
      const fallback = new FallbackAIProvider();
      responseText = await fallback.generateResponse(dto.messages, dto.context);
    }

    return {
      message: {
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export const aiService = new AIService();

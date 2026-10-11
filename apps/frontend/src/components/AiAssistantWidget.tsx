import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, User, RefreshCw, AlertCircle } from 'lucide-react';
import { communicationApi } from '../api/communication';
import type { AiChatMessageDto } from '@cloudlab/shared-types';


const SUGGESTED_PROMPTS = [
  'How do I create and manage a project squad in CloudLab?',
  'What is the difference between Docker Pods and Kubernetes Deployments?',
  'How do I enroll in a course and attempt module quizzes?',
  'Explain microservices architecture and API Gateway routing.',
];

export const AiAssistantWidget: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [messages, setMessages] = useState<AiChatMessageDto[]>([
    {
      role: 'assistant',
      content: `Hello! 👋 I am **CloudLab AI**, your intelligent assistant.\n\nAsk me anything about CloudLab platform features, courses, projects, Docker, Kubernetes, or programming concepts!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMessage: AiChatMessageDto = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      // Send chat history to backend API (keeps API key secure)
      const res = await communicationApi.sendAiChatMessage({
        messages: updatedHistory.map((m) => ({ role: m.role, content: m.content })),
      });

      const aiMessage: AiChatMessageDto = {
        role: 'assistant',
        content: res.message.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error: Unable to fetch AI response (${err.response?.data?.message || err.message}). Please try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderFormattedContent = (content: string) => {
    // Basic formatting for bold and code blocks
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('```')) {
        return null; // Ignore fence line
      }
      return (
        <React.Fragment key={idx}>
          {line.includes('`') ? (
            <span>{line}</span>
          ) : (
            line
          )}
          {idx < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <div className={`ai-chat-container ${compact ? 'compact' : ''}`}>
      {/* Header */}
      <div className="ai-chat-header">
        <div className="ai-header-left">
          <div className="ai-bot-avatar">
            <Bot size={20} color="#040812" />
          </div>
          <div>
            <div className="ai-title-row">
              <span className="ai-title">CloudLab AI Assistant</span>

            </div>
            <span className="ai-subtitle">Instant answers for DevOps, Courses &amp; CloudLab platform</span>
          </div>
        </div>

        <button
          type="button"
          className="btn-clear-chat"
          title="Clear Conversation"
          onClick={() =>
            setMessages([
              {
                role: 'assistant',
                content: 'Conversation reset. Ask me a question!',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ])
          }
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Messages Body */}
      <div className="ai-chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`ai-message-row ${msg.role}`}>
            <div className="ai-msg-avatar">
              {msg.role === 'assistant' ? <Bot size={16} color="#00d4ff" /> : <User size={16} color="#fff" />}
            </div>
            <div className="ai-msg-bubble">
              <div className="ai-msg-header">
                <span className="ai-sender-name">{msg.role === 'assistant' ? 'CloudLab AI' : 'You'}</span>
                {msg.timestamp && <span className="ai-msg-time">{msg.timestamp}</span>}
              </div>
              <div className="ai-msg-text">{renderFormattedContent(msg.content)}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="ai-message-row assistant">
            <div className="ai-msg-avatar">
              <Bot size={16} color="#00d4ff" />
            </div>
            <div className="ai-msg-bubble loading">
              <div className="typing-indicator">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      {messages.length <= 2 && !loading && (
        <div className="ai-suggested-prompts">
          <span className="prompts-label">Suggested Questions:</span>
          <div className="prompts-grid">
            {SUGGESTED_PROMPTS.map((prompt, pIdx) => (
              <button
                key={pIdx}
                type="button"
                className="prompt-chip"
                onClick={() => handleSend(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="ai-chat-input-area">
        <input
          type="text"
          className="ai-input"
          placeholder="Ask something about CloudLab, Docker, Kubernetes..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          type="button"
          className="btn-send-ai"
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
        >
          <Send size={16} />
          <span>Send</span>
        </button>
      </div>

      <style>{`
        .ai-chat-container {
          background: rgba(13, 18, 29, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          height: 600px;
          overflow: hidden;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
        }

        .ai-chat-container.compact {
          height: 450px;
        }

        .ai-chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .ai-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ai-bot-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #00d4ff 0%, #0077ff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px rgba(0, 212, 255, 0.4);
        }

        .ai-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ai-title {
          font-size: 15px;
          font-weight: 700;
          color: #fff;
        }

        .ai-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 700;
          background: rgba(0, 212, 255, 0.15);
          color: #00d4ff;
          border: 1px solid rgba(0, 212, 255, 0.3);
          padding: 2px 8px;
          border-radius: 12px;
        }

        .ai-subtitle {
          font-size: 11.5px;
          color: #94a3b8;
        }

        .btn-clear-chat {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-clear-chat:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .ai-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ai-message-row {
          display: flex;
          gap: 12px;
          max-width: 85%;
        }

        .ai-message-row.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .ai-message-row.assistant {
          align-self: flex-start;
        }

        .ai-msg-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .ai-msg-bubble {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 12px 16px;
          color: #e2e8f0;
          font-size: 13.5px;
          line-height: 1.5;
        }

        .user .ai-msg-bubble {
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.18), rgba(0, 119, 255, 0.18));
          border-color: rgba(0, 212, 255, 0.35);
          color: #fff;
        }

        .ai-msg-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 4px;
        }

        .ai-sender-name {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .ai-msg-time {
          font-size: 10px;
          color: #64748b;
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 4px;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          background: #00d4ff;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        .ai-suggested-prompts {
          padding: 10px 20px;
          background: rgba(0, 0, 0, 0.2);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .prompts-label {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
          display: block;
          margin-bottom: 8px;
        }

        .prompts-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .prompt-chip {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .prompt-chip:hover {
          background: rgba(0, 212, 255, 0.12);
          border-color: rgba(0, 212, 255, 0.3);
          color: #00d4ff;
        }

        .ai-chat-input-area {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 20px;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .ai-input {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 10px 14px;
          color: #fff;
          font-size: 13.5px;
          outline: none;
          transition: border-color 0.15s;
        }

        .ai-input:focus {
          border-color: #00d4ff;
        }

        .btn-send-ai {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #00d4ff 0%, #0077ff 100%);
          border: none;
          color: #040812;
          font-weight: 700;
          font-size: 13px;
          padding: 10px 18px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-send-ai:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(0, 212, 255, 0.35);
        }

        .btn-send-ai:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

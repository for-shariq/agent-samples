import { useEffect, useRef } from 'react';
import type { Message } from '../types';
import Composer from './Composer';
import AssistantMessage from './AssistantMessage';

interface Props {
  messages: Message[];
  busy: boolean;
  onSend: (text: string) => void;
}

const suggestions = [
  { icon: 'bi-lightbulb', text: 'What can you help me do?' },
  { icon: 'bi-search', text: 'Research a topic from official sources' },
  { icon: 'bi-pencil-square', text: 'Help me draft an email' },
  { icon: 'bi-code-slash', text: 'Explain a piece of code' },
];

export default function ChatView({ messages, busy, onSend }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const scrollToEnd = () => endRef.current?.scrollIntoView({ block: 'end' });
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  return (
    <div className="chat-view">
      <div className="chat-scroll">
        {messages.length === 0 ? (
          <div className="hero">
            <span className="brand-mark lg" aria-hidden />
            <h1>How can I help you today?</h1>
            <div className="suggestions">
              {suggestions.map((s) => (
                <button key={s.text} className="suggestion" onClick={() => onSend(s.text)}>
                  <i className={`bi ${s.icon}`} />
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages">
            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="msg user"><div className="bubble">{m.content}</div></div>
              ) : (
                <AssistantMessage
                  key={m.id}
                  id={m.id}
                  content={m.content}
                  error={m.error}
                  animate={m.animate}
                  onTick={scrollToEnd}
                />
              ),
            )}
            {busy && (
              <div className="msg assistant" role="status" aria-live="polite">
                <span className="brand-mark sm pulsing" aria-hidden />
                <div className="thinking"><span className="shimmer">Thinking…</span></div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>
      <Composer disabled={busy} onSend={onSend} />
    </div>
  );
}

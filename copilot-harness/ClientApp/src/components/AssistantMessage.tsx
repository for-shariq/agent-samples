import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

// Ids whose reveal animation already finished, so switching chats doesn't replay it.
const revealed = new Set<string>();

interface Props {
  id: string;
  content: string;
  error?: boolean;
  animate?: boolean;
  onTick: () => void;
}

export default function AssistantMessage({ id, content, error, animate, onTick }: Props) {
  const shouldAnimate = !!animate && !error && !revealed.has(id);
  const [shown, setShown] = useState(shouldAnimate ? 0 : content.length);
  const [copied, setCopied] = useState(false);
  const tick = useRef(onTick);
  tick.current = onTick;

  useEffect(() => {
    if (!shouldAnimate) return;
    // Finish in roughly 1.5s regardless of reply length.
    const step = Math.max(2, Math.ceil(content.length / 90));
    const timer = setInterval(() => {
      setShown((n) => {
        const next = Math.min(content.length, n + step);
        if (next >= content.length) {
          clearInterval(timer);
          revealed.add(id);
        }
        return next;
      });
      tick.current();
    }, 16);
    return () => clearInterval(timer);
  }, [id, content, shouldAnimate]);

  const done = shown >= content.length;

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="msg assistant">
      <span className="brand-mark sm" aria-hidden />
      <div className="reply-col">
        <div className={`reply markdown ${error ? 'text-danger' : ''} ${done ? '' : 'streaming'}`}>
          <ReactMarkdown>{content.slice(0, shown)}</ReactMarkdown>
        </div>
        {done && !error && (
          <div className="msg-actions">
            <button className="icon-btn sm" aria-label="Copy" title="Copy" onClick={copy}>
              <i className={`bi ${copied ? 'bi-check2' : 'bi-copy'}`} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { Activity, Conversation } from '../types';

interface Props {
  conversations: Conversation[];
  activeId: string;
  open: boolean;
  onClose: () => void;
}

const isSkill = (a: Activity) => a.kind === 'function' && /skill/i.test(a.name);

function iconFor(a: Activity): string {
  if (isSkill(a)) return 'bi-stars';
  switch (a.kind) {
    case 'web_search': return 'bi-globe2';
    case 'file_search': return 'bi-file-earmark-search';
    case 'function': return 'bi-gear';
    default: return 'bi-tools';
  }
}

function labelFor(a: Activity): string {
  if (isSkill(a)) return 'Skill';
  switch (a.kind) {
    case 'web_search': return 'Web search';
    case 'file_search': return 'File search';
    case 'function': return 'Function';
    default: return 'Tool';
  }
}

function prettyArgs(raw: string): string {
  try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
}

function ActivityItem({ a }: { a: Activity }) {
  const [expanded, setExpanded] = useState(false);
  const failed = !!a.status && /fail|incomplete|cancel/i.test(a.status);
  const hasArgs = !!a.arguments && a.arguments !== '{}';

  return (
    <li className="activity-item">
      <button
        className="activity-row"
        onClick={() => hasArgs && setExpanded((e) => !e)}
        aria-expanded={hasArgs ? expanded : undefined}
        disabled={!hasArgs}
      >
        <span className={`activity-icon ${isSkill(a) ? 'skill' : ''}`}><i className={`bi ${iconFor(a)}`} /></span>
        <span className="activity-text">
          <span className="activity-name text-truncate">{a.name}</span>
          <span className="activity-meta">{labelFor(a)}</span>
        </span>
        {a.status && (
          <span className={`activity-status ${failed ? 'failed' : ''}`}>
            <i className={`bi ${failed ? 'bi-x-circle-fill' : 'bi-check-circle-fill'}`} />
          </span>
        )}
        {hasArgs && <i className={`bi ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'} activity-chevron`} />}
      </button>
      {expanded && hasArgs && <pre className="activity-args">{prettyArgs(a.arguments!)}</pre>}
    </li>
  );
}

function Section({ icon, title, items }: { icon: string; title: string; items: Activity[] }) {
  const [expanded, setExpanded] = useState(true);
  if (items.length === 0) return null;
  return (
    <div className="activity-section">
      <button className="activity-section-head" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
        <i className={`bi ${expanded ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
        <i className={`bi ${icon}`} />
        <span>{title}</span>
        <span className="activity-count">{items.length}</span>
      </button>
      {expanded && (
        <ul className="activity-list">
          {[...items].reverse().map((a) => <ActivityItem key={a.id} a={a} />)}
        </ul>
      )}
    </div>
  );
}

function ConversationGroup({ conversation, defaultOpen }: { conversation: Conversation; defaultOpen: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const { activities } = conversation;
  return (
    <div className="activity-group">
      <button className="activity-group-head" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
        <i className={`bi ${expanded ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
        <span className="text-truncate">{conversation.title}</span>
        <span className="activity-count">{activities.length}</span>
      </button>
      {expanded && (
        <>
          <Section icon="bi-stars" title="Skills" items={activities.filter(isSkill)} />
          <Section icon="bi-tools" title="Tools" items={activities.filter((a) => !isSkill(a))} />
        </>
      )}
    </div>
  );
}

export default function ActivityPanel({ conversations, activeId, open, onClose }: Props) {
  const withActivity = conversations.filter((c) => c.activities.length > 0);
  return (
    <>
      {open && <div className="activity-backdrop d-xl-none" onClick={onClose} />}
      <aside className={`activity-panel ${open ? 'open' : ''}`} aria-label="Tools and skills">
        <div className="activity-head">
          <span className="fw-semibold">Tools &amp; skills</span>
          <button className="icon-btn sm ms-auto" aria-label="Close panel" onClick={onClose}>
            <i className="bi bi-x-lg" />
          </button>
        </div>
        {withActivity.length === 0 ? (
          <div className="activity-empty">
            <i className="bi bi-tools" />
            <p>Tools and skills the agent uses will appear here.</p>
          </div>
        ) : (
          <div className="activity-groups">
            {withActivity.map((c) => (
              <ConversationGroup key={c.id} conversation={c} defaultOpen={c.id === activeId} />
            ))}
          </div>
        )}
      </aside>
    </>
  );
}

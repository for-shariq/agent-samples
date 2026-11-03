import type { Conversation } from '../types';

interface Props {
  conversations: Conversation[];
  activeId: string;
  open: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
}

export default function Sidebar({ conversations, activeId, open, onSelect, onNew, onClose }: Props) {
  return (
    <>
      {open && <div className="sidebar-backdrop d-md-none" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-head">
          <span className="brand-mark" aria-hidden />
          <span className="fw-semibold">Copilot</span>
        </div>
        <button className="btn new-chat-btn" onClick={onNew}>
          <i className="bi bi-plus-lg me-2" />New chat
        </button>
        <div className="sidebar-section">Chats</div>
        <nav className="chat-list">
          {conversations.map((c) => (
            <button
              key={c.id}
              className={`chat-item ${c.id === activeId ? 'active' : ''}`}
              onClick={() => onSelect(c.id)}
            >
              <i className="bi bi-chat-left-text me-2" />
              <span className="text-truncate">{c.title}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}

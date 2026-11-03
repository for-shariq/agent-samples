import { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import ActivityPanel from './components/ActivityPanel';
import { sendChat } from './api';
import type { Conversation, Message } from './types';

const uid = () => crypto.randomUUID();
const newConversation = (): Conversation => ({ id: uid(), title: 'New chat', messages: [], activities: [] });

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() => [newConversation()]);
  const [activeId, setActiveId] = useState(() => conversations[0].id);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(true);

  const active = conversations.find((c) => c.id === activeId)!;

  const patch = (id: string, fn: (c: Conversation) => Conversation) =>
    setConversations((list) => list.map((c) => (c.id === id ? fn(c) : c)));

  const setBusy = (id: string, on: boolean) =>
    setBusyIds((s) => {
      const next = new Set(s);
      if (on) next.add(id); else next.delete(id);
      return next;
    });

  const startNew = () => {
    const c = newConversation();
    setConversations((l) => [c, ...l]);
    setActiveId(c.id);
    setSidebarOpen(false);
  };

  const send = async (text: string) => {
    const id = activeId;
    const foundryId = active.foundryId;
    const userMsg: Message = { id: uid(), role: 'user', content: text };
    patch(id, (c) => ({
      ...c,
      title: c.messages.length === 0 ? text.slice(0, 40) : c.title,
      messages: [...c.messages, userMsg],
    }));
    setBusy(id, true);
    try {
      const { reply, conversationId, activities } = await sendChat(text, foundryId);
      patch(id, (c) => ({
        ...c,
        foundryId: conversationId,
        activities: [
          ...c.activities,
          ...(activities ?? []).map((a) => ({
            id: uid(),
            kind: a.kind,
            name: a.name,
            status: a.status ?? undefined,
            arguments: a.arguments ?? undefined,
          })),
        ],
        messages: [...c.messages, { id: uid(), role: 'assistant', content: reply, animate: true }],
      }));
    } catch (e) {
      patch(id, (c) => ({
        ...c,
        messages: [...c.messages, { id: uid(), role: 'assistant', content: (e as Error).message, error: true }],
      }));
    } finally {
      setBusy(id, false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        open={sidebarOpen}
        onSelect={(id) => { setActiveId(id); setSidebarOpen(false); }}
        onNew={startNew}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="main-pane">
        <header className="topbar">
          <button className="icon-btn d-md-none" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
            <i className="bi bi-list" />
          </button>
          <span className="brand-title">Copilot</span>
          <button
            className="icon-btn ms-auto"
            aria-label="Toggle activity panel"
            title="Tools & skills"
            onClick={() => setActivityOpen((o) => !o)}
          >
            <i className={`bi ${activityOpen ? 'bi-layout-sidebar-reverse' : 'bi-tools'}`} />
          </button>
        </header>
        <ChatView messages={active.messages} busy={busyIds.has(activeId)} onSend={send} />
      </main>
      <ActivityPanel conversations={conversations} activeId={activeId} open={activityOpen} onClose={() => setActivityOpen(false)} />
    </div>
  );
}

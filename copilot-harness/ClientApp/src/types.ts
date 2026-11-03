export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  error?: boolean;
  // Reveal the reply progressively the first time it is shown.
  animate?: boolean;
}

export type ActivityKind = 'web_search' | 'file_search' | 'function' | 'other';

// A tool/skill call the agent made while producing a reply.
export interface Activity {
  id: string;
  kind: ActivityKind;
  name: string;
  status?: string;
  arguments?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  activities: Activity[];
  // Foundry conversation id, assigned by the backend on the first reply.
  foundryId?: string;
}

export interface MockSocket {
  ev: {
    on: (_event: string, _handler: (...args: unknown[]) => void) => void;
  };
  sendPresenceUpdate: (_presence: string) => Promise<void>;
  sendMessage: (_jid: string, _content: unknown) => Promise<{ key: { id: string } }>;
  groupFetchAllParticipating: () => Promise<Record<string, { id: string; subject: string }>>;
  end: (_code?: unknown) => void;
}

const socket: MockSocket = {
  ev: {
    on: () => {},
  },
  sendPresenceUpdate: async () => {},
  sendMessage: async () => ({ key: { id: 'mock-message-id' } }),
  groupFetchAllParticipating: async () => ({}),
  end: () => {},
};

export default function makeWASocket(): MockSocket {
  return socket;
}

export async function useMultiFileAuthState(): Promise<{
  state: Record<string, unknown>;
  saveCreds: () => Promise<void>;
}> {
  return {
    state: {},
    saveCreds: async () => {},
  };
}

export async function fetchLatestBaileysVersion(): Promise<{
  version: [number, number, number];
}> {
  return { version: [1, 0, 0] };
}

export const DisconnectReason = {
  loggedOut: 401,
};

export type WASocket = MockSocket;
export interface BaileysEventMap {
  'messages.upsert': unknown;
  'connection.update': {
    connection?: 'close' | 'open' | 'connecting';
    qr?: string;
    lastDisconnect?: {
      error?: unknown;
    };
  };
}

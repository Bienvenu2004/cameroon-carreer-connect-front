import type { Client, IMessage } from "@stomp/stompjs";

import type { NotificationDto } from "@/types/api";

/**
 * Live notification feed over STOMP.
 *
 * The backend has had a working broker at /retms-websocket since early on, and
 * both @stomp/stompjs and sockjs-client have been installed the whole time —
 * neither was ever imported. The bell polled every thirty seconds instead, which
 * meant a candidate could be invited to interview and not hear about it for half
 * a minute, and every open tab issued two requests a minute whether anything had
 * happened or not. On metered mobile data that is not free.
 *
 * Authentication rides the existing HttpOnly cookie: the handshake interceptor
 * reads `access_token` off the upgrade request, so there is no token to hold in
 * JavaScript and nothing extra to send.
 *
 * The client is a module singleton with reference counting. Several components
 * may want the feed (the bell, a dashboard badge), and they should share one
 * socket rather than opening one each.
 *
 * SockJS and the STOMP client are imported dynamically. Statically, they landed
 * in the entry chunk -- roughly 50 kB gzipped -- because the notification bell
 * lives in the header, which every page renders. An anonymous visitor reading a
 * job advert has no notifications and no session to authenticate a socket with,
 * so they were paying for a feature they cannot use, on the exact connections
 * this platform exists to accommodate.
 */

/** Where the backend publishes per-user notifications. */
const USER_QUEUE = "/user/queue/notifications";

/** Matches the endpoint registered in WebSocketConfig. */
const ENDPOINT = "/retms-websocket";

type Listener = (notification: NotificationDto) => void;

let client: Client | null = null;
let listeners: Listener[] = [];
let connected = false;

function baseUrl(): string {
  // Same resolution as the axios client: empty in proxy mode (dev and
  // same-origin deployments), an absolute origin when the API is elsewhere.
  return import.meta.env.VITE_API_PROXY_TARGET ?? "";
}

function notify(message: IMessage) {
  let payload: NotificationDto;
  try {
    payload = JSON.parse(message.body) as NotificationDto;
  } catch {
    // A malformed frame is not worth taking the socket down for.
    return;
  }
  for (const listener of listeners) {
    try {
      listener(payload);
    } catch {
      // One bad listener must not starve the others.
    }
  }
}

/** In flight while the socket libraries are being fetched. */
let clientPromise: Promise<Client | null> | null = null;

async function ensureClient(): Promise<Client | null> {
  if (client) return client;
  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    const [{ default: SockJS }, { Client: StompClient }] = await Promise.all([
      import("sockjs-client"),
      import("@stomp/stompjs"),
    ]);

    const created = new StompClient({
      // SockJS rather than a raw WebSocket because the backend registers the
      // endpoint `.withSockJS()`, and because its XHR fallbacks are what keep
      // this working on the restrictive mobile networks the platform targets.
      webSocketFactory: () => new SockJS(`${baseUrl()}${ENDPOINT}`),

      // Back off rather than hammering a server that is down, and stay quiet in
      // production: STOMP's debug output is extremely chatty.
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: import.meta.env.DEV ? (msg) => console.debug("[stomp]", msg) : () => {},

      onConnect: () => {
        connected = true;
        created.subscribe(USER_QUEUE, notify);
      },
      onWebSocketClose: () => {
        connected = false;
      },
      onStompError: () => {
        connected = false;
      },
    });

    client = created;
    return created;
  })().catch(() => {
    // A blocked or failed chunk load must not break the page. The bell keeps
    // polling, which is exactly why the poll was retained as a fallback.
    clientPromise = null;
    return null;
  });

  return clientPromise;
}

/**
 * Subscribe to live notifications.
 *
 * Returns an unsubscribe function. The socket opens on the first subscriber and
 * closes when the last one leaves, so a logged-out visitor never holds one open.
 */
export function subscribeToNotifications(listener: Listener): () => void {
  listeners.push(listener);

  void ensureClient().then((c) => {
    // Bail if everyone unsubscribed while the chunk was downloading.
    if (!c || listeners.length === 0) return;
    if (!c.active) c.activate();
  });

  return () => {
    listeners = listeners.filter((l) => l !== listener);
    if (listeners.length === 0 && client) {
      void client.deactivate();
      client = null;
      clientPromise = null;
      connected = false;
    }
  };
}

/** Whether the feed is currently live. Used to decide how hard to poll. */
export function isSocketConnected(): boolean {
  return connected;
}

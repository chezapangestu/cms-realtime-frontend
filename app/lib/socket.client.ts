"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL || "";
  if (!url) return null;

  if (socket) return socket;

  socket = io(url, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    timeout: 20000,
  });

  return socket;
}

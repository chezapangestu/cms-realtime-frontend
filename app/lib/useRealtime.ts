"use client";

import { useEffect } from "react";
import { getSocket } from "./socket.client";

export function useRealtime({
  onPostUpsert,
  onPostDelete,
  onSettingsUpsert,
}: {
  onPostUpsert?: (post: any) => void;
  onPostDelete?: (payload: { id: string }) => void;
  onSettingsUpsert?: (payload: { fields?: Record<string, string> }) => void;
}) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onConnect = () => console.log("[socket] connected", socket.id);
    const onDisconnect = (r: any) => console.log("[socket] disconnected", r);
    const onConnectError = (e: any) =>
      console.log("[socket] connect_error", e?.message || e);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    if (onPostUpsert) socket.on("post:upsert", onPostUpsert);
    if (onPostDelete) socket.on("post:delete", onPostDelete);
    if (onSettingsUpsert) socket.on("settings:upsert", onSettingsUpsert);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);

      if (onPostUpsert) socket.off("post:upsert", onPostUpsert);
      if (onPostDelete) socket.off("post:delete", onPostDelete);
      if (onSettingsUpsert) socket.off("settings:upsert", onSettingsUpsert);

      // penting: JANGAN disconnect di sini
      // biar singleton tetap hidup walau page re-mount
    };
  }, [onPostUpsert, onPostDelete, onSettingsUpsert]);
}

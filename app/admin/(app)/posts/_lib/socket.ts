"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

type Options = {
  path?: string; // kalau backend kamu pakai default "/socket.io", boleh kosong
};

export function useSocket(socketUrl?: string, options?: Options) {
  const socketRef = useRef<Socket | null>(null);
  const urlRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // kalau url kosong, pastikan disconnect
    if (!socketUrl) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      urlRef.current = socketUrl;
      return;
    }

    // kalau url berubah, disconnect yang lama lalu buat baru
    const urlChanged = urlRef.current !== socketUrl;

    if (!socketRef.current || urlChanged) {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      socketRef.current = io(socketUrl, {
        path: options?.path ?? "/socket.io",
        transports: ["websocket"], // stabil untuk server prod
        withCredentials: true,
      });

      urlRef.current = socketUrl;
    }

    return () => {
      // cleanup saat unmount (dev strict mode akan memanggil ini juga)
      socketRef.current?.disconnect();
      socketRef.current = null;
      urlRef.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketUrl]);

  return socketRef.current;
}

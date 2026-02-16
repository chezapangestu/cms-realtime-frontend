"use client";

import { useEffect, useMemo, useState } from "react";

export type Phase =
  | "idle"
  | "loading_list"
  | "uploading_create"
  | "creating"
  | "uploading_update"
  | "updating"
  | "deleting"
  | "reordering";

export function useNotice(phase: Phase) {
  const [showNotice, setShowNotice] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState("");

  const isBusy = phase !== "idle";

  const busyLabel = useMemo(() => {
    if (phase === "loading_list") return "Loading...";
    if (phase === "uploading_create") return "Uploading...";
    if (phase === "creating") return "Creating...";
    if (phase === "uploading_update") return "Uploading...";
    if (phase === "updating") return "Updating...";
    if (phase === "deleting") return "Deleting...";
    if (phase === "reordering") return "Reordering...";
    return "";
  }, [phase]);

  function pushStatus(msg: string) {
    setErrorText("");
    setStatusText(msg);
    setShowNotice(true);
  }

  function pushError(msg: string) {
    setStatusText("");
    setErrorText(msg);
    setShowNotice(true);
  }

  function closeNotice() {
    setShowNotice(false);
  }

  function clearNotice() {
    setShowNotice(false);
    setStatusText("");
    setErrorText("");
  }

  // Auto-hide hanya untuk status (bukan error)
  useEffect(() => {
    if (!showNotice) return;
    if (!statusText) return;

    const t = setTimeout(() => setShowNotice(false), 3000);
    return () => clearTimeout(t);
  }, [showNotice, statusText]);

  return {
    showNotice,
    statusText,
    errorText,
    isBusy,
    busyLabel,

    pushStatus,
    pushError,
    closeNotice,
    clearNotice,
    setShowNotice,
    setStatusText,
    setErrorText,
  };
}

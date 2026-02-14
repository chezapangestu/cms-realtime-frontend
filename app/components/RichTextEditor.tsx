"use client";

import React, { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";

export function RichTextEditor({
  value,
  onChange,
  disabled,
  placeholder = "Tulis deskripsi...",
}: {
  value: string; // HTML string
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
      }),
      Underline,
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-zinc max-w-none focus:outline-none min-h-[140px] px-3 py-2",
      },
    },
  });

  function normalize(html: string) {
    const s = (html || "").trim();
    return s === "<p></p>" ? "" : s;
  }

  // sync external value changes (misal saat openEdit ganti post)
  useEffect(() => {
    if (!editor) return;
    const next = normalize(value || "");
    const current = normalize(editor.getHTML());
    if (next !== current) {
      editor.commands.setContent(next || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!mounted || !editor) return null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 px-2 py-2 text-sm">
        <ToolbarButton editor={editor} cmd="bold" label="B" />
        <ToolbarButton editor={editor} cmd="italic" label="I" />
        <ToolbarButton editor={editor} cmd="underline" label="U" />
        <Sep />
        {/* <ToolbarButton editor={editor} cmd="bulletList" label="• List" /> */}
        {/* <ToolbarButton editor={editor} cmd="orderedList" label="1. List" /> */}
        {/* <Sep /> */}
        <button
          type="button"
          disabled={!editor || disabled}
          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 hover:bg-zinc-50 disabled:opacity-50"
          onClick={() => {
            const url = prompt("Link URL (https://...)");
            if (!url) return;
            editor?.chain().focus().setLink({ href: url }).run();
          }}
        >
          Link
        </button>
        <button
          type="button"
          disabled={!editor || disabled}
          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 hover:bg-zinc-50 disabled:opacity-50"
          onClick={() => editor?.chain().focus().unsetLink().run()}
        >
          Unlink
        </button>
      </div>

      <div
        className="relative prose prose-zinc max-w-none
  prose-ul:list-disc prose-ol:list-decimal
  prose-ul:pl-6 prose-ol:pl-6
  prose-li:my-1"
      >
        {!value ? (
          <div className="pointer-events-none absolute left-3 top-2 text-sm text-zinc-400">
            {placeholder}
          </div>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Sep() {
  return <span className="mx-1 h-6 w-px bg-zinc-200" />;
}

function ToolbarButton({
  editor,
  cmd,
  label,
}: {
  editor: any;
  cmd: "bold" | "italic" | "underline" | "bulletList" | "orderedList";
  label: string;
}) {
  const run = () => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (cmd === "bold") chain.toggleBold().run();
    if (cmd === "italic") chain.toggleItalic().run();
    if (cmd === "underline") chain.toggleUnderline().run();
    if (cmd === "bulletList") chain.toggleBulletList().run();
    if (cmd === "orderedList") chain.toggleOrderedList().run();
  };

  const active =
    cmd === "bold"
      ? editor?.isActive("bold")
      : cmd === "italic"
        ? editor?.isActive("italic")
        : cmd === "underline"
          ? editor?.isActive("underline")
          : cmd === "bulletList"
            ? editor?.isActive("bulletList")
            : editor?.isActive("orderedList");

  return (
    <button
      type="button"
      onClick={run}
      disabled={!editor}
      className={[
        "rounded-lg border px-2 py-1",
        active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white hover:bg-zinc-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

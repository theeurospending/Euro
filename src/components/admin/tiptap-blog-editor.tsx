'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';

export function TiptapBlogEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: 'Write your article…' }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-zinc dark:prose-invert max-w-none min-h-[300px] p-4 focus:outline-none',
      },
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  async function pickAndUploadImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/admin/blog/upload-image', { method: 'POST', body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        editor?.chain().focus().setImage({ src: json.url, alt: file.name }).run();
      } catch (e) {
        alert(e instanceof Error ? e.message : String(e));
      } finally {
        setUploading(false);
      }
    };
    input.click();
  }

  if (!editor) return <div className="min-h-[300px] rounded border border-zinc-300 p-3 text-sm text-zinc-400">Loading…</div>;

  return (
    <div className="rounded border border-zinc-300 dark:border-zinc-700">
      <div className="flex flex-wrap gap-1 border-b border-zinc-300 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-900">
        <Tb on={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Tb>
        <Tb on={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Tb>
        <Tb on={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>B</Tb>
        <Tb on={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></Tb>
        <Tb on={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></Tb>
        <Tb on={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</Tb>
        <Tb on={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</Tb>
        <Tb on={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</Tb>
        <Tb on={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>{'</>'}</Tb>
        <Tb on={editor.isActive('link')} onClick={() => {
          const prev = editor.getAttributes('link').href ?? '';
          const url = window.prompt('URL', prev);
          if (url === null) return;
          if (url === '') editor.chain().focus().unsetLink().run();
          else editor.chain().focus().setLink({ href: url }).run();
        }}>🔗</Tb>
        <Tb onClick={pickAndUploadImage}>{uploading ? '⬆…' : '🖼'}</Tb>
        <Tb onClick={() => editor.chain().focus().setHorizontalRule().run()}>—</Tb>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function Tb({ on, onClick, children }: { on?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs ${on ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
    >
      {children}
    </button>
  );
}

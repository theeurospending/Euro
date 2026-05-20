'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

export function TiptapEditor({
  value,
  onChange,
  placeholder = 'Write something…',
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-zinc dark:prose-invert max-w-none min-h-[120px] p-3 focus:outline-none',
      },
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return <div className="min-h-[120px] rounded border border-zinc-300 p-3 text-sm text-zinc-400">Loading editor…</div>;

  return (
    <div className="rounded border border-zinc-300 dark:border-zinc-700">
      <div className="flex flex-wrap gap-1 border-b border-zinc-300 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-900">
        <TbButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>B</TbButton>
        <TbButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></TbButton>
        <TbButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</TbButton>
        <TbButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</TbButton>
        <TbButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</TbButton>
        <TbButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</TbButton>
        <TbButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</TbButton>
        <TbButton active={editor.isActive('link')} onClick={() => {
          const prev = editor.getAttributes('link').href ?? '';
          const url = window.prompt('URL', prev);
          if (url === null) return;
          if (url === '') editor.chain().focus().unsetLink().run();
          else editor.chain().focus().setLink({ href: url }).run();
        }}>🔗</TbButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function TbButton({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs ${active ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
    >
      {children}
    </button>
  );
}

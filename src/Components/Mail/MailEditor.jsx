import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { FormatBold, FormatItalic, FormatListBulleted, FormatListNumbered, Link as LinkIcon, Image as ImageIcon, FormatColorText } from '@mui/icons-material';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt('URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    
    if (url === null) {
      return;
    }
    
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 border border-gray-200 rounded">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-1 rounded ${editor.isActive('bold') ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-gray-700'}`}
        title="Bold"
      >
        <FormatBold fontSize="small" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-1 rounded ${editor.isActive('italic') ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-gray-700'}`}
        title="Italic"
      >
        <FormatItalic fontSize="small" />
      </button>
      
      <div className="w-px bg-gray-300 mx-1"></div>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1 rounded ${editor.isActive('bulletList') ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-gray-700'}`}
        title="Bullet List"
      >
        <FormatListBulleted fontSize="small" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1 rounded ${editor.isActive('orderedList') ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-gray-700'}`}
        title="Ordered List"
      >
        <FormatListNumbered fontSize="small" />
      </button>

      <div className="w-px bg-gray-300 mx-1"></div>
      
      <button
        type="button"
        onClick={setLink}
        className={`p-1 rounded ${editor.isActive('link') ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-gray-700'}`}
        title="Insert Link"
      >
        <LinkIcon fontSize="small" />
      </button>
      <button
        type="button"
        onClick={addImage}
        className="p-1 rounded hover:bg-gray-200 text-gray-700"
        title="Insert Image"
      >
        <ImageIcon fontSize="small" />
      </button>

      <div className="w-px bg-gray-300 mx-1"></div>

      <input
        type="color"
        onInput={event => editor.chain().focus().setColor(event.target.value).run()}
        value={editor.getAttributes('textStyle').color || '#000000'}
        className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
        title="Text Color"
      />
    </div>
  );
};

export const MailEditor = ({ content, onChange, placeholder = 'Write your email here...', editable = true }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      TextStyle,
      Color,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[150px] p-3 border border-gray-200 rounded',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full">
      {editable && <MenuBar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
};

export default MailEditor;

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { useAuth } from '../../context/AuthContext';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
import { FormatBold, FormatItalic, FormatListBulleted, FormatListNumbered, Link as LinkIcon, Image as ImageIcon, FormatColorText } from '@mui/icons-material';

const MenuBar = ({ editor }) => {
  const { accessToken } = useAuth();
  const [variables, setVariables] = useState([]);

  useEffect(() => {
    if (accessToken) {
      axios.get(`${API_BASE_URL}/mail/template-variables/`, { headers: { Authorization: `Bearer ${accessToken}` } })
        .then(res => setVariables(res.data))
        .catch(err => console.error(err));
    }
  }, [accessToken]);

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
    <div className="flex flex-wrap items-center gap-1.5 mb-2 p-2 bg-gray-50 border border-gray-200 rounded-xl">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-1 rounded ${editor.isActive('bold') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'}`}
        title="Bold"
      >
        <FormatBold fontSize="small" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-1 rounded ${editor.isActive('italic') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'}`}
        title="Italic"
      >
        <FormatItalic fontSize="small" />
      </button>
      
      <div className="w-px bg-gray-300 mx-1"></div>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1 rounded ${editor.isActive('bulletList') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'}`}
        title="Bullet List"
      >
        <FormatListBulleted fontSize="small" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1 rounded ${editor.isActive('orderedList') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'}`}
        title="Ordered List"
      >
        <FormatListNumbered fontSize="small" />
      </button>

      <div className="w-px bg-gray-300 mx-1"></div>
      
      <button
        type="button"
        onClick={setLink}
        className={`p-1 rounded ${editor.isActive('link') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'}`}
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
      
      <select 
        onChange={(e) => {
            if (e.target.value) {
                editor.chain().focus().insertContent(`{{${e.target.value}}}`).run();
                e.target.value = '';
            }
        }}
        className="px-2 py-1 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white cursor-pointer hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        title="Insert Template Variable"
        defaultValue=""
      >
        <option value="" disabled>@ Insert Variable...</option>
        {variables.map(v => (
            <option key={v.id} value={v.id}>{v.label} ({`{{${v.id}}}`})</option>
        ))}
      </select>

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
        class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[150px] p-3 border border-gray-200 rounded-xl bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all',
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

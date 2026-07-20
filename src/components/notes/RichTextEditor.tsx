import { useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { createLowlight, common } from 'lowlight';
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading1, Heading2, Heading3,
  Quote, Undo, Redo, Code, Code2, Image as ImageIcon, Link as LinkIcon, Unlink,
  AlignLeft, AlignCenter, AlignRight, Minus, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const lowlight = createLowlight(common);
// Signed URL válida por ~10 anos para uso prático em conteúdo persistido.
const IMAGE_SIGNED_TTL = 60 * 60 * 24 * 365 * 10;

const ProfessionalIndentBehavior = Extension.create({
  name: 'professionalIndentBehavior',

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        // Garante uma nova linha/parágrafo persistente sem depender de handlers externos.
        return this.editor.chain().focus().insertContent('<p></p>').run();
      },
      'Shift-Enter': () => {
        // Quebra simples dentro do mesmo parágrafo.
        return this.editor.chain().focus().insertContent('<br>').run();
      },
      Tab: () => {
        if (
          this.editor.isActive('bulletList') ||
          this.editor.isActive('orderedList') ||
          this.editor.isActive('codeBlock')
        ) {
          return false;
        }
        // Insere 2 espaços não colapsáveis para indentação visual.
        return this.editor.chain().focus().insertContent('\u00A0\u00A0').run();
      },
    };
  },
});

/**
 * Converte texto plano colado (com \n / \n\n) em HTML preservando parágrafos,
 * quebras de linha e múltiplos espaços (via &nbsp;). Exportado para testes.
 */
export function plainTextToHtml(text: string): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const preserveSpaces = (s: string) =>
    // 2+ espaços consecutivos viram nbsp para não colapsar no HTML.
    s.replace(/ {2,}/g, (m) => '\u00A0'.repeat(m.length));

  const paragraphs = text.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return paragraphs
    .map((p) => {
      const lines = p.split('\n').map((l) => preserveSpaces(escape(l)));
      return `<p>${lines.join('<br>')}</p>`;
    })
    .join('');
}

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder = 'Escreva suas anotações...' }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, link: false, underline: false }),
      Placeholder.configure({ placeholder }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      Image.configure({ HTMLAttributes: { class: 'rounded-md max-w-full h-auto my-3' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'typescript' }),
      TextStyle,
      FontFamily.configure({ types: ['textStyle'] }),
      ProfessionalIndentBehavior,
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-base dark:prose-invert max-w-none px-8 py-6 min-h-full focus:outline-none text-base leading-relaxed',
      },
      handlePaste: (_view, event) => {
        const cd = event.clipboardData;
        if (!cd) return false;
        const html = cd.getData('text/html');
        if (html && html.trim().length > 0) return false;
        const text = cd.getData('text/plain');
        if (!text || !/\n/.test(text)) return false;
        event.preventDefault();
        const htmlOut = plainTextToHtml(text);
        editor?.chain().focus().insertContent(htmlOut).run();
        return true;
      },
      handleDOMEvents: {
        keydown: (_view, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            // Impede atalhos globais/parents de capturarem, sem bloquear o ProseMirror.
            event.stopPropagation();
          }
          return false;
        },
      },
    },
  });

  if (!editor) return null;

  const handleImageUpload = async (file: File) => {
    if (!user) {
      toast({ title: 'Faça login para enviar imagens', variant: 'destructive' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande', description: 'Máximo 8MB.', variant: 'destructive' });
      return;
    }
    uploadingRef.current = true;
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('note-images').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from('note-images')
        .createSignedUrl(path, IMAGE_SIGNED_TTL);
      if (signErr || !signed) throw signErr || new Error('URL inválida');
      editor.chain().focus().setImage({ src: signed.signedUrl, alt: file.name }).run();
    } catch (err) {
      toast({
        title: 'Erro ao enviar imagem',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      uploadingRef.current = false;
    }
  };

  const promptLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL do link', previous || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const ToolButton = ({
    onClick, active, title, children,
  }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <Button
      type="button" variant="ghost" size="icon-sm" title={title} onClick={onClick}
      className={cn('h-8 w-8', active && 'bg-accent text-accent-foreground')}
    >
      {children}
    </Button>
  );
  const Divider = () => <div className="w-px h-6 bg-border mx-1" />;

  const DEFAULT_FONT = '__default__';
  const FONT_OPTIONS: { label: string; value: string }[] = [
    { label: 'Padrão', value: DEFAULT_FONT },
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Space Grotesk', value: '"Space Grotesk", sans-serif' },
    { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
    { label: 'Mono', value: '"JetBrains Mono", ui-monospace, monospace' },
    { label: 'System', value: 'system-ui, sans-serif' },
  ];
  const currentFont = (editor.getAttributes('textStyle').fontFamily as string | undefined) || DEFAULT_FONT;
  const setFont = (value: string) => {
    if (!value || value === DEFAULT_FONT) editor.chain().focus().unsetFontFamily().run();
    else editor.chain().focus().setFontFamily(value).run();
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background overflow-hidden">
      <div className="flex items-center gap-0.5 overflow-x-auto overflow-y-hidden whitespace-nowrap p-2 border-b border-border bg-muted/40 shrink-0">
        <ToolButton title="Negrito" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold className="h-4 w-4" /></ToolButton>
        <ToolButton title="Itálico" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic className="h-4 w-4" /></ToolButton>
        <ToolButton title="Sublinhado" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}><UnderlineIcon className="h-4 w-4" /></ToolButton>
        <ToolButton title="Código inline" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')}><Code className="h-4 w-4" /></ToolButton>
        <Divider />
        <Select value={currentFont} onValueChange={setFont}>
          <SelectTrigger className="h-8 w-[150px] text-xs" title="Fonte">
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((f) => (
              <SelectItem key={f.label} value={f.value} style={{ fontFamily: f.value !== DEFAULT_FONT ? f.value : undefined }}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Divider />
        <ToolButton title="Título 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}><Heading1 className="h-4 w-4" /></ToolButton>
        <ToolButton title="Título 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}><Heading2 className="h-4 w-4" /></ToolButton>
        <ToolButton title="Título 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}><Heading3 className="h-4 w-4" /></ToolButton>
        <Divider />
        <ToolButton title="Lista" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}><List className="h-4 w-4" /></ToolButton>
        <ToolButton title="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered className="h-4 w-4" /></ToolButton>
        <ToolButton title="Citação" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}><Quote className="h-4 w-4" /></ToolButton>
        <ToolButton title="Bloco de código" onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}><Code2 className="h-4 w-4" /></ToolButton>
        <ToolButton title="Divisor" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolButton>
        <Divider />
        <ToolButton title="Alinhar esquerda" onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })}><AlignLeft className="h-4 w-4" /></ToolButton>
        <ToolButton title="Centralizar" onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })}><AlignCenter className="h-4 w-4" /></ToolButton>
        <ToolButton title="Alinhar direita" onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })}><AlignRight className="h-4 w-4" /></ToolButton>
        <Divider />
        <ToolButton title="Inserir link" onClick={promptLink} active={editor.isActive('link')}><LinkIcon className="h-4 w-4" /></ToolButton>
        <ToolButton title="Remover link" onClick={() => editor.chain().focus().unsetLink().run()}><Unlink className="h-4 w-4" /></ToolButton>
        <ToolButton title="Enviar imagem" onClick={() => fileInputRef.current?.click()}>
          {uploadingRef.current ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </ToolButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImageUpload(file);
            e.target.value = '';
          }}
        />
        <Divider />
        <ToolButton title="Desfazer" onClick={() => editor.chain().focus().undo().run()}><Undo className="h-4 w-4" /></ToolButton>
        <ToolButton title="Refazer" onClick={() => editor.chain().focus().redo().run()}><Redo className="h-4 w-4" /></ToolButton>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto cursor-text"
        onClick={() => editor.chain().focus().run()}
      >
        <EditorContent
          editor={editor}
          className="h-full [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-full [&_.ProseMirror]:w-full [&_.ProseMirror]:cursor-text [&_.ProseMirror]:whitespace-pre-wrap [&_.ProseMirror]:leading-7 [&_.ProseMirror_p]:my-3 [&_.ProseMirror_p]:min-h-[1.75rem] [&_.ProseMirror_br]:block [&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_pre]:text-foreground [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:text-primary [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
        />
      </div>
    </div>
  );
}

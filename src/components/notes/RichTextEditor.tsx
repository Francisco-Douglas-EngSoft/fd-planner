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
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Superscript } from '@tiptap/extension-superscript';
import { Subscript } from '@tiptap/extension-subscript';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { createLowlight, common } from 'lowlight';
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading1, Heading2, Heading3,
  Quote, Undo, Redo, Code, Code2, Image as ImageIcon, Link as LinkIcon, Unlink,
  AlignLeft, AlignCenter, AlignRight, Minus, Loader2,
  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
  Highlighter, Palette, Table as TableIcon, ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
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

/** Extensão custom para tamanho de fonte via TextStyle. */
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] as string[] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.fontSize?.replace(/['"]+/g, '') || null,
            renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {}),
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    } as never;
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
      FontSize,
      Color.configure({ types: ['textStyle'] }),
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
      Table.configure({ resizable: true, HTMLAttributes: { class: 'note-table' } }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList.configure({ HTMLAttributes: { class: 'note-task-list' } }),
      TaskItem.configure({ nested: true }),
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

  const DEFAULT_SIZE = '__default__';
  const SIZE_OPTIONS = [
    { label: 'Padrão', value: DEFAULT_SIZE },
    { label: '12', value: '12px' },
    { label: '14', value: '14px' },
    { label: '16', value: '16px' },
    { label: '18', value: '18px' },
    { label: '20', value: '20px' },
    { label: '24', value: '24px' },
    { label: '30', value: '30px' },
    { label: '36', value: '36px' },
  ];
  const currentSize = (editor.getAttributes('textStyle').fontSize as string | undefined) || DEFAULT_SIZE;
  const setSize = (value: string) => {
    const chain = editor.chain().focus();
    if (!value || value === DEFAULT_SIZE) (chain as unknown as { unsetFontSize: () => typeof chain }).unsetFontSize().run();
    else (chain as unknown as { setFontSize: (s: string) => typeof chain }).setFontSize(value).run();
  };

  const TEXT_COLORS = ['#111827', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#6b7280'];
  const HIGHLIGHT_COLORS = ['#fef08a', '#fecaca', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fed7aa', '#fecdd3', '#a7f3d0'];

  return (
    <div className="flex flex-col h-full min-h-0 bg-background overflow-hidden">
      <div className="flex items-center gap-0.5 overflow-x-auto overflow-y-hidden whitespace-nowrap p-2 border-b border-border bg-muted/40 shrink-0">
        <ToolButton title="Negrito" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold className="h-4 w-4" /></ToolButton>
        <ToolButton title="Itálico" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic className="h-4 w-4" /></ToolButton>
        <ToolButton title="Sublinhado" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}><UnderlineIcon className="h-4 w-4" /></ToolButton>
        <ToolButton title="Código inline" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')}><Code className="h-4 w-4" /></ToolButton>
        <ToolButton title="Sobrescrito" onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')}><SuperscriptIcon className="h-4 w-4" /></ToolButton>
        <ToolButton title="Subscrito" onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')}><SubscriptIcon className="h-4 w-4" /></ToolButton>
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
        <Select value={currentSize} onValueChange={setSize}>
          <SelectTrigger className="h-8 w-[80px] text-xs" title="Tamanho">
            <SelectValue placeholder="Tam" />
          </SelectTrigger>
          <SelectContent>
            {SIZE_OPTIONS.map((s) => (
              <SelectItem key={s.label} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" title="Cor do texto" className="h-8 w-8">
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-5 gap-1">
              {TEXT_COLORS.map((c) => (
                <button key={c} type="button" title={c}
                  className="h-6 w-6 border border-border"
                  style={{ background: c }}
                  onClick={() => editor.chain().focus().setColor(c).run()} />
              ))}
              <button type="button" title="Remover cor"
                className="h-6 w-6 border border-border text-[10px] col-span-5 mt-1"
                onClick={() => editor.chain().focus().unsetColor().run()}>Padrão</button>
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" title="Destacar (marca-texto)"
              className={cn('h-8 w-8', editor.isActive('highlight') && 'bg-accent text-accent-foreground')}>
              <Highlighter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-4 gap-1">
              {HIGHLIGHT_COLORS.map((c) => (
                <button key={c} type="button" title={c}
                  className="h-6 w-6 border border-border"
                  style={{ background: c }}
                  onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()} />
              ))}
              <button type="button" title="Remover destaque"
                className="h-6 w-6 border border-border text-[10px] col-span-4 mt-1"
                onClick={() => editor.chain().focus().unsetHighlight().run()}>Remover</button>
            </div>
          </PopoverContent>
        </Popover>
        <Divider />
        <ToolButton title="Título 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}><Heading1 className="h-4 w-4" /></ToolButton>
        <ToolButton title="Título 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}><Heading2 className="h-4 w-4" /></ToolButton>
        <ToolButton title="Título 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}><Heading3 className="h-4 w-4" /></ToolButton>
        <Divider />
        <ToolButton title="Lista" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}><List className="h-4 w-4" /></ToolButton>
        <ToolButton title="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered className="h-4 w-4" /></ToolButton>
        <ToolButton title="Lista de tarefas" onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')}><ListChecks className="h-4 w-4" /></ToolButton>
        <ToolButton title="Citação" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}><Quote className="h-4 w-4" /></ToolButton>
        <ToolButton title="Bloco de código" onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}><Code2 className="h-4 w-4" /></ToolButton>
        <ToolButton title="Divisor" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolButton>
        <ToolButton title="Inserir tabela 3x3"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <TableIcon className="h-4 w-4" />
        </ToolButton>
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
          className="h-full note-prose [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-full [&_.ProseMirror]:w-full [&_.ProseMirror]:cursor-text [&_.ProseMirror]:whitespace-pre-wrap [&_.ProseMirror]:leading-7 [&_.ProseMirror_p]:my-3 [&_.ProseMirror_p]:min-h-[1.75rem] [&_.ProseMirror_br]:block [&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_pre]:text-foreground [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:text-primary [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
        />
      </div>
    </div>
  );
}

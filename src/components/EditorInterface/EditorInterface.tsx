import React, { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import {
  Bold,
  Italic,
  Heading2,
  Quote,
  Link as LinkIcon,
  List,
  Table,
  Save,
} from 'lucide-react';
import Button from '../common/Button';
import styles from './EditorInterface.module.css';

interface EditorInterfaceProps {
  initialValue?: string;
  path?: string; // absolute file path for saving/versioning
  projectId?: string;
}

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end);
  const isToggled = selected.startsWith(before) && selected.endsWith(after);

  if (isToggled) {
    const newSelected = selected.slice(
      before.length,
      selected.length - after.length
    );
    const next = value.slice(0, start) + newSelected + value.slice(end);
    textarea.value = next;
    textarea.selectionStart = start;
    textarea.selectionEnd = start + newSelected.length;
    return next;
  }

  const next =
    value.slice(0, start) + before + selected + after + value.slice(end);
  textarea.value = next;
  const cursor = start + before.length + selected.length;
  textarea.selectionStart = cursor;
  textarea.selectionEnd = cursor;
  return next;
}

function insertAtLineStart(textarea: HTMLTextAreaElement, prefix: string) {
  const start = textarea.selectionStart;
  const value = textarea.value;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  textarea.value = next;
  const delta = prefix.length;
  textarea.selectionStart = start + delta;
  textarea.selectionEnd = start + delta;
  return next;
}

const EditorInterface: React.FC<EditorInterfaceProps> = ({
  initialValue = '# New document',
  path,
  projectId,
}) => {
  const [content, setContent] = useState<string>(initialValue);
  const [dirty, setDirty] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const debounceTimer = useRef<number | null>(null);

  useEffect(() => {
    setContent(initialValue);
  }, [initialValue]);

  const handleInput: React.ChangeEventHandler<HTMLTextAreaElement> = e => {
    setContent(e.target.value);
    setDirty(true);
    // Debounced autosave after inactivity
    if (debounceTimer.current) {
      window.clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = window.setTimeout(() => {
      void autosave();
    }, 800);
  };

  const handleBlur: React.FocusEventHandler<HTMLTextAreaElement> = () => {
    // Save shortly after blur to avoid losing edits when switching views
    if (debounceTimer.current) {
      window.clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = window.setTimeout(() => {
      void autosave(true);
    }, 200);
  };

  const applyWrap = (before: string, after: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const next = wrapSelection(el, before, after);
    setContent(next);
    setDirty(true);
    el.focus();
  };

  const applyLinePrefix = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const next = insertAtLineStart(el, prefix);
    setContent(next);
    setDirty(true);
    el.focus();
  };

  const onBold = () => applyWrap('**', '**');
  const onItalic = () => applyWrap('*', '*');
  const onHeading = () => applyLinePrefix('## ');
  const onQuote = () => applyLinePrefix('> ');
  const onList = () => applyLinePrefix('- ');
  const onLink = () => applyWrap('[', '](https://)');
  const onTable = () => {
    const el = textareaRef.current;
    if (!el) return;
    const snippet = '\n| Column 1 | Column 2 |\n|---|---|\n|  |  |\n';
    const start = el.selectionStart;
    const value = el.value;
    const next = value.slice(0, start) + snippet + value.slice(start);
    el.value = next;
    setContent(next);
    setDirty(true);
    const cursor = start + snippet.length;
    el.selectionStart = cursor;
    el.selectionEnd = cursor;
    el.focus();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        onBold();
      } else if (key === 'i') {
        e.preventDefault();
        onItalic();
      } else if (key === 's') {
        e.preventDefault();
        // Schedule save after current input processing tick so we capture latest keystroke
        setTimeout(() => {
          void autosave(true);
        }, 0);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Save on unload if dirty
  useEffect(() => {
    const beforeUnload = () => {
      if (dirty) {
        void autosave(true);
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty, content]);

  async function autosave(isImmediate: boolean = false) {
    if (!path) return; // require path to save
    if (!dirty && !isImmediate) return;
    try {
      setSaving(true);
      const payloadContent = textareaRef.current?.value ?? content;
      const request = {
        tool: 'save_note',
        arguments: {
          path,
          content: payloadContent,
          project_id: projectId,
        },
      };
      const res = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const data = await res.json();
      if (!data.success) {
        // keep dirty so user knows it didn't save
        console.error('Autosave failed:', data.error);
        return;
      }
      setDirty(false);
      setLastSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Autosave error:', err);
    } finally {
      setSaving(false);
    }
  }

  function sanitize(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const walker = document.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_ELEMENT,
      null
    );
    // Remove script/style and event handlers
    const toRemove: Element[] = [];
    // Traverse
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const current = walker.nextNode() as Element | null;
      if (!current) break;
      const tag = current.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style') {
        toRemove.push(current);
        continue;
      }
      // Strip on* attributes
      [...current.attributes].forEach(attr => {
        if (attr.name.toLowerCase().startsWith('on')) {
          current.removeAttribute(attr.name);
        }
        if (attr.name.toLowerCase() === 'href') {
          const href = attr.value.trim();
          if (href.startsWith('javascript:')) {
            current.setAttribute('href', '#');
          }
        }
      });
    }
    toRemove.forEach(el => el.remove());
    return doc.body.innerHTML;
  }

  const rendered = useMemo(() => {
    const raw = marked.parse(content);
    return sanitize(raw);
  }, [content]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Markdown Editor</h2>
        <div className={styles.saveStatus}>
          {dirty ? (
            <>
              <span className={styles.dirtyDot} title='Unsaved changes' />
              <span>{saving ? 'Saving…' : 'Unsaved'}</span>
            </>
          ) : (
            <>
              <span className={styles.saveDot} title='Saved' />
              <span>
                {saving
                  ? 'Saving…'
                  : lastSavedAt
                    ? `Saved ${lastSavedAt}`
                    : 'Saved'}
              </span>
            </>
          )}
        </div>
      </div>
      <div className={styles.toolbar}>
        <Button
          variant='primary'
          size='sm'
          title='Save (Cmd/Ctrl+S)'
          onClick={() => autosave(true)}
          disabled={saving || !dirty}
        >
          <Save />
        </Button>
        <Button
          variant='ghost'
          size='sm'
          title='Bold (Ctrl/Cmd+B)'
          onClick={onBold}
        >
          <Bold />
        </Button>
        <Button
          variant='ghost'
          size='sm'
          title='Italic (Ctrl/Cmd+I)'
          onClick={onItalic}
        >
          <Italic />
        </Button>
        <Button variant='ghost' size='sm' title='Heading' onClick={onHeading}>
          <Heading2 />
        </Button>
        <Button variant='ghost' size='sm' title='Quote' onClick={onQuote}>
          <Quote />
        </Button>
        <Button variant='ghost' size='sm' title='List' onClick={onList}>
          <List />
        </Button>
        <Button variant='ghost' size='sm' title='Link' onClick={onLink}>
          <LinkIcon />
        </Button>
        <Button variant='ghost' size='sm' title='Table' onClick={onTable}>
          <Table />
        </Button>
      </div>
      <div className={styles.split}>
        <div className={styles.editorPane}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={content}
            onChange={handleInput}
            onBlur={handleBlur}
            aria-label='Markdown editor'
          />
        </div>
        <div className={styles.previewPane}>
          <div
            className={styles.preview}
            data-testid='preview'
            // Marked output; ensure CSS confines and we rely on trusted content in app context
            dangerouslySetInnerHTML={{ __html: rendered }}
          />
        </div>
      </div>
    </div>
  );
};

export default EditorInterface;

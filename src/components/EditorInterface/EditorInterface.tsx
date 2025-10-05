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
  Wand2,
  Sparkles,
  X,
} from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
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
  const [currentPath, setCurrentPath] = useState<string | undefined>(path);
  const [showNameModal, setShowNameModal] = useState<boolean>(false);
  const [proposedPath, setProposedPath] = useState<string>('');
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [genPrompt, setGenPrompt] = useState<string>('');
  const [genLoading, setGenLoading] = useState<boolean>(false);
  const [showRefineModal, setShowRefineModal] = useState<boolean>(false);
  const [refineInstruction, setRefineInstruction] = useState<string>(
    'Improve clarity and style while preserving meaning.'
  );
  const [refineLoading, setRefineLoading] = useState<boolean>(false);
  const [pendingRefined, setPendingRefined] = useState<string | null>(null);
  const [insertInfo, setInsertInfo] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    setContent(initialValue);
  }, [initialValue]);

  useEffect(() => {
    // Enforce file naming before editing if no path is set
    if (!currentPath) {
      setShowNameModal(true);
    }
  }, [currentPath]);

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
    if (!currentPath) return; // require path to save
    if (!dirty && !isImmediate) return;
    try {
      setSaving(true);
      setSaveError(null);
      const payloadContent = textareaRef.current?.value ?? content;
      const request = {
        tool: 'save_note',
        arguments: {
          path: currentPath,
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
        // keep dirty so user knows it didn't save/index
        const errMsg =
          typeof data.error === 'string' ? data.error : 'Autosave failed.';
        setSaveError(errMsg);
        console.error('Autosave failed:', errMsg);
        return;
      }
      setDirty(false);
      setLastSavedAt(new Date().toLocaleTimeString());
      // Brief success notice to reflect EP14 indexing completion
      setSaveNotice('Indexed');
      window.setTimeout(() => setSaveNotice(null), 2000);
    } catch (err) {
      console.error('Autosave error:', err);
      setSaveError('Network error during autosave');
    } finally {
      setSaving(false);
    }
  }

  async function generateFromPrompt() {
    setGenLoading(true);
    try {
      const request = {
        tool: 'generate_document',
        arguments: {
          prompt: genPrompt,
        },
      };
      const res = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const data = await res.json();
      if (!data.success) {
        console.error('Generate failed:', data.error);
        return;
      }
      const markdown = data.data?.markdown ?? '';
      setContent(markdown);
      setDirty(true);
      setShowGenerateModal(false);
    } catch (e) {
      console.error('Generate error:', e);
    } finally {
      setGenLoading(false);
    }
  }

  async function refineSelection() {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = el.value;
    const hasSelection = end > start;
    const selection = hasSelection ? value.slice(start, end) : '';
    const request = {
      tool: 'refine_content',
      arguments: {
        selection:
          selection ||
          '(No selection. Treat this as a continuation where the cursor is placed.)',
        context: value,
        instruction: refineInstruction,
      },
    };
    setRefineLoading(true);
    try {
      const res = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const data = await res.json();
      if (!data.success) {
        console.error('Refine failed:', data.error);
        return;
      }
      const refined = data.data?.refined ?? '';
      setPendingRefined(refined);
      if (!hasSelection) {
        setInsertInfo(
          'No selection detected. The refined text will be inserted at the cursor position.'
        );
      } else {
        setInsertInfo(null);
      }
      setShowRefineModal(false);
    } catch (e) {
      console.error('Refine error:', e);
    } finally {
      setRefineLoading(false);
    }
  }

  function applyPendingRefined(accept: boolean) {
    const el = textareaRef.current;
    if (!el) {
      setPendingRefined(null);
      return;
    }
    if (accept && pendingRefined) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const hasSelection = end > start;
      const value = el.value;
      let next: string;
      let insertPos = end;
      if (hasSelection) {
        next = value.slice(0, start) + pendingRefined + value.slice(end);
        insertPos = start + pendingRefined.length;
      } else {
        // Insert at cursor
        next = value.slice(0, start) + pendingRefined + value.slice(start);
        insertPos = start + pendingRefined.length;
      }
      el.value = next;
      el.selectionStart = insertPos;
      el.selectionEnd = insertPos;
      setContent(next);
      setDirty(true);
    }
    setPendingRefined(null);
    setInsertInfo(null);
    el?.focus();
  }

  function onRequestGenerate() {
    if (!currentPath) {
      setShowNameModal(true);
      return;
    }
    setShowGenerateModal(true);
  }

  function onRequestRefine() {
    if (!currentPath) {
      setShowNameModal(true);
      return;
    }
    setShowRefineModal(true);
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
          variant='secondary'
          size='sm'
          title='Generate from prompt'
          onClick={onRequestGenerate}
        >
          <Wand2 />
        </Button>
        <Button
          variant='secondary'
          size='sm'
          title='Refine selection'
          onClick={onRequestRefine}
        >
          <Sparkles />
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
      {saveError && (
        <div className={styles.errorAlert} role='alert'>
          <span className={styles.errorText}>{saveError}</span>
        </div>
      )}
      {saveNotice && !saveError && (
        <div className={styles.noticeAlert} role='status'>
          <span className={styles.noticeText}>{saveNotice}</span>
        </div>
      )}
      <div className={styles.split}>
        <div className={styles.editorPane}>
          {!currentPath && (
            <div className={styles.banner}>
              <span>Before editing, please name and save the file.</span>
            </div>
          )}
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

      {showNameModal && (
        <div className={styles.modal} role='dialog' aria-modal='true'>
          <div className={styles.backdrop} onClick={() => {}} />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Name your file</h3>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {}}
                title='Close'
              >
                <X />
              </Button>
            </div>
            <div className={styles.formGroup}>
              <Input
                placeholder='/absolute/path/to/file.md'
                value={proposedPath}
                onChange={e => setProposedPath(e.target.value)}
              />
            </div>
            <div className={styles.modalFooter}>
              <Button
                variant='primary'
                onClick={() => {
                  if (proposedPath.trim().length === 0) return;
                  setCurrentPath(proposedPath.trim());
                  setShowNameModal(false);
                }}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {showGenerateModal && (
        <div className={styles.modal} role='dialog' aria-modal='true'>
          <div
            className={styles.backdrop}
            onClick={() => setShowGenerateModal(false)}
          />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Generate document</h3>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setShowGenerateModal(false)}
                title='Close'
              >
                <X />
              </Button>
            </div>
            <div className={styles.formGroup}>
              <Input
                placeholder='Describe what you need...'
                value={genPrompt}
                onChange={e => setGenPrompt(e.target.value)}
              />
            </div>
            <div className={styles.modalFooter}>
              <Button
                variant='secondary'
                onClick={() => setShowGenerateModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant='primary'
                onClick={generateFromPrompt}
                loading={genLoading}
                disabled={!genPrompt.trim()}
              >
                Generate
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRefineModal && (
        <div className={styles.modal} role='dialog' aria-modal='true'>
          <div
            className={styles.backdrop}
            onClick={() => setShowRefineModal(false)}
          />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Refine selection</h3>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setShowRefineModal(false)}
                title='Close'
              >
                <X />
              </Button>
            </div>
            <div className={styles.formGroup}>
              <Input
                placeholder='Instruction (optional)'
                value={refineInstruction}
                onChange={e => setRefineInstruction(e.target.value)}
              />
            </div>
            <div className={styles.modalFooter}>
              <Button
                variant='secondary'
                onClick={() => setShowRefineModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant='primary'
                onClick={refineSelection}
                loading={refineLoading}
              >
                Refine
              </Button>
            </div>
          </div>
        </div>
      )}

      {pendingRefined && (
        <div className={styles.modal} role='dialog' aria-modal='true'>
          <div
            className={styles.backdrop}
            onClick={() => applyPendingRefined(false)}
          />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Review refined text</h3>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => applyPendingRefined(false)}
                title='Close'
              >
                <X />
              </Button>
            </div>
            {insertInfo && <div className={styles.banner}>{insertInfo}</div>}
            <div className={styles.formGroup}>
              <textarea
                className={styles.textarea}
                value={pendingRefined}
                onChange={() => {}}
                readOnly
                aria-label='Refined preview'
              />
            </div>
            <div className={styles.modalFooter}>
              <Button
                variant='secondary'
                onClick={() => applyPendingRefined(false)}
              >
                Reject
              </Button>
              <Button
                variant='primary'
                onClick={() => applyPendingRefined(true)}
              >
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorInterface;

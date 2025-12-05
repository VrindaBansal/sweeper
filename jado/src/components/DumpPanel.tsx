import { useState, useEffect, useRef } from "react";
import { DumpEntry } from "../types";
import { storage } from "../utils/storage";
import { startOfWeek, format, isSameWeek } from "date-fns";

export default function DumpPanel() {
  const [dumpInput, setDumpInput] = useState("");
  const [currentWeekDump, setCurrentWeekDump] = useState<DumpEntry | null>(null);
  const [archivedDumps, setArchivedDumps] = useState<DumpEntry[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDumps();
  }, []);

  // Auto-save with debounce
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (dumpInput.trim()) {
        handleSave();
      }
    }, 1000); // Save 1 second after user stops typing

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [dumpInput]);

  const loadDumps = () => {
    const allDumps = storage.getDumps();
    const now = new Date();
    const thisWeekStart = startOfWeek(now);

    const current = allDumps.find(dump =>
      isSameWeek(dump.weekStart, thisWeekStart)
    );

    const archived = allDumps
      .filter(dump => !isSameWeek(dump.weekStart, thisWeekStart))
      .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());

    setCurrentWeekDump(current || null);
    setArchivedDumps(archived);

    // Load current week's content
    if (current) {
      setDumpInput(current.content);
    }
  };

  const handleSave = () => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now);

    if (currentWeekDump) {
      // Update existing dump
      const allDumps = storage.getDumps();
      const updated = allDumps.map(dump =>
        dump.id === currentWeekDump.id
          ? { ...dump, content: dumpInput, createdAt: now }
          : dump
      );
      storage.saveDumps(updated);
    } else {
      // Create new dump for this week
      const newDump: DumpEntry = {
        id: crypto.randomUUID(),
        content: dumpInput,
        createdAt: now,
        weekStart: thisWeekStart,
      };
      storage.addDump(newDump);
    }

    loadDumps();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const cursorPos = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const textBeforeCursor = dumpInput.substring(0, cursorPos);
    const textAfterCursor = dumpInput.substring(selectionEnd);
    const selectedText = dumpInput.substring(cursorPos, selectionEnd);
    const currentLineStart = textBeforeCursor.lastIndexOf('\n') + 1;
    const currentLine = textBeforeCursor.substring(currentLineStart);

    // Handle formatting shortcuts (Cmd+B, Cmd+I, Cmd+U, Cmd+S)
    if (e.metaKey || e.ctrlKey) {
      let wrapper = '';

      if (e.key === 'b' || e.key === 'B') {
        wrapper = '**'; // Bold
      } else if (e.key === 'i' || e.key === 'I') {
        wrapper = '*'; // Italic
      } else if (e.key === 'u' || e.key === 'U') {
        wrapper = '__'; // Underline
      } else if (e.key === 's' || e.key === 'S') {
        wrapper = '~~'; // Strikethrough
      }

      if (wrapper) {
        e.preventDefault();
        const newText = textBeforeCursor + wrapper + selectedText + wrapper + textAfterCursor;
        setDumpInput(newText);
        setTimeout(() => {
          const newCursorPos = cursorPos + wrapper.length;
          const newSelectionEnd = selectionEnd + wrapper.length;
          textarea.setSelectionRange(newCursorPos, newSelectionEnd);
        }, 0);
        return;
      }
    }

    // Handle Enter key
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: Outdent (same as Shift+Tab)
        e.preventDefault();

        const arrowMatch = currentLine.match(/^(\s{4,})(→)\s/);

        if (arrowMatch) {
          // Convert → back to • by removing 4 spaces
          const newIndent = arrowMatch[1].substring(4);
          const restOfLine = currentLine.substring(arrowMatch[0].length);
          const newText = textBeforeCursor.substring(0, currentLineStart) + newIndent + '• ' + restOfLine + textAfterCursor;
          setDumpInput(newText);

          setTimeout(() => {
            const newCursorPos = currentLineStart + newIndent.length + 2 + (cursorPos - currentLineStart - arrowMatch[0].length);
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }, 0);
        } else {
          // Check if line starts with • and no indentation
          const baseBulletMatch = currentLine.match(/^(•)\s/);
          if (baseBulletMatch) {
            // Remove the bullet entirely
            const restOfLine = currentLine.substring(baseBulletMatch[0].length);
            const newText = textBeforeCursor.substring(0, currentLineStart) + restOfLine + textAfterCursor;
            setDumpInput(newText);

            setTimeout(() => {
              const newCursorPos = currentLineStart + (cursorPos - currentLineStart - baseBulletMatch[0].length);
              textarea.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
          } else {
            // Remove indentation (2 spaces)
            const indentMatch = currentLine.match(/^(\s{2,})/);
            if (indentMatch) {
              const newIndent = indentMatch[1].substring(2);
              const restOfLine = currentLine.substring(indentMatch[0].length);
              const newText = textBeforeCursor.substring(0, currentLineStart) + newIndent + restOfLine + textAfterCursor;
              setDumpInput(newText);

              setTimeout(() => {
                const newCursorPos = currentLineStart + newIndent.length + (cursorPos - currentLineStart - indentMatch[0].length);
                textarea.setSelectionRange(newCursorPos, newCursorPos);
              }, 0);
            }
          }
        }
      } else {
        // Normal Enter: Create new bullet line
        e.preventDefault();

        const bulletMatch = currentLine.match(/^(\s*)(•|→)\s/);

        if (bulletMatch) {
          const indent = bulletMatch[1];
          const bullet = bulletMatch[2];
          const newText = textBeforeCursor + '\n' + indent + bullet + ' ' + textAfterCursor;
          setDumpInput(newText);

          setTimeout(() => {
            const newCursorPos = cursorPos + indent.length + bullet.length + 2;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }, 0);
        } else {
          const newText = textBeforeCursor + '\n' + textAfterCursor;
          setDumpInput(newText);
          setTimeout(() => {
            textarea.setSelectionRange(cursorPos + 1, cursorPos + 1);
          }, 0);
        }
      }
    }

    // Handle Tab key for indented bullets
    else if (e.key === 'Tab') {
      e.preventDefault();

      if (e.shiftKey) {
        // Shift+Tab: Outdent - convert → back to • or remove indentation
        const arrowMatch = currentLine.match(/^(\s{4,})(→)\s/);

        if (arrowMatch) {
          // Convert → back to • by removing 4 spaces
          const newIndent = arrowMatch[1].substring(4);
          const restOfLine = currentLine.substring(arrowMatch[0].length);
          const newText = textBeforeCursor.substring(0, currentLineStart) + newIndent + '• ' + restOfLine + textAfterCursor;
          setDumpInput(newText);

          setTimeout(() => {
            const newCursorPos = currentLineStart + newIndent.length + 2 + (cursorPos - currentLineStart - arrowMatch[0].length);
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }, 0);
        } else {
          // Check if line starts with • and no indentation
          const baseBulletMatch = currentLine.match(/^(•)\s/);
          if (baseBulletMatch) {
            // Remove the bullet entirely
            const restOfLine = currentLine.substring(baseBulletMatch[0].length);
            const newText = textBeforeCursor.substring(0, currentLineStart) + restOfLine + textAfterCursor;
            setDumpInput(newText);

            setTimeout(() => {
              const newCursorPos = currentLineStart + (cursorPos - currentLineStart - baseBulletMatch[0].length);
              textarea.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
          } else {
            // Remove indentation (2 spaces)
            const indentMatch = currentLine.match(/^(\s{2,})/);
            if (indentMatch) {
              const newIndent = indentMatch[1].substring(2);
              const restOfLine = currentLine.substring(indentMatch[0].length);
              const newText = textBeforeCursor.substring(0, currentLineStart) + newIndent + restOfLine + textAfterCursor;
              setDumpInput(newText);

              setTimeout(() => {
                const newCursorPos = currentLineStart + newIndent.length + (cursorPos - currentLineStart - indentMatch[0].length);
                textarea.setSelectionRange(newCursorPos, newCursorPos);
              }, 0);
            }
          }
        }
      } else {
        // Tab: Indent
        const bulletMatch = currentLine.match(/^(\s*)(•)\s/);

        if (bulletMatch) {
          const indent = bulletMatch[1] + '    ';
          const restOfLine = currentLine.substring(bulletMatch[0].length);
          const newText = textBeforeCursor.substring(0, currentLineStart) + indent + '→ ' + restOfLine + textAfterCursor;
          setDumpInput(newText);

          setTimeout(() => {
            const newCursorPos = currentLineStart + indent.length + 2 + (cursorPos - currentLineStart - bulletMatch[0].length);
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }, 0);
        } else {
          const newText = textBeforeCursor + '  ' + textAfterCursor;
          setDumpInput(newText);
          setTimeout(() => {
            textarea.setSelectionRange(cursorPos + 2, cursorPos + 2);
          }, 0);
        }
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    // Auto-convert "- " to "• "
    const lines = newValue.split('\n');
    const modifiedLines = lines.map(line => {
      if (line.match(/^\s*-\s/)) {
        return line.replace(/^(\s*)-\s/, '$1• ');
      }
      return line;
    });

    const modifiedValue = modifiedLines.join('\n');

    if (modifiedValue !== newValue) {
      setDumpInput(modifiedValue);
      setTimeout(() => {
        e.target.setSelectionRange(cursorPos, cursorPos);
      }, 0);
    } else {
      setDumpInput(newValue);
    }
  };

  return (
    <div className="notes-container">
      <div className="input-section">
        <div className="subcategory-row">
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Week of {format(startOfWeek(new Date()), 'MMM d, yyyy')}
          </div>
        </div>

        <textarea
          className="note-input"
          placeholder="Dump your thoughts here... This week's dump will be automatically filed on Sunday. Use '- ' for bullets, Tab to indent."
          value={dumpInput}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          style={{ minHeight: '400px' }}
        />
      </div>

      {archivedDumps.length > 0 && (
        <div className="notes-list">
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            marginBottom: '16px',
            color: 'var(--text-primary)'
          }}>
            Previous Weeks
          </h3>
          {archivedDumps.map((dump) => (
            <div key={dump.id} className="note-item">
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px'
              }}>
                Week of {format(dump.weekStart, 'MMM d, yyyy')}
              </div>
              <div className="note-content" style={{ whiteSpace: 'pre-wrap' }}>
                {dump.content}
              </div>
              <div className="note-meta">
                <span>{format(dump.createdAt, 'MMM d, h:mm a')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { Category, WeeklyNote, SubCategory } from "../types";
import { storage } from "../utils/storage";
import { startOfWeek, format, isSameWeek } from "date-fns";

interface NotesPanelProps {
  category: Category;
  onFileNote: (category: Category, content: string, subcategory?: string) => void;
}

export default function NotesPanel({ category, onFileNote }: NotesPanelProps) {
  const [noteInput, setNoteInput] = useState("");
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [weeklyNotes, setWeeklyNotes] = useState<WeeklyNote[]>([]);
  const [hoveredSubcategoryId, setHoveredSubcategoryId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const allSubcategories = storage.getSubCategories();
    const categorySubcategories = allSubcategories.filter(sc => sc.category === category);
    setSubcategories(categorySubcategories);

    // Load the last selected subcategory for this category
    const lastSelectedSubcategory = localStorage.getItem(`jado_selected_subcategory_${category}`);
    if (lastSelectedSubcategory) {
      setSelectedSubcategory(lastSelectedSubcategory);
    } else {
      setSelectedSubcategory("");
    }
  }, [category]);

  // Load note content when category or subcategory changes
  useEffect(() => {
    const currentContent = storage.getCurrentNoteContent(category, selectedSubcategory || undefined);
    setNoteInput(currentContent);
  }, [category, selectedSubcategory]);

  // Auto-save current note content
  useEffect(() => {
    // Don't auto-save on initial mount or category change
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      storage.saveCurrentNoteContent(category, noteInput, selectedSubcategory || undefined);
    }, 500); // Save after 500ms of inactivity

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [noteInput, category, selectedSubcategory]);

  useEffect(() => {
    const allWeeklyNotes = storage.getWeeklyNotes();
    const categoryWeeklyNotes = allWeeklyNotes
      .filter(note => note.category === category)
      .filter(note => !selectedSubcategory || note.subcategory === selectedSubcategory)
      .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
    setWeeklyNotes(categoryWeeklyNotes);

    // Save the selected subcategory for this category
    localStorage.setItem(`jado_selected_subcategory_${category}`, selectedSubcategory);
  }, [selectedSubcategory, category]);

  const handleAddSubcategory = () => {
    if (newSubcategoryName.trim()) {
      const newSubcategory: SubCategory = {
        id: crypto.randomUUID(),
        name: newSubcategoryName.trim(),
        category,
      };
      storage.addSubCategory(newSubcategory);
      setSubcategories([...subcategories, newSubcategory]);
      setSelectedSubcategory(newSubcategory.name);
      setNewSubcategoryName("");
      setShowAddSubcategory(false);
    }
  };

  const handleDeleteSubcategory = (subcategoryId: string, subcategoryName: string) => {
    const allSubcategories = storage.getSubCategories();
    const updatedSubcategories = allSubcategories.filter(sc => sc.id !== subcategoryId);
    storage.saveSubCategories(updatedSubcategories);
    setSubcategories(subcategories.filter(sc => sc.id !== subcategoryId));

    // If the deleted subcategory was selected, switch to "All"
    if (selectedSubcategory === subcategoryName) {
      setSelectedSubcategory("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const cursorPos = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const textBeforeCursor = noteInput.substring(0, cursorPos);
    const textAfterCursor = noteInput.substring(selectionEnd);
    const selectedText = noteInput.substring(cursorPos, selectionEnd);
    const currentLineStart = textBeforeCursor.lastIndexOf('\n') + 1;
    const currentLine = textBeforeCursor.substring(currentLineStart);

    // Handle formatting shortcuts (Cmd+B, Cmd+I, Cmd+U, Cmd+S)
    if (e.metaKey || e.ctrlKey) {
      let wrapper = '';
      let preventSave = false;

      if (e.key === 'b' || e.key === 'B') {
        wrapper = '**'; // Bold
        preventSave = true;
      } else if (e.key === 'i' || e.key === 'I') {
        wrapper = '*'; // Italic
        preventSave = true;
      } else if (e.key === 'u' || e.key === 'U') {
        wrapper = '__'; // Underline (using markdown convention)
        preventSave = true;
      } else if (e.key === 's' || e.key === 'S') {
        wrapper = '~~'; // Strikethrough
        preventSave = true;
      }

      if (wrapper) {
        e.preventDefault();
        const newText = textBeforeCursor + wrapper + selectedText + wrapper + textAfterCursor;
        setNoteInput(newText);
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
          setNoteInput(newText);

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
            setNoteInput(newText);

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
              setNoteInput(newText);

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

        // Check if current line starts with a bullet
        const bulletMatch = currentLine.match(/^(\s*)(•|→)\s/);

        if (bulletMatch) {
          const indent = bulletMatch[1];
          const bullet = bulletMatch[2];
          const newText = textBeforeCursor + '\n' + indent + bullet + ' ' + textAfterCursor;
          setNoteInput(newText);

          // Set cursor position after the new bullet
          setTimeout(() => {
            const newCursorPos = cursorPos + indent.length + bullet.length + 2;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }, 0);
        } else {
          // Normal enter behavior
          const newText = textBeforeCursor + '\n' + textAfterCursor;
          setNoteInput(newText);
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
        // Shift+Tab: Outdent with alternating bullets
        const bulletMatch = currentLine.match(/^(\s{4,})(•|→)\s/);

        if (bulletMatch) {
          // Remove 4 spaces and alternate bullet
          const currentIndent = bulletMatch[1];
          const currentBullet = bulletMatch[2];
          const newIndent = currentIndent.substring(4);
          const newBullet = currentBullet === '•' ? '→' : '•'; // Alternate back
          const restOfLine = currentLine.substring(bulletMatch[0].length);
          const newText = textBeforeCursor.substring(0, currentLineStart) + newIndent + newBullet + ' ' + restOfLine + textAfterCursor;
          setNoteInput(newText);

          setTimeout(() => {
            const newCursorPos = currentLineStart + newIndent.length + 2 + (cursorPos - currentLineStart - bulletMatch[0].length);
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }, 0);
        } else {
          // Check if line starts with • or → and no indentation
          const baseBulletMatch = currentLine.match(/^(•|→)\s/);
          if (baseBulletMatch) {
            // Remove the bullet entirely
            const restOfLine = currentLine.substring(baseBulletMatch[0].length);
            const newText = textBeforeCursor.substring(0, currentLineStart) + restOfLine + textAfterCursor;
            setNoteInput(newText);

            setTimeout(() => {
              const newCursorPos = currentLineStart + (cursorPos - currentLineStart - baseBulletMatch[0].length);
              textarea.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
          } else {
            // Remove indentation (4 spaces)
            const indentMatch = currentLine.match(/^(\s{4,})/);
            if (indentMatch) {
              const newIndent = indentMatch[1].substring(4);
              const restOfLine = currentLine.substring(indentMatch[0].length);
              const newText = textBeforeCursor.substring(0, currentLineStart) + newIndent + restOfLine + textAfterCursor;
              setNoteInput(newText);

              setTimeout(() => {
                const newCursorPos = currentLineStart + newIndent.length + (cursorPos - currentLineStart - indentMatch[0].length);
                textarea.setSelectionRange(newCursorPos, newCursorPos);
              }, 0);
            }
          }
        }
      } else {
        // Tab: Indent with alternating bullets
        const bulletMatch = currentLine.match(/^(\s*)(•|→)\s/);

        if (bulletMatch) {
          const currentIndent = bulletMatch[1];
          const currentBullet = bulletMatch[2];
          const newIndent = currentIndent + '    '; // Add 4 spaces
          const newBullet = currentBullet === '•' ? '→' : '•'; // Alternate
          const restOfLine = currentLine.substring(bulletMatch[0].length);
          const newText = textBeforeCursor.substring(0, currentLineStart) + newIndent + newBullet + ' ' + restOfLine + textAfterCursor;
          setNoteInput(newText);

          setTimeout(() => {
            const newCursorPos = currentLineStart + newIndent.length + 2 + (cursorPos - currentLineStart - bulletMatch[0].length);
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }, 0);
        } else {
          // Normal tab - add indentation
          const newText = textBeforeCursor + '  ' + textAfterCursor;
          setNoteInput(newText);
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

    // Auto-convert "- " to "• " (bullet point)
    const lines = newValue.split('\n');
    const modifiedLines = lines.map(line => {
      if (line.match(/^\s*-\s/)) {
        return line.replace(/^(\s*)-\s/, '$1• ');
      }
      return line;
    });

    const modifiedValue = modifiedLines.join('\n');

    if (modifiedValue !== newValue) {
      setNoteInput(modifiedValue);
      // Adjust cursor position if text was modified
      setTimeout(() => {
        e.target.setSelectionRange(cursorPos, cursorPos);
      }, 0);
    } else {
      setNoteInput(newValue);
    }
  };

  return (
    <div className="notes-container">
      <div className="input-section">
        <div className="subcategory-row">
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {noteInput.trim() ? `${noteInput.split(/\s+/).length} words` : 'Start typing...'}
          </div>
          <div className="subcategory-controls">
            {!showAddSubcategory ? (
              <>
                <div className="menu">
                  <div className="item">
                    <a href="#" className="link" onClick={(e) => e.preventDefault()}>
                      <span>{selectedSubcategory || `All ${category}`}</span>
                      <svg viewBox="0 0 360 360" xmlSpace="preserve">
                        <g>
                          <path
                            d="M325.607,79.393c-5.857-5.857-15.355-5.858-21.213,0.001l-139.39,139.393L25.607,79.393 c-5.857-5.857-15.355-5.858-21.213,0.001c-5.858,5.858-5.858,15.355,0,21.213l150.004,150c2.813,2.813,6.628,4.393,10.606,4.393 s7.794-1.581,10.606-4.394l149.996-150C331.465,94.749,331.465,85.251,325.607,79.393z"
                          ></path>
                        </g>
                      </svg>
                    </a>
                    <div className="submenu">
                      <div className="submenu-item">
                        <a
                          href="#"
                          className="submenu-link"
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedSubcategory("");
                          }}
                        >
                          All {category}
                        </a>
                      </div>
                      {subcategories.map(sc => (
                        <div
                          key={sc.id}
                          className="submenu-item subcategory-item-wrapper"
                          onMouseEnter={() => setHoveredSubcategoryId(sc.id)}
                          onMouseLeave={() => setHoveredSubcategoryId(null)}
                        >
                          <a
                            href="#"
                            className="submenu-link"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedSubcategory(sc.name);
                            }}
                          >
                            {sc.name}
                          </a>
                          <button
                            className={`subcategory-delete-btn ${hoveredSubcategoryId === sc.id ? 'visible' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteSubcategory(sc.id, sc.name);
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  className="add-subcategory-btn"
                  onClick={() => setShowAddSubcategory(true)}
                >
                  + Add subcategory
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  className="subcategory-select"
                  placeholder="Subcategory name..."
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSubcategory();
                    if (e.key === 'Escape') {
                      setShowAddSubcategory(false);
                      setNewSubcategoryName("");
                    }
                  }}
                  autoFocus
                />
                <button className="button" onClick={handleAddSubcategory}>Add</button>
                <button
                  className="add-subcategory-btn"
                  onClick={() => {
                    setShowAddSubcategory(false);
                    setNewSubcategoryName("");
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        <textarea
          className="note-input"
          placeholder={`This week's ${category} notes${selectedSubcategory ? ` for ${selectedSubcategory}` : ''}... Auto-saves and files every Sunday. Use "- " for bullets, Tab to indent.`}
          value={noteInput}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </div>

      <div className="notes-list">
        {weeklyNotes.map((note) => (
          <div key={note.id} className="note-item">
            <div className="note-content" style={{ whiteSpace: 'pre-wrap' }}>{note.content}</div>
            <div className="note-meta">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span>Week of {format(note.weekStart, 'MMM d, yyyy')}</span>
                {note.subcategory && (
                  <span className="subcategory-tag">{note.subcategory}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

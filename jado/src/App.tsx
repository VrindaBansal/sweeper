import { useState, useEffect } from "react";
import "./App.css";
import { Category, WeeklyNote } from "./types";
import NotesPanel from "./components/NotesPanel";
import CalendarPanel from "./components/CalendarPanel";
import DumpPanel from "./components/DumpPanel";
import { storage } from "./utils/storage";
import { startOfWeek, isAfter } from "date-fns";

function App() {
  const [activeTab, setActiveTab] = useState<Category | 'calendar' | 'dump'>('work');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRetroMode, setIsRetroMode] = useState(() => {
    const saved = localStorage.getItem('jado_retro_mode');
    return saved === 'true';
  });

  // Check on app load if it's Sunday and we need to file notes
  useEffect(() => {
    checkAndFileNotes();
  }, []);

  // Save retro mode preference
  useEffect(() => {
    localStorage.setItem('jado_retro_mode', String(isRetroMode));
    if (isRetroMode) {
      document.body.classList.add('retro-mode');
    } else {
      document.body.classList.remove('retro-mode');
    }
  }, [isRetroMode]);

  const checkAndFileNotes = () => {
    const now = new Date();
    const lastFiledDate = localStorage.getItem('jado_last_filed_date');
    const currentWeekStart = startOfWeek(now);

    // If we're past Sunday and haven't filed this week yet
    if (!lastFiledDate || isAfter(currentWeekStart, new Date(lastFiledDate))) {
      const categories: Category[] = ['work', 'school', 'personal'];

      categories.forEach(category => {
        const content = storage.getCurrentNoteContent(category);
        if (content.trim()) {
          const weeklyNote: WeeklyNote = {
            id: crypto.randomUUID(),
            category,
            content: content.trim(),
            weekStart: currentWeekStart,
            createdAt: now,
          };
          storage.addWeeklyNote(weeklyNote);
          storage.clearCurrentNoteContent(category);
        }
      });

      localStorage.setItem('jado_last_filed_date', currentWeekStart.toISOString());
    }
  };

  const handleFileNote = (category: Category, content: string, subcategory?: string) => {
    // This is called if we want to manually file a note (not currently used)
  };

  const getSearchResults = () => {
    if (!searchQuery.trim()) return { weeklyNotes: [], events: [], dumps: [] };

    const query = searchQuery.toLowerCase();

    // Search weekly notes
    const weeklyNotes = storage.getWeeklyNotes();
    const matchingNotes = weeklyNotes.filter(note =>
      note.content.toLowerCase().includes(query) ||
      note.subcategory?.toLowerCase().includes(query)
    );

    // Search events
    const events = storage.getEvents();
    const matchingEvents = events.filter(event =>
      event.title.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query)
    );

    // Search dumps
    const dumps = storage.getDumps();
    const matchingDumps = dumps.filter(dump =>
      dump.content.toLowerCase().includes(query)
    );

    return { weeklyNotes: matchingNotes, events: matchingEvents, dumps: matchingDumps };
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Jado</h1>
        <div className="glass-toggle-container">
          <label className="glass-toggle">
            <input
              type="checkbox"
              checked={isRetroMode}
              onChange={(e) => setIsRetroMode(e.target.checked)}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">{isRetroMode ? 'Retro' : 'Classic'}</span>
          </label>
        </div>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'work' ? 'active' : ''}`}
          onClick={() => setActiveTab('work')}
        >
          Work
        </button>
        <button
          className={`tab ${activeTab === 'school' ? 'active' : ''}`}
          onClick={() => setActiveTab('school')}
        >
          School
        </button>
        <button
          className={`tab ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          Personal
        </button>
        <button
          className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          Calendar
        </button>
        <button
          className={`tab ${activeTab === 'dump' ? 'active' : ''}`}
          onClick={() => setActiveTab('dump')}
        >
          Dump
        </button>
        <button className="search-tab-btn" onClick={() => setShowSearch(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'work' && (
          <NotesPanel
            category="work"
            onFileNote={handleFileNote}
          />
        )}
        {activeTab === 'school' && (
          <NotesPanel
            category="school"
            onFileNote={handleFileNote}
          />
        )}
        {activeTab === 'personal' && (
          <NotesPanel
            category="personal"
            onFileNote={handleFileNote}
          />
        )}
        {activeTab === 'calendar' && (
          <CalendarPanel />
        )}
        {activeTab === 'dump' && (
          <DumpPanel />
        )}
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="modal-overlay" onClick={() => setShowSearch(false)}>
          <div className="modal search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Search</h2>
              <button className="modal-close" onClick={() => setShowSearch(false)}>
                ×
              </button>
            </div>
            <div className="modal-content">
              <input
                type="text"
                className="form-input"
                placeholder="Search notes, events, dumps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />

              {searchQuery.trim() && (() => {
                const results = getSearchResults();
                const hasResults = results.weeklyNotes.length > 0 || results.events.length > 0 || results.dumps.length > 0;

                return hasResults ? (
                  <div className="search-results">
                    {results.weeklyNotes.length > 0 && (
                      <div className="search-section">
                        <h3 className="search-section-title">Notes ({results.weeklyNotes.length})</h3>
                        {results.weeklyNotes.map((note) => (
                          <div key={note.id} className="note-item" onClick={() => {
                            setActiveTab(note.category);
                            setShowSearch(false);
                          }}>
                            <div className="note-content">{note.content}</div>
                            <div className="note-meta">
                              <span className="subcategory-tag">{note.category}</span>
                              {note.subcategory && (
                                <span className="subcategory-tag">{note.subcategory}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {results.events.length > 0 && (
                      <div className="search-section">
                        <h3 className="search-section-title">Events ({results.events.length})</h3>
                        {results.events.map((event) => (
                          <div key={event.id} className="note-item" onClick={() => {
                            setActiveTab('calendar');
                            setShowSearch(false);
                          }}>
                            <div className="note-content">{event.title}</div>
                            {event.description && (
                              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                {event.description}
                              </div>
                            )}
                            <div className="note-meta">
                              <span className="subcategory-tag">
                                {new Date(event.startTime).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {results.dumps.length > 0 && (
                      <div className="search-section">
                        <h3 className="search-section-title">Dumps ({results.dumps.length})</h3>
                        {results.dumps.map((dump) => (
                          <div key={dump.id} className="note-item" onClick={() => {
                            setActiveTab('dump');
                            setShowSearch(false);
                          }}>
                            <div className="note-content" style={{ whiteSpace: 'pre-wrap' }}>
                              {dump.content.substring(0, 200)}{dump.content.length > 200 ? '...' : ''}
                            </div>
                            <div className="note-meta">
                              <span className="subcategory-tag">
                                Week of {new Date(dump.weekStart).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">No results found</div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

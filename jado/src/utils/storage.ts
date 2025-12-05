import { Note, WeeklyNote, CalendarEvent, SubCategory, DumpEntry } from '../types';

const NOTES_KEY = 'jado_notes';
const WEEKLY_NOTES_KEY = 'jado_weekly_notes';
const EVENTS_KEY = 'jado_events';
const SUBCATEGORIES_KEY = 'jado_subcategories';
const DUMPS_KEY = 'jado_dumps';
const CURRENT_NOTE_KEY = 'jado_current_note';

export const storage = {
  // Notes operations
  getNotes: (): Note[] => {
    const notesJson = localStorage.getItem(NOTES_KEY);
    if (!notesJson) return [];

    const notes = JSON.parse(notesJson);
    // Convert date strings back to Date objects
    return notes.map((note: any) => ({
      ...note,
      createdAt: new Date(note.createdAt),
      updatedAt: new Date(note.updatedAt),
    }));
  },

  saveNotes: (notes: Note[]): void => {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  },

  // Calendar events operations
  getEvents: (): CalendarEvent[] => {
    const eventsJson = localStorage.getItem(EVENTS_KEY);
    if (!eventsJson) return [];

    const events = JSON.parse(eventsJson);
    return events.map((event: any) => ({
      ...event,
      startTime: new Date(event.startTime),
      endTime: event.endTime ? new Date(event.endTime) : undefined,
    }));
  },

  saveEvents: (events: CalendarEvent[]): void => {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  },

  addEvent: (event: CalendarEvent): void => {
    const events = storage.getEvents();
    events.push(event);
    storage.saveEvents(events);
  },

  // Subcategories operations
  getSubCategories: (): SubCategory[] => {
    const subCatsJson = localStorage.getItem(SUBCATEGORIES_KEY);
    if (!subCatsJson) return [];
    return JSON.parse(subCatsJson);
  },

  saveSubCategories: (subcategories: SubCategory[]): void => {
    localStorage.setItem(SUBCATEGORIES_KEY, JSON.stringify(subcategories));
  },

  addSubCategory: (subcategory: SubCategory): void => {
    const subcategories = storage.getSubCategories();
    subcategories.push(subcategory);
    storage.saveSubCategories(subcategories);
  },

  // Dump operations
  getDumps: (): DumpEntry[] => {
    const dumpsJson = localStorage.getItem(DUMPS_KEY);
    if (!dumpsJson) return [];

    const dumps = JSON.parse(dumpsJson);
    return dumps.map((dump: any) => ({
      ...dump,
      createdAt: new Date(dump.createdAt),
      weekStart: new Date(dump.weekStart),
    }));
  },

  saveDumps: (dumps: DumpEntry[]): void => {
    localStorage.setItem(DUMPS_KEY, JSON.stringify(dumps));
  },

  addDump: (dump: DumpEntry): void => {
    const dumps = storage.getDumps();
    dumps.push(dump);
    storage.saveDumps(dumps);
  },

  // Weekly notes operations (filed notes)
  getWeeklyNotes: (): WeeklyNote[] => {
    const weeklyNotesJson = localStorage.getItem(WEEKLY_NOTES_KEY);
    if (!weeklyNotesJson) return [];

    const weeklyNotes = JSON.parse(weeklyNotesJson);
    return weeklyNotes.map((note: any) => ({
      ...note,
      createdAt: new Date(note.createdAt),
      weekStart: new Date(note.weekStart),
    }));
  },

  saveWeeklyNotes: (weeklyNotes: WeeklyNote[]): void => {
    localStorage.setItem(WEEKLY_NOTES_KEY, JSON.stringify(weeklyNotes));
  },

  addWeeklyNote: (note: WeeklyNote): void => {
    const weeklyNotes = storage.getWeeklyNotes();
    weeklyNotes.push(note);
    storage.saveWeeklyNotes(weeklyNotes);
  },

  // Current note (the persistent note box content)
  getCurrentNoteContent: (category: string, subcategory?: string): string => {
    const currentNoteJson = localStorage.getItem(CURRENT_NOTE_KEY);
    if (!currentNoteJson) return '';

    const currentNotes = JSON.parse(currentNoteJson);
    const key = subcategory ? `${category}:${subcategory}` : category;
    return currentNotes[key] || '';
  },

  saveCurrentNoteContent: (category: string, content: string, subcategory?: string): void => {
    const currentNoteJson = localStorage.getItem(CURRENT_NOTE_KEY);
    const currentNotes = currentNoteJson ? JSON.parse(currentNoteJson) : {};
    const key = subcategory ? `${category}:${subcategory}` : category;
    currentNotes[key] = content;
    localStorage.setItem(CURRENT_NOTE_KEY, JSON.stringify(currentNotes));
  },

  clearCurrentNoteContent: (category: string, subcategory?: string): void => {
    const currentNoteJson = localStorage.getItem(CURRENT_NOTE_KEY);
    if (!currentNoteJson) return;

    const currentNotes = JSON.parse(currentNoteJson);
    const key = subcategory ? `${category}:${subcategory}` : category;
    currentNotes[key] = '';
    localStorage.setItem(CURRENT_NOTE_KEY, JSON.stringify(currentNotes));
  },
};

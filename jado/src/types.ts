export type Category = 'work' | 'school' | 'personal';
export type EventType = 'task' | 'meeting' | 'other' | 'out-of-office';

export interface Note {
  id: string;
  category: Category;
  content: string;
  subcategory?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklyNote {
  id: string;
  category: Category;
  content: string;
  subcategory?: string;
  weekStart: Date; // Sunday of the week this note belongs to
  createdAt: Date;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  source: 'google' | 'app';
  isAllDay?: boolean;
  eventType?: EventType;
}

export interface SubCategory {
  id: string;
  name: string;
  category: Category;
}

export interface DumpEntry {
  id: string;
  content: string;
  createdAt: Date;
  weekStart: Date; // Sunday of the week this dump belongs to
}

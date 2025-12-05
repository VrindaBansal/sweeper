import OpenAI from 'openai';
import { CalendarEvent } from '../types';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Note: In production, API calls should go through your backend
});

export interface ParsedEventInfo {
  hasTimeInfo: boolean;
  title?: string;
  datetime?: string;
  description?: string;
}

export async function parseNoteForEvent(noteContent: string): Promise<ParsedEventInfo | null> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that extracts temporal information from notes.
Analyze the note and determine if it contains any time-sensitive information like deadlines, appointments, or tasks with specific times.
If found, extract the event title, date/time, and description.

Respond ONLY with valid JSON in this exact format:
{
  "hasTimeInfo": boolean,
  "title": "event title" or null,
  "datetime": "ISO 8601 datetime string" or null,
  "description": "event description" or null
}

Examples:
Input: "send email by 6pm"
Output: {"hasTimeInfo": true, "title": "Send email", "datetime": "2025-12-04T18:00:00", "description": "Send email"}

Input: "order charger by tomorrow"
Output: {"hasTimeInfo": true, "title": "Order charger", "datetime": "2025-12-05T09:00:00", "description": "Order charger"}

Input: "meeting notes from today"
Output: {"hasTimeInfo": false, "title": null, "datetime": null, "description": null}

Current date/time: ${new Date().toISOString()}`
        },
        {
          role: 'user',
          content: noteContent
        }
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as ParsedEventInfo;
    return parsed;
  } catch (error) {
    console.error('Error parsing note with OpenAI:', error);
    return null;
  }
}

export function createEventFromParsedInfo(info: ParsedEventInfo): CalendarEvent | null {
  if (!info.hasTimeInfo || !info.title || !info.datetime) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    title: info.title,
    description: info.description,
    startTime: new Date(info.datetime),
    source: 'app',
  };
}

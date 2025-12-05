import { useState, useEffect } from "react";
import { CalendarEvent, EventType } from "../types";
import { storage } from "../utils/storage";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from "date-fns";

export default function CalendarPanel() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    endTime: '',
    isAllDay: true,
    eventType: 'task' as EventType,
  });
  const [showEventTypeDropdown, setShowEventTypeDropdown] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = () => {
    const savedEvents = storage.getEvents();
    savedEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    setEvents(savedEvents);
  };

  const getViewDates = () => {
    if (view === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      const days = [];
      let day = weekStart;
      while (day <= weekEnd) {
        days.push(day);
        day = addDays(day, 1);
      }
      return days;
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart);
      const endDate = endOfWeek(monthEnd);
      const days = [];
      let day = startDate;
      while (day <= endDate) {
        days.push(day);
        day = addDays(day, 1);
      }
      return days;
    }
  };

  const calendarDays = getViewDates();

  const getEventsForDay = (day: Date) => {
    return events.filter(event =>
      isSameDay(event.startTime, day)
    );
  };

  const hasOutOfOffice = (day: Date) => {
    const dayEvents = getEventsForDay(day);
    return dayEvents.some(e => e.eventType === 'out-of-office');
  };

  const handleAddEvent = () => {
    // For out-of-office, only date is required
    if (newEvent.eventType === 'out-of-office' && !newEvent.date) return;
    // For other types, title and date are required
    if (newEvent.eventType !== 'out-of-office' && (!newEvent.title || !newEvent.date)) return;

    const eventDate = new Date(newEvent.date);
    let eventEndTime: Date | undefined;

    if (newEvent.eventType === 'out-of-office' && !newEvent.isAllDay && newEvent.time && newEvent.endTime) {
      // Out of office with specific time range
      const [startHours, startMinutes] = newEvent.time.split(':');
      eventDate.setHours(parseInt(startHours), parseInt(startMinutes));

      eventEndTime = new Date(newEvent.date);
      const [endHours, endMinutes] = newEvent.endTime.split(':');
      eventEndTime.setHours(parseInt(endHours), parseInt(endMinutes));
    } else if (newEvent.time) {
      // Regular event with time
      const [hours, minutes] = newEvent.time.split(':');
      eventDate.setHours(parseInt(hours), parseInt(minutes));
    }

    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      title: newEvent.eventType === 'out-of-office' ? 'Out of Office' : newEvent.title,
      description: newEvent.description || undefined,
      startTime: eventDate,
      endTime: eventEndTime,
      source: 'app',
      eventType: newEvent.eventType,
    };

    storage.addEvent(event);
    loadEvents();
    setShowAddEventModal(false);
    setNewEvent({ title: '', description: '', date: '', time: '', endTime: '', isAllDay: true, eventType: 'task' });
  };

  const handleQuickAdd = () => {
    if (!selectedDate) return;
    setNewEvent({
      ...newEvent,
      date: format(selectedDate, 'yyyy-MM-dd'),
    });
    setShowDayModal(false);
    setShowAddEventModal(true);
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setShowDayModal(true);
  };

  const navigate = (direction: 'prev' | 'next') => {
    if (view === 'week') {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    const updatedEvents = events.filter(e => e.id !== eventId);
    storage.saveEvents(updatedEvents);
    loadEvents();
  };

  const getWeekRange = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    return `${format(weekStart, 'M/d')}-${format(weekEnd, 'M/d')}`;
  };

  const monthStart = startOfMonth(currentDate);
  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  return (
    <div className="notes-container">
      <div className="calendar-grid">
        <div className="calendar-controls">
          <div className="calendar-header-controls">
            <h2 className="calendar-month">
              {view === 'week' ? getWeekRange() : format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="view-toggle">
              <button
                className={view === 'week' ? 'active' : ''}
                onClick={() => setView('week')}
              >
                Week
              </button>
              <button
                className={view === 'month' ? 'active' : ''}
                onClick={() => setView('month')}
              >
                Month
              </button>
            </div>
          </div>
          <div className="calendar-nav">
            <button onClick={() => navigate('prev')}>
              ← Previous
            </button>
            <button onClick={() => setCurrentDate(new Date())}>
              Today
            </button>
            <button onClick={() => navigate('next')}>
              Next →
            </button>
            <button
              className="add-event-btn"
              onClick={() => setShowAddEventModal(true)}
            >
              + Add
            </button>
          </div>
        </div>

        <div className="calendar-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}
        </div>

        <div className={`calendar-days ${view === 'week' ? 'week-view' : ''}`}>
          {calendarDays.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isTodayDate = isToday(day);
            const isOOO = hasOutOfOffice(day);

            return (
              <div
                key={index}
                className={`calendar-day ${isTodayDate ? 'today' : ''} ${view === 'month' && !isCurrentMonth ? 'other-month' : ''} ${isOOO ? 'out-of-office' : ''}`}
                onClick={() => handleDayClick(day)}
              >
                <div className="calendar-day-number">{format(day, 'd')}</div>
                {dayEvents.length > 0 && !isOOO && (
                  <div className="calendar-event-dot" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Modal */}
      {showDayModal && selectedDate && (
        <div className="modal-overlay" onClick={() => setShowDayModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h2>
              <button className="modal-close" onClick={() => setShowDayModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-content">
              {selectedDayEvents.length === 0 ? (
                <div className="empty-state">No events on this day</div>
              ) : (
                selectedDayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="note-item event-item-wrapper"
                    onMouseEnter={() => setHoveredEventId(event.id)}
                    onMouseLeave={() => setHoveredEventId(null)}
                    style={{ position: 'relative' }}
                  >
                    <div style={{ flex: 1 }}>
                      <div className="note-content">{event.title}</div>
                      {event.description && (
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          {event.description}
                        </div>
                      )}
                      <div className={`note-meta ${hoveredEventId === event.id ? 'faded' : ''}`}>
                        <span>{format(event.startTime, 'h:mm a')}</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span className="subcategory-tag">
                            {event.eventType || 'other'}
                          </span>
                          <span className="subcategory-tag">
                            {event.source === 'google' ? 'Google' : 'Jado'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      className={`event-delete-btn ${hoveredEventId === event.id ? 'visible' : ''}`}
                      onClick={() => handleDeleteEvent(event.id)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                      Delete
                    </button>
                  </div>
                ))
              )}
              <button
                className="add-event-btn"
                onClick={handleQuickAdd}
                style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}
              >
                + Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddEventModal && (
        <div className="modal-overlay" onClick={() => setShowAddEventModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Event</h2>
              <button className="modal-close" onClick={() => setShowAddEventModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label className="form-label">Event Type *</label>
                <div className="menu event-type-menu">
                  <div className="item">
                    <a href="#" className="link" onClick={(e) => e.preventDefault()}>
                      <span style={{ textTransform: 'capitalize' }}>
                        {newEvent.eventType === 'out-of-office' ? 'Out of Office' : newEvent.eventType}
                      </span>
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
                            setNewEvent({ ...newEvent, eventType: 'task' });
                          }}
                        >
                          Task
                        </a>
                      </div>
                      <div className="submenu-item">
                        <a
                          href="#"
                          className="submenu-link"
                          onClick={(e) => {
                            e.preventDefault();
                            setNewEvent({ ...newEvent, eventType: 'meeting' });
                          }}
                        >
                          Meeting
                        </a>
                      </div>
                      <div className="submenu-item">
                        <a
                          href="#"
                          className="submenu-link"
                          onClick={(e) => {
                            e.preventDefault();
                            setNewEvent({ ...newEvent, eventType: 'other' });
                          }}
                        >
                          Other
                        </a>
                      </div>
                      <div className="submenu-item">
                        <a
                          href="#"
                          className="submenu-link"
                          onClick={(e) => {
                            e.preventDefault();
                            setNewEvent({ ...newEvent, eventType: 'out-of-office', isAllDay: true });
                          }}
                        >
                          Out of Office
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {newEvent.eventType !== 'out-of-office' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Event Title *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder="Meeting with team"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-input form-textarea"
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      placeholder="Optional description..."
                    />
                  </div>
                </>
              )}
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                />
              </div>
              {newEvent.eventType === 'out-of-office' && (
                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: '12px' }}>Time</label>
                  <div className="radio-inputs">
                    <label>
                      <input
                        type="radio"
                        name="oooTimeType"
                        className="radio-input"
                        checked={newEvent.isAllDay}
                        onChange={() => setNewEvent({ ...newEvent, isAllDay: true })}
                      />
                      <span className="radio-tile">
                        <span className="radio-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="5"></circle>
                            <line x1="12" y1="1" x2="12" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="23"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                            <line x1="1" y1="12" x2="3" y2="12"></line>
                            <line x1="21" y1="12" x2="23" y2="12"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                          </svg>
                        </span>
                        <span className="radio-label">All Day</span>
                      </span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="oooTimeType"
                        className="radio-input"
                        checked={!newEvent.isAllDay}
                        onChange={() => setNewEvent({ ...newEvent, isAllDay: false })}
                      />
                      <span className="radio-tile">
                        <span className="radio-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                        </span>
                        <span className="radio-label">Specific Time</span>
                      </span>
                    </label>
                  </div>
                  {!newEvent.isAllDay && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
                      <input
                        type="time"
                        className="form-input"
                        value={newEvent.time}
                        onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                        style={{ flex: 1 }}
                      />
                      <span style={{ color: 'var(--text-secondary)' }}>to</span>
                      <input
                        type="time"
                        className="form-input"
                        value={newEvent.endTime}
                        onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                        style={{ flex: 1 }}
                      />
                    </div>
                  )}
                </div>
              )}
              {newEvent.eventType !== 'out-of-office' && (
                <div className="form-group">
                  <label className="form-label">Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  />
                </div>
              )}
              <button
                className="button"
                onClick={handleAddEvent}
                disabled={newEvent.eventType === 'out-of-office' ? !newEvent.date : (!newEvent.title || !newEvent.date)}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

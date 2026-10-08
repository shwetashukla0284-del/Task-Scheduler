
import { useMemo } from "react";

const START_HOUR = 0;
const END_HOUR = 24;
const TOTAL_MINUTES = 24 * 60;

const formatTime = (date) =>
  new Date(date).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const getLocalDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function CalendarView({ tasks = [], selectedDate, onDateChange }) {
  const hours = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => START_HOUR + i
  );

  const dayTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const start = task.scheduledSlot?.start;
        if (!start || task.status !== "scheduled") return false;
        return getLocalDate(start) === selectedDate;
      })
      .map((task) => {
        const start = new Date(task.scheduledSlot.start);
        const end = new Date(task.scheduledSlot.end);

        const startMinutes =
          start.getHours() * 60 + start.getMinutes();

        const endMinutes =
          end.getHours() * 60 + end.getMinutes();

        return {
          ...task,
          calendarStart: Math.max(0, startMinutes),
          calendarEnd: Math.min(TOTAL_MINUTES, endMinutes),
        };
      })
      .filter(
        (task) =>
          task.calendarStart < TOTAL_MINUTES &&
          task.calendarEnd > 0 &&
          task.calendarEnd > task.calendarStart
      )
      .sort((a, b) => a.calendarStart - b.calendarStart);
  }, [tasks, selectedDate]);

  return (
    <section className="calendar-section">
      <div className="calendar-heading">
        <div>
          <h2>Daily Calendar</h2>
          <p>View your scheduled tasks by time.</p>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          aria-label="Select calendar date"
        />
      </div>

      <div className="calendar">
        <div className="calendar-hours">
          {hours.map((hour) => (
            <div className="calendar-hour" key={hour}>
              {new Date(2026, 0, 1, hour).toLocaleTimeString(
                "en-IN",
                {
                  hour: "numeric",
                  hour12: true,
                }
              )}
            </div>
          ))}
          <div className="calendar-hour calendar-midnight">
            12 am
          </div>
        </div>

        <div className="calendar-timeline">
          {hours.map((hour) => (
            <div className="calendar-hour-line" key={hour} />
          ))}

          {dayTasks.map((task) => {
            const top = task.calendarStart;
            const height =
              task.calendarEnd - task.calendarStart;

            return (
              <div
                className={`calendar-task priority-${task.priority}`}
                key={task._id}
                style={{
                  top: `${top}px`,
                  height: `${Math.max(height, 24)}px`,
                }}
                title={`${task.title}: ${formatTime(
                  task.scheduledSlot.start
                )} – ${formatTime(task.scheduledSlot.end)}`}
              >
                <strong>{task.title}</strong>
                <span>
                  {formatTime(task.scheduledSlot.start)} –{" "}
                  {formatTime(task.scheduledSlot.end)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {dayTasks.length === 0 && (
        <p className="calendar-empty">
          No scheduled tasks for this date.
        </p>
      )}
    </section>
  );
}

export default CalendarView;
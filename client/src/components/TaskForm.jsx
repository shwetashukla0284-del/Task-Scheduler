
import { useEffect, useState } from "react";

const initialForm = {
  title: "",
  estimatedDuration: "",
  deadline: "",
  priority: "medium",
};

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getLocalDateTime(date) {
  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getInitialPickerValue(value) {
  if (value) return value;
  return getLocalDateTime(new Date());
}

function CustomDateTimePicker({
  value,
  onConfirm,
  onCancel,
}) {
  const [draft, setDraft] = useState(() =>
    getInitialPickerValue(value)
  );

  useEffect(() => {
    setDraft(getInitialPickerValue(value));
  }, [value]);

  const datePart = draft.slice(0, 10);
  const timePart = draft.slice(11, 16);

  const handleDateChange = (event) => {
    const date = event.target.value;
    setDraft(`${date}T${timePart || "09:00"}`);
  };

  const handleTimeChange = (event) => {
    const time = event.target.value;
    setDraft(`${datePart || getLocalDateTime(new Date()).slice(0, 10)}T${time}`);
  };

  const handleConfirm = () => {
    if (!datePart || !timePart) return;
    const selected = new Date(draft);

    if (Number.isNaN(selected.getTime())) return;

    onConfirm(draft);
  };

  return (
    <div className="datetime-picker">
      <div className="datetime-picker-heading">
        <div>
          <h3>Select deadline</h3>
          <p>Choose a date and time for your task.</p>
        </div>
      </div>

      <div className="datetime-picker-fields">
        <div className="form-group">
          <label htmlFor="custom-deadline-date">Date</label>
          <input
            id="custom-deadline-date"
            type="date"
            value={datePart}
            onChange={handleDateChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="custom-deadline-time">Time</label>
          <input
            id="custom-deadline-time"
            type="time"
            value={timePart}
            onChange={handleTimeChange}
          />
        </div>
      </div>

      <div className="datetime-picker-actions">
        <button
          type="button"
          className="cancel-button"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="primary-btn"
          onClick={handleConfirm}
          disabled={!datePart || !timePart}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

function TaskForm({
  initialTask,
  onSubmit,
  onCancel,
  submitting = false,
}) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setForm({
        title: initialTask.title || "",
        estimatedDuration: String(
          initialTask.estimatedDuration ?? ""
        ),
        deadline: formatDateTime(initialTask.deadline),
        priority: initialTask.priority || "medium",
      });
    } else {
      setForm(initialForm);
    }

    setError("");
    setShowDatePicker(false);
  }, [initialTask]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleDeadlineConfirm = (value) => {
    setForm((previous) => ({
      ...previous,
      deadline: value,
    }));
    setShowDatePicker(false);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const title = form.title.trim();
    const duration = Number(form.estimatedDuration);
    const deadline = new Date(form.deadline);

    if (!title) {
      setError("Please enter a task title.");
      return;
    }

    if (!Number.isFinite(duration) || duration < 1) {
      setError("Duration must be at least 1 minute.");
      return;
    }

    if (!Number.isInteger(duration)) {
      setError("Duration must be a whole number of minutes.");
      return;
    }

    if (!form.deadline || Number.isNaN(deadline.getTime())) {
      setError("Please select a valid deadline.");
      return;
    }

    try {
      await onSubmit({
        title,
        estimatedDuration: duration,
        deadline: deadline.toISOString(),
        priority: form.priority,
      });

      if (!initialTask) {
        setForm(initialForm);
      }
    } catch {
      // The parent displays the API error.
    }
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <h2>{initialTask ? "Edit Task" : "Create New Task"}</h2>

      {error && <p className="form-error">{error}</p>}

      <div className="form-group">
        <label htmlFor="title">Task title</label>
        <input
          id="title"
          name="title"
          type="text"
          placeholder="e.g. Complete project report"
          value={form.title}
          onChange={handleChange}
          maxLength={150}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="estimatedDuration">
          Estimated duration (minutes)
        </label>
        <input
          id="estimatedDuration"
          name="estimatedDuration"
          type="number"
          min="1"
          step="1"
          placeholder="e.g. 60"
          value={form.estimatedDuration}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="deadline-display">Deadline</label>
        <div className="deadline-input-wrapper">
          <input
            id="deadline-display"
            type="text"
            readOnly
            placeholder="Select date and time"
            value={
              form.deadline
                ? new Date(form.deadline).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : ""
            }
            onClick={() => setShowDatePicker(true)}
            onFocus={() => setShowDatePicker(true)}
            required
          />
          <button
            type="button"
            className="deadline-picker-trigger"
            aria-label="Choose deadline"
            onClick={() => setShowDatePicker(true)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
              <path d="m9 15 2 2 4-4" />
            </svg>
          </button>
        </div>

        {showDatePicker && (
          <CustomDateTimePicker
            value={form.deadline}
            onConfirm={handleDeadlineConfirm}
            onCancel={() => setShowDatePicker(false)}
          />
        )}
      </div>

      <div className="form-group">
        <label htmlFor="priority">Priority</label>
        <select
          id="priority"
          name="priority"
          value={form.priority}
          onChange={handleChange}
        >
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting
            ? "Saving..."
            : initialTask
              ? "Update Task"
              : "Create Task"}
        </button>

        {initialTask && (
          <button
            type="button"
            className="cancel-button"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default TaskForm;
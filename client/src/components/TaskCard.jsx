
function TaskCard({
  task,
  onEdit,
  onDelete,
  onSchedule,
  scheduling = false,
}) {
  const formatDate = (value) => {
    if (!value) return "Not set";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Invalid date";
    }

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const start = task.scheduledSlot?.start;
  const end = task.scheduledSlot?.end;

  const hasScheduledSlot =
    task.status === "scheduled" && start && end;

  return (
    <article className="task-card">
      <div className="task-card-header">
        <h3>{task.title}</h3>

        <span className={`priority priority-${task.priority}`}>
          {task.priority}
        </span>
      </div>

      <div className="task-details">
        <p>
          <strong>Duration:</strong>{" "}
          {task.estimatedDuration} minutes
        </p>

        <p>
          <strong>Deadline:</strong>{" "}
          {formatDate(task.deadline)}
        </p>

        <p>
          <strong>Status:</strong>{" "}
          <span className={`status status-${task.status}`}>
            {task.status}
          </span>
        </p>

        {hasScheduledSlot && (
          <p>
            <strong>Scheduled:</strong>{" "}
            {formatDate(start)} –{" "}
            {new Date(end).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>

      <div className="task-card-actions">
        <button
          type="button"
          onClick={() => onEdit(task)}
        >
          Edit
        </button>

        {task.status !== "completed" && (
          <button
            type="button"
            onClick={() => onSchedule(task._id)}
            disabled={scheduling}
          >
            {scheduling ? "Scheduling..." : "Schedule"}
          </button>
        )}

        <button
          type="button"
          className="delete-button"
          onClick={() => onDelete(task._id)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

export default TaskCard;
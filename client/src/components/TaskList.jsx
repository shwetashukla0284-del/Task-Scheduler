
import TaskCard from "./TaskCard";

function TaskList({
  tasks,
  onEdit,
  onDelete,
  onSchedule,
  schedulingId = null,
}) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="empty-state">
        <h3>No tasks yet</h3>
        <p>Add a task to get started with your schedule.</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskCard
          key={task._id}
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onSchedule={onSchedule}
          scheduling={schedulingId === task._id}
        />
      ))}
    </div>
  );
}

export default TaskList;
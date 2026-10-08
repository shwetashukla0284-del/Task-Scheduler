import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  scheduleTask,
} from "../services/taskService";

function Dashboard() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [schedulingId, setSchedulingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const getUser = () => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : {};
    } catch {
      return {};
    }
  };

  const user = getUser();
  const userName = user.name || user.fullName || "User";
  const userEmail = user.email || "";

  const initials = userName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const loadTasks = useCallback(async () => {
    try {
      setError("");

      const data = await getTasks();

      if (!Array.isArray(data.tasks)) {
        throw new Error("Invalid tasks response from server");
      }

      setTasks(data.tasks);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load tasks."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleFormSubmit = async (formData) => {
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      if (editingTask) {
        await updateTask(editingTask._id, formData);
        setSuccess("Task updated successfully.");
      } else {
        await createTask(formData);
        setSuccess("Task created successfully.");
      }

      setShowForm(false);
      setEditingTask(null);

      await loadTasks();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to save task."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const handleDelete = async (taskId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await deleteTask(taskId);

      setTasks((prev) =>
        prev.filter((task) => task._id !== taskId)
      );

      setSuccess("Task deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to delete task."
      );
    }
  };

  const handleSchedule = async (taskId) => {
    try {
      setSchedulingId(taskId);
      setError("");
      setSuccess("");

      const result = await scheduleTask(taskId);

      await loadTasks();

      const movedTasks = Array.isArray(result?.rescheduledTasks)
        ? result.rescheduledTasks
        : [];

      if (movedTasks.length > 0) {
        const movedNames = movedTasks
          .map((task) => task?.title)
          .filter(Boolean)
          .join(", ");

        setSuccess(
          movedNames
            ? `Task scheduled successfully. ${movedNames} was rescheduled to resolve the conflict.`
            : "Task scheduled successfully. Another task was rescheduled to resolve the conflict."
        );
      } else {
        setSuccess("Task scheduled successfully.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to schedule task."
      );
    } finally {
      setSchedulingId(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTask(null);
    setError("");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login", { replace: true });
  };

  const scheduledCount = tasks.filter(
    (task) =>
      task.status === "scheduled" ||
      task.scheduledSlot
  ).length;

  const unscheduledCount =
    tasks.length - scheduledCount;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>TaskScheduler</h1>
          <p>
            Organize your tasks and plan your day.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => navigate("/schedule")}
          >
            View Schedule
          </button>

          <div className="profile-wrapper">
            <button
              type="button"
              className="profile-trigger"
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              onClick={() =>
                setProfileOpen((prev) => !prev)
              }
            >
              <span
                className="profile-avatar"
                aria-hidden="true"
              >
                {initials || "U"}
              </span>

              <span className="profile-trigger-name">
                {userName}
              </span>

              <span
                className="profile-chevron"
                aria-hidden="true"
              >
                {profileOpen ? "▲" : "▼"}
              </span>
            </button>

            {profileOpen && (
              <>
                <button
                  type="button"
                  className="profile-backdrop"
                  aria-label="Close profile menu"
                  onClick={() =>
                    setProfileOpen(false)
                  }
                />

                <div
                  className="profile-menu"
                  role="menu"
                >
                  <div className="profile-menu-user">
                    <span
                      className="profile-avatar profile-avatar-large"
                      aria-hidden="true"
                    >
                      {initials || "U"}
                    </span>

                    <div className="profile-user-details">
                      <strong>{userName}</strong>

                      {userEmail && (
                        <span>{userEmail}</span>
                      )}
                    </div>
                  </div>

                  <div className="profile-menu-divider" />

                  <button
                    type="button"
                    className="profile-logout"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <span aria-hidden="true">↪</span>
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <aside
          className="dashboard-sidebar"
          aria-label="Main navigation"
        >
          <div className="sidebar-label">
            MENU
          </div>

          <button
            type="button"
            className="sidebar-link active"
            onClick={() => navigate("/dashboard")}
          >
            <span aria-hidden="true">▦</span>
            Dashboard
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() => navigate("/schedule")}
          >
            <span aria-hidden="true">▣</span>
            Schedule
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() => navigate("/all-tasks")}
          >
            <span aria-hidden="true">☷</span>
            All Tasks
          </button>
        </aside>

        <main className="dashboard-content">
          <section
            className="stats-grid"
            aria-label="Task statistics"
          >
            <div className="stat-card">
              <span>Total Tasks</span>
              <strong>{tasks.length}</strong>
            </div>

            <div className="stat-card">
              <span>Scheduled Tasks</span>
              <strong>{scheduledCount}</strong>
            </div>

            <div className="stat-card">
              <span>Unscheduled Tasks</span>
              <strong>{unscheduledCount}</strong>
            </div>
          </section>

          {error && (
            <div
              className="message error-message"
              role="alert"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="message success-message"
              role="status"
            >
              {success}
            </div>
          )}

          <section
            className="tasks-section"
            aria-labelledby="tasks-heading"
          >
            <div className="section-heading">
              <div>
                <h2 id="tasks-heading">
                  Your Tasks
                </h2>

                <p>
                  Manage your tasks in one place.
                </p>
              </div>

              {!showForm && (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    setEditingTask(null);
                    setShowForm(true);
                    setError("");
                    setSuccess("");
                  }}
                >
                  + Add Task
                </button>
              )}
            </div>

            {showForm && (
              <div
                className="task-form-container"
                style={{ position: "relative" }}
              >
                <div className="task-form-heading">
                  <h3>
                    {editingTask
                      ? "Edit Task"
                      : "Create Task"}
                  </h3>

                  <button
                    type="button"
                    className="task-form-close"
                    style={{
                      position: "absolute",
                      top: "16px",
                      right: "16px",
                      zIndex: 2,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "34px",
                      height: "34px",
                      padding: 0,
                      border: "1px solid #f9a8d4",
                      borderRadius: "9px",
                      background: "#fce7f3",
                      color: "#9d174d",
                      fontSize: "25px",
                      lineHeight: 1,
                      cursor: "pointer",
                    }}
                    aria-label="Close task form"
                    title="Close"
                    onClick={handleCancel}
                    disabled={submitting}
                  >
                    ×
                  </button>
                </div>

                <TaskForm
                  initialTask={editingTask}
                  onSubmit={handleFormSubmit}
                  onCancel={handleCancel}
                  submitting={submitting}
                />
              </div>
            )}

            {loading ? (
              <p
                className="loading-text"
                role="status"
                aria-live="polite"
              >
                Loading tasks...
              </p>
            ) : (
              <TaskList
                tasks={tasks}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSchedule={handleSchedule}
                schedulingId={schedulingId}
              />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
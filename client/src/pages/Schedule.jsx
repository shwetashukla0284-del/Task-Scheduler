

import { useCallback, useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import {

  getTasks,

  getSchedulePreview,

} from "../services/taskService";

import CalendarView from "../components/CalendarView";



function Schedule() {

  const navigate = useNavigate();



  const [tasks, setTasks] = useState([]);

  const [preview, setPreview] = useState(null);

  const [loading, setLoading] = useState(true);

  const [previewLoading, setPreviewLoading] = useState(false);

  const [error, setError] = useState("");
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
  const initials = userName.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };



  const [selectedDate, setSelectedDate] = useState(() => {

    const today = new Date();

    const year = today.getFullYear();

    const month = String(today.getMonth() + 1).padStart(2, "0");

    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;

  });



  // Format date and time

  const formatDateTime = (date) => {

    if (!date) return "Not available";



    const parsedDate = new Date(date);



    if (Number.isNaN(parsedDate.getTime())) {

      return "Invalid date";

    }



    return parsedDate.toLocaleString("en-IN", {

      dateStyle: "medium",

      timeStyle: "short",

    });

  };



  // Load tasks from backend

  const loadSchedule = useCallback(async () => {

    try {

      setError("");

      setLoading(true);



      const data = await getTasks();



      const taskList = Array.isArray(data)

        ? data

        : Array.isArray(data?.tasks)

          ? data.tasks

          : [];



      setTasks(taskList);

    } catch (err) {

      console.error("Load schedule error:", err);



      setError(

        err.response?.data?.message ||

          "Failed to load scheduled tasks."

      );

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    loadSchedule();

  }, [loadSchedule]);



  // Generate schedule preview

  const handlePreview = async () => {

    try {

      setPreviewLoading(true);

      setError("");



      const data = await getSchedulePreview();

      setPreview(data);

    } catch (err) {

      console.error("Schedule preview error:", err);



      setError(

        err.response?.data?.message ||

          "Failed to generate schedule preview."

      );

    } finally {

      setPreviewLoading(false);

    }

  };



  // Get only tasks with valid scheduled slots

  const scheduledTasks = tasks

    .filter(

      (task) =>

        task.status === "scheduled" &&

        task.scheduledSlot?.start &&

        task.scheduledSlot?.end

    )

    .sort(

      (a, b) =>

        new Date(a.scheduledSlot.start).getTime() -

        new Date(b.scheduledSlot.start).getTime()

    );



  // Priority styling

  const getPriorityClass = (priority) => {

    const validPriorities = [

      "low",

      "medium",

      "high",

      "urgent",

    ];



    const value = validPriorities.includes(

      (priority || "").toLowerCase()

    )

      ? priority.toLowerCase()

      : "medium";



    return `priority-badge priority-${value}`;

  };



  return (

    <div className="schedule-page">

      {/* Header */}

      <header className="schedule-header">
        <div>
          <h1>My Schedule</h1>
          <p>View your planned tasks and available time.</p>
        </div>

        <div className="header-actions">
          <button type="button" className="secondary-btn" onClick={loadSchedule} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <div className="profile-wrapper">
            <button
              type="button"
              className="profile-trigger"
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((prev) => !prev)}
            >
              <span className="profile-avatar" aria-hidden="true">{initials || "U"}</span>
              <span className="profile-trigger-name">{userName}</span>
              <span className="profile-chevron" aria-hidden="true">{profileOpen ? "▲" : "▼"}</span>
            </button>

            {profileOpen && (
              <>
                <button type="button" className="profile-backdrop" aria-label="Close profile menu" onClick={() => setProfileOpen(false)} />
                <div className="profile-menu" role="menu">
                  <div className="profile-menu-user">
                    <span className="profile-avatar profile-avatar-large" aria-hidden="true">{initials || "U"}</span>
                    <div className="profile-user-details">
                      <strong>{userName}</strong>
                      {userEmail && <span>{userEmail}</span>}
                    </div>
                  </div>
                  <div className="profile-menu-divider" />
                  <button type="button" className="profile-logout" role="menuitem" onClick={handleLogout}>
                    <span aria-hidden="true">↪</span> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="schedule-body">
        <aside className="schedule-sidebar" aria-label="Main navigation">
          <div className="sidebar-label">MENU</div>
          <button type="button" className="sidebar-link" onClick={() => navigate("/dashboard")}>
            <span aria-hidden="true">▦</span> Dashboard
          </button>
          <button type="button" className="sidebar-link active" onClick={() => navigate("/schedule")}>
            <span aria-hidden="true">▣</span> Schedule
          </button>
          <button type="button" className="sidebar-link" onClick={() => navigate("/dashboard")}>
            <span aria-hidden="true">☷</span> All Tasks
          </button>
        </aside>

      <main className="schedule-content">

        {/* Error message */}

        {error && (

          <div className="message error-message" role="alert">

            {error}

          </div>

        )}



        {/* Daily Calendar */}

        {!loading && (

          <CalendarView

            tasks={scheduledTasks}

            selectedDate={selectedDate}

            onDateChange={setSelectedDate}

          />

        )}



        {/* Scheduled tasks */}

        <section className="schedule-section">

          <div className="section-heading">

            <div>

              <h2>Scheduled Tasks</h2>

              <p>

                {scheduledTasks.length} task

                {scheduledTasks.length === 1 ? "" : "s"} scheduled

              </p>

            </div>



            <button

              className="primary-btn"

              onClick={handlePreview}

              disabled={previewLoading}

            >

              {previewLoading

                ? "Generating..."

                : "Generate Preview"}

            </button>

          </div>



          {loading ? (

            <p className="loading-text">

              Loading schedule...

            </p>

          ) : scheduledTasks.length === 0 ? (

            <div className="empty-state">

              <h3>No scheduled tasks</h3>

              <p>

                Schedule a task from your dashboard to see it here.

              </p>

              <button

                className="primary-btn"

                onClick={() => navigate("/dashboard")}

              >

                Go to Dashboard

              </button>

            </div>

          ) : (

            <div className="schedule-list">

              {scheduledTasks.map((task) => (

                <article

                  className="schedule-card"

                  key={task._id}

                >

                  <div className="schedule-time">

                    <span>Start</span>

                    <strong>

                      {formatDateTime(

                        task.scheduledSlot.start

                      )}

                    </strong>



                    <span>End</span>

                    <strong>

                      {formatDateTime(

                        task.scheduledSlot.end

                      )}

                    </strong>

                  </div>



                  <div className="schedule-details">

                    <h3>{task.title}</h3>



                    <span

                      className={getPriorityClass(task.priority)}

                    >

                      {task.priority || "medium"}

                    </span>



                    <p>

                      <strong>Duration:</strong>{" "}

                      {task.estimatedDuration} minutes

                    </p>



                    <p>

                      <strong>Deadline:</strong>{" "}

                      {formatDateTime(task.deadline)}

                    </p>



                    <p>

                      <strong>Status:</strong>{" "}

                      {task.status}

                    </p>

                  </div>

                </article>

              ))}

            </div>

          )}

        </section>



        {/* Schedule preview */}

        {preview !== null && (

          <section className="preview-section">

            <div className="section-heading">

              <div>

                <h2>Schedule Preview</h2>

                <p>

                  Available time based on your scheduled tasks.

                </p>

              </div>

            </div>



            <div className="preview-output">

              <div className="preview-summary">

                <p>

                  <strong>Date:</strong>{" "}

                  {formatDateTime(preview.date)}

                </p>



                <p>

                  <strong>Working hours:</strong>{" "}

                  {preview.workingHours?.start || "09:00"} –{" "}

                  {preview.workingHours?.end || "21:00"}

                </p>

              </div>



              <h3>Available Time Blocks</h3>



              {Array.isArray(preview.availableBlocks) &&

              preview.availableBlocks.length > 0 ? (

                <div className="schedule-list">

                  {preview.availableBlocks.map((block, index) => (

                    <article

                      className="schedule-card"

                      key={`${block.start}-${index}`}

                    >

                      <div className="schedule-details">

                        <p>

                          <strong>Start:</strong>{" "}

                          {formatDateTime(block.start)}

                        </p>



                        <p>

                          <strong>End:</strong>{" "}

                          {formatDateTime(block.end)}

                        </p>



                        <p>

                          <strong>Free time:</strong>{" "}

                          {Number(

                            block.durationMinutes

                          ).toFixed(0)}{" "}

                          minutes

                        </p>

                      </div>

                    </article>

                  ))}

                </div>

              ) : (

                <div className="empty-state">

                  <p>No available time blocks for this day.</p>

                </div>

              )}



              <h3>Tasks Included in Preview</h3>



              {Array.isArray(preview.scheduledTasks) &&

              preview.scheduledTasks.length > 0 ? (

                <div className="schedule-list">

                  {preview.scheduledTasks.map((task) => (

                    <article

                      className="schedule-card"

                      key={task._id}

                    >

                      <div className="schedule-details">

                        <h3>{task.title}</h3>

                        <p>

                          <strong>Start:</strong>{" "}

                          {formatDateTime(

                            task.scheduledSlot?.start

                          )}

                        </p>

                        <p>

                          <strong>End:</strong>{" "}

                          {formatDateTime(

                            task.scheduledSlot?.end

                          )}

                        </p>

                      </div>

                    </article>

                  ))}

                </div>

              ) : (

                <p>No scheduled tasks in this preview.</p>

              )}

            </div>

          </section>

        )}

      </main>
      </div>
    </div>

  );

}



export default Schedule;
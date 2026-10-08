# TaskScheduler

TaskScheduler is a full-stack task and meeting scheduling application that helps users create, manage, and automatically schedule tasks based on duration, priority, deadlines, and available time slots.

The application includes JWT-based authentication, task CRUD operations, automatic scheduling, conflict resolution, calendar-based schedule visualization, and task filtering.

## Live Demo

Frontend: https://task-scheduler-seven-nu.vercel.app/

Backend API: https://task-scheduler-ai60.onrender.com/

## Features

### Task Management

- Create tasks with title, duration, deadline, priority, and status
- Edit existing tasks
- Delete tasks
- View all tasks in one place
- Search tasks by title
- Filter tasks by status and priority

### Automatic Scheduling

- Automatically finds available time slots for tasks
- Considers task duration and deadline
- Uses task priority during scheduling
- Prevents overlapping scheduled tasks
- Handles scheduling conflicts
- Reschedules affected tasks when required
- Returns an appropriate error when no valid time slot is available

### Calendar and Schedule

- Dedicated schedule page
- Calendar-based visualization of scheduled tasks
- View scheduled tasks by date
- Display task start and end times
- Schedule preview functionality

### Authentication

- User registration
- User login
- JWT-based authentication
- Protected API routes
- Password hashing using bcrypt
- Logout functionality

### Dashboard

- Total task count
- Scheduled task count
- Unscheduled task count
- Task cards with task details
- Quick access to editing, scheduling, and deletion

## Tech Stack

### Frontend

- React
- Vite
- React Router
- Axios
- CSS

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JSON Web Tokens
- bcryptjs

### Deployment

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas
- Version Control: Git and GitHub

## System Architecture

```text
                    User
                     |
                     v
              React Frontend
                 Vite + React
                     |
                     | HTTP / REST API
                     v
              Express Backend
                     |
          +----------+----------+
          |                     |
          v                     v
    Authentication        Task Management
    JWT + bcrypt             Controllers
          |                     |
          +----------+----------+
                     |
                     v
                 Scheduler
          Conflict Resolution
                     |
                     v
               MongoDB Atlas

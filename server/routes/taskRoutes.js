
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  scheduleTask,
  getSchedulePreview,
} = require("../controllers/taskController");

// Check that every controller is a valid function
const handlers = {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  scheduleTask,
  getSchedulePreview,
};

for (const [name, handler] of Object.entries(handlers)) {
  if (typeof handler !== "function") {
    throw new TypeError(
      `Invalid task controller: ${name} must be a function`
    );
  }
}

// All task routes require authentication
router.use(protect);

// Task CRUD
router.post("/", createTask);
router.get("/", getTasks);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);

// Scheduling
router.get("/preview", getSchedulePreview);
router.post("/:id/schedule", scheduleTask);

module.exports = router;
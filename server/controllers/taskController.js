
const Task = require("../models/task");
const {
  scheduleWithConflictResolution,
  getFreeBlocks,
} = require("../services/scheduler");

// Get authenticated user's ID
const getUserId = (req) => {
  if (!req.user) {
    throw new Error("Authenticated user not found");
  }

  return req.user._id || req.user.id;
};

// Create a task
const createTask = async (req, res) => {
  try {
    const {
      title,
      estimatedDuration,
      deadline,
      priority = "medium",
    } = req.body || {};

    if (
      typeof title !== "string" ||
      !title.trim() ||
      estimatedDuration === undefined ||
      estimatedDuration === null ||
      estimatedDuration === "" ||
      !deadline
    ) {
      return res.status(400).json({
        message: "Title, duration and deadline are required",
      });
    }

    if (
      !Number.isFinite(Number(estimatedDuration)) ||
      Number(estimatedDuration) < 1
    ) {
      return res.status(400).json({
        message: "Duration must be at least 1 minute",
      });
    }

    if (!["low", "medium", "high", "urgent"].includes(priority)) {
      return res.status(400).json({
        message: "Invalid priority",
      });
    }

    const parsedDeadline = new Date(deadline);

    if (Number.isNaN(parsedDeadline.getTime())) {
      return res.status(400).json({
        message: "Invalid deadline",
      });
    }

    const task = await Task.create({
      user: getUserId(req),
      title: title.trim(),
      estimatedDuration: Number(estimatedDuration),
      deadline: parsedDeadline,
      priority,
    });

    return res.status(201).json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("Create task error:", error);
    return res.status(500).json({
      message: "Failed to create task",
      error: error.message,
    });
  }
};

// Get all tasks of the logged-in user
const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      user: getUserId(req),
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    return res.status(500).json({
      message: "Failed to fetch tasks",
      error: error.message,
    });
  }
};

// Update a task
const updateTask = async (req, res) => {
  try {
    const userId = getUserId(req);
    const body = req.body || {};

    const allowedFields = [
      "title",
      "estimatedDuration",
      "deadline",
      "priority",
      "status",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update",
      });
    }

    if (
      updates.title !== undefined &&
      (typeof updates.title !== "string" ||
        !updates.title.trim())
    ) {
      return res.status(400).json({
        message: "Title cannot be empty",
      });
    }

    if (updates.title !== undefined) {
      updates.title = updates.title.trim();
    }

    if (updates.estimatedDuration !== undefined) {
      const duration = Number(updates.estimatedDuration);

      if (!Number.isFinite(duration) || duration < 1) {
        return res.status(400).json({
          message: "Duration must be at least 1 minute",
        });
      }

      updates.estimatedDuration = duration;
    }

    if (updates.deadline !== undefined) {
      const deadline = new Date(updates.deadline);

      if (Number.isNaN(deadline.getTime())) {
        return res.status(400).json({
          message: "Invalid deadline",
        });
      }

      updates.deadline = deadline;
    }

    if (
      updates.priority !== undefined &&
      !["low", "medium", "high", "urgent"].includes(
        updates.priority
      )
    ) {
      return res.status(400).json({
        message: "Invalid priority",
      });
    }

    if (
      updates.status !== undefined &&
      !["pending", "scheduled", "completed", "unscheduled"].includes(
        updates.status
      )
    ) {
      return res.status(400).json({
        message: "Invalid task status",
      });
    }

    const existingTask = await Task.findOne({
      _id: req.params.id,
      user: userId,
    });

    if (!existingTask) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    // Check whether scheduling details actually changed.
    const durationChanged =
      updates.estimatedDuration !== undefined &&
      Number(existingTask.estimatedDuration) !==
        updates.estimatedDuration;

    const deadlineChanged =
      updates.deadline !== undefined &&
      new Date(existingTask.deadline).getTime() !==
        updates.deadline.getTime();

    const priorityChanged =
      updates.priority !== undefined &&
      existingTask.priority !== updates.priority;

    const schedulingDetailsChanged =
      durationChanged || deadlineChanged || priorityChanged;

    // Clear the old slot only when a scheduled task's
    // scheduling details change, or it is set to pending.
    const clearOldSchedule =
      existingTask.status === "scheduled" &&
      (schedulingDetailsChanged ||
        updates.status === "pending");

    const updateQuery = {
      $set: { ...updates },
    };

    if (clearOldSchedule) {
      updateQuery.$set.status = "pending";
      updateQuery.$unset = {
        scheduledSlot: 1,
      };
    } else if (updates.status === "pending") {
      updateQuery.$unset = {
        scheduledSlot: 1,
      };
    }

    const task = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        user: userId,
      },
      updateQuery,
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      message: clearOldSchedule
        ? "Task updated. Previous schedule cleared. Click Schedule to reschedule."
        : "Task updated successfully",
      task,
    });
  } catch (error) {
    console.error("Update task error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    return res.status(500).json({
      message: "Failed to update task",
      error: error.message,
    });
  }
};

// Delete a task
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: getUserId(req),
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    return res.status(200).json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    return res.status(500).json({
      message: "Failed to delete task",
      error: error.message,
    });
  }
};

// Automatically schedule a task before its deadline
const scheduleTask = async (req, res) => {
  try {
    const userId = getUserId(req);

    const task = await Task.findOne({
      _id: req.params.id,
      user: userId,
    }).lean();

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const deadline = new Date(task.deadline);
    const now = new Date();

    if (
      Number.isNaN(deadline.getTime()) ||
      deadline <= now
    ) {
      return res.status(409).json({
        message: "Task deadline has passed or is invalid",
      });
    }

    const body = req.body || {};
    const workingHours = body.workingHours;

    if (
      workingHours !== undefined &&
      (!workingHours ||
        typeof workingHours.start !== "string" ||
        typeof workingHours.end !== "string")
    ) {
      return res.status(400).json({
        message: "Invalid working hours",
      });
    }

    const tasks = await Task.find({
      user: userId,
      status: "scheduled",
      _id: { $ne: task._id },
    }).lean();

    // Search from today through the deadline.
    const firstDay = new Date(now);
    firstDay.setHours(0, 0, 0, 0);

    const lastDay = new Date(deadline);
    lastDay.setHours(0, 0, 0, 0);

    let result = null;

    for (
      let day = new Date(firstDay);
      day <= lastDay;
      day.setDate(day.getDate() + 1)
    ) {
      const candidate = scheduleWithConflictResolution({
        task,
        tasks,
        day: new Date(day),
        workingHours,
      });

      if (candidate.success) {
        result = candidate;
        break;
      }
    }

    if (!result) {
      return res.status(409).json({
        message:
          "No available slot or valid conflict resolution before the deadline",
        task,
      });
    }

    const operations = [
      {
        updateOne: {
          filter: {
            _id: task._id,
            user: userId,
          },
          update: {
            $set: {
              status: result.task.status,
              scheduledSlot: result.task.scheduledSlot,
            },
          },
        },
      },
    ];

    // Save any displaced tasks as well.
    for (const change of result.changes || []) {
      operations.push({
        updateOne: {
          filter: {
            _id: change.task._id,
            user: userId,
          },
          update: {
            $set: {
              status: "scheduled",
              scheduledSlot: change.newSlot,
            },
          },
        },
      });
    }

    await Task.bulkWrite(operations);

    const savedTask = await Task.findOne({
      _id: task._id,
      user: userId,
    });

    const rescheduledTasks = await Promise.all(
      (result.changes || []).map((change) =>
        Task.findOne({
          _id: change.task._id,
          user: userId,
        })
      )
    );

    return res.status(200).json({
      message: result.message || "Task scheduled successfully",
      task: savedTask,
      rescheduledTasks: rescheduledTasks.filter(Boolean),
    });
  } catch (error) {
    console.error("Schedule task error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    return res.status(500).json({
      message: "Failed to schedule task",
      error: error.message,
    });
  }
};

// Get schedule preview for a particular day
const getSchedulePreview = async (req, res) => {
  try {
    const userId = getUserId(req);
    const day = req.query.day || new Date();
    const parsedDay = new Date(day);

    if (Number.isNaN(parsedDay.getTime())) {
      return res.status(400).json({
        message: "Invalid scheduling date",
      });
    }

    const tasks = await Task.find({
      user: userId,
      status: "scheduled",
    }).lean();

    const workingHours = {
      start: "09:00",
      end: "21:00",
    };

    const freeBlocks = getFreeBlocks(
      parsedDay,
      tasks,
      workingHours
    );

    const formattedBlocks = freeBlocks.map((block) => ({
      start: block.start,
      end: block.end,
      durationMinutes:
        (block.end.getTime() - block.start.getTime()) /
        (60 * 1000),
    }));

    return res.status(200).json({
      date: parsedDay,
      workingHours,
      availableBlocks: formattedBlocks,
      scheduledTasks: tasks,
    });
  } catch (error) {
    console.error("Schedule preview error:", error);

    return res.status(500).json({
      message: "Failed to generate schedule preview",
      error: error.message,
    });
  }
};

module.exports = {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  scheduleTask,
  getSchedulePreview,
};
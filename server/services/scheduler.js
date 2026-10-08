
const DEFAULT_WORKING_HOURS = {
  start: "09:00",
  end: "21:00",
};

const PRIORITY_LEVELS = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// Convert HH:mm into minutes after midnight
const toMinutes = (time) => {
  if (
    typeof time !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  ) {
    throw new Error("Working hours must use HH:mm format");
  }

  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Create a local Date at a given number of minutes after midnight
const dateAtMinutes = (day, minutes) => {
  let date;

  if (
    typeof day === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(day)
  ) {
    const [year, month, dayNumber] = day.split("-").map(Number);
    date = new Date(year, month - 1, dayNumber);
  } else {
    date = new Date(day);
  }

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid scheduling day");
  }

  date.setHours(0, 0, 0, 0);
  date.setMinutes(minutes);

  return date;
};

// Calculate free time blocks for a particular day
const getFreeBlocks = (
  day,
  tasks,
  workingHours = DEFAULT_WORKING_HOURS
) => {
  const startMinutes = toMinutes(workingHours.start);
  const endMinutes = toMinutes(workingHours.end);

  if (startMinutes >= endMinutes) {
    throw new Error("Working hours must end after they start");
  }

  const dayStart = dateAtMinutes(day, startMinutes);
  const dayEnd = dateAtMinutes(day, endMinutes);
  const now = new Date();

  // A past day has no available time
  if (dayEnd <= now) {
    return [];
  }

  // Today: start from the current time, if within working hours.
  // Future day: start at the configured working-hour start.
  const effectiveStart = new Date(
    Math.max(dayStart.getTime(), now.getTime())
  );

  if (effectiveStart >= dayEnd) {
    return [];
  }

  const busySlots = tasks
    .filter(
      (task) =>
        task.status === "scheduled" &&
        task.scheduledSlot?.start &&
        task.scheduledSlot?.end
    )
    .map((task) => ({
      start: new Date(task.scheduledSlot.start),
      end: new Date(task.scheduledSlot.end),
    }))
    .filter(
      (slot) =>
        !Number.isNaN(slot.start.getTime()) &&
        !Number.isNaN(slot.end.getTime()) &&
        slot.start < dayEnd &&
        slot.end > effectiveStart &&
        slot.start < slot.end
    )
    .sort((a, b) => a.start - b.start);

  const freeBlocks = [];
  let cursor = effectiveStart;

  for (const slot of busySlots) {
    const slotStart = new Date(
      Math.max(slot.start.getTime(), effectiveStart.getTime())
    );

    const slotEnd = new Date(
      Math.min(slot.end.getTime(), dayEnd.getTime())
    );

    if (slotEnd <= cursor) {
      continue;
    }

    if (slotStart > cursor) {
      freeBlocks.push({
        start: new Date(cursor),
        end: new Date(slotStart),
      });
    }

    if (slotEnd > cursor) {
      cursor = slotEnd;
    }
  }

  if (cursor < dayEnd) {
    freeBlocks.push({
      start: new Date(cursor),
      end: new Date(dayEnd),
    });
  }

  return freeBlocks;
};

// Find the earliest free slot that fits a task
const findEarliestSlot = (
  durationMinutes,
  deadline,
  freeBlocks
) => {
  if (
    !Number.isFinite(Number(durationMinutes)) ||
    Number(durationMinutes) <= 0
  ) {
    throw new Error("Duration must be greater than zero");
  }

  const deadlineDate = new Date(deadline);

  if (Number.isNaN(deadlineDate.getTime())) {
    throw new Error("Invalid deadline");
  }

  const durationMs = Number(durationMinutes) * 60 * 1000;

  for (const block of freeBlocks) {
    const start = new Date(block.start);
    const blockEnd = new Date(block.end);
    const end = new Date(start.getTime() + durationMs);

    if (
      start < deadlineDate &&
      end <= blockEnd &&
      end <= deadlineDate
    ) {
      return { start, end };
    }
  }

  return null;
};

// Schedule a task without moving existing tasks
const scheduleTask = ({
  task,
  tasks,
  day,
  workingHours = DEFAULT_WORKING_HOURS,
}) => {
  const freeBlocks = getFreeBlocks(day, tasks, workingHours);

  const slot = findEarliestSlot(
    task.estimatedDuration,
    task.deadline,
    freeBlocks
  );

  if (!slot) {
    return {
      success: false,
      reason: "No available slot before the deadline",
      task: {
        ...task,
        status: "unscheduled",
        scheduledSlot: {
          start: null,
          end: null,
        },
      },
    };
  }

  return {
    success: true,
    message: "Task scheduled successfully",
    task: {
      ...task,
      status: "scheduled",
      scheduledSlot: slot,
    },
  };
};

// Schedule a task and attempt one-task conflict resolution
const scheduleWithConflictResolution = ({
  task,
  tasks,
  day,
  workingHours = DEFAULT_WORKING_HOURS,
}) => {
  // First, try normal scheduling
  const normalResult = scheduleTask({
    task,
    tasks,
    day,
    workingHours,
  });

  if (normalResult.success) {
    return {
      ...normalResult,
      updatedTasks: tasks,
      changes: [],
    };
  }

  const newPriority = PRIORITY_LEVELS[task.priority];

  if (!newPriority) {
    return {
      ...normalResult,
      reason: "Invalid task priority",
    };
  }

  const newDeadline = new Date(task.deadline);

  if (Number.isNaN(newDeadline.getTime())) {
    throw new Error("Invalid deadline");
  }

  // Find eligible lower-priority tasks
  const candidates = tasks
    .filter((existingTask) => {
      const existingPriority =
        PRIORITY_LEVELS[existingTask.priority];

      const existingDeadline = new Date(existingTask.deadline);

      return (
        existingTask.status === "scheduled" &&
        existingTask.scheduledSlot?.start &&
        existingTask.scheduledSlot?.end &&
        existingPriority &&
        existingPriority < newPriority &&
        !Number.isNaN(existingDeadline.getTime()) &&
        existingDeadline > newDeadline
      );
    })
    .sort((a, b) => {
      // Try the lowest-priority task first
      const priorityDifference =
        PRIORITY_LEVELS[a.priority] -
        PRIORITY_LEVELS[b.priority];

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      // If priorities match, try the later deadline first
      return new Date(b.deadline) - new Date(a.deadline);
    });

  // Try moving one eligible task at a time
  for (const candidate of candidates) {
    const remainingTasks = tasks.filter(
      (existingTask) => existingTask !== candidate
    );

    // Find a slot for the new task without the candidate
    const freeBlocks = getFreeBlocks(
      day,
      remainingTasks,
      workingHours
    );

    const newSlot = findEarliestSlot(
      task.estimatedDuration,
      task.deadline,
      freeBlocks
    );

    if (!newSlot) {
      continue;
    }

    const newScheduledTask = {
      ...task,
      status: "scheduled",
      scheduledSlot: newSlot,
    };

    // Calculate free blocks after placing the new task
    const blocksAfterNewTask = getFreeBlocks(
      day,
      [...remainingTasks, newScheduledTask],
      workingHours
    );

    // The displaced task must move to a later slot
    const originalStart = new Date(
      candidate.scheduledSlot.start
    );

    const laterBlocks = blocksAfterNewTask.filter(
      (block) => block.start > originalStart
    );

    const replacementSlot = findEarliestSlot(
      candidate.estimatedDuration,
      candidate.deadline,
      laterBlocks
    );

    if (!replacementSlot) {
      continue;
    }

    // Update the displaced task without mutating the input
    const updatedTasks = tasks.map((existingTask) => {
      if (existingTask !== candidate) {
        return existingTask;
      }

      return {
        ...existingTask,
        status: "scheduled",
        scheduledSlot: replacementSlot,
      };
    });

    return {
      success: true,
      message: "Task scheduled after resolving a conflict",
      task: newScheduledTask,
      updatedTasks,
      changes: [
        {
          task: candidate,
          previousSlot: candidate.scheduledSlot,
          newSlot: replacementSlot,
        },
      ],
    };
  }

  // No valid conflict resolution was found
  return {
    success: false,
    reason:
      "No available slot or valid conflict resolution before the deadline",
    task: {
      ...task,
      status: "unscheduled",
      scheduledSlot: {
        start: null,
        end: null,
      },
    },
    updatedTasks: tasks,
    changes: [],
  };
};

module.exports = {
  getFreeBlocks,
  findEarliestSlot,
  scheduleTask,
  scheduleWithConflictResolution,
};
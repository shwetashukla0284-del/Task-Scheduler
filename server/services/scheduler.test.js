
const {
  getFreeBlocks,
  findEarliestSlot,
  scheduleTask,
  scheduleWithConflictResolution,
} = require("./scheduler");

// Use local dates to match the scheduler's working hours.
const at = (hour, minute = 0, day = 30) =>
  new Date(2026, 8, day, hour, minute, 0, 0);

const makeTask = (overrides = {}) => ({
  _id: "task1",
  title: "Test task",
  estimatedDuration: 60,
  deadline: at(17),
  priority: "medium",
  status: "pending",
  scheduledSlot: { start: null, end: null },
  ...overrides,
});

const scheduledTask = (overrides = {}) => {
  const start = at(9);
  const end = at(10);

  return makeTask({
    status: "scheduled",
    scheduledSlot: { start, end },
    ...overrides,
  });
};

const workingHours = {
  start: "09:00",
  end: "12:00",
};

// Freeze time so tests are independent of the actual clock.
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(at(8));
});

afterEach(() => {
  jest.useRealTimers();
});

// ==========================================
// TEST 1: FREE TIME BLOCKS
// ==========================================

describe("getFreeBlocks", () => {
  test("returns the full working day when no tasks are scheduled", () => {
    const blocks = getFreeBlocks(at(0), [], workingHours);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].start).toEqual(at(9));
    expect(blocks[0].end).toEqual(at(12));
  });

  test("subtracts scheduled tasks from working hours", () => {
    const task = scheduledTask();

    const blocks = getFreeBlocks(at(0), [task], workingHours);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].start).toEqual(at(10));
    expect(blocks[0].end).toEqual(at(12));
  });

  test("returns multiple free blocks around scheduled tasks", () => {
    const tasks = [
      scheduledTask({
        _id: "1",
        scheduledSlot: {
          start: at(10),
          end: at(11),
        },
      }),
      scheduledTask({
        _id: "2",
        scheduledSlot: {
          start: at(9),
          end: at(9, 30),
        },
      }),
    ];

    const blocks = getFreeBlocks(at(0), tasks, workingHours);

    expect(blocks).toHaveLength(2);

    expect(blocks[0]).toEqual({
      start: at(9, 30),
      end: at(10),
    });

    expect(blocks[1]).toEqual({
      start: at(11),
      end: at(12),
    });
  });

  test("ignores pending tasks", () => {
    const task = makeTask({ status: "pending" });

    const blocks = getFreeBlocks(at(0), [task], workingHours);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].start).toEqual(at(9));
    expect(blocks[0].end).toEqual(at(12));
  });

  test("rejects invalid working hours", () => {
    expect(() =>
      getFreeBlocks(at(0), [], {
        start: "12:00",
        end: "09:00",
      })
    ).toThrow("Working hours must end after they start");
  });

  test("starts from the current time when scheduling today", () => {
    jest.setSystemTime(at(10, 30));

    const blocks = getFreeBlocks(at(0), [], workingHours);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].start).toEqual(at(10, 30));
    expect(blocks[0].end).toEqual(at(12));
  });

  test("does not return past time slots", () => {
    jest.setSystemTime(at(10));

    const blocks = getFreeBlocks(
      at(0),
      [
        scheduledTask({
          scheduledSlot: {
            start: at(9),
            end: at(9, 30),
          },
        }),
      ],
      workingHours
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0].start).toEqual(at(10));
    expect(blocks[0].end).toEqual(at(12));
  });

  test("returns no blocks for a past day", () => {
    jest.setSystemTime(at(10));

    const blocks = getFreeBlocks(
      at(0, 0, 29),
      [],
      workingHours
    );

    expect(blocks).toHaveLength(0);
  });

  test("returns no blocks when the working day has ended", () => {
    jest.setSystemTime(at(12));

    const blocks = getFreeBlocks(at(0), [], workingHours);

    expect(blocks).toHaveLength(0);
  });

  test("uses normal working hours for a future day", () => {
    jest.setSystemTime(at(10));

    const blocks = getFreeBlocks(
      at(0, 0, 31),
      [],
      workingHours
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0].start).toEqual(at(9, 0, 31));
    expect(blocks[0].end).toEqual(at(12, 0, 31));
  });
});

// ==========================================
// TEST 2: EARLIEST SLOT
// ==========================================

describe("findEarliestSlot", () => {
  test("finds the earliest slot that fits the duration", () => {
    const blocks = [
      { start: at(9), end: at(10) },
      { start: at(10, 30), end: at(12) },
    ];

    // The first block is too short for 90 minutes.
    const slot = findEarliestSlot(90, at(12), blocks);

    expect(slot).toEqual({
      start: at(10, 30),
      end: at(12),
    });
  });

  test("returns null when the task cannot fit before the deadline", () => {
    const blocks = [
      { start: at(9), end: at(10) },
    ];

    const slot = findEarliestSlot(120, at(12), blocks);

    expect(slot).toBeNull();
  });

  test("rejects zero duration", () => {
    expect(() =>
      findEarliestSlot(0, at(12), [])
    ).toThrow("Duration must be greater than zero");
  });
});

// ==========================================
// TEST 3: NORMAL TASK SCHEDULING
// ==========================================

describe("scheduleTask", () => {
  test("schedules a task in the earliest available slot", () => {
    const task = makeTask({
      estimatedDuration: 60,
    });

    const result = scheduleTask({
      task,
      tasks: [],
      day: at(0),
      workingHours,
    });

    expect(result.success).toBe(true);
    expect(result.task.status).toBe("scheduled");

    expect(result.task.scheduledSlot).toEqual({
      start: at(9),
      end: at(10),
    });
  });

  test("marks a task unscheduled if no slot is available", () => {
    const task = makeTask({
      estimatedDuration: 240,
      deadline: at(10),
    });

    const result = scheduleTask({
      task,
      tasks: [],
      day: at(0),
      workingHours,
    });

    expect(result.success).toBe(false);
    expect(result.task.status).toBe("unscheduled");

    expect(result.task.scheduledSlot).toEqual({
      start: null,
      end: null,
    });
  });

  test("does not schedule a task in the past", () => {
    jest.setSystemTime(at(10));

    const task = makeTask({
      estimatedDuration: 60,
      deadline: at(12),
    });

    const result = scheduleTask({
      task,
      tasks: [],
      day: at(0),
      workingHours,
    });

    expect(result.success).toBe(true);
    expect(result.task.scheduledSlot.start.getTime())
      .toBeGreaterThanOrEqual(Date.now());
  });

  test("does not schedule a task after working hours", () => {
    jest.setSystemTime(at(12));

    const task = makeTask({
      estimatedDuration: 30,
      deadline: at(17),
    });

    const result = scheduleTask({
      task,
      tasks: [],
      day: at(0),
      workingHours,
    });

    expect(result.success).toBe(false);
    expect(result.task.status).toBe("unscheduled");
  });
});

// ==========================================
// TEST 4: CONFLICT RESOLUTION
// ==========================================

describe("scheduleWithConflictResolution", () => {
  test("schedules normally without moving existing tasks", () => {
    const task = makeTask({
      estimatedDuration: 60,
    });

    const existing = scheduledTask();

    const result = scheduleWithConflictResolution({
      task,
      tasks: [existing],
      day: at(0),
      workingHours,
    });

    expect(result.success).toBe(true);

    expect(result.task.scheduledSlot).toEqual({
      start: at(10),
      end: at(11),
    });

    expect(result.changes).toHaveLength(0);
  });

  test("bumps a lower-priority task to schedule an urgent task", () => {
    const existing = scheduledTask({
      _id: "low-task",
      title: "Low priority task",
      estimatedDuration: 60,
      priority: "low",
      deadline: at(12),
    });

    const urgent = makeTask({
      _id: "urgent-task",
      title: "Urgent task",
      estimatedDuration: 60,
      priority: "urgent",
      deadline: at(10),
    });

    const result = scheduleWithConflictResolution({
      task: urgent,
      tasks: [existing],
      day: at(0),
      workingHours,
    });

    expect(result.success).toBe(true);

    expect(result.task.scheduledSlot).toEqual({
      start: at(9),
      end: at(10),
    });

    expect(result.updatedTasks[0].scheduledSlot).toEqual({
      start: at(10),
      end: at(11),
    });

    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].task).toBe(existing);
  });

  test("does not bump a task with equal priority", () => {
    const existing = scheduledTask({
      priority: "high",
      deadline: at(12),
    });

    const newTask = makeTask({
      estimatedDuration: 180,
      priority: "high",
      deadline: at(10),
    });

    const result = scheduleWithConflictResolution({
      task: newTask,
      tasks: [existing],
      day: at(0),
      workingHours,
    });

    expect(result.success).toBe(false);
    expect(result.changes).toHaveLength(0);
  });

  test("does not mutate the original task when bumping", () => {
    const existing = scheduledTask({
      priority: "low",
      deadline: at(12),
    });

    const originalSlot = {
      ...existing.scheduledSlot,
    };

    const urgent = makeTask({
      priority: "urgent",
      deadline: at(10),
    });

    scheduleWithConflictResolution({
      task: urgent,
      tasks: [existing],
      day: at(0),
      workingHours,
    });

    expect(existing.scheduledSlot).toEqual(originalSlot);
  });
});
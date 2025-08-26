const ProgressCalculator = require("../lib/progress-calc");

describe("ProgressCalculator", () => {
  let calculator;

  beforeEach(() => {
    calculator = new ProgressCalculator();
  });

  describe("calculateProgress", () => {
    it("should handle features without tasks", () => {
      const feature = { status: "active" };
      const progress = calculator.calculateProgress(feature);

      expect(progress).toEqual({
        completed: 0,
        total: 1,
        percentage: 0,
        countingSubtasks: false,
        itemType: "tasks",
        taskBreakdown: {
          mainTasks: 0,
          completedTasks: 0,
          totalSubtasks: 0,
          completedSubtasks: 0,
        },
      });
    });

    it("should handle done features without tasks", () => {
      const feature = { status: "done" };
      const progress = calculator.calculateProgress(feature);

      expect(progress).toEqual({
        completed: 1,
        total: 1,
        percentage: 100,
        countingSubtasks: false,
        itemType: "tasks",
        taskBreakdown: {
          mainTasks: 0,
          completedTasks: 0,
          totalSubtasks: 0,
          completedSubtasks: 0,
        },
      });
    });

    it("should calculate progress for pure task-based features", () => {
      const feature = {
        tasks: [
          { status: "complete" },
          { status: "complete" },
          { status: "in_progress" },
          { status: "ready" },
        ],
      };

      const progress = calculator.calculateProgress(feature);

      expect(progress).toEqual({
        completed: 2,
        total: 4,
        percentage: 50,
        countingSubtasks: false,
        itemType: "tasks",
        taskBreakdown: {
          mainTasks: 4,
          completedTasks: 2,
          totalSubtasks: 0,
          completedSubtasks: 0,
        },
      });
    });

    it("should calculate progress for pure subtask-based features", () => {
      const feature = {
        tasks: [
          {
            status: "in_progress",
            subtasks: [
              { completed: true },
              { completed: true },
              { completed: false },
            ],
          },
          {
            status: "ready",
            subtasks: [{ completed: false }, { completed: false }],
          },
        ],
      };

      const progress = calculator.calculateProgress(feature);

      expect(progress).toEqual({
        completed: 2,
        total: 5,
        percentage: 40,
        countingSubtasks: true,
        itemType: "subtasks",
        taskBreakdown: {
          mainTasks: 2,
          completedTasks: 0,
          totalSubtasks: 5,
          completedSubtasks: 2,
        },
      });
    });

    it("should calculate progress for mixed task and subtask features", () => {
      const feature = {
        tasks: [
          { status: "complete" }, // Complete task = 1 point
          {
            status: "in_progress",
            subtasks: [{ completed: true }, { completed: false }],
          }, // 50% complete = 0.5 points
          { status: "ready" }, // Incomplete task = 0 points
        ],
      };

      const progress = calculator.calculateProgress(feature);

      expect(progress).toEqual({
        completed: 2, // 1 + 0.5 rounded to 2
        total: 3,
        percentage: 50, // 1.5/3 = 50%
        countingSubtasks: false,
        itemType: "tasks",
        taskBreakdown: {
          mainTasks: 3,
          completedTasks: 1,
          totalSubtasks: 2,
          completedSubtasks: 1,
        },
      });
    });

    it("should handle empty tasks array", () => {
      const feature = { tasks: [] };
      const progress = calculator.calculateProgress(feature);

      expect(progress.total).toBe(1);
      expect(progress.completed).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it("should calculate 100% progress correctly", () => {
      const feature = {
        tasks: [{ status: "complete" }, { status: "complete" }],
      };

      const progress = calculator.calculateProgress(feature);

      expect(progress.percentage).toBe(100);
      expect(progress.completed).toBe(2);
      expect(progress.total).toBe(2);
    });

    it("should round progress values appropriately", () => {
      const feature = {
        tasks: [
          { status: "complete" },
          {
            status: "in_progress",
            subtasks: [
              { completed: true },
              { completed: false },
              { completed: false },
            ],
          }, // 1/3 complete = 0.333... points
          { status: "ready" },
        ],
      };

      const progress = calculator.calculateProgress(feature);

      // Should round to nearest integer
      expect(progress.completed).toBe(1); // 1 + 0.333 rounded to 1
      expect(progress.percentage).toBe(44); // 1.333/3 = 44.4% rounded to 44%
    });
  });

  describe("calculateOverallProgress", () => {
    it("should calculate progress across multiple features", () => {
      const features = [
        {
          tasks: [{ status: "complete" }, { status: "complete" }],
        },
        {
          tasks: [
            { status: "complete" },
            { status: "in_progress" },
            { status: "ready" },
          ],
        },
        { status: "done" }, // No tasks
      ];

      const progress = calculator.calculateOverallProgress(features);

      expect(progress).toEqual({
        completed: 4, // 2 + 1 + 1
        total: 6, // 2 + 3 + 1
        percentage: 67, // 4/6 = 66.7% rounded to 67%
      });
    });

    it("should handle empty features array", () => {
      const progress = calculator.calculateOverallProgress([]);

      expect(progress).toEqual({
        completed: 0,
        total: 0,
        percentage: 0,
      });
    });
  });

  describe("getNextAvailableTask", () => {
    it("should return first ready task", () => {
      const feature = {
        tasks: [
          { status: "complete", title: "Done Task" },
          { status: "ready", title: "Ready Task 1" },
          { status: "ready", title: "Ready Task 2" },
        ],
      };

      const nextTask = calculator.getNextAvailableTask(feature);

      expect(nextTask).toEqual({
        status: "ready",
        title: "Ready Task 1",
      });
    });

    it("should return null if no ready tasks", () => {
      const feature = {
        tasks: [
          { status: "complete" },
          { status: "in_progress" },
          { status: "blocked" },
        ],
      };

      const nextTask = calculator.getNextAvailableTask(feature);

      expect(nextTask).toBeNull();
    });

    it("should handle features without tasks", () => {
      const feature = {};
      const nextTask = calculator.getNextAvailableTask(feature);

      expect(nextTask).toBeNull();
    });
  });

  describe("getBlockedTasks", () => {
    it("should return all blocked tasks", () => {
      const feature = {
        tasks: [
          { status: "complete", title: "Done" },
          { status: "blocked", title: "Blocked 1" },
          { status: "ready", title: "Ready" },
          { status: "blocked", title: "Blocked 2" },
        ],
      };

      const blockedTasks = calculator.getBlockedTasks(feature);

      expect(blockedTasks).toHaveLength(2);
      expect(blockedTasks[0].title).toBe("Blocked 1");
      expect(blockedTasks[1].title).toBe("Blocked 2");
    });

    it("should return empty array if no blocked tasks", () => {
      const feature = {
        tasks: [{ status: "complete" }, { status: "ready" }],
      };

      const blockedTasks = calculator.getBlockedTasks(feature);

      expect(blockedTasks).toEqual([]);
    });
  });

  describe("getInProgressTasks", () => {
    it("should return all in-progress tasks", () => {
      const feature = {
        tasks: [
          { status: "complete", title: "Done" },
          { status: "in_progress", title: "Working 1" },
          { status: "ready", title: "Ready" },
          { status: "in_progress", title: "Working 2" },
        ],
      };

      const inProgressTasks = calculator.getInProgressTasks(feature);

      expect(inProgressTasks).toHaveLength(2);
      expect(inProgressTasks[0].title).toBe("Working 1");
      expect(inProgressTasks[1].title).toBe("Working 2");
    });
  });

  describe("getFeatureVelocity", () => {
    beforeEach(() => {
      // Mock Date to ensure consistent test results
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-31"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should calculate velocity from recent completions", () => {
      const features = [
        { status: "done", completedDate: "2024-01-30" }, // 1 day ago
        { status: "done", completedDate: "2024-01-25" }, // 6 days ago
        { status: "done", completedDate: "2024-01-15" }, // 16 days ago
        { status: "done", completedDate: "2024-01-01" }, // 30 days ago
        { status: "done", completedDate: "2023-12-01" }, // Too old
        { status: "active" }, // Not done
      ];

      const velocity = calculator.getFeatureVelocity(features, 30);

      expect(velocity).toEqual({
        featuresCompleted: 4,
        averagePerWeek: expect.closeTo(0.93, 1), // 4 features / 30 days * 7 days
        periodDays: 30,
      });
    });

    it("should handle features without completion dates", () => {
      const features = [
        { status: "done" }, // No completedDate
        { status: "done", completedDate: "2024-01-30" },
      ];

      const velocity = calculator.getFeatureVelocity(features, 30);

      expect(velocity.featuresCompleted).toBe(1);
    });

    it("should use default 30-day period", () => {
      const features = [{ status: "done", completedDate: "2024-01-30" }];

      const velocity = calculator.getFeatureVelocity(features);

      expect(velocity.periodDays).toBe(30);
    });
  });

  describe("estimateCompletionTime", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-31"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should estimate completion time based on velocity", () => {
      const features = [
        // Active features (incomplete)
        {
          status: "active",
          tasks: [
            { status: "complete" },
            { status: "ready" },
            { status: "ready" },
          ],
        },
        // Backlog features (all tasks needed)
        {
          status: "backlog",
          tasks: [{ status: "ready" }, { status: "ready" }],
        },
        // Historical data for velocity
        { status: "done", completedDate: "2024-01-30" },
        { status: "done", completedDate: "2024-01-20" },
        { status: "done", completedDate: "2024-01-10" },
      ];

      const estimate = calculator.estimateCompletionTime(features);

      expect(estimate).toEqual({
        activeTasks: 2, // 2 remaining tasks in active
        backlogTasks: 2, // 2 total tasks in backlog
        totalTasks: 4,
        estimatedWeeks: expect.any(Number),
        tasksPerWeek: expect.any(Number),
      });

      expect(estimate.estimatedWeeks).toBeGreaterThan(0);
    });

    it("should handle case with no historical data", () => {
      const features = [
        {
          status: "active",
          tasks: [{ status: "ready" }],
        },
      ];

      const estimate = calculator.estimateCompletionTime(features);

      expect(estimate).toEqual({
        activeTasks: 1,
        backlogTasks: 0,
        totalTasks: 1,
        estimatedWeeks: null,
        message: "No historical data for estimation",
      });
    });

    it("should calculate remaining tasks for active features", () => {
      const features = [
        {
          status: "active",
          tasks: [
            { status: "complete" },
            { status: "complete" },
            { status: "in_progress" },
            { status: "ready" },
            { status: "ready" },
          ],
        },
      ];

      const estimate = calculator.estimateCompletionTime(features);

      expect(estimate.activeTasks).toBe(3); // 3 non-complete tasks
    });

    it("should count all tasks for backlog features", () => {
      const features = [
        {
          status: "backlog",
          tasks: [
            { status: "ready" },
            { status: "ready" },
            { status: "ready" },
          ],
        },
      ];

      const estimate = calculator.estimateCompletionTime(features);

      expect(estimate.backlogTasks).toBe(3);
    });

    it("should handle features without tasks", () => {
      const features = [{ status: "active" }, { status: "backlog" }];

      const estimate = calculator.estimateCompletionTime(features);

      expect(estimate.activeTasks).toBe(1); // 1 item for active feature
      expect(estimate.backlogTasks).toBe(1); // 1 item for backlog feature
    });
  });

  describe("edge cases", () => {
    it("should handle null and undefined inputs gracefully", () => {
      expect(() => calculator.calculateProgress(null)).not.toThrow();
      expect(() => calculator.calculateProgress(undefined)).not.toThrow();
      expect(() => calculator.calculateOverallProgress(null)).not.toThrow();
      expect(() => calculator.getNextAvailableTask({})).not.toThrow();
    });

    it("should handle malformed task data", () => {
      const feature = {
        tasks: [
          { status: "complete" },
          { status: "invalid_status" },
          null,
          undefined,
          {},
        ],
      };

      expect(() => calculator.calculateProgress(feature)).not.toThrow();

      const progress = calculator.calculateProgress(feature);
      expect(progress.total).toBe(5);
      expect(progress.completed).toBe(1); // Only the complete task
    });

    it("should handle circular references safely", () => {
      const feature = {
        tasks: [{ status: "complete" }],
      };

      // Create circular reference
      feature.tasks[0].parent = feature;

      expect(() => calculator.calculateProgress(feature)).not.toThrow();
    });
  });
});

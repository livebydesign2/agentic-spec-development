class ProgressCalculator {
  calculateProgress(feature) {
    // Handle null/undefined feature
    if (!feature) {
      return {
        completed: 0,
        total: 1,
        percentage: 0,
        countingSubtasks: false,
        itemType: 'tasks',
        taskBreakdown: {
          mainTasks: 0,
          completedTasks: 0,
          totalSubtasks: 0,
          completedSubtasks: 0,
        },
      };
    }

    if (!feature.tasks || feature.tasks.length === 0) {
      // No tasks defined, assume based on status
      return {
        completed: feature.status === 'done' ? 1 : 0,
        total: 1,
        percentage: feature.status === 'done' ? 100 : 0,
        countingSubtasks: false,
        itemType: 'tasks', // Default to tasks for features without detailed breakdown
        taskBreakdown: {
          mainTasks: 0,
          completedTasks: 0,
          totalSubtasks: 0,
          completedSubtasks: 0,
        },
      };
    }

    // Calculate task breakdown for metadata (handle null tasks)
    const totalSubtasks = feature.tasks.reduce(
      (sum, t) => sum + (t && t.subtasks ? t.subtasks.length : 0),
      0
    );
    const tasksWithoutSubtasks = feature.tasks.filter(
      (t) => t && (!t.subtasks || t.subtasks.length === 0)
    ).length;
    // const _tasksWithSubtasks = feature.tasks.filter(
    //   (t) => t && t.subtasks && t.subtasks.length > 0,
    // ).length;
    const completedTasks = feature.tasks.filter(
      (t) => t && t.status === 'complete'
    ).length;
    const completedSubtasks = feature.tasks.reduce(
      (sum, t) =>
        sum +
        (t && t.subtasks
          ? t.subtasks.filter((s) => s && s.completed).length
          : 0),
      0
    );

    let totalItems = 0;
    let completedItems = 0;
    let countingSubtasks = false;

    // Universal progress calculation logic - works for all formats composably
    if (totalSubtasks === 0) {
      // Pure task-based counting (no subtasks anywhere)
      totalItems = feature.tasks.length;
      completedItems = completedTasks;
      countingSubtasks = false;
    } else if (tasksWithoutSubtasks === 0) {
      // Pure subtask-based counting (all tasks have subtasks)
      totalItems = totalSubtasks;
      completedItems = completedSubtasks;
      countingSubtasks = true;
    } else {
      // Mixed format: Prefer main task counting for better UX
      // This makes BUG-021 show "2 of 3 tasks" instead of "2 of 5 subtasks"
      totalItems = feature.tasks.length;

      // Calculate weighted completion for mixed format
      completedItems = feature.tasks.reduce((sum, task) => {
        if (task.status === 'complete') {
          return sum + 1; // Completed task = 1 point
        } else if (task.subtasks && task.subtasks.length > 0) {
          // Partially completed task based on subtask progress
          const subtaskProgress =
            task.subtasks.filter((s) => s.completed).length /
            task.subtasks.length;
          return sum + subtaskProgress;
        } else {
          return sum; // Incomplete task with no subtasks = 0 points
        }
      }, 0);

      countingSubtasks = false; // Display as tasks for cleaner UX
    }

    const percentage =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      completed: Math.round(completedItems), // Round for display
      total: totalItems,
      percentage,
      countingSubtasks,
      itemType: countingSubtasks ? 'subtasks' : 'tasks',
      taskBreakdown: {
        mainTasks: feature.tasks.length,
        completedTasks,
        totalSubtasks,
        completedSubtasks,
      },
    };
  }

  calculateOverallProgress(features) {
    // Handle null/undefined features array
    if (!features || !Array.isArray(features)) {
      return {
        completed: 0,
        total: 0,
        percentage: 0,
      };
    }

    let totalCompleted = 0;
    let totalTasks = 0;

    features.forEach((feature) => {
      const progress = this.calculateProgress(feature);
      totalCompleted += progress.completed;
      totalTasks += progress.total;
    });

    return {
      completed: totalCompleted,
      total: totalTasks,
      percentage:
        totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0,
    };
  }

  getNextAvailableTask(feature) {
    if (!feature || !feature.tasks) return null;

    return feature.tasks.find((task) => task.status === 'ready') || null;
  }

  getBlockedTasks(feature) {
    if (!feature || !feature.tasks) return [];

    return feature.tasks.filter((task) => task && task.status === 'blocked');
  }

  getInProgressTasks(feature) {
    if (!feature || !feature.tasks) return [];

    return feature.tasks.filter(
      (task) => task && task.status === 'in_progress'
    );
  }

  getFeatureVelocity(features, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentCompletions = features.filter((feature) => {
      if (feature.status !== 'done' || !feature.completedDate) return false;

      const completedDate = new Date(feature.completedDate);
      return completedDate >= cutoffDate;
    });

    return {
      featuresCompleted: recentCompletions.length,
      averagePerWeek: (recentCompletions.length / days) * 7,
      periodDays: days,
    };
  }

  estimateCompletionTime(features) {
    const activeTasks = features
      .filter((f) => f.status === 'active')
      .reduce((total, feature) => {
        const progress = this.calculateProgress(feature);
        return total + (progress.total - progress.completed);
      }, 0);

    const backlogTasks = features
      .filter((f) => f.status === 'backlog')
      .reduce((total, feature) => {
        const progress = this.calculateProgress(feature);
        return total + progress.total;
      }, 0);

    const velocity = this.getFeatureVelocity(features);
    const tasksPerWeek = velocity.averagePerWeek * 3; // Assume 3 tasks per feature on average

    if (tasksPerWeek <= 0) {
      return {
        activeTasks,
        backlogTasks,
        totalTasks: activeTasks + backlogTasks,
        estimatedWeeks: null,
        message: 'No historical data for estimation',
      };
    }

    const estimatedWeeks = Math.ceil(
      (activeTasks + backlogTasks) / tasksPerWeek
    );

    return {
      activeTasks,
      backlogTasks,
      totalTasks: activeTasks + backlogTasks,
      estimatedWeeks,
      tasksPerWeek: Math.round(tasksPerWeek * 10) / 10,
    };
  }
}

module.exports = ProgressCalculator;

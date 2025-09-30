export interface ActivityItem {
  id: string;
  type: string;
  action: string;
  details: string;
  timestamp: Date;
  severity: 'success' | 'info' | 'warning' | 'error';
}

export interface ActivityTransformConfig<T> {
  type: string;
  action: string;
  severity: 'success' | 'info' | 'warning' | 'error';
  getDetails: (item: T) => string;
  getId?: (item: T) => string;
}

/**
 * Utility for transforming various entities into standardized activity items
 */
export class ActivityTransformService {
  /**
   * Transform an array of entities into activity items
   */
  static transformToActivities<T extends { id: string; createdAt: Date }>(
    items: T[],
    config: ActivityTransformConfig<T>,
  ): ActivityItem[] {
    return items.map((item) => ({
      id: config.getId ? config.getId(item) : `${config.type}-${item.id}`,
      type: config.type,
      action: config.action,
      details: config.getDetails(item),
      timestamp: item.createdAt,
      severity: config.severity,
    }));
  }

  /**
   * Transform multiple entity arrays into combined activity list
   */
  static combineActivities(...activityArrays: ActivityItem[][]): ActivityItem[] {
    return activityArrays
      .flat()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Add time ago information to activities
   */
  static addTimeAgo(activities: ActivityItem[]): Array<ActivityItem & { timeAgo: string }> {
    return activities.map((activity) => ({
      ...activity,
      timeAgo: this.getTimeAgo(activity.timestamp),
    }));
  }

  /**
   * Calculate time ago string from date
   */
  private static getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  /**
   * Limit activities to a specific count
   */
  static limitActivities<T extends ActivityItem>(activities: T[], limit: number): T[] {
    return activities.slice(0, limit);
  }
}

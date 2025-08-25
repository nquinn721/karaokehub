import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';

export interface CancellableTask {
  id: string;
  type: 'worker' | 'browser' | 'parsing' | 'timeout';
  resource: Worker | any;
  description: string;
  startTime: Date;
}

@Injectable()
export class CancellationService extends EventEmitter {
  private readonly logger = new Logger(CancellationService.name);
  private isCancelled = false;
  private activeTasks = new Map<string, CancellableTask>();
  private activeTimeouts = new Set<NodeJS.Timeout>();

  /**
   * Register a task for potential cancellation
   */
  registerTask(task: CancellableTask): void {
    this.activeTasks.set(task.id, task);
    this.logger.log(`📝 Registered ${task.type}: ${task.description}`);
  }

  /**
   * Unregister a completed task
   */
  unregisterTask(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (task) {
      this.activeTasks.delete(taskId);
      this.logger.log(`✅ Unregistered ${task.type}: ${task.description}`);
    }
  }

  /**
   * Register a timeout for cancellation
   */
  registerTimeout(timeout: NodeJS.Timeout): void {
    this.activeTimeouts.add(timeout);
  }

  /**
   * Clear a specific timeout
   */
  clearTimeout(timeout: NodeJS.Timeout): void {
    clearTimeout(timeout);
    this.activeTimeouts.delete(timeout);
  }

  /**
   * Cancel ALL active operations immediately
   */
  async cancelAll(): Promise<void> {
    this.logger.warn('🛑 EMERGENCY SHUTDOWN - Cancelling all operations...');
    this.isCancelled = true;

    const startTime = Date.now();
    const totalTasks = this.activeTasks.size + this.activeTimeouts.size;

    // Emit global cancellation event
    this.emit('cancel-all');

    // Cancel all timeouts
    this.logger.log(`⏰ Clearing ${this.activeTimeouts.size} active timeouts...`);
    for (const timeout of this.activeTimeouts) {
      clearTimeout(timeout);
    }
    this.activeTimeouts.clear();

    // Cancel all registered tasks
    this.logger.log(`🔄 Terminating ${this.activeTasks.size} active tasks...`);
    const terminationPromises: Promise<void>[] = [];

    for (const [taskId, task] of this.activeTasks) {
      terminationPromises.push(this.terminateTask(task));
    }

    // Wait for all terminations to complete (with timeout)
    try {
      await Promise.race([
        Promise.all(terminationPromises),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Termination timeout')), 5000),
        ),
      ]);
    } catch (error) {
      this.logger.error('⚠️ Some tasks failed to terminate gracefully, forcing shutdown');
    }

    this.activeTasks.clear();

    const elapsed = Date.now() - startTime;
    this.logger.warn(
      `✅ Emergency shutdown complete in ${elapsed}ms. Terminated ${totalTasks} operations.`,
    );
  }

  /**
   * Terminate a specific task
   */
  private async terminateTask(task: CancellableTask): Promise<void> {
    try {
      switch (task.type) {
        case 'worker':
          if (task.resource && typeof task.resource.terminate === 'function') {
            await task.resource.terminate();
            this.logger.log(`💀 Terminated worker: ${task.description}`);
          }
          break;

        case 'browser':
          if (task.resource && typeof task.resource.close === 'function') {
            if (!task.resource.isClosed || !task.resource.isClosed()) {
              await task.resource.close();
              this.logger.log(`🌐 Closed browser: ${task.description}`);
            }
          }
          break;

        case 'parsing':
          // For parsing operations, we just emit an event and let the parser handle it
          this.emit('cancel-parsing', task.id);
          this.logger.log(`⛔ Cancelled parsing: ${task.description}`);
          break;

        case 'timeout':
          if (task.resource) {
            clearTimeout(task.resource);
            this.logger.log(`⏰ Cleared timeout: ${task.description}`);
          }
          break;

        default:
          this.logger.warn(`❓ Unknown task type: ${task.type}`);
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to terminate ${task.type} '${task.description}':`,
        error.message,
      );
    }
  }

  /**
   * Check if cancellation has been requested
   */
  isCancellationRequested(): boolean {
    return this.isCancelled;
  }

  /**
   * Reset cancellation state (for new operations)
   */
  reset(): void {
    this.isCancelled = false;
    this.activeTasks.clear();
    this.activeTimeouts.clear();
    this.removeAllListeners();
    this.logger.log('🔄 Cancellation service reset');
  }

  /**
   * Get current status
   */
  getStatus() {
    const tasks = Array.from(this.activeTasks.values()).map((task) => ({
      id: task.id,
      type: task.type,
      description: task.description,
      duration: Date.now() - task.startTime.getTime(),
    }));

    return {
      isCancelled: this.isCancelled,
      activeTasks: tasks.length,
      activeTimeouts: this.activeTimeouts.size,
      tasks,
    };
  }

  /**
   * Create a cancellable timeout
   */
  createCancellableTimeout(
    callback: () => void,
    delay: number,
    description: string,
  ): NodeJS.Timeout {
    const timeout = setTimeout(() => {
      this.activeTimeouts.delete(timeout);
      if (!this.isCancelled) {
        callback();
      }
    }, delay);

    this.activeTimeouts.add(timeout);
    this.logger.log(`⏰ Created cancellable timeout: ${description} (${delay}ms)`);

    return timeout;
  }

  /**
   * Utility method to check for cancellation in loops
   */
  throwIfCancelled(context?: string): void {
    if (this.isCancelled) {
      const message = context ? `Operation cancelled in ${context}` : 'Operation cancelled';
      throw new Error(message);
    }
  }
}

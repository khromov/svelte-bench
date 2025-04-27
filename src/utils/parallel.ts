/**
 * Run an array of tasks in parallel with a concurrency limit
 * @param tasks Array of functions that return promises
 * @param concurrencyLimit Maximum number of tasks to run in parallel
 * @returns Promise that resolves when all tasks are complete
 */
export async function runWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrencyLimit: number
): Promise<T[]> {
  const results: T[] = [];
  const runningTasks = new Set<Promise<void>>();
  
  // Create a queue of tasks
  const taskQueue = [...tasks];
  
  // Process the next task in the queue
  async function processNext(): Promise<void> {
    if (taskQueue.length === 0) return;
    
    const task = taskQueue.shift()!;
    const taskPromise = (async () => {
      try {
        const result = await task();
        results.push(result);
      } catch (error) {
        console.error("Task error:", error);
        throw error;
      } finally {
        runningTasks.delete(taskPromise);
        await processNext();
      }
    })();
    
    runningTasks.add(taskPromise);
    await taskPromise;
  }
  
  // Start initial batch of tasks up to concurrency limit
  const initialBatch = Math.min(concurrencyLimit, tasks.length);
  const initialPromises = [];
  
  for (let i = 0; i < initialBatch; i++) {
    initialPromises.push(processNext());
  }
  
  // Wait for all tasks to complete
  await Promise.all(initialPromises);
  await Promise.all(runningTasks);
  
  return results;
}

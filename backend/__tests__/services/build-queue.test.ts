const BuildQueue = require('../../src/services/BuildQueue').default;

describe('BuildQueue', () => {
  let queue;
  let executor;

  beforeEach(() => {
    executor = { execute: jest.fn().mockResolvedValue(undefined) };
    queue = new BuildQueue(2);
  });

  describe('enqueue', () => {
    it('should start executing immediately if not full', () => {
      queue.enqueue('b1', { id: 'b1' }, { id: 'p1' }, executor);

      expect(executor.execute).toHaveBeenCalled();
      expect(queue.running.size).toBe(1);
      expect(queue.queue.length).toBe(0);
    });

    it('should queue builds when at max concurrency', () => {
      queue.enqueue('b1', { id: 'b1' }, { id: 'p1' }, executor);
      queue.enqueue('b2', { id: 'b2' }, { id: 'p1' }, executor);
      const result = queue.enqueue('b3', { id: 'b3' }, { id: 'p1' }, executor);

      expect(result.queued).toBe(true);
      expect(result.position).toBe(1);
      expect(queue.running.size).toBe(2);
      expect(queue.queue.length).toBe(1);
    });
  });

  describe('cancel', () => {
    it('should remove a queued build', () => {
      queue.enqueue('b1', { id: 'b1' }, { id: 'p1' }, executor);
      queue.enqueue('b2', { id: 'b2' }, { id: 'p1' }, executor);
      queue.enqueue('b3', { id: 'b3' }, { id: 'p1' }, executor);

      const cancelled = queue.cancel('b3');
      expect(cancelled).toBe(true);
      expect(queue.queue.length).toBe(0);
    });

    it('should return false for non-existent build', () => {
      const cancelled = queue.cancel('non-existent');
      expect(cancelled).toBe(false);
    });
  });

  describe('queue management', () => {
    it('should track running count', () => {
      queue.enqueue('b1', { id: 'b1' }, { id: 'p1' }, executor);
      expect(queue.getRunningCount()).toBe(1);
    });

    it('should track queue length', () => {
      queue.enqueue('b1', { id: 'b1' }, { id: 'p1' }, executor);
      queue.enqueue('b2', { id: 'b2' }, { id: 'p1' }, executor);
      queue.enqueue('b3', { id: 'b3' }, { id: 'p1' }, executor);

      expect(queue.getQueueLength()).toBe(1);
    });

    it('should report full when at max', () => {
      queue.enqueue('b1', { id: 'b1' }, { id: 'p1' }, executor);
      queue.enqueue('b2', { id: 'b2' }, { id: 'p1' }, executor);

      expect(queue.isFull()).toBe(true);
    });
  });

  describe('setMaxConcurrent', () => {
    it('should update max concurrent', () => {
      queue.setMaxConcurrent(5);
      expect(queue.getMaxConcurrent()).toBe(5);
    });
  });
});

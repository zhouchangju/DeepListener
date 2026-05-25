export interface ReviewQueueState<T> {
  items: T[];
  currentIndex: number;
}

export interface ReviewQueueTransition<T> extends ReviewQueueState<T> {
  completed: boolean;
}

export function removeCurrentReviewItem<T>({ items, currentIndex }: ReviewQueueState<T>): ReviewQueueTransition<T> {
  if (items.length === 0) {
    return { items, currentIndex: 0, completed: true };
  }

  const nextItems = items.filter((_, index) => index !== currentIndex);
  const nextIndex = Math.min(currentIndex, Math.max(0, nextItems.length - 1));

  return {
    items: nextItems,
    currentIndex: nextIndex,
    completed: nextItems.length === 0,
  };
}

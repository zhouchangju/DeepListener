import { useRef, useCallback } from "react";

export function useAutoScroll() {
  const isUserScrolling = useRef(false);
  const userScrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const onListScroll = useCallback(() => {
    isUserScrolling.current = true;
    if (userScrollTimeout.current) clearTimeout(userScrollTimeout.current);
    userScrollTimeout.current = setTimeout(() => {
      isUserScrolling.current = false;
    }, 2000);
  }, []);

  const scrollToItem = useCallback((index: number, force: boolean) => {
    if (!listContainerRef.current) return;
    
    // Skip if user is scrolling manually (unless forced)
    if (!force && isUserScrolling.current) return;

    requestAnimationFrame(() => {
      const container = listContainerRef.current!;
      const el = document.getElementById(`sentence-${index}`);
      if (el) {
        const top = el.offsetTop - container.offsetTop;
        const targetScroll = top - (container.clientHeight / 2) + (el.clientHeight / 2);
        container.scrollTo({ top: targetScroll, behavior: "smooth" });
      }
    });
  }, []);

  return { listContainerRef, onListScroll, scrollToItem };
}

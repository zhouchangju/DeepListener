interface PlayerControlsStateInput {
  isPlaying: boolean;
  isReady: boolean;
  duration: number | undefined;
}

export function getPlayerControlsState({
  isPlaying,
  isReady,
  duration,
}: PlayerControlsStateInput) {
  return {
    isPlaying,
    duration: isReady ? duration || 0 : 0,
  };
}

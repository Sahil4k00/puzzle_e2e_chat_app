import { useEffect, useState } from "react";

export function useCountdown(initialSeconds, isActive) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isActive || secondsLeft <= 0) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setSecondsLeft((currentValue) => Math.max(currentValue - 1, 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isActive, secondsLeft]);

  return secondsLeft;
}
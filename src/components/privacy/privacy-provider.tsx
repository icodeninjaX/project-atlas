"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

type PrivacyContextValue = {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
  toggle: () => void;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

function storageKey(userId: string) {
  return `atlas:privacy-mode:${userId}`;
}

export function PrivacyProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [hidden, setHiddenState] = useState(false);

  useLayoutEffect(() => {
    const saved = window.localStorage.getItem(storageKey(userId)) === "hidden";
    queueMicrotask(() => setHiddenState(saved));
    document.documentElement.dataset.atlasPrivacy = saved
      ? "hidden"
      : "visible";
  }, [userId]);

  const setHidden = useCallback(
    (nextHidden: boolean) => {
      setHiddenState(nextHidden);
      window.localStorage.setItem(
        storageKey(userId),
        nextHidden ? "hidden" : "visible",
      );
      document.documentElement.dataset.atlasPrivacy = nextHidden
        ? "hidden"
        : "visible";
    },
    [userId],
  );

  const value = useMemo(
    () => ({ hidden, setHidden, toggle: () => setHidden(!hidden) }),
    [hidden, setHidden],
  );

  return (
    <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
  );
}

export function usePrivacyMode() {
  return (
    useContext(PrivacyContext) ?? {
      hidden: false,
      setHidden: () => undefined,
      toggle: () => undefined,
    }
  );
}

export function SensitiveValue({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { hidden } = usePrivacyMode();

  return (
    <span
      className={className}
      aria-label={hidden ? "Hidden sensitive value" : undefined}
    >
      {hidden ? (
        <span aria-hidden="true" className="tracking-[0.18em]">
          ••••••
        </span>
      ) : (
        children
      )}
    </span>
  );
}

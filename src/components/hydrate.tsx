import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { useAppStore } from "@/lib/store";

export function Hydrate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const result = useAppStore.persist.rehydrate();
    void Promise.resolve(result).then(() => {
      useAppStore.setState({ hydrated: true });
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-fg">
        <Logo className="text-lg opacity-80" />
      </div>
    );
  }

  return children;
}

import { useRouter } from "next/router";
import { useEffect } from "react";

import { useAuth } from "../hooks/useAuth";

export default function HomePage() {
  const router = useRouter();
  const { ready, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!ready) {
      return;
    }

    router.replace(isAuthenticated ? "/dashboard" : "/login");
  }, [ready, isAuthenticated, router]);

  return <div className="min-h-screen" />;
}
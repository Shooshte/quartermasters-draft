import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { trpc } from "~/lib/trpc";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const [health, setHealth] = useState<string>("loading...");

  useEffect(() => {
    trpc.health.check.query().then((res) => setHealth(res.status));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">Quartermasters Draft</h1>
      <p className="text-muted-foreground">API Status: {health}</p>
      <Button>Get Started</Button>
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/play")({
  component: PlayPage,
});

function PlayPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">Play</h1>
    </main>
  );
}

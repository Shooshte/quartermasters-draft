import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/replay/$id")({
  component: ReplayPage,
});

function ReplayPage() {
  const { id } = Route.useParams();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">Replay</h1>
      <p className="text-muted-foreground">Game: {id}</p>
    </main>
  );
}

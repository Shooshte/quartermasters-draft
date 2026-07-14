import { createFileRoute, redirect } from "@tanstack/react-router";
import { BattleWorkbench } from "~/components/battle/battle-workbench";
import { canAccessRoute } from "~/lib/route-utils";

export const Route = createFileRoute("/_authenticated/replay/$id")({
  beforeLoad: ({ context }) => {
    if (!canAccessRoute(context.userRole, "/replay")) {
      throw redirect({ to: "/403", search: { notice: undefined } });
    }
  },
  component: ReplayPage,
});

function ReplayPage() {
  const { id } = Route.useParams();
  return <BattleWorkbench replayId={id} />;
}

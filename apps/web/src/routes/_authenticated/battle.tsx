import { createFileRoute, redirect } from "@tanstack/react-router";
import { BattleWorkbench } from "~/components/battle/battle-workbench";
import { canAccessRoute } from "~/lib/route-utils";

export const Route = createFileRoute("/_authenticated/battle")({
  beforeLoad: ({ context }) => {
    if (!canAccessRoute(context.userRole, "/battle")) {
      throw redirect({ to: "/403", search: { notice: undefined } });
    }
  },
  component: BattleWorkbench,
});

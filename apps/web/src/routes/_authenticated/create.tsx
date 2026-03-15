import { createFileRoute, redirect } from "@tanstack/react-router";
import { canAccessRoute } from "~/lib/route-utils";
import { CreatePage } from "~/components/create/create-page";

export const Route = createFileRoute("/_authenticated/create")({
  validateSearch: (search: Record<string, unknown>) => ({
    scenario_id:
      typeof search.scenario_id === "string" ? search.scenario_id : undefined,
    entity_id:
      typeof search.entity_id === "string" ? search.entity_id : undefined,
    effect_id:
      typeof search.effect_id === "string" ? search.effect_id : undefined,
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (!canAccessRoute(context.userRole, "/create")) {
      throw redirect({ to: "/403" });
    }
  },
  component: CreatePageRoute,
});

function CreatePageRoute() {
  const search = Route.useSearch();
  return <CreatePage search={search} />;
}

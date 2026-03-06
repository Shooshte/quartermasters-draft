import { createFileRoute, redirect } from "@tanstack/react-router";
import { getDefaultRoute } from "~/lib/route-utils";

export const Route = createFileRoute("/_authenticated/")({
  beforeLoad: ({ context }) => {
    const { userRole } = context;
    throw redirect({ to: getDefaultRoute(userRole) });
  },
  component: () => null,
});

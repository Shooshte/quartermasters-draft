import { RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import { getRouter } from "./router";
import "./styles/app.css";
const router = getRouter();
function revalidateSession() {
  router.options.context.queryClient.clear();
  void router.invalidate();
}
window.addEventListener("qd:session-changed", revalidateSession);
window.addEventListener("qd:authorization-failure", revalidateSession);
const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing.");
createRoot(root).render(<RouterProvider router={router} />);

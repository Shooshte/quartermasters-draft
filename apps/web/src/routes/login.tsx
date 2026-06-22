import { UserRole } from "@qd/shared";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/lib/auth-client";
import { getRedirectTarget, getUserRole, mapDbRole } from "~/lib/route-utils";

type LoginSearch = {
  next?: string;
  reason?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    next: typeof search.next === "string" ? search.next : undefined,
    reason: typeof search.reason === "string" ? search.reason : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { next, reason } = useSearch({ from: "/login" });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: session, isPending: sessionLoading } = authClient.useSession();

  // Redirect already-authenticated users
  useEffect(() => {
    if (sessionLoading || !session?.user) return;
    const dbRole = getUserRole(session.user);
    const role = mapDbRole(dbRole) ?? UserRole.PLAYER;
    const target = getRedirectTarget(role, next);
    if (target.notice) {
      const url = new URL(target.path, window.location.origin);
      url.searchParams.set("notice", target.notice);
      window.location.assign(url.toString());
    } else {
      navigate({ to: target.path });
    }
  }, [session, sessionLoading, next, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
        rememberMe,
      });

      if (result.error) {
        setError("Invalid credentials");
        setIsSubmitting(false);
        return;
      }

      // Fetch the session to get user role
      const sessionResult = await authClient.getSession();

      if (!sessionResult.data?.user) {
        setError("Invalid credentials");
        setIsSubmitting(false);
        return;
      }

      const dbRole = getUserRole(sessionResult.data.user);
      const role = mapDbRole(dbRole) ?? UserRole.PLAYER;
      const target = getRedirectTarget(role, next);

      if (target.notice) {
        const url = new URL(target.path, window.location.origin);
        url.searchParams.set("notice", target.notice);
        window.location.assign(url.toString());
      } else {
        navigate({ to: target.path });
      }
    } catch {
      setError("Invalid credentials");
      setIsSubmitting(false);
    }
  }

  // Don't render form while checking session or if already authenticated
  if (sessionLoading || session?.user) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_center,oklch(0.22_0.015_60)_0%,oklch(0.17_0.01_60)_70%)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Log in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <Label htmlFor="remember" className="text-sm font-normal">
                Remember me
              </Label>
            </div>

            {reason === "expired" && (
              <p className="text-sm text-muted-foreground">
                Session expired, please log in to continue
              </p>
            )}

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

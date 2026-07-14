import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { trpc } from "~/lib/trpc";
import { BattleResultView } from "./battle-result";
import { type BattleSetup, BattleSetupForm } from "./battle-setup-form";

interface BattleWorkbenchProps {
  replayId?: string;
}

const emptySetup: BattleSetup = {
  scenarioAId: "",
  scenarioBId: "",
  seed: "",
};

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  return fallback;
}

export function BattleWorkbench({ replayId }: BattleWorkbenchProps) {
  const navigate = useNavigate();
  const [setup, setSetup] = useState<BattleSetup>(emptySetup);
  const initializedReplayId = useRef<string | undefined>(undefined);
  const createPending = useRef(false);

  const optionsQuery = useQuery({
    queryKey: ["battleLab", "scenarioOptions"],
    queryFn: () => trpc.battleLab.scenarioOptions.query(),
  });

  const replayQuery = useQuery({
    queryKey: ["battleLab", "replay", replayId],
    queryFn: () => {
      if (!replayId) throw new Error("Replay ID is required.");
      return trpc.battleLab.get.query({ id: replayId });
    },
    enabled: Boolean(replayId),
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (!replayId) {
      initializedReplayId.current = undefined;
      return;
    }

    if (
      replayQuery.data &&
      !replayQuery.isFetching &&
      !replayQuery.isError &&
      initializedReplayId.current !== replayId
    ) {
      setSetup({
        scenarioAId: replayQuery.data.replay.scenarioAId,
        scenarioBId: replayQuery.data.replay.scenarioBId,
        seed: replayQuery.data.replay.seed,
      });
      initializedReplayId.current = replayId;
    }
  }, [replayId, replayQuery.data, replayQuery.isError, replayQuery.isFetching]);

  const createReplay = useMutation({
    mutationFn: (input: BattleSetup) => trpc.battleLab.create.mutate(input),
    onSuccess: ({ replay }) => {
      navigate({
        to: "/replay/$id",
        params: { id: replay.id },
        search: { notice: undefined },
      });
    },
    onSettled: () => {
      createPending.current = false;
    },
  });

  function handleSubmit(input: BattleSetup) {
    if (createPending.current || createReplay.isPending) return;

    createPending.current = true;
    createReplay.mutate(input);
  }

  const replayRefreshing = Boolean(replayId) && replayQuery.isFetching;

  return (
    <div className="mx-auto w-full max-w-[96rem] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-2 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[10px] tracking-[0.22em] text-primary uppercase">
            Quartermaster&apos;s testing ledger
          </p>
          <h1 className="text-2xl font-semibold sm:text-3xl">Battle lab</h1>
        </div>
        <p className="max-w-xl text-sm leading-5 text-muted-foreground sm:text-right">
          Configure a reproducible matchup, resolve it, and inspect every recorded state change.
        </p>
      </header>

      {optionsQuery.isPending ? (
        <Card className="border-dashed">
          <CardContent className="py-4 text-sm text-muted-foreground" aria-live="polite">
            Loading battle lab…
          </CardContent>
        </Card>
      ) : optionsQuery.isError ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm"
        >
          {errorMessage(optionsQuery.error, "Scenario options could not be loaded.")}
        </p>
      ) : replayRefreshing ? (
        <Card className="border-dashed border-primary/25 bg-primary/[0.035]">
          <CardContent className="py-4 text-sm text-muted-foreground" aria-live="polite">
            Regenerating battle result…
          </CardContent>
        </Card>
      ) : (
        <>
          {replayQuery.isError ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm"
            >
              {errorMessage(replayQuery.error, "Replay could not be loaded.")}
            </p>
          ) : null}

          <Card className="gap-4 border-primary/15 bg-card/80 py-0">
            <CardHeader className="border-b border-border/70 px-5 py-4 sm:px-6">
              <div>
                <p className="mb-1 text-[10px] tracking-[0.18em] text-primary/80 uppercase">
                  Matchup definition
                </p>
                <h2 className="text-base font-semibold">Scenario A versus Scenario B</h2>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
              <BattleSetupForm
                options={optionsQuery.data ?? []}
                value={setup}
                onChange={setSetup}
                onSubmit={handleSubmit}
                pending={createReplay.isPending}
                error={
                  createReplay.isError
                    ? errorMessage(createReplay.error, "Battle could not be resolved.")
                    : undefined
                }
              />
            </CardContent>
          </Card>

          {replayQuery.data && !replayQuery.isError ? (
            <>
              <p className="border-l-2 border-primary/50 pl-3 text-sm text-muted-foreground">
                Results use the latest scenario versions.
              </p>
              <BattleResultView
                scenarios={replayQuery.data.scenarios}
                result={replayQuery.data.result}
              />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

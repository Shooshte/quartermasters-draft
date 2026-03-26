import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "~/lib/trpc";
import { SPELLS_PAGE_SIZE, createIdleWorkspace } from "../types";
import type { WorkspaceState } from "../types";

interface UseDeleteSpellDialogOptions {
  entityWorkspace: WorkspaceState;
  setEntityWorkspace: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  setPerTabSelection: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
  skipEntityResetRef: React.MutableRefObject<boolean>;
  navigate?: any;
  spellTotalCount: number;
  spellPage: number;
  setSpellPage: (page: number) => void;
}

export function useDeleteSpellDialog({
  entityWorkspace,
  setEntityWorkspace,
  setPerTabSelection,
  skipEntityResetRef,
  navigate,
  spellTotalCount,
  spellPage,
  setSpellPage,
}: UseDeleteSpellDialogOptions) {
  const queryClient = useQueryClient();
  const [isDeleteSpellDialogOpen, setIsDeleteSpellDialogOpen] = useState(false);
  const [deleteSpellTarget, setDeleteSpellTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteSpellError, setDeleteSpellError] = useState<string | null>(null);

  const requestDeleteSpell = useCallback((id: string, name: string) => {
    setDeleteSpellTarget({ id, name });
    setIsDeleteSpellDialogOpen(true);
  }, []);

  const confirmDeleteSpell = useCallback(async () => {
    if (!deleteSpellTarget) return;
    try {
      setDeleteSpellError(null);
      await trpc.scenarioBuilder.spells.delete.mutate({ id: deleteSpellTarget.id });

      if (entityWorkspace.entityId === deleteSpellTarget.id) {
        setEntityWorkspace(createIdleWorkspace());
        setPerTabSelection((prev) => ({ ...prev, Spells: null }));
        skipEntityResetRef.current = true;
        navigate?.({
          search: (prev: Record<string, unknown>) => {
            const next = { ...prev };
            delete next.spell_id;
            return next;
          },
          replace: true,
        });
      }

      await queryClient.invalidateQueries({
        queryKey: ["scenarioBuilder", "spells", "list"],
      });

      const newTotalCount = spellTotalCount - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotalCount / SPELLS_PAGE_SIZE));
      if (spellPage > newTotalPages) {
        setSpellPage(newTotalPages);
      }

      setDeleteSpellTarget(null);
      setIsDeleteSpellDialogOpen(false);
    } catch {
      setDeleteSpellError("Failed to delete spell. Please try again.");
    }
  }, [deleteSpellTarget, entityWorkspace.entityId, navigate, queryClient, spellTotalCount, spellPage, setEntityWorkspace, setPerTabSelection, skipEntityResetRef, setSpellPage]);

  const cancelDeleteSpell = useCallback(() => {
    setDeleteSpellTarget(null);
    setIsDeleteSpellDialogOpen(false);
    setDeleteSpellError(null);
  }, []);

  return {
    isDeleteSpellDialogOpen,
    deleteSpellTarget,
    deleteSpellError,
    requestDeleteSpell,
    confirmDeleteSpell,
    cancelDeleteSpell,
  };
}

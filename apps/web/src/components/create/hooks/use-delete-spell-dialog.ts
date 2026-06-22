import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { trpc } from "~/lib/trpc";
import type { CreatePageNavigate, WorkspaceState } from "../types";
import { createIdleWorkspace, SPELLS_PAGE_SIZE } from "../types";

interface UseDeleteSpellDialogOptions {
  entityWorkspace: WorkspaceState;
  setEntityWorkspace: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  setPerTabSelection: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
  skipEntityResetRef: React.MutableRefObject<boolean>;
  navigate?: CreatePageNavigate;
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
  const [deleteSpellTarget, setDeleteSpellTarget] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [deleteSpellError, setDeleteSpellError] = useState<string | null>(null);

  const requestDeleteSpell = useCallback((id: string, name: string) => {
    setDeleteSpellTarget({ id, name });
    setIsDeleteSpellDialogOpen(true);
  }, []);

  const isLinkedItemConflict = useCallback((error: unknown) => {
    if (
      error instanceof Error &&
      error.message.includes("Cannot delete spell while it is linked")
    ) {
      return true;
    }

    if (typeof error !== "object" || error === null) {
      return false;
    }

    const maybeTrpcError = error as {
      data?: { code?: string };
      shape?: { message?: string; data?: { code?: string } };
    };

    return (
      maybeTrpcError.data?.code === "CONFLICT" ||
      maybeTrpcError.shape?.data?.code === "CONFLICT" ||
      maybeTrpcError.shape?.message?.includes("Cannot delete spell while it is linked") === true
    );
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
        queryKey: ["scenarioBuilder", "spells"],
      });

      const newTotalCount = spellTotalCount - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotalCount / SPELLS_PAGE_SIZE));
      if (spellPage > newTotalPages) {
        setSpellPage(newTotalPages);
      }

      setDeleteSpellTarget(null);
      setIsDeleteSpellDialogOpen(false);
    } catch (error) {
      if (isLinkedItemConflict(error)) {
        setDeleteSpellError("Cannot delete spell while it is linked to one or more items.");
      } else {
        setDeleteSpellError("Failed to delete spell. Please try again.");
      }
    }
  }, [
    deleteSpellTarget,
    entityWorkspace.entityId,
    navigate,
    queryClient,
    spellTotalCount,
    spellPage,
    setEntityWorkspace,
    setPerTabSelection,
    skipEntityResetRef,
    setSpellPage,
    isLinkedItemConflict,
  ]);

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

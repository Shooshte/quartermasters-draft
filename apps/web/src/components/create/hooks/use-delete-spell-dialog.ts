import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "~/lib/trpc";
import type { CreatePageNavigate, WorkspaceState } from "../types";
import { createIdleWorkspace, SPELLS_PAGE_SIZE } from "../types";
import { useDeleteEntityDialog } from "./use-delete-entity-dialog";

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
  const isLinkedItemConflict = (error: unknown) => {
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
  };
  const dialog = useDeleteEntityDialog({
    deleteEntity: (id) => trpc.scenarioBuilder.spells.delete.mutate({ id }),
    invalidate: () => queryClient.invalidateQueries({ queryKey: ["scenarioBuilder", "spells"] }),
    onDeleted: (id) => {
      if (entityWorkspace.entityId === id) {
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
      const newTotalCount = spellTotalCount - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotalCount / SPELLS_PAGE_SIZE));
      if (spellPage > newTotalPages) setSpellPage(newTotalPages);
    },
    fallbackError: "Failed to delete spell. Please try again.",
    mapError: (error) =>
      isLinkedItemConflict(error)
        ? "Cannot delete spell while it is linked to one or more items."
        : null,
  });

  return {
    isDeleteSpellDialogOpen: dialog.isOpen,
    deleteSpellTarget: dialog.target,
    deleteSpellError: dialog.error,
    requestDeleteSpell: dialog.request,
    confirmDeleteSpell: dialog.confirm,
    cancelDeleteSpell: dialog.cancel,
  };
}

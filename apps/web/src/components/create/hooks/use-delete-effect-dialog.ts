import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "~/lib/trpc";
import type { CreatePageNavigate, WorkspaceState } from "../types";
import { createIdleWorkspace, EFFECTS_PAGE_SIZE } from "../types";
import { useDeleteEntityDialog } from "./use-delete-entity-dialog";

interface UseDeleteEffectDialogOptions {
  entityWorkspace: WorkspaceState;
  setEntityWorkspace: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  setPerTabSelection: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
  skipEntityResetRef: React.MutableRefObject<boolean>;
  navigate?: CreatePageNavigate;
  effectTotalCount: number;
  effectPage: number;
  setEffectPage: (page: number) => void;
}

export function useDeleteEffectDialog({
  entityWorkspace,
  setEntityWorkspace,
  setPerTabSelection,
  skipEntityResetRef,
  navigate,
  effectTotalCount,
  effectPage,
  setEffectPage,
}: UseDeleteEffectDialogOptions) {
  const queryClient = useQueryClient();
  const isLinkedItemConflict = (error: unknown) => {
    if (
      error instanceof Error &&
      error.message.includes("Cannot delete effect while it is linked")
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
      maybeTrpcError.shape?.message?.includes("Cannot delete effect while it is linked") === true
    );
  };
  const dialog = useDeleteEntityDialog({
    deleteEntity: (id) => trpc.scenarioBuilder.effects.delete.mutate({ id }),
    invalidate: () => queryClient.invalidateQueries({ queryKey: ["scenarioBuilder", "effects"] }),
    onDeleted: (id) => {
      if (entityWorkspace.entityId === id) {
        setEntityWorkspace(createIdleWorkspace());
        setPerTabSelection((prev) => ({ ...prev, Effects: null }));
        skipEntityResetRef.current = true;
        navigate?.({
          search: (prev: Record<string, unknown>) => {
            const next = { ...prev };
            delete next.effect_id;
            return next;
          },
          replace: true,
        });
      }
      const newTotalCount = effectTotalCount - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotalCount / EFFECTS_PAGE_SIZE));
      if (effectPage > newTotalPages) setEffectPage(newTotalPages);
    },
    fallbackError: "Failed to delete effect. Please try again.",
    mapError: (error) =>
      isLinkedItemConflict(error)
        ? "Cannot delete effect while it is linked to one or more items."
        : null,
  });

  return {
    isDeleteEffectDialogOpen: dialog.isOpen,
    deleteEffectTarget: dialog.target,
    deleteEffectError: dialog.error,
    requestDeleteEffect: dialog.request,
    confirmDeleteEffect: dialog.confirm,
    cancelDeleteEffect: dialog.cancel,
  };
}

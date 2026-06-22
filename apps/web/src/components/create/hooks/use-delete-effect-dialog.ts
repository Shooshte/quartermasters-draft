import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { trpc } from "~/lib/trpc";
import type { CreatePageNavigate, WorkspaceState } from "../types";
import { createIdleWorkspace, EFFECTS_PAGE_SIZE } from "../types";

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
  const [isDeleteEffectDialogOpen, setIsDeleteEffectDialogOpen] = useState(false);
  const [deleteEffectTarget, setDeleteEffectTarget] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [deleteEffectError, setDeleteEffectError] = useState<string | null>(null);

  const requestDeleteEffect = useCallback((id: string, name: string) => {
    setDeleteEffectTarget({ id, name });
    setIsDeleteEffectDialogOpen(true);
  }, []);

  const isLinkedSpellConflict = useCallback((error: unknown) => {
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
  }, []);

  const confirmDeleteEffect = useCallback(async () => {
    if (!deleteEffectTarget) return;
    try {
      setDeleteEffectError(null);
      await trpc.scenarioBuilder.effects.delete.mutate({ id: deleteEffectTarget.id });

      if (entityWorkspace.entityId === deleteEffectTarget.id) {
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

      await queryClient.invalidateQueries({
        queryKey: ["scenarioBuilder", "effects"],
      });

      const newTotalCount = effectTotalCount - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotalCount / EFFECTS_PAGE_SIZE));
      if (effectPage > newTotalPages) {
        setEffectPage(newTotalPages);
      }

      setDeleteEffectTarget(null);
      setIsDeleteEffectDialogOpen(false);
    } catch (error) {
      if (isLinkedSpellConflict(error)) {
        setDeleteEffectError("Cannot delete effect while it is linked to one or more spells.");
      } else {
        setDeleteEffectError("Failed to delete effect. Please try again.");
      }
    }
  }, [
    deleteEffectTarget,
    entityWorkspace.entityId,
    navigate,
    queryClient,
    effectTotalCount,
    effectPage,
    setEntityWorkspace,
    setPerTabSelection,
    skipEntityResetRef,
    setEffectPage,
    isLinkedSpellConflict,
  ]);

  const cancelDeleteEffect = useCallback(() => {
    setDeleteEffectTarget(null);
    setIsDeleteEffectDialogOpen(false);
    setDeleteEffectError(null);
  }, []);

  return {
    isDeleteEffectDialogOpen,
    deleteEffectTarget,
    deleteEffectError,
    requestDeleteEffect,
    confirmDeleteEffect,
    cancelDeleteEffect,
  };
}

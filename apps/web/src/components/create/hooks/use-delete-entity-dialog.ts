import { useCallback, useRef, useState } from "react";

export interface DeleteTarget {
  id: string;
  name: string;
}

export interface DeleteEntityController {
  isOpen: boolean;
  target: DeleteTarget | null;
  error: string | null;
  request(id: string, name: string): void;
  confirm(): Promise<void>;
  cancel(): void;
}

export function useDeleteEntityDialog(options: {
  deleteEntity(id: string): Promise<unknown>;
  invalidate(): Promise<unknown>;
  onDeleted(id: string): void;
  fallbackError: string;
  mapError?(error: unknown): string | null;
}): DeleteEntityController {
  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState<DeleteTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isConfirmingRef = useRef(false);

  const request = useCallback((id: string, name: string) => {
    setTarget({ id, name });
    setError(null);
    setIsOpen(true);
  }, []);

  const confirm = useCallback(async () => {
    if (!target || isConfirmingRef.current) return;
    isConfirmingRef.current = true;
    try {
      setError(null);
      await options.deleteEntity(target.id);
      options.onDeleted(target.id);
      await options.invalidate();
      setTarget(null);
      setIsOpen(false);
    } catch (caught) {
      setError(options.mapError?.(caught) ?? options.fallbackError);
    } finally {
      isConfirmingRef.current = false;
    }
  }, [options, target]);

  const cancel = useCallback(() => {
    setTarget(null);
    setError(null);
    setIsOpen(false);
  }, []);

  return { isOpen, target, error, request, confirm, cancel };
}

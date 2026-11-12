import { useCallback, useState } from "react";
import { useToast } from "../components/ui/Toast";
import { apiError } from "../lib/api";

/**
 * Runs a mutation with a busy flag and reports the outcome as a toast.
 * `busy` holds the key of the running action so only that button shows a spinner.
 */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const run = useCallback(async (key: string, action: () => Promise<unknown>, successMessage?: string) => {
    setBusy(key);
    try {
      await action();
      if (successMessage) toast.success(successMessage);
      return true;
    } catch (error) {
      toast.error(apiError(error));
      return false;
    } finally {
      setBusy(null);
    }
  }, [toast]);

  return { run, busy };
}

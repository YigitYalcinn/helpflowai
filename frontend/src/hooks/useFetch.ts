import { useCallback, useEffect, useRef, useState } from "react";
import { api, apiError, apiStatus } from "../lib/api";
import { ApiResponse } from "../types";

type State<T> = { data: T | null; loading: boolean; error: string | null; status?: number };

/** Loads `url` and exposes loading/error state plus a `reload` for after mutations. */
export function useFetch<T>(url: string | null) {
  const [state, setState] = useState<State<T>>({ data: null, loading: Boolean(url), error: null });
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    if (!url) return;
    const id = ++requestId.current;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const res = await api.get<ApiResponse<T>>(url);
      // Ignore answers to requests that were superseded by a newer one.
      if (id === requestId.current) setState({ data: res.data.data, loading: false, error: null });
    } catch (error) {
      if (id === requestId.current) setState((current) => ({ ...current, loading: false, error: apiError(error), status: apiStatus(error) }));
    }
  }, [url]);

  useEffect(() => {
    setState({ data: null, loading: Boolean(url), error: null });
    reload();
  }, [reload, url]);

  return { ...state, reload };
}

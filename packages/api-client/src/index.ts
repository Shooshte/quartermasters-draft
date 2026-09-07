import type { components } from "./generated.js";

export type { components, paths } from "./generated.js";

type Wire = components["schemas"];
/** Dates exist only in the browser adapter; the HTTP/OpenAPI contract uses ISO strings. */
type WithDates<T> = T extends readonly unknown[]
  ? { [K in keyof T]: WithDates<T[K]> }
  : T extends object
    ? { [K in keyof T]: K extends "createdAt" | "updatedAt" ? Date : WithDates<T[K]> }
    : T;
export type EffectListOutput = WithDates<Wire["EffectList"]>;
export type ItemListOutput = WithDates<Wire["ItemList"]>;
export type UnitListOutput = WithDates<Wire["UnitList"]>;
export type ScenarioListOutput = WithDates<Wire["ScenarioList"]>;
export type ReplayOutput = WithDates<Wire["ReplayOutput"]>;
export type SessionResponse = Wire["SessionResponse"];
export type LoginInput = Wire["LoginInput"];
export type ListInput = Partial<Wire["ListInput"]>;

export class ApiError extends Error {
  readonly data: { code: string };
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.data = { code };
  }
}

function restoreDates(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(restoreDates);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      (key === "createdAt" || key === "updatedAt") && typeof item === "string"
        ? new Date(item)
        : restoreDates(item),
    ]),
  );
}

type ApiClientOptions = {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  onAuthorizationFailure?: (status: number) => void;
};
export function createApiClient(options: ApiClientOptions = {}) {
  async function request<T>(path: string, method = "GET", body?: unknown): Promise<WithDates<T>> {
    const response = await (options.fetch ?? globalThis.fetch)(
      `${options.baseUrl ?? ""}/api/v1${path}`,
      {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ApiError(
        response.status,
        "INVALID_RESPONSE",
        "The server returned an invalid response.",
      );
    }
    if (!response.ok) {
      const error = (payload as Partial<Wire["ApiErrorEnvelope"]>)?.error;
      if ((response.status === 401 || response.status === 403) && !path.startsWith("/auth/"))
        options.onAuthorizationFailure?.(response.status);
      throw new ApiError(
        response.status,
        error?.code ?? "INTERNAL_SERVER_ERROR",
        error?.message ?? "Request failed.",
        error?.details,
      );
    }
    return restoreDates(payload) as WithDates<T>;
  }
  function resource<Input, Output, List>(path: string) {
    return {
      list: {
        query: (input: ListInput = {}) =>
          request<List>(`${path}?input=${encodeURIComponent(JSON.stringify(input))}`),
      },
      get: {
        query: ({ id }: { id: string }) => request<Output>(`${path}/${encodeURIComponent(id)}`),
      },
      create: { mutate: (input: Input) => request<Output>(path, "POST", input) },
      update: {
        mutate: ({ id, ...input }: Input & { id: string }) =>
          request<Output>(`${path}/${encodeURIComponent(id)}`, "PUT", input),
      },
      delete: {
        mutate: ({ id }: { id: string }) =>
          request<Wire["Success"]>(`${path}/${encodeURIComponent(id)}`, "DELETE"),
      },
    };
  }
  return {
    scenarioBuilder: {
      effects: resource<Wire["EffectInput"], Wire["Effect"], Wire["EffectList"]>("/effects"),
      items: resource<Wire["ItemInput"], Wire["Item"], Wire["ItemList"]>("/items"),
      units: resource<Wire["UnitInput"], Wire["Unit"], Wire["UnitList"]>("/units"),
      scenarios: resource<Wire["ScenarioInput"], Wire["Scenario"], Wire["ScenarioList"]>(
        "/scenarios",
      ),
    },
    battleLab: {
      scenarioOptions: {
        query: () => request<Wire["ScenarioOption"][]>("/battle/scenario-options"),
      },
      create: {
        mutate: (input: Wire["ReplayInput"]) =>
          request<Wire["ReplayOutput"]>("/replays", "POST", input),
      },
      get: {
        query: ({ id }: { id: string }) =>
          request<Wire["ReplayOutput"]>(`/replays/${encodeURIComponent(id)}`),
      },
    },
    auth: {
      session: () => request<SessionResponse>("/auth/session"),
      login: (input: LoginInput) => request<SessionResponse>("/auth/login", "POST", input),
      logout: () => request<Wire["Success"]>("/auth/logout", "POST"),
    },
  };
}

// Generated from qd-api-types OpenAPI. Do not edit.
export interface paths {
    "/api/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["LoginInput"];
                };
            };
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SessionResponse"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Success"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SessionResponse"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/battle/scenario-options": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ScenarioOption"][];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/effects": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    /** @description URL-encoded JSON list filters; defaults page=1, limit=20, sortBy=name, sortDir=asc, linkageFilter.mode=all; limit 1..500. */
                    input?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["EffectList"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["EffectInput"];
                };
            };
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Effect"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/effects/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Effect"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["EffectInput"];
                };
            };
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Effect"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Success"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    /** @description URL-encoded JSON list filters; defaults page=1, limit=20, sortBy=name, sortDir=asc, linkageFilter.mode=all; limit 1..500. */
                    input?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ItemList"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ItemInput"];
                };
            };
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Item"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/items/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Item"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ItemInput"];
                };
            };
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Item"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Success"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/replays": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ReplayInput"];
                };
            };
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ReplayOutput"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/replays/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ReplayOutput"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/scenarios": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    /** @description URL-encoded JSON list filters; defaults page=1, limit=20, sortBy=name, sortDir=asc, linkageFilter.mode=all; limit 1..500. */
                    input?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ScenarioList"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ScenarioInput"];
                };
            };
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Scenario"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/scenarios/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Scenario"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ScenarioInput"];
                };
            };
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Scenario"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Success"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/units": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    /** @description URL-encoded JSON list filters; defaults page=1, limit=20, sortBy=name, sortDir=asc, linkageFilter.mode=all; limit 1..500. */
                    input?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["UnitList"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["UnitInput"];
                };
            };
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Unit"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/units/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Unit"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["UnitInput"];
                };
            };
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Unit"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Success */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Success"];
                    };
                };
                /** @description Invalid input */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Unauthenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Conflict */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
                /** @description Internal error */
                500: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ApiErrorEnvelope"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        ActiveEffectState: {
            /** Format: int32 */
            actionsRemaining?: number;
            /** Format: int32 */
            actionsUntilTrigger?: number;
            bypassesShield?: boolean;
            effectType: components["schemas"]["EffectCategory"];
            id: string;
            isTaunt?: boolean;
            name: string;
            origin?: components["schemas"]["BattleLogOrigin"];
            /** Format: int32 */
            remainingTriggers?: number;
            sourceScenarioId: string;
            sourceUnitId: string;
            statKey?: components["schemas"]["StatKey"];
            targetUnitId: string;
            timingType: components["schemas"]["EffectTimingType"];
            /** Format: int32 */
            triggerEveryActions?: number;
            /** Format: double */
            value: number;
        };
        ApiError: {
            code: string;
            details?: unknown;
            message: string;
        };
        ApiErrorEnvelope: {
            error: components["schemas"]["ApiError"];
        };
        AttackLogEntry: components["schemas"]["BaseLogEntry"] & {
            attacker: string;
            attackerId: string;
            /** Format: double */
            damage: number;
            target: string;
            targetId: string;
        };
        BaseLogEntry: {
            actionId?: string;
            /** Format: int32 */
            batchNumber: number;
            message: string;
            origin?: components["schemas"]["BattleLogOrigin"];
        };
        BattleEffectTemplate: {
            bypassesShield?: boolean;
            /** Format: double */
            criticalChance?: number | null;
            /** Format: double */
            directHealing?: number | null;
            /** Format: double */
            directMeleeDmg?: number | null;
            /** Format: double */
            directRangedDmg?: number | null;
            /** Format: double */
            directSpellDmg?: number | null;
            /** Format: double */
            dodge?: number | null;
            effectType: components["schemas"]["EffectCategory"];
            /** Format: double */
            health?: number | null;
            id?: string;
            isTaunt: boolean;
            /** Format: double */
            lastsForActions?: number | null;
            /** Format: double */
            mana?: number | null;
            /** Format: double */
            manaRegen?: number | null;
            /** Format: double */
            meleeDmg?: number | null;
            name?: string;
            /** Format: double */
            rangedDmg?: number | null;
            /** Format: double */
            shield?: number | null;
            /** Format: double */
            speed?: number | null;
            /** Format: double */
            spellDmg?: number | null;
            timingType: components["schemas"]["EffectTimingType"];
            /** Format: double */
            triggerCount?: number | null;
            /** Format: double */
            triggerEveryActions?: number | null;
        };
        BattleEndLogEntry: components["schemas"]["BaseLogEntry"] & {
            outcome: string;
            winnerId: string | null;
        };
        BattleItemEffect: {
            effect: components["schemas"]["BattleEffectTemplate"];
            /** Format: int32 */
            sequenceOrder: number;
        };
        BattleItemState: {
            /** Format: double */
            activationHealthCost: number;
            /** Format: double */
            activationManaCost: number;
            allowedRowTypes?: components["schemas"]["RowType"][];
            /** Format: double */
            criticalChance: number;
            /** Format: double */
            dodge: number;
            effects: components["schemas"]["BattleItemEffect"][];
            id?: string;
            /** Format: double */
            mana: number;
            /** Format: double */
            manaRegen: number;
            /** Format: double */
            meleeDmg: number;
            name: string;
            /** Format: double */
            rangedDmg: number;
            /** Format: double */
            spellDmg: number;
        };
        BattleLogEntry: (components["schemas"]["AttackLogEntry"] & {
            /** @enum {string} */
            type: "attack";
        }) | (components["schemas"]["ItemActivationLogEntry"] & {
            /** @enum {string} */
            type: "item-activation";
        }) | (components["schemas"]["EffectApplyLogEntry"] & {
            /** @enum {string} */
            type: "effect-apply";
        }) | (components["schemas"]["EffectExpireLogEntry"] & {
            /** @enum {string} */
            type: "effect-expire";
        }) | (components["schemas"]["DamageLogEntry"] & {
            /** @enum {string} */
            type: "damage";
        }) | (components["schemas"]["HealLogEntry"] & {
            /** @enum {string} */
            type: "heal";
        }) | (components["schemas"]["DeathLogEntry"] & {
            /** @enum {string} */
            type: "death";
        }) | (components["schemas"]["FatigueLogEntry"] & {
            /** @enum {string} */
            type: "fatigue";
        }) | (components["schemas"]["BattleEndLogEntry"] & {
            /** @enum {string} */
            type: "battle-end";
        });
        BattleLogOrigin: {
            actionId?: string;
            effect?: components["schemas"]["BattleLogSourceRef"];
            item?: components["schemas"]["BattleLogSourceRef"];
            kind: components["schemas"]["BattleLogOriginKind"];
            sourceUnitId?: string;
        };
        /** @enum {string} */
        BattleLogOriginKind: "basic-attack" | "item-effect" | "fatigue";
        BattleLogSourceRef: {
            id?: string;
            name: string;
            /** Format: int32 */
            position: number;
        };
        BattleResult: {
            /** Format: int32 */
            actionsResolved: number;
            finalState: components["schemas"]["BattleState"];
            log: components["schemas"]["BattleLogEntry"][];
            winnerId: string | null;
        };
        BattleRows: {
            melee: components["schemas"]["BattleUnitState"][];
            ranged: components["schemas"]["BattleUnitState"][];
            support: components["schemas"]["BattleUnitState"][];
            tank: components["schemas"]["BattleUnitState"][];
        };
        BattleScenarioState: {
            id: string;
            name?: string;
            rows: components["schemas"]["BattleRows"];
        };
        BattleState: {
            /** Format: int32 */
            actionCount: number;
            /** Format: int32 */
            batchCount: number;
            /** Format: int32 */
            fatigueActionThreshold: number;
            /** Format: double */
            fatigueDamageStart: number;
            log: components["schemas"]["BattleLogEntry"][];
            scenarios: components["schemas"]["BattleScenarioState"][];
            status: components["schemas"]["BattleStatus"];
            winnerId: string | null;
        };
        /** @enum {string} */
        BattleStatus: "active" | "finished";
        BattleUnitState: {
            /** Format: int32 */
            actedCount: number;
            /** Format: double */
            actionBar: number;
            activeEffects: components["schemas"]["ActiveEffectState"][];
            baseStats: components["schemas"]["UnitStats"];
            /** Format: double */
            currentHealth: number;
            instanceId: string;
            itemBonusStats: components["schemas"]["UnitStats"];
            items: components["schemas"]["BattleItemState"][];
            /** Format: double */
            mana: number;
            name: string;
            rowType: components["schemas"]["RowType"];
            scenarioId: string;
            selectionShape: components["schemas"]["TargetSelectionShape"];
            shieldLayers: components["schemas"]["ShieldLayer"][];
            /** Format: int32 */
            slot: number;
            /** Format: int32 */
            targetCount: number;
            targetPriority: components["schemas"]["TargetPriority"];
            targetScope: components["schemas"]["TargetScope"];
            templateId?: string;
        };
        DamageLogEntry: components["schemas"]["BaseLogEntry"] & {
            /** Format: double */
            damage: number;
            source: string;
            sourceId: string;
            target: string;
            targetId: string;
        };
        DeathLogEntry: components["schemas"]["BaseLogEntry"] & {
            unit: string;
            unitId: string;
        };
        Effect: components["schemas"]["EffectData"] & {
            createdAt: string;
            id: string;
            needsTimingConfiguration: boolean;
            updatedAt: string;
        };
        EffectApplyLogEntry: components["schemas"]["BaseLogEntry"] & {
            /** Format: int32 */
            actionsRemaining?: number;
            effect: string;
            stat: components["schemas"]["StatKey"];
            target: string;
            targetId: string;
            /** Format: double */
            value: number;
        };
        /** @enum {string} */
        EffectCategory: "buff" | "debuff" | "healing" | "damage";
        EffectData: {
            bypassesShield: boolean;
            /** Format: double */
            criticalChance: number | null;
            /** Format: double */
            directHealing: number | null;
            /** Format: double */
            directMeleeDmg: number | null;
            /** Format: double */
            directRangedDmg: number | null;
            /** Format: double */
            directSpellDmg: number | null;
            /** Format: double */
            dodge: number | null;
            effectType: components["schemas"]["EffectCategory"];
            /** Format: double */
            health: number | null;
            isTaunt: boolean;
            /** Format: double */
            lastsForActions: number | null;
            /** Format: double */
            mana: number | null;
            /** Format: double */
            manaRegen: number | null;
            /** Format: double */
            meleeDmg: number | null;
            name: string;
            /** Format: double */
            rangedDmg: number | null;
            /** Format: double */
            shield: number | null;
            /** Format: double */
            speed: number | null;
            /** Format: double */
            spellDmg: number | null;
            timingType: components["schemas"]["EffectTimingType"];
            /** Format: double */
            triggerCount: number | null;
            /** Format: double */
            triggerEveryActions: number | null;
        };
        EffectExpireLogEntry: components["schemas"]["BaseLogEntry"] & {
            /** Format: int32 */
            actionsRemaining?: number;
            effect: string;
            stat?: components["schemas"]["StatKey"];
            target: string;
            targetId: string;
            /** Format: double */
            value?: number;
        };
        EffectInput: {
            bypassesShield?: boolean;
            /** Format: double */
            criticalChance?: number | null;
            /** Format: double */
            directHealing?: number | null;
            /** Format: double */
            directMeleeDmg?: number | null;
            /** Format: double */
            directRangedDmg?: number | null;
            /** Format: double */
            directSpellDmg?: number | null;
            /** Format: double */
            dodge?: number | null;
            effectType: components["schemas"]["EffectCategory"];
            /** Format: double */
            health?: number | null;
            isTaunt?: boolean;
            /** Format: double */
            lastsForActions?: number | null;
            /** Format: double */
            mana?: number | null;
            /** Format: double */
            manaRegen?: number | null;
            /** Format: double */
            meleeDmg?: number | null;
            name: string;
            /** Format: double */
            rangedDmg?: number | null;
            /** Format: double */
            shield?: number | null;
            /** Format: double */
            speed?: number | null;
            /** Format: double */
            spellDmg?: number | null;
            timingType: components["schemas"]["EffectTimingType"];
            /** Format: double */
            triggerCount?: number | null;
            /** Format: double */
            triggerEveryActions?: number | null;
        };
        EffectList: {
            items: components["schemas"]["EffectListItem"][];
            /** Format: int32 */
            limit: number;
            /** Format: int32 */
            page: number;
            /** Format: int64 */
            totalCount: number;
        };
        EffectListItem: {
            bypassesShield?: boolean;
            /** Format: double */
            criticalChance: number | null;
            /** Format: double */
            dodge: number | null;
            effectType: components["schemas"]["EffectCategory"];
            /** Format: double */
            health: number | null;
            id: string;
            isTaunt?: boolean;
            /** Format: double */
            lastsForActions: number | null;
            /** Format: double */
            mana: number | null;
            /** Format: double */
            manaRegen: number | null;
            /** Format: double */
            meleeDmg: number | null;
            name: string;
            needsTimingConfiguration: boolean;
            /** Format: double */
            rangedDmg: number | null;
            /** Format: double */
            shield: number | null;
            /** Format: double */
            speed: number | null;
            /** Format: double */
            spellDmg: number | null;
            timingType: components["schemas"]["EffectTimingType"];
            /** Format: double */
            triggerCount: number | null;
            /** Format: double */
            triggerEveryActions: number | null;
            updatedAt: string;
        };
        /** @enum {string} */
        EffectTimingType: "instant" | "interval";
        FatigueLogEntry: components["schemas"]["BaseLogEntry"] & {
            /** Format: double */
            damage: number;
            target: string;
            targetId: string;
        };
        HealLogEntry: components["schemas"]["BaseLogEntry"] & {
            /** Format: double */
            amount: number;
            source: string;
            sourceId: string;
            target: string;
            targetId: string;
        };
        Item: components["schemas"]["ItemInput"] & {
            createdAt: string;
            id: string;
            updatedAt: string;
        };
        ItemActivationLogEntry: components["schemas"]["BaseLogEntry"] & {
            caster: string;
            casterId: string;
            effects: string[];
            item: string;
            targetIds: string[];
            targets: string[];
        };
        ItemInput: {
            /** Format: double */
            activationHealthCost: number;
            /** Format: double */
            activationManaCost: number;
            allowedRowTypes: components["schemas"]["RowType"][];
            /** Format: double */
            criticalChance: number;
            /** Format: double */
            dodge: number;
            effectIds: string[];
            /** Format: double */
            mana: number;
            /** Format: double */
            manaRegen: number;
            /** Format: double */
            meleeDmg: number;
            name: string;
            /** Format: double */
            rangedDmg: number;
            /** Format: double */
            spellDmg: number;
        };
        ItemList: {
            items: components["schemas"]["ItemListItem"][];
            /** Format: int32 */
            limit: number;
            /** Format: int32 */
            page: number;
            /** Format: int64 */
            totalCount: number;
        };
        ItemListItem: {
            /** Format: double */
            criticalChance: number;
            /** Format: double */
            dodge: number;
            id: string;
            /** Format: double */
            mana: number;
            /** Format: double */
            manaRegen: number;
            /** Format: double */
            meleeDmg: number;
            name: string;
            /** Format: double */
            rangedDmg: number;
            /** Format: double */
            spellDmg: number;
            updatedAt: string;
        };
        LinkageFilter: {
            /** @enum {string} */
            mode: "all";
        } | {
            /** @enum {string} */
            mode: "linked";
        } | {
            /** @enum {string} */
            mode: "unlinked";
        } | {
            /** @enum {string} */
            mode: "scenario";
            scenarioId: string;
        };
        ListInput: {
            /** Format: int32 */
            limit?: number;
            linkageFilter?: components["schemas"]["LinkageFilter"];
            /** Format: int32 */
            page?: number;
            sortBy?: string;
            sortDir?: string;
        };
        LoginInput: {
            email: string;
            password: string;
            rememberMe?: boolean;
        };
        Replay: components["schemas"]["ReplayInput"] & {
            createdAt: string;
            id: string;
        };
        ReplayInput: {
            scenarioAId: string;
            scenarioBId: string;
            seed: string;
        };
        ReplayOutput: {
            replay: components["schemas"]["Replay"];
            result: components["schemas"]["BattleResult"];
            scenarios: components["schemas"]["ScenarioOption"][];
        };
        /** @enum {string} */
        RowType: "tank" | "melee" | "ranged" | "support";
        Scenario: {
            createdAt: string;
            id: string;
            name: string;
            rows: components["schemas"]["ScenarioRow"][];
            updatedAt: string;
        };
        ScenarioAssignment: {
            assignmentId: string;
            /** Format: int32 */
            position: number;
            unitId: string;
            unitName: string;
        };
        ScenarioInput: {
            name: string;
            rows: components["schemas"]["ScenarioRowInput"][];
        };
        ScenarioList: {
            items: components["schemas"]["ScenarioListItem"][];
            /** Format: int32 */
            limit: number;
            /** Format: int32 */
            page: number;
            /** Format: int64 */
            totalCount: number;
        };
        ScenarioListItem: {
            createdAt: string;
            id: string;
            name: string;
            updatedAt: string;
        };
        ScenarioOption: {
            id: string;
            name: string;
        };
        ScenarioRow: {
            assignments: components["schemas"]["ScenarioAssignment"][];
            id: string;
            rowType: components["schemas"]["RowType"];
        };
        ScenarioRowInput: {
            rowType: components["schemas"]["RowType"];
            unitIds: string[];
        };
        SessionResponse: {
            authenticated: boolean;
            userId: string;
            userRole: components["schemas"]["UserRole"];
        } | {
            authenticated: boolean;
            hadSession: boolean;
        };
        ShieldLayer: {
            activeEffectId?: string;
            id: string;
            /** Format: double */
            remaining: number;
        };
        /** @enum {string} */
        StatKey: "health" | "mana" | "meleeDmg" | "rangedDmg" | "manaRegen" | "spellDmg" | "speed" | "dodge" | "criticalChance";
        Success: {
            success: boolean;
        };
        /** @enum {string} */
        TargetPriority: "highest_health" | "lowest_health" | "highest_damage" | "support" | "random";
        /** @enum {string} */
        TargetScope: "self" | "self_allies" | "self_enemies" | "allies" | "enemies" | "both";
        /** @enum {string} */
        TargetSelectionShape: "individual" | "adjacent";
        Unit: components["schemas"]["UnitData"] & {
            createdAt: string;
            id: string;
            updatedAt: string;
        };
        UnitData: {
            /** Format: double */
            criticalChance: number;
            /** Format: double */
            dodge: number;
            /** Format: double */
            health: number;
            itemIds: string[];
            /** Format: double */
            mana: number;
            /** Format: double */
            manaRegen: number;
            /** Format: double */
            meleeDmg: number;
            name: string;
            /** Format: double */
            rangedDmg: number;
            selectionShape: components["schemas"]["TargetSelectionShape"];
            /** Format: double */
            speed: number;
            /** Format: double */
            spellDmg: number;
            /** Format: int32 */
            targetCount: number;
            targetPriority: components["schemas"]["TargetPriority"];
            targetScope: components["schemas"]["TargetScope"];
        };
        UnitInput: {
            /** Format: double */
            criticalChance: number;
            /** Format: double */
            dodge: number;
            /** Format: double */
            health: number;
            itemIds: string[];
            /** Format: double */
            mana: number;
            /** Format: double */
            manaRegen: number;
            /** Format: double */
            meleeDmg: number;
            name: string;
            /** Format: double */
            rangedDmg: number;
            selectionShape?: components["schemas"]["TargetSelectionShape"];
            /** Format: double */
            speed: number;
            /** Format: double */
            spellDmg: number;
            /** Format: int32 */
            targetCount?: number;
            targetPriority?: components["schemas"]["TargetPriority"];
            targetScope?: components["schemas"]["TargetScope"];
        };
        UnitList: {
            items: components["schemas"]["UnitListItem"][];
            /** Format: int32 */
            limit: number;
            /** Format: int32 */
            page: number;
            /** Format: int64 */
            totalCount: number;
        };
        UnitListItem: {
            id: string;
            name: string;
            updatedAt: string;
        };
        UnitStats: {
            /** Format: double */
            criticalChance: number;
            /** Format: double */
            dodge: number;
            /** Format: double */
            health: number;
            /** Format: double */
            mana: number;
            /** Format: double */
            manaRegen: number;
            /** Format: double */
            meleeDmg: number;
            /** Format: double */
            rangedDmg: number;
            /** Format: double */
            speed: number;
            /** Format: double */
            spellDmg: number;
        };
        /** @enum {string} */
        UserRole: "game_master" | "player";
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;

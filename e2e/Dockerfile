FROM node:24-bookworm-slim AS web-build
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @qd/web... build

FROM rust:1.97.1-bookworm AS rust-build
WORKDIR /app
COPY . .
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --locked --release -p qd-server -p qd-db \
    && mkdir -p /out && cp target/release/qd-server target/release/qd-db /out/

FROM debian:bookworm-slim AS production
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --create-home qd
WORKDIR /app
COPY --from=rust-build /out/qd-server /usr/local/bin/qd-server
COPY --from=rust-build /out/qd-db /usr/local/bin/qd-db
COPY --from=web-build /app/apps/web/dist /app/web
ENV WEB_DIST_DIR=/app/web HOST=0.0.0.0 PORT=3000
USER qd
EXPOSE 3000
CMD ["qd-server"]

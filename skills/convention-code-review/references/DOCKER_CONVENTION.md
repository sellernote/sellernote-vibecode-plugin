# Docker Convention

> Defines rules applied to Docker projects.
> Parent rules: INFRASTRUCTURE_CONVENTION.md

## Technology Stack

| Item | Version/Setting |
|------|----------|
| BuildKit | Must be enabled (`DOCKER_BUILDKIT=1`) |

## Dockerfile

### Multi-Stage Build

- [MUST] Production Dockerfiles must use multi-stage builds.
- **Good example**:
  ```dockerfile
  # --- Build Stage ---
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY package.json pnpm-lock.yaml ./
  RUN corepack enable && pnpm install --frozen-lockfile
  COPY . .
  RUN pnpm build

  # --- Production Stage ---
  FROM node:20-alpine AS runner
  WORKDIR /app
  RUN addgroup --system --gid 1001 appgroup && \
      adduser --system --uid 1001 appuser
  COPY --from=builder /app/dist ./dist
  COPY --from=builder /app/node_modules ./node_modules
  COPY --from=builder /app/package.json ./
  USER appuser
  EXPOSE 3000
  CMD ["node", "dist/main.js"]
  ```

### Base Image Selection

- [MUST] Production images must use minimal base images with `alpine` or `slim` variants.
- [MUST] Pin base image tags to exact versions. (e.g., `node:20.11-alpine`)
- **Good example**:
  ```dockerfile
  FROM node:20.11-alpine
  ```

### Layer Caching Optimization

- [SHOULD] Place less frequently changed instructions at the top of the Dockerfile and more frequently changed instructions at the bottom.
- **Good example**:
  ```dockerfile
  COPY package.json pnpm-lock.yaml ./
  RUN pnpm install --frozen-lockfile
  COPY . .
  RUN pnpm build
  ```

### RUN Instruction Optimization

- [SHOULD] Chain related `RUN` instructions with `&&` and clean up package manager caches in the same layer.
- **Good example**:
  ```dockerfile
  RUN apk add --no-cache curl tzdata && \
      rm -rf /var/cache/apk/*
  ```

### .dockerignore

- [MUST] Create a `.dockerignore` file at the project root to exclude unnecessary files from the build context.
- **Good example**:
  ```
  node_modules
  .git
  .env
  .env.*
  dist
  coverage
  *.md
  .DS_Store
  ```

### COPY vs ADD

- [SHOULD] Use `COPY` instead of `ADD` for copying files. (`ADD` has implicit behaviors such as automatic decompression)

## Image Naming/Tagging

### Image Naming

- [MUST] Image names must follow the `{registry}/{project}/{service}` pattern.
- **Good example**:
  ```
  123456789.dkr.ecr.ap-northeast-2.amazonaws.com/sellernote/api
  123456789.dkr.ecr.ap-northeast-2.amazonaws.com/sellernote/web
  ```

### Tag Strategy

- [MUST] Do not use the `latest` tag for production images. Use Git SHA or semantic version tags.
- **Good example**:
  ```bash
  docker build -t sellernote/api:abc1234 .
  docker build -t sellernote/api:v1.2.3 .
  docker tag sellernote/api:abc1234 sellernote/api:staging
  ```

## Docker Compose

### Service Configuration

- [MUST] Do not use the `version:` field in Docker Compose files. (deprecated)
- [SHOULD] Use service names that clearly indicate their role.
- **Good example**:
  ```yaml
  services:
    api:
      build:
        context: ./apps/api
        dockerfile: Dockerfile
      ports:
        - "3000:3000"
      depends_on:
        postgres:
          condition: service_healthy
      environment:
        - DATABASE_URL=postgresql://user:pass@postgres:5432/sellernote

    postgres:
      image: postgres:16-alpine
      volumes:
        - postgres_data:/var/lib/postgresql/data
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U user"]
        interval: 10s
        timeout: 5s
        retries: 3

    redis:
      image: redis:7-alpine
      volumes:
        - redis_data:/data

  volumes:
    postgres_data:
    redis_data:
  ```

### Health Check

- [SHOULD] Define `healthcheck` for dependent services and use `condition: service_healthy` in `depends_on`.

### Volumes

- [MUST] Use Named Volumes for persistent data (DB data, file uploads, etc.).

## Security

### Non-Root User

- [MUST] Containers must run as a dedicated non-root user.
- **Good example**:
  ```dockerfile
  RUN addgroup --system --gid 1001 appgroup && \
      adduser --system --uid 1001 appuser
  USER appuser
  ```

### Image Scanning

- [SHOULD] Perform vulnerability scanning after image builds in the CI/CD pipeline. (Recommended: Trivy, Docker Scout, Snyk)

### Secret Handling

- [MUST NOT] Do not include secrets in `ENV` or `ARG` in the Dockerfile. (`ARG` is exposed in image history, `ENV` is accessible inside the container)
- [SHOULD] Use BuildKit's `--mount=type=secret` when secrets are needed during build time.
- **Good example**:
  ```dockerfile
  RUN --mount=type=secret,id=npm_token \
      NPM_TOKEN=$(cat /run/secrets/npm_token) npm install
  ```

### Resource Limits

- [SHOULD] Set CPU/memory limits in Docker Compose or orchestration tools.
- **Good example**:
  ```yaml
  services:
    api:
      deploy:
        resources:
          limits:
            cpus: "1.0"
            memory: 512M
          reservations:
            cpus: "0.5"
            memory: 256M
  ```

## Anti-Patterns

- [MUST NOT] Do not use the `latest` tag for production deployments.
- [MUST NOT] Do not run containers without a `USER` directive in the Dockerfile.
- [MUST NOT] Do not include build tools, debugging tools, or devDependencies in production images.
- [MUST NOT] Do not use full OS images such as `ubuntu` or `debian` as production base images. (Use `alpine` or `distroless`)
- [MUST NOT] Do not copy secrets in the Dockerfile and then delete them in a subsequent layer. (The secrets still exist in the previous layer)
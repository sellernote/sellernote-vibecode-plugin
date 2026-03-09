# Infrastructure Convention

> Defines common rules that apply across all infrastructure.
> Sub-documents: [AWS](aws/AWS_CONVENTION.md) | [Docker](docker/DOCKER_CONVENTION.md) | [Terraform](terraform/TERRAFORM_CONVENTION.md) | [Pulumi](pulumi/PULUMI_CONVENTION.md) | [Monorepo](monorepo/MONOREPO_CONVENTION.md)

## Environment Separation

### Environment Definition

- [MUST] Operate the following 3 environments as standard.

| Environment | Purpose | Characteristics |
|------|------|------|
| `dev` | Development/Testing | Latest feature integration, frequent deployments allowed, data reset possible |
| `staging` | Pre-deployment verification | Identical configuration to production, QA/integration testing performed |
| `production` | Live service | Approval-based deployment, monitoring/alerting required, rollback strategy required |

### Environment Parity

- [SHOULD] Keep the infrastructure configuration (network, service stack, runtime version) of staging and production environments as identical as possible.

### Environment Identifiers

- [MUST] Include environment identifiers (`dev`, `staging`, `production`) in all resource names and tags.
- **Good examples**:
  ```
  dev-sellernote-api-server
  staging-sellernote-rds
  production-sellernote-cdn
  ```

## Environment Variable Management

### .env File Rules

- [MUST] `.env` files must never be included in version control (Git).
- [MUST] Provide a `.env.example` file to document the list and format of required environment variables.
- **Good examples**:
  ```bash
  # .env.example
  DATABASE_URL=postgresql://user:password@host:5432/dbname
  REDIS_URL=redis://host:6379
  AWS_REGION=ap-northeast-2
  ```

### Environment Variable Naming

- [MUST] Write environment variables in `UPPER_SNAKE_CASE`.
- [SHOULD] Use service/domain prefixes for grouping.
- **Good examples**:
  ```bash
  DATABASE_HOST=localhost
  DATABASE_PORT=5432
  DATABASE_NAME=sellernote
  REDIS_HOST=localhost
  REDIS_PORT=6379
  AWS_S3_BUCKET_NAME=sellernote-uploads
  ```

### Secret Management

- [MUST] Manage secrets (API keys, DB passwords, tokens, etc.) through a secret management service.

| Environment | Secret Management Method |
|------|-----------------|
| Local development | `.env` file (not included in Git) |
| CI/CD | CI/CD tool's secret storage (e.g., GitHub Secrets) |
| Cloud | AWS Secrets Manager, AWS SSM Parameter Store |

## CI/CD Pipeline

### Pipeline Stages

- [MUST] The CI/CD pipeline must include the following stages in order.

```
[Lint/Format] → [Build] → [Test] → [Security Scan] → [Deploy to Staging] → [Deploy to Production]
```

| Stage | Description | On Failure |
|---------|------|---------|
| Lint/Format | Code style and static analysis | Pipeline aborted |
| Build | Application build, Docker image creation | Pipeline aborted |
| Test | Unit tests, integration tests | Pipeline aborted |
| Security Scan | Dependency vulnerabilities, image scanning | Warning or abort (depending on severity) |
| Deploy to Staging | Deploy to staging environment and verify | Production deployment blocked |
| Deploy to Production | Deploy to production environment | Execute rollback procedure |

### Immutable Artifacts

- [MUST] Once built, artifacts (Docker images, build outputs) must be deployed identically to all environments without modification.
- **Good examples**:
  ```
  Build → Create image (v1.2.3) → Deploy to staging → Deploy to production (same image)
  ```

## Deployment Strategy

### Deployment Method Selection Criteria

- [SHOULD] Choose a deployment strategy that fits the service characteristics.

| Strategy | Description | Suitable For |
|------|------|------------|
| Rolling | Replace instances sequentially | General services, minimize downtime |
| Blue-Green | Prepare new environment then switch traffic | Core services requiring instant rollback |
| Canary | Route only some traffic to the new version | Large-scale user-facing services, gradual verification |

### Rollback Strategy

- [MUST] All production deployments must have rollback procedures defined in advance.
- [SHOULD] Rollbacks should be performed by redeploying the previous version's artifact. Do not revert code and rebuild.

## Security Policy

- [MUST] All service accounts, IAM roles, and containers must be granted only the minimum permissions necessary to perform their tasks. (Principle of Least Privilege)
- [MUST] Backend services such as production databases and caches must be configured so they are not directly accessible from the public internet.
- [SHOULD] Inter-service communication should be conducted through internal networks (VPC, Private Subnet).
- [SHOULD] Critical secrets (DB passwords, API keys) should be rotated periodically.

## Monitoring/Alerting

### Metric Collection

- [MUST] All production services must collect the following core metrics.

| Category | Metrics |
|---------|--------|
| Application | Response time (P50, P95, P99), error rate, requests per second (RPS) |
| Infrastructure | CPU utilization, memory utilization, disk utilization |
| Database | Query response time, connection count, slow queries |

### Log Aggregation

- [MUST] Application logs must be collected into a centralized logging system.
- [SHOULD] Logs should be output in a structured format (JSON).
- **Good examples**:
  ```json
  {"timestamp":"2025-01-15T10:30:00Z","level":"ERROR","service":"api","message":"DB connection failed","error":"timeout"}
  ```

### Alert Thresholds

- [MUST] Set up alerts for the following items in the production environment.

| Item | Threshold Criteria (Example) | Severity |
|------|-------------------|--------|
| Error rate | Error rate > 5% over 5 minutes | Critical |
| Response time | P95 > 3 seconds | Warning |
| CPU utilization | 5-minute average > 80% | Warning |
| Disk utilization | > 85% | Critical |
| Service health check | 3 consecutive failures | Critical |

- [SHOULD] Separate alert channels by severity. (e.g., Critical for immediate notification, Warning for dashboard)

## Anti-patterns

- [MUST NOT] Do not write secrets directly in source code or configuration files. (e.g., `DATABASE_PASSWORD: "mysecretpassword123"` in `docker-compose.yml`)
- [MUST NOT] Do not manually deploy by SSH-ing into the production environment.
- [MUST NOT] Do not operate production services without monitoring/alerting.
- [MUST NOT] Do not branch code logic based on environment. Handle environment differences through environment variables and configuration.
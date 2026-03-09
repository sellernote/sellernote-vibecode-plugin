# Pulumi Convention

> Defines rules applied to Pulumi IaC projects.
> Parent rules: INFRASTRUCTURE_CONVENTION.md

## Tech Stack

| Item | Version/Config |
|------|----------|
| Language | TypeScript |

## Project Structure

### Directory Layout

- [MUST] Organize Pulumi projects based on the directory structure below. Reusable infrastructure patterns go in `components/`, and logical resource groups go in `stacks/`.

```
infra/
├── Pulumi.yaml                  # 프로젝트 정의
├── Pulumi.dev.yaml              # dev 스택 설정
├── Pulumi.staging.yaml          # staging 스택 설정
├── Pulumi.production.yaml       # production 스택 설정
├── index.ts                     # 진입점
├── config.ts                    # 스택별 설정 로드
├── components/                  # 재사용 Component Resource
│   ├── vpc.ts
│   ├── ecs-service.ts
│   └── rds-cluster.ts
├── stacks/                      # 스택별 리소스 정의
│   ├── networking.ts
│   ├── database.ts
│   └── application.ts
├── types.ts                     # 공통 타입 정의
├── utils.ts                     # 유틸리티 함수
├── tsconfig.json
├── package.json
└── __tests__/
    ├── components/
    └── stacks/
```

### File Roles

- [MUST] Separate each file's role according to the criteria below.

| File | Role |
|------|------|
| `Pulumi.yaml` | Defines project name, runtime, and description |
| `Pulumi.{stack}.yaml` | Stores per-stack configuration values (config) |
| `index.ts` | Program entry point, composes stack resources |
| `config.ts` | Loads and type-converts configuration values using `pulumi.Config` |
| `components/*.ts` | Reusable ComponentResource classes |
| `stacks/*.ts` | Definitions per logical resource group (networking, DB, app, etc.) |
| `types.ts` | Interface and type definitions |

## Coding Conventions

### Resource Naming

- [MUST] Use the `{environment}-{service}-{resourceType}` pattern for resource logical names.
- **Good example**:
  ```typescript
  const bucket = new aws.s3.Bucket("dev-sellernote-uploads", {
    bucket: `dev-sellernote-uploads`,
    tags: defaultTags,
  });

  const cluster = new aws.ecs.Cluster("production-sellernote-api", {
    name: "production-sellernote-api",
    settings: [{ name: "containerInsights", value: "enabled" }],
  });
  ```

### Tagging Strategy

- [MUST] Apply `Environment`, `Service`, and `ManagedBy` tags to all AWS resources as mandatory.
- [SHOULD] Define common tags once in config.ts and apply them uniformly to all resources.
- **Good example**:
  ```typescript
  // config.ts
  const config = new pulumi.Config();
  const environment = config.require("environment");
  const service = config.get("service") || "sellernote";

  export const defaultTags = {
    Environment: environment,
    Service: service,
    ManagedBy: "pulumi",
    Project: pulumi.getProject(),
    Stack: pulumi.getStack(),
  };

  // stacks/networking.ts
  const vpc = new aws.ec2.Vpc("dev-sellernote-vpc", {
    cidrBlock: "10.0.0.0/16",
    tags: { ...defaultTags, Name: "dev-sellernote-vpc" },
  });
  ```

### Config/Secret Management

- [MUST] Store environment-specific settings in stack configuration files using the `pulumi config set` command.
- [MUST] Store secrets in encrypted form using the `pulumi config set --secret` command.
- [MUST NOT] Hard-code secrets in source code.
- **Good example**:
  ```bash
  pulumi config set aws:region ap-northeast-2
  pulumi config set environment dev
  pulumi config set --secret databasePassword "my-secure-password"
  ```
  ```typescript
  // config.ts
  const config = new pulumi.Config();
  export const environment = config.require("environment");
  export const instanceType = config.get("instanceType") || "t3.small";
  export const databasePassword = config.requireSecret("databasePassword");
  ```

### Type Safety

- [MUST] Handle Pulumi `Output<T>` types correctly. Use `pulumi.interpolate` when string interpolation is needed.
- [MUST NOT] Access Output values synchronously with the `.get()` method. (Causes runtime errors and breaks secret tracking)
- [SHOULD] Use `.apply()` only for simple transformations, and use `pulumi.all()` for complex logic.
- **Good example**:
  ```typescript
  const bucket = new aws.s3.Bucket("dev-sellernote-uploads");
  const cluster = new aws.ecs.Cluster("dev-sellernote-api");

  // pulumi.interpolate로 Output 값 조합
  const bucketUrl = pulumi.interpolate`https://${bucket.bucketDomainName}`;

  // pulumi.all()로 여러 Output 처리
  const summary = pulumi.all([bucket.id, cluster.name]).apply(
    ([bucketId, clusterName]) => `Bucket: ${bucketId}, Cluster: ${clusterName}`
  );
  ```
  **Note**: Synchronous access via `.get()`, plain string concatenation (`"https://" + output`), and creating resources inside `apply` are all prohibited.

### Stack Outputs

- [MUST] Define stack outputs with `export` for values that need to be referenced by other stacks or external systems.
- [MUST NOT] Expose secret values as plaintext in stack outputs. They must be wrapped with `pulumi.secret()`.
- **Good example**:
  ```typescript
  export const vpcId = vpc.id;
  export const clusterEndpoint = cluster.endpoint;
  export const dbConnectionString = pulumi.secret(
    pulumi.interpolate`postgresql://${dbUser}:${dbPassword}@${db.endpoint}/sellernote`
  );
  ```

## Stack Management

### Per-Environment Stacks

- [MUST] Operate separate stacks per environment (dev/staging/production).
- [SHOULD] Keep stack names simple and lowercase. (`dev`, `staging`, `production`)
- **Good example**:
  ```bash
  pulumi stack init dev
  pulumi stack init staging
  pulumi stack init production
  ```

### Stack Configuration Files

- [MUST] Commit each stack's configuration file (`Pulumi.{stack}.yaml`) to Git for version control. However, secrets must be encrypted with `--secret`.
- **Good example**:
  ```yaml
  # Pulumi.dev.yaml
  config:
    aws:region: ap-northeast-2
    sellernote:environment: dev
    sellernote:instanceType: t3.small
    sellernote:databasePassword:
      secure: AAABADQXFlU0BJ+Zi5WC9eLhWkPGdXczWJbGKs...
  ```

### Cross-Stack References

- [SHOULD] Use `pulumi.StackReference` when output values from other projects/stacks are needed.
- **Good example**:
  ```typescript
  const networkingStack = new pulumi.StackReference("organization/networking/production");
  const vpcId = networkingStack.getOutput("vpcId");
  const privateSubnetIds = networkingStack.getOutput("privateSubnetIds");
  ```
  **Note**: Do not hard-code resource IDs from other stacks.

## Component Resource

### Modularizing Reusable Infrastructure

- [SHOULD] Abstract repeating infrastructure patterns into classes that extend `pulumi.ComponentResource`.
- [MUST] Always set the `{ parent: this }` option on child resources created inside a Component Resource.
- [MUST] Call `this.registerOutputs()` at the end of the Component Resource constructor.
- [MUST] Use the `{organization}:{module}:{type}` pattern for Component Resource type URNs.
- **Good example** (core pattern):
  ```typescript
  export class EcsService extends pulumi.ComponentResource {
    public readonly serviceName: pulumi.Output<string>;

    constructor(name: string, args: EcsServiceArgs, opts?: pulumi.ComponentResourceOptions) {
      super("sellernote:infra:EcsService", name, {}, opts);  // URN: {조직}:{모듈}:{타입}

      const taskDef = new aws.ecs.TaskDefinition(`${name}-task`, {
        /* config */
      }, { parent: this });  // parent: this 필수

      const service = new aws.ecs.Service(`${name}-svc`, {
        taskDefinition: taskDef.arn,
      }, { parent: this });  // parent: this 필수

      this.serviceName = service.name;
      this.registerOutputs({ serviceName: this.serviceName });  // 필수 호출
    }
  }
  ```

## State Management

### State Backend Selection

- [MUST] Use a remote State Backend for team projects. Do not store State on the local file system.

| Item | Pulumi Cloud | S3 Self-managed |
|------|-------------|-----------------|
| State Locking | Built-in | Built-in (blob protocol-based) |
| Secret Management | Built-in | Requires external provider (AWS KMS, etc.) |
| RBAC | Built-in | Must be configured manually via IAM/bucket policies |
| Cost | Free tier + paid plans | Only S3 storage costs |

- [SHOULD] Prefer Pulumi Cloud for quick setup and team collaboration needs.
- [MAY] Choose an S3 Self-managed backend when data sovereignty or regulatory compliance requirements exist.
- **Good example**:
  ```bash
  pulumi login                                              # Pulumi Cloud
  pulumi login s3://sellernote-pulumi-state?region=ap-northeast-2  # S3
  ```

### State Access Management

- [MUST] Manage access permissions to State at the team level.
- [MUST] Grant production State write permissions to only a minimal number of personnel.
- **Good example**:
  ```
  - dev 스택: 팀 전체 write 권한
  - staging 스택: 팀 전체 read, 시니어 엔지니어 write 권한
  - production 스택: 팀 전체 read, CI/CD + 인프라 리드 write 권한
  ```

## Security

### Secret Encryption

- [MUST] Encrypt and store secrets using the `pulumi config set --secret` command.
- [MUST NOT] Expose secret values as plaintext in Pulumi stack outputs. They must be wrapped with `pulumi.secret()`.
- [SHOULD] Use customer-managed keys such as AWS KMS instead of default encryption when regulatory compliance is required.
- **Good example**:
  ```bash
  pulumi config set --secret databasePassword "secure-password-123"
  pulumi stack init production --secrets-provider="awskms://alias/pulumi-secrets?region=ap-northeast-2"
  ```
  ```typescript
  export const dbConnectionString = pulumi.secret(
    pulumi.interpolate`postgresql://admin:${dbPassword}@${db.endpoint}:5432/sellernote`
  );
  ```

### IAM Least Privilege

- [MUST] Grant only the minimum required permissions to IAM roles used for Pulumi execution.
- [SHOULD] Separate the IAM role for Pulumi execution in CI/CD pipelines from the IAM role for developers' local execution.
- **Good example**:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["ec2:*", "ecs:*", "rds:*", "s3:*", "iam:GetRole", "iam:PassRole"],
      "Resource": "*",
      "Condition": {
        "StringEquals": { "aws:RequestedRegion": "ap-northeast-2" }
      }
    }]
  }
  ```
  **Note**: Full-access policies with `"Action": "*", "Resource": "*"` are prohibited.

## CI/CD Integration

### Preview -> Up Workflow

- [MUST] Automatically run `pulumi preview` on PRs to review changes.
- [MUST] For production deployments, always review the preview results before executing `pulumi up` with an approval-based process.
- [SHOULD] Use GitHub Actions `pulumi/actions` and automatically post preview results as PR comments.
- **Good example** (core structure):
  ```yaml
  # Preview: on pull_request (paths: infra/**)
  - uses: pulumi/actions@v6
    with: { command: preview, stack-name: dev, work-dir: infra, comment-on-pr: true }
    env: { PULUMI_ACCESS_TOKEN, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION }

  # Deploy: on push to main (paths: infra/**)
  # Job 1: deploy-dev → pulumi up (stack: dev)
  # Job 2: deploy-production (needs: deploy-dev, environment: production)
  #   Step 1: pulumi preview (stack: production)
  #   Step 2: pulumi up (stack: production)
  ```
  **Note**: Running `up` directly without a preview or omitting `environment: production` (no approval process) is prohibited.

### Plugin Caching

- [SHOULD] Cache Pulumi plugins and npm packages in CI/CD pipelines.
- **Good example**:
  ```yaml
  - uses: actions/cache@v4
    with:
      path: |
        ~/.pulumi/plugins
        ~/.pulumi/policies
      key: pulumi-plugins-${{ hashFiles('infra/package-lock.json') }}
  ```

## Anti-Patterns

- [MUST NOT] Hard-code secrets in source code or store them as plaintext in configuration files without `--secret`. Correct approach: `pulumi config set --secret`, `config.requireSecret()`
- [MUST NOT] Directly modify resources managed by Pulumi through the AWS Console or CLI. (Causes State Drift)
- [MUST NOT] Manage all infrastructure resources in a single stack. Separate them by logical units.
- [MUST NOT] Access Output values synchronously with `Output.get()`. Use `pulumi.interpolate` or `.apply()`.
- [MUST NOT] Create AWS resources without tags.
- [MUST NOT] Execute `pulumi up` directly on production without reviewing `pulumi preview` first.
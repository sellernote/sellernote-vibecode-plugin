# Terraform Convention

> Defines the rules applied to Terraform projects.
> Parent rules: INFRASTRUCTURE_CONVENTION.md

## Project Structure

### Directory Layout

- [MUST] Separate directories by environment, and manage common modules in the `modules/` directory.

```
terraform/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── locals.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   ├── staging/
│   └── production/
├── modules/
│   ├── networking/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── ecs/
│   ├── rds/
│   └── ...
```

### File Organization

- [MUST] Each environment directory and module must follow the file structure below.

| File | Role |
|------|------|
| `main.tf` | Resource definitions, module calls |
| `variables.tf` | Input variable declarations |
| `outputs.tf` | Output value declarations |
| `locals.tf` | Local value definitions (computed values, common tags, etc.) |
| `backend.tf` | Remote State backend configuration (environment directories only) |
| `terraform.tfvars` | Variable value assignments (environment directories only) |
| `providers.tf` | Provider configuration (environment directories only) |
| `data.tf` | Data source definitions (as needed) |

- [SHOULD] When the number of resources grows, split them into separate files by logical group. (e.g., `network.tf`, `ecs.tf`, `rds.tf`)

## Naming

### Resource Naming

- [MUST] Terraform resource names (HCL internal identifiers) must use `snake_case`.
- [SHOULD] Do not repeat the resource type in the resource name.
- **Good examples**:
  ```hcl
  resource "aws_instance" "api" {}          # aws_instance.api
  resource "aws_security_group" "api" {}    # aws_security_group.api
  resource "aws_db_instance" "main" {}      # Use main or this if it is the only resource
  ```

### Variable Naming

- [MUST] Variable names must use `snake_case` and clearly express their meaning.
- [MUST] Specify `type` and `description` for all variables.
- **Good examples**:
  ```hcl
  variable "environment" {
    type        = string
    description = "배포 환경 (dev, staging, production)"
    validation {
      condition     = contains(["dev", "staging", "production"], var.environment)
      error_message = "environment는 dev, staging, production 중 하나여야 합니다."
    }
  }

  variable "api_instance_count" {
    type        = number
    description = "API 서버 인스턴스 수"
    default     = 2
  }
  ```

### Output Naming

- [MUST] Output names must use `snake_case` following the `{resource_type}_{attribute}` pattern.
- [MUST] Specify `description` for all outputs.
- **Good examples**:
  ```hcl
  output "vpc_id" {
    description = "생성된 VPC의 ID"
    value       = aws_vpc.main.id
  }
  ```

### Module Naming

- [SHOULD] Internal module directory names should be written in `snake_case` and clearly indicate the infrastructure they manage.
- [SHOULD] Externally published modules should follow the `terraform-{provider}-{name}` pattern.
- **Good examples**:
  ```
  modules/networking/
  modules/ecs_cluster/
  modules/rds_postgres/
  ```

## Module Strategy

### Module Separation Criteria

- [SHOULD] Group resources that are logically created/destroyed together into a single module.
- **Good examples**:
  ```hcl
  module "networking" {
    source      = "../../modules/networking"
    environment = var.environment
    vpc_cidr    = "10.0.0.0/16"
  }

  module "ecs" {
    source             = "../../modules/ecs"
    environment        = var.environment
    vpc_id             = module.networking.vpc_id
    private_subnet_ids = module.networking.private_subnet_ids
  }
  ```

### Module Design Principles

- [MUST NOT] Do not configure providers directly inside modules. Providers must be configured in the calling root module.
- [SHOULD] Avoid direct module-to-module calls (deep nesting) and compose modules at the root module level.

### Module Versioning

- [SHOULD] Pin versions for external modules (Terraform Registry, Git, etc.).
- **Good examples**:
  ```hcl
  module "vpc" {
    source  = "terraform-aws-modules/vpc/aws"
    version = "5.5.1"
  }
  ```

## State Management

### Remote State

- [MUST] Terraform State must be stored in a remote backend (e.g., S3 + DynamoDB). Do not store it locally.
- **Good examples**:
  ```hcl
  terraform {
    backend "s3" {
      bucket         = "sellernote-terraform-state"
      key            = "production/terraform.tfstate"
      region         = "ap-northeast-2"
      dynamodb_table = "sellernote-terraform-lock"
      encrypt        = true
    }
  }
  ```

### State Locking

- [MUST] Enable State Locking to prevent concurrent modifications.

### State Separation

- [MUST] Separate State files by environment (dev/staging/production).
- [SHOULD] Consider separating State for logically independent infrastructure components as well. (Minimizing Blast Radius)

### State Security

- [MUST] Store State files with encryption. (e.g., S3 server-side encryption)
- [MUST NOT] Do not commit State files to the Git repository.

### Cross-State References

- [SHOULD] Use the `terraform_remote_state` data source when output values from another State are needed.
- **Good examples**:
  ```hcl
  data "terraform_remote_state" "networking" {
    backend = "s3"
    config = {
      bucket = "sellernote-terraform-state"
      key    = "production/networking/terraform.tfstate"
      region = "ap-northeast-2"
    }
  }
  ```

## Workspaces

- [SHOULD] For environment separation, prefer directory-based separation over Terraform Workspaces. (Workspaces share the same backend, making complete isolation difficult)
- [MAY] Workspaces may be used for minor variations of the same configuration (e.g., per-region deployments).

## Code Quality

### Formatting and Validation

- [MUST] Run `terraform fmt` and `terraform validate` before committing.
- [SHOULD] Automatically run `terraform fmt -check` and `terraform validate` in CI/CD pipelines.

### Security Scanning

- [SHOULD] Include Terraform security scanning tools (tfsec, Checkov, etc.) in CI/CD pipelines.

### Sensitive Variable Handling

- [MUST] Set `sensitive = true` for sensitive variables.
- **Good examples**:
  ```hcl
  variable "database_password" {
    type        = string
    description = "RDS 마스터 비밀번호"
    sensitive   = true
  }
  ```

## Anti-Patterns

- [MUST NOT] Do not use local State (`terraform.tfstate`) in team projects.
- [MUST NOT] Do not hardcode values that vary by environment. Extract them as variables.
  **Good examples**:
  ```hcl
  resource "aws_instance" "api" {
    ami           = var.api_ami_id
    instance_type = var.api_instance_type
    subnet_id     = module.networking.private_subnet_ids[0]
  }
  ```
- [MUST NOT] Do not manage all infrastructure in a single module or a single State.
- [MUST NOT] Do not manually transfer State files via Slack, email, shared drives, etc.
- [MUST NOT] Do not run `terraform apply` directly on the production environment without reviewing `terraform plan`.
- [SHOULD] Run production `terraform apply` through CI/CD pipelines and include an approval process for plan results.
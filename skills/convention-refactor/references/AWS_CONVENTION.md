# AWS Convention

> Defines rules applied to AWS infrastructure.
> Parent rules: INFRASTRUCTURE_CONVENTION.md

## Resource Naming

### Naming Pattern

- [MUST] All AWS resource names follow the `{env}-{service}-{resource}-{identifier}` pattern.

| Component | Description | Example |
|-----------|-------------|---------|
| `{env}` | Environment identifier | `dev`, `staging`, `prod` |
| `{service}` | Service/project name | `sellernote`, `api`, `web` |
| `{resource}` | Resource type | `rds`, `sg`, `s3`, `ecs` |
| `{identifier}` | Specific identifier (optional) | `main`, `replica`, `static` |

- **Good examples**:
  ```
  prod-sellernote-rds-main
  dev-api-ecs-cluster
  staging-web-s3-static
  prod-sellernote-sg-api
  ```

### Tag Strategy

- [MUST] Assign the following required tags to all AWS resources.

| Tag Key | Description | Example Value |
|---------|-------------|---------------|
| `Environment` | Environment | `dev`, `staging`, `production` |
| `Service` | Service/project name | `sellernote` |
| `Team` | Responsible team | `backend`, `infra` |
| `ManagedBy` | Management tool | `terraform`, `manual` |

- [SHOULD] Tag keys use `PascalCase`, and values use `lowercase`.
- **Good example**:
  ```hcl
  tags = {
    Environment = "production"
    Service     = "sellernote"
    Team        = "backend"
    ManagedBy   = "terraform"
  }
  ```

## IAM

### Role-Based Access

- [MUST] People (developers) access by assuming Roles through IAM Identity Center (SSO) instead of IAM Users.
- [MUST] Services/applications access AWS resources using IAM Roles. (EC2 Instance Profile, ECS Task Role, etc.)

### Policy Writing

- [MUST] IAM policies follow the principle of least privilege. Only explicitly allow the necessary services, actions, and resources.
- **Good example**:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::prod-sellernote-s3-uploads/*"
    }]
  }
  ```
  **Caution**: Wildcard policies such as `"Action": "s3:*", "Resource": "*"` are prohibited.

### IAM Policy Management Principles

- [SHOULD] Use managed policies instead of inline policies.
- [SHOULD] IAM policy changes are managed as code through Terraform.

## Network

### VPC Design

- [MUST] Do not use the default VPC; create a custom VPC suited to the purpose.
- [MUST] Plan VPC CIDRs to avoid conflicts with on-premises networks and other VPCs.

### Subnet Configuration

- [MUST] Separate public subnets and private subnets.

| Subnet Type | Purpose | Internet Access |
|-------------|---------|-----------------|
| Public | Load balancers (ALB), NAT Gateway, Bastion Host | Direct access through Internet Gateway |
| Private (App) | Application servers (ECS, EC2) | Outbound only through NAT Gateway |
| Private (Data) | Databases (RDS), caches (ElastiCache) | No internet access, accessible only from app subnets |

- [MUST] Subnets are distributed across at least 2 or more Availability Zones (AZs).

### Security Groups

- [MUST] Security groups explicitly allow only the necessary ports and sources. Minimize `0.0.0.0/0` inbound rules.
- [SHOULD] Use Security Group References to control communication between services.
- **Good example**:
  ```hcl
  resource "aws_security_group_rule" "rds_from_api" {
    type                     = "ingress"
    from_port                = 5432
    to_port                  = 5432
    protocol                 = "tcp"
    source_security_group_id = aws_security_group.api.id  # SG 참조
    security_group_id        = aws_security_group.rds.id
  }
  ```

## Cost Management

### Instance Selection

- [SHOULD] Select instance types that match the workload characteristics.

| Workload | Recommended Instance Family |
|----------|-----------------------------|
| General web servers | t3, t3a |
| Compute-intensive | c6i, c7g |
| Memory-intensive | r6i, r7g |

### Reserved / Savings Plans / Spot Usage

- [SHOULD] Apply Savings Plans or Reserved Instances to stably running production workloads.
- [MAY] Use Spot Instances for interruption-tolerant workloads such as batch jobs and development environments.

| Purchase Option | Discount Rate | Suitable Workloads |
|-----------------|---------------|-------------------|
| On-Demand | Base price | Short-term testing, unpredictable workloads |
| Savings Plans | ~72% | Stable production workloads |
| Spot | ~90% | Batch processing, dev/test, fault-tolerant workloads |

### Cost Tags

- [MUST] Assign `Service`, `Environment`, `Team` tags to all resources for cost tracking.
- [SHOULD] Monitor monthly costs using AWS Cost Explorer or AWS Budgets.

## Anti-Patterns

- [MUST NOT] Do not use the AWS root account for routine operations. Set up MFA on the root account and use it only in emergencies.
- [MUST NOT] Do not use wildcard policies such as `Action: "*"`, `Resource: "*"`.
- [MUST NOT] Do not create resources without specifying a region.
- [MUST NOT] Do not add `0.0.0.0/0` inbound rules to security groups for backend resources such as databases and caches.
- [MUST NOT] Do not deploy core services in a production environment to only a single Availability Zone.
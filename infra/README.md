# St. Joseph IoT Infrastructure

Terraform configuration for the St. Joseph IoT backend infrastructure in AWS.

## Scope

This stack currently manages:

- Amazon ECR repository for backend container images
- CloudWatch log group for backend ECS logs
- ECS cluster
- ECS backend task definition
- ECS backend service

This stack currently references, but does not manage:

- Existing VPC
- Existing public subnets
- Existing ECS service security group
- Existing backend target group
- Existing ECS task execution role
- Existing Secrets Manager secret

The ALB, listener, listener rule, VPC, subnets, route tables, IAM policies, ACM certificate, Route 53 records, and Secrets Manager values are intentionally not managed by this stack yet.

## Safety Notes

Do not commit Terraform state files:

```text
terraform.tfstate
terraform.tfstate.backup
.terraform/
```

Do not store AWS credentials or secret values in Terraform files.

Before making changes, run:

```bash
terraform plan
```

Only apply changes after the plan is fully understood.

## Current Expected Plan

After the completed imports, the expected result is:

```text
No changes. Your infrastructure matches the configuration.
```

## Documentation

Operational notes and import records are stored in:

```text
docs/
```


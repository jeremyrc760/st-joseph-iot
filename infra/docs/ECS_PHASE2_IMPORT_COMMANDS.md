# ECS Phase 2 Import Commands

These commands import the ECS-specific resources that are now represented in Terraform.

Do not run `terraform apply` during this phase.

Run all commands from:

```bash
cd /Users/rongchuanyin/Documents/aws/st-joseph-iot/infra
```

## 1. Format and Validate

```bash
terraform fmt
terraform validate
```

## 2. Import the Existing CloudWatch Log Group

Resource address:

```text
aws_cloudwatch_log_group.backend
```

Import command:

```bash
terraform import aws_cloudwatch_log_group.backend /ecs/st-joseph-iot-backend
```

Optional review:

```bash
terraform plan
```

Note: until all ECS Phase 2 resources are imported, `terraform plan` may still show the remaining unimported resources as `create`. Do not apply that plan.

## 3. Import the Existing ECS Cluster

Resource address:

```text
aws_ecs_cluster.main
```

Import command:

```bash
terraform import aws_ecs_cluster.main st-joseph-iot-cluster
```

Optional review:

```bash
terraform plan
```

Note: until all ECS Phase 2 resources are imported, `terraform plan` may still show the remaining unimported resources as `create`. Do not apply that plan.

## 4. Import the Existing ECS Task Definition

Resource address:

```text
aws_ecs_task_definition.backend
```

Import command:

```bash
terraform import aws_ecs_task_definition.backend arn:aws:ecs:us-east-1:697196251337:task-definition/st-joseph-iot-backend:3
```

Optional review:

```bash
terraform plan
```

Note: until all ECS Phase 2 resources are imported, `terraform plan` may still show the remaining unimported resources as `create`. Do not apply that plan.

## 5. Import the Existing ECS Service

Resource address:

```text
aws_ecs_service.backend
```

Import command:

```bash
terraform import aws_ecs_service.backend st-joseph-iot-cluster/st-joseph-iot-backend-service-vge00ihr
```

Final review:

```bash
terraform plan
```

After all four imports are complete, the goal is for this final plan to show no changes or only fully understood differences.

## Important Notes

- Do not commit `terraform.tfstate`.
- Do not store Secrets Manager secret values in Terraform.
- Do not import the shared or legacy-named ALB yet.
- Do not import VPC, subnets, route tables, security groups, ACM, Route 53, or IAM policies yet.
- Stop if `terraform plan` shows unexpected create, update, or destroy actions.

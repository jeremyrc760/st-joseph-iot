# ECS Import Planning Checklist

This checklist is for discovering the existing ECS deployment before writing or importing any ECS Terraform resources.

Do not run `terraform apply` during this phase.

## 1. Confirm Scope

Phase 2 should first document the existing ECS setup before Terraform manages it.

Target AWS account:

```text
697196251337
```

Target AWS region:

```text
us-east-1
```

Already imported in Phase 1:

```text
aws_ecr_repository.backend
```

## 2. Confirm AWS Account

```bash
aws sts get-caller-identity
```

Expected account:

```text
697196251337
```

Stop if the active AWS account is different.

## 3. Discover ECS Clusters

List ECS clusters in the target region:

```bash
aws ecs list-clusters \
  --region us-east-1
```

Record the cluster ARN and cluster name.

## 4. Discover ECS Services

After identifying the cluster, list services:

```bash
aws ecs list-services \
  --region us-east-1 \
  --cluster <cluster-name-or-arn>
```

Record each service ARN and service name.

## 5. Describe the ECS Service

```bash
aws ecs describe-services \
  --region us-east-1 \
  --cluster <cluster-name-or-arn> \
  --services <service-name>
```

Record:

- Cluster name
- Service name
- Desired count
- Launch type or capacity provider strategy
- Platform version
- Task definition ARN
- Deployment configuration
- Network configuration
- Load balancer target group ARN, if present
- Service security groups
- Service subnets
- Assign public IP setting

## 6. Describe the Task Definition

Use the task definition ARN from the ECS service output:

```bash
aws ecs describe-task-definition \
  --region us-east-1 \
  --task-definition <task-definition-arn>
```

Record:

- Task definition family
- Revision
- CPU and memory
- Network mode
- Execution role ARN
- Task role ARN, if present
- Container name
- Container image URI
- Container port mappings
- Environment variable names
- Secret names or ARNs only
- Log configuration

Do not retrieve secret values.

## 7. Identify Related Networking Resources

If the ECS service uses `awsvpc` networking, record subnet and security group details.

```bash
aws ec2 describe-subnets \
  --region us-east-1 \
  --subnet-ids <subnet-id-1> <subnet-id-2>
```

```bash
aws ec2 describe-security-groups \
  --region us-east-1 \
  --group-ids <security-group-id-1> <security-group-id-2>
```

For Phase 2, decide whether these should be imported as Terraform resources or referenced with `data` blocks.

## 8. Identify Related Load Balancer Resources

If the ECS service has a load balancer, record the target group:

```bash
aws elbv2 describe-target-groups \
  --region us-east-1 \
  --target-group-arns <target-group-arn>
```

Then identify the load balancer and listeners:

```bash
aws elbv2 describe-load-balancers \
  --region us-east-1
```

```bash
aws elbv2 describe-listeners \
  --region us-east-1 \
  --load-balancer-arn <load-balancer-arn>
```

For Phase 2, do not import ALB resources until the ECS dependency map is clear.

## 9. Identify IAM Roles

For the execution role and task role:

```bash
aws iam get-role \
  --role-name <role-name>
```

Record role names and ARNs only.

Do not modify IAM policies yet.

## 10. Identify Logs

If the task definition uses CloudWatch Logs, record the log group name from the container log configuration.

```bash
aws logs describe-log-groups \
  --region us-east-1 \
  --log-group-name-prefix <log-group-prefix>
```

For Phase 2, decide whether the log group should be imported, referenced, or left unmanaged.

## 11. Suggested Terraform Resource Addresses

Use simple, stable names when ECS resources are ready to import:

```text
aws_ecs_cluster.main
aws_ecs_service.backend
aws_ecs_task_definition.backend
```

Related resources may be added later only after discovery:

```text
aws_lb.main
aws_lb_listener.http
aws_lb_listener.https
aws_lb_target_group.backend
aws_security_group.ecs_service
aws_iam_role.ecs_task_execution
aws_iam_role.ecs_task
aws_cloudwatch_log_group.backend
```

Do not add or import these related resources until their ownership is clear.

## 12. Suggested Import Order

Recommended order after discovery is complete:

1. ECS cluster
2. Task definition
3. ECS service
4. Related target group, if Terraform will manage it
5. Related load balancer and listeners, if Terraform will manage them
6. Related security groups, if Terraform will manage them
7. Related IAM roles, if Terraform will manage them
8. Related CloudWatch log group, if Terraform will manage it

## 13. Stop Before Apply

After each import, run:

```bash
terraform plan
```

Do not run:

```bash
terraform apply
```

Only continue when the plan output is understood and there are no unexpected create, update, or destroy actions.


# Looks up existing AWS resources that the backend ECS service depends on.
# These dependencies are referenced by Terraform but are not owned by this stack yet.

data "aws_subnet" "public_1a" {
  id = local.existing_public_subnet_1a_id
}

data "aws_subnet" "public_1b" {
  id = local.existing_public_subnet_1b_id
}

data "aws_security_group" "ecs_service" {
  id = local.existing_ecs_security_group_id
}

data "aws_lb_target_group" "backend" {
  arn = local.existing_backend_target_group_arn
}

data "aws_iam_role" "ecs_task_execution" {
  name = local.ecs_task_execution_role_name
}

data "aws_secretsmanager_secret" "backend" {
  name = local.backend_secret_name
}

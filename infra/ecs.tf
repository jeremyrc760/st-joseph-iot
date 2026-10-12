# Manages the existing ECS cluster that runs the St. Joseph IoT backend service.
resource "aws_ecs_cluster" "main" {
  name = local.ecs_cluster_name

  configuration {
    # Keeps the imported cluster's default ECS Exec logging configuration unchanged.
    execute_command_configuration {
      logging = "DEFAULT"
    }
  }
}

removed {
  from = aws_ecs_task_definition.backend

  lifecycle {
    destroy = false
  }
}

# Manages the existing ECS service while leaving app image rollouts to CI/CD.
resource "aws_ecs_service" "backend" {
  name            = local.ecs_service_name
  cluster         = aws_ecs_cluster.main.arn
  task_definition = var.initial_task_definition_arn
  desired_count   = 1

  platform_version                   = "LATEST"
  scheduling_strategy                = "REPLICA"
  health_check_grace_period_seconds  = 60
  enable_ecs_managed_tags            = true
  propagate_tags                     = "NONE"
  enable_execute_command             = false
  availability_zone_rebalancing      = "ENABLED"
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 0
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  load_balancer {
    target_group_arn = data.aws_lb_target_group.backend.arn
    container_name   = local.backend_container_name
    container_port   = local.backend_container_port
  }

  network_configuration {
    subnets = [
      data.aws_subnet.public_1a.id,
      data.aws_subnet.public_1b.id,
    ]

    security_groups  = [data.aws_security_group.ecs_service.id]
    assign_public_ip = true
  }

  lifecycle {
    # GitHub Actions currently registers new task definition revisions for deployments.
    # Ignore this field so Terraform does not roll the service back to an older image tag.
    ignore_changes = [task_definition]
  }
}

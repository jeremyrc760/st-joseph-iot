# Centralizes stable names and IDs for the imported backend infrastructure.
locals {
  aws_account_id = "697196251337"
  aws_region     = "us-east-1"

  ecr_repository_name = "st-joseph-iot-backend"
  ecs_cluster_name    = "st-joseph-iot-cluster"
  ecs_service_name    = "st-joseph-iot-backend-service-vge00ihr"

  backend_container_name = "st-joseph-iot-backend"
  backend_container_port = 3000
  backend_image_tag      = "19ea2fbf96b69b5bbf6bd0f5c0a81e1e933782b1"

  backend_log_group_name        = "/ecs/st-joseph-iot-backend"
  backend_log_retention_in_days = 30

  existing_public_subnet_1a_id      = "subnet-0890f48526f3b657c"
  existing_public_subnet_1b_id      = "subnet-01dc482c5746a6f2c"
  existing_ecs_security_group_id    = "sg-0eb0c024d882833b6"
  existing_backend_target_group_arn = "arn:aws:elasticloadbalancing:us-east-1:697196251337:targetgroup/st-joseph-iot-backend-tg/7f70261c0972ae2e"

  ecs_task_execution_role_name = "ecsTaskExecutionRole"
  backend_secret_name          = "st-joseph-iot/backend"
}

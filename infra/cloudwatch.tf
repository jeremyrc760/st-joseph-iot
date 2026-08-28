# Manages the existing CloudWatch log group used by the backend ECS task.
resource "aws_cloudwatch_log_group" "backend" {
  name              = local.backend_log_group_name
  retention_in_days = local.backend_log_retention_in_days
  log_group_class   = "STANDARD"
}

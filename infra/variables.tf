variable "initial_task_definition_arn" {
  description = "Task Definition ARN used when initially creating the ECS Service. Subsequent revisions are managed by GitHub Actions CD."
  type        = string
}
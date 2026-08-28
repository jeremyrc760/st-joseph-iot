# Represents the existing backend ECR repository that will be imported into Terraform state.
resource "aws_ecr_repository" "backend" {
  # Repository used to store backend container images for the St. Joseph IoT app.
  name = local.ecr_repository_name

  # Prevents existing image tags from being overwritten after they are pushed.
  image_tag_mutability = "IMMUTABLE"
}

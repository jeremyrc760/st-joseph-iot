# Configures Terraform to manage resources in the target AWS account and region.
provider "aws" {
  region              = local.aws_region
  allowed_account_ids = [local.aws_account_id]
}

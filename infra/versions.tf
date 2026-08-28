# Defines the Terraform CLI and provider versions required for this infra stack.
terraform {
  required_version = ">= 1.7.0"

  # Uses the official AWS provider to manage AWS infrastructure resources.
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

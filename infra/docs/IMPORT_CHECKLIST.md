# Terraform Import Checklist for Existing ECR Repository

This checklist is for importing the existing Amazon ECR repository `st-joseph-iot-backend` into Terraform state.

Terraform must only manage the existing ECR repository in Phase 1. Do not run `terraform apply` yet.

## 1. Confirm the Target Directory

Run all Terraform commands from this directory:

```bash
cd /Users/rongchuanyin/Documents/aws/st-joseph-iot/infra
```

Expected Terraform files:

```text
versions.tf
providers.tf
ecr.tf
IMPORT_CHECKLIST.md
```

## 2. Confirm AWS Login and Account

Make sure your terminal is authenticated to AWS and pointing to the correct account.

```bash
aws sts get-caller-identity
```

Expected account:

```text
697196251337
```

If the account is different, stop and switch your AWS profile or credentials before continuing.

## 3. Confirm the Existing ECR Repository

Check that the repository already exists in `us-east-1`:

```bash
aws ecr describe-repositories \
  --region us-east-1 \
  --repository-names st-joseph-iot-backend
```

The repository should already exist before import. Terraform should not create a new repository for Phase 1.

## 4. Initialize Terraform

Initialize Terraform in the `infra/` directory:

```bash
terraform init
```

This downloads the AWS provider and prepares the local Terraform working directory.

## 5. Validate the Terraform Configuration

Run:

```bash
terraform validate
```

Expected result:

```text
Success! The configuration is valid.
```

## 6. Import the Existing ECR Repository

Use this Terraform resource address:

```text
aws_ecr_repository.backend
```

Import command:

```bash
terraform import aws_ecr_repository.backend st-joseph-iot-backend
```

This writes the existing AWS ECR repository into Terraform state. It does not create the repository.

## 7. Review the Terraform Plan

After import, run:

```bash
terraform plan
```

Best expected result:

```text
No changes. Your infrastructure matches the configuration.
```

If Terraform shows changes, do not run `terraform apply` yet. First compare the real ECR repository settings with `ecr.tf`, then update the Terraform configuration if needed.

## 8. Stop Before Apply

Do not run:

```bash
terraform apply
```

Phase 1 is complete when:

- Terraform has been initialized.
- The existing ECR repository has been imported.
- `terraform plan` has been reviewed.
- Any unexpected drift has been understood before applying changes.


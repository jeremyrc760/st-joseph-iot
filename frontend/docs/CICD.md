# Frontend CI/CD

The frontend is deployed as static files to Amazon S3 and served through CloudFront.

## Workflows

- `Frontend CI` runs on pull requests and pushes to `main` when frontend files change.
- `Frontend CD` runs on pushes to `main` when frontend files change, and can also be started manually with `workflow_dispatch`.

## Deployment Flow

1. Check out the repository.
2. Install Node.js 22.
3. Install frontend dependencies with `npm ci`.
4. Run `npm run lint`.
5. Run `npm run build` with production API endpoints.
6. Assume the AWS deployment role through GitHub OIDC.
7. Sync `frontend/dist/` to the private S3 bucket.
8. Create a CloudFront invalidation for `/*`.

## Production Endpoints

The production build uses:

```text
VITE_API_BASE_URL=https://api.jeremycloudlabs.com
VITE_SOCKET_URL=https://api.jeremycloudlabs.com
```

## AWS Resources

```text
S3 bucket: st-joseph-iot-frontend-697196251337
CloudFront distribution ID: E057T40JLUFCW
Frontend domain: https://app.jeremycloudlabs.com
Backend API domain: https://api.jeremycloudlabs.com
```

## Required AWS Permissions

The GitHub OIDC deployment role needs permission to update the frontend bucket and invalidate CloudFront:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DeployFrontendToS3",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::st-joseph-iot-frontend-697196251337"
    },
    {
      "Sid": "WriteFrontendObjects",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::st-joseph-iot-frontend-697196251337/*"
    },
    {
      "Sid": "InvalidateFrontendCloudFront",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "arn:aws:cloudfront::697196251337:distribution/E057T40JLUFCW"
    }
  ]
}
```

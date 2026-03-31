# 1. Create the Secret logical container
resource "aws_secretsmanager_secret" "imdb_api_key" {
  name        = "${local.env_name}/IMDB_API_KEY"
  description = "API Key for accessing the IMDB developer API"

  # If this secret is deleted, force immediate deletion 
  # for dev environments, but set recovery window for production.
  recovery_window_in_days = 0 
}

# 2. Set a placeholder value (Never commit real keys to IaC)
resource "aws_secretsmanager_secret_version" "imdb_api_key_val" {
  secret_id     = aws_secretsmanager_secret.imdb_api_key.id
  secret_string = jsonencode({
    API_KEY = "REPLACE_ME_IN_AWS_CONSOLE"
  })

  # Ignore changes so Terraform doesn't overwrite the real key once you set it manually
  lifecycle {
    ignore_changes = [secret_string]
  }
}

# 3. Attach Least-Privilege IAM Policy to the Lambda Execution Role
resource "aws_iam_role_policy" "lambda_secrets_access" {
  name = "${local.env_name}-SecretsAccessPolicy"
  role = aws_iam_role.lambda_exec.id # References the role created in serverless.tf

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "secretsmanager:GetSecretValue"
        # CRITICAL: Restrict access to ONLY this specific secret, not all secrets
        Resource = aws_secretsmanager_secret.imdb_api_key.arn
      }
    ]
  })
}

# Export the ARN to inject into Lambda environment variables
output "imdb_secret_arn" {
  value = aws_secretsmanager_secret.imdb_api_key.arn
}
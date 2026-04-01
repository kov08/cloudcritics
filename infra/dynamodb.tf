resource "aws_dynamodb_table" "main_table" {
  name         = "${local.env_name}-CloudCritics-Table"
  billing_mode = "PAY_PER_REQUEST" # Serverless, scales to 0, no baseline cost
  hash_key     = "PK"
  range_key    = "SK"

  # Define the attributes used for keys (DO NOT define non-key attributes here)
  attribute {
    name = "PK"
    type = "S" # String
  }
  
  attribute {
    name = "SK"
    type = "S" # String
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  # Global Secondary Index for querying "Recent Searches globally" or "Searches by Entity"
  global_secondary_index {
    name               = "GSI1"
    hash_key           = "GSI1PK"
    range_key          = "GSI1SK"
    projection_type    = "ALL" # Copies all attributes to the index
  }

  tags = {
    Name = "${local.env_name}-DynamoDB"
  }
}

# Grant Lambda permission to Write to the Table and Read from the GSI
resource "aws_iam_role_policy" "lambda_dynamodb_access" {
  name = "${local.env_name}-DynamoDBAccessPolicy"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:GetItem"
        ]
        Resource = [
          aws_dynamodb_table.main_table.arn,
          "${aws_dynamodb_table.main_table.arn}/index/*" # Grants access to the GSIs
        ]
      }
    ]
  })
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.main_table.name
}
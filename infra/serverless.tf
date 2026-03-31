# 1. Archive the Lambda code into a zip file
data "archive_file" "search_movies_zip" {
  type        = "zip"
  source_dir  = "../serverless/SearchMovies"
  output_path = "search_movies.zip"
}

# 2. IAM Role for Lambda to execute
resource "aws_iam_role" "lambda_exec" {
  name = "${local.env_name}-LambdaExecRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# Allow Lambda to write logs to CloudWatch
resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# 3. The Lambda Function
resource "aws_lambda_function" "search_movies" {
  filename         = data.archive_file.search_movies_zip.output_path
  function_name    = "${local.env_name}-SearchMovies"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.search_movies_zip.output_base64sha256

  environment {
    variables = {
      IMDB_API_URL = "https://api.imdb.com/v1/search"
      SECRET_KEY_NAME = aws_secretsmanager_secret.imdb_api_key.name
    }
  }
}

# 4. API Gateway (HTTP API)
resource "aws_apigatewayv2_api" "api" {
  name          = "${local.env_name}-API"
  protocol_type = "HTTP"
  
  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
  }
}

# 5. API Gateway JWT Authorizer attached to Cognito
resource "aws_apigatewayv2_authorizer" "cognito_auth" {
  api_id           = aws_apigatewayv2_api.api.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${local.env_name}-Cognito-Authorizer"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.client.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.pool.id}"
  }
}

# 6. API Gateway Integration with Lambda
resource "aws_apigatewayv2_integration" "search_integration" {
  api_id           = aws_apigatewayv2_api.api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.search_movies.invoke_arn
}

# 7. The Route (GET /movies)
resource "aws_apigatewayv2_route" "search_route" {
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "GET /movies"
  target             = "integrations/${aws_apigatewayv2_integration.search_integration.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito_auth.id
}

# 8. Grant API Gateway permission to invoke the Lambda
resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.search_movies.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

# 9. Default Stage Deployment
resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
}

output "api_gateway_url" {
  value = aws_apigatewayv2_api.api.api_endpoint
}
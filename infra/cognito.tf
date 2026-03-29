# infra/cognito.tf

resource "aws_cognito_user_pool" "pool" {
  name = "${local.env_name}-UserPool"

  # Users log in with their email, not a separate username
  alias_attributes         = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your CloudCritics Verification Code"
    email_message        = "Your verification code is {####}."
  }

  schema {
    attribute_data_type = "String"
    name                = "email"
    required            = true
    mutable             = true
  }

  tags = {
    Name = "${local.env_name}-Cognito-Pool"
  }
}

resource "aws_cognito_user_pool_client" "client" {
  name         = "${local.env_name}-AppClient"
  user_pool_id = aws_cognito_user_pool.pool.id

  # CRITICAL: False for SPAs. Secret keys cannot be hidden in React.
  generate_secret = false 

  # SRP (Secure Remote Password) protocol prevents password interception
  explicit_auth_flows = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]

  # Token validities
  access_token_validity  = 60 # Minutes
  id_token_validity      = 60 # Minutes
  refresh_token_validity = 30 # Days
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.pool.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.client.id
}
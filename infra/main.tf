# 1. Define the Provider (AWS)
provider "aws" {
  region = "us-east-1" # You can change this to your preferred region
}

# Fetch dynamically available Availability Zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Define a local variable for naming consistency
locals {
  env_name = "CloudCriticsProd"
}

# 2. The VPC (The Fence)
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${local.env_name}-VPC"
  }
}

# 3. Internet Gateway (The Front Door)
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.env_name}-IGW"
  }
}

# 4. Public Subnets (The Web-Facing Rooms)
resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "${local.env_name}-Public-Subnet-AZ1"
  }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true

  tags = {
    Name = "${local.env_name}-Public-Subnet-AZ2"
  }
}

# 5. Private Subnets (The Secure Vaults)
resource "aws_subnet" "private_1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.3.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = false # CRITICAL: No public IPs allowed

  tags = {
    Name = "${local.env_name}-Private-Subnet-AZ1"
  }
}

resource "aws_subnet" "private_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.4.0/24"
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = false

  tags = {
    Name = "${local.env_name}-Private-Subnet-AZ2"
  }
}

# 6. NAT Gateway (The One-Way Mail Slot)
resource "aws_eip" "nat_eip" {
  domain = "vpc"
  depends_on = [aws_internet_gateway.igw]
}

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat_eip.id
  subnet_id     = aws_subnet.public_1.id # Lives in the public subnet

  tags = {
    Name = "${local.env_name}-NAT-Gateway"
  }
}

# 7. Route Tables (The Hallway Signs)

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "${local.env_name}-Public-Routes"
  }
}

# Private Route Table
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id # Points to NAT, not IGW
  }

  tags = {
    Name = "${local.env_name}-Private-Routes"
  }
}

# 8. Route Table Associations (Nailing the signs to the walls)
resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_1" {
  subnet_id      = aws_subnet.private_1.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_2" {
  subnet_id      = aws_subnet.private_2.id
  route_table_id = aws_route_table.private.id
}

# 9. Outputs (Exports for future use)
output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_1_id" {
  value = aws_subnet.public_1.id
}

output "private_subnet_1_id" {
  value = aws_subnet.private_1.id
}
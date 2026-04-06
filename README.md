# 🎬 CloudCritics

**Enterprise-Grade Movie Analysis & Sentiment Engine**

CloudCritics is a highly scalable, distributed cloud application designed to search for movie data, analyze public sentiment using Natural Language Processing (NLP), and provide an interactive conversational AI assistant. 

This repository serves as a masterclass in modern backend engineering, Infrastructure as Code (IaC), event-driven microservices, and DevSecOps best practices.

---

## 🏗️ Architecture Overview

The application utilizes a **Hybrid Cloud Architecture**, blending containerized monolithic services (Web/App Tier) with event-driven serverless microservices for specialized compute and AI tasks.

* **Frontend:** React Single Page Application (SPA) with secure, in-memory JWT session management.
* **Core Backend:** Multi-stage Dockerized Node.js/Express API running on EC2 Auto Scaling Groups behind an Application Load Balancer (ALB).
* **Serverless Tier:** AWS API Gateway routing to isolated AWS Lambda functions for heavy AI compute and Pub/Sub integrations.
* **Persistence:** Amazon DynamoDB utilizing strict Single-Table Design patterns and Read-Through caching.

---

## 🛠️ Technology Stack

| Domain | Technologies Used |
| :--- | :--- |
| **Frontend** | React.js, React Router, Tailwind CSS, Axios |
| **Backend Compute** | Node.js, Express.js, Docker, AWS Lambda, Amazon EC2 |
| **Infrastructure (IaC)** | Terraform (HCL), AWS CloudFormation |
| **Database & Caching** | Amazon DynamoDB (Single-Table Design, GSIs, TTL) |
| **Identity & Security** | AWS Cognito (JWT/SRP), AWS WAFv2, IAM (Least Privilege), AWS Secrets Manager, CloudTrail |
| **Networking** | Custom VPC, Public/Private Subnets, NAT Gateways, ALB, VPC Endpoints |
| **AI / ML** | Amazon Lex V2 (NLU), Amazon Comprehend (NLP Sentiment Analysis) |
| **Event-Driven (EDA)**| Amazon SNS (Pub/Sub) |

---

## 🚀 Key Engineering Highlights (System Design)

### 1. Network Isolation & Security (Defense in Depth)
* **Custom VPC:** Implemented a strict 2-tier network. Public subnets host the ALB and NAT Gateways; Private subnets host all EC2 compute resources.
* **Stateful Firewalls:** Configured Security Group referencing (ALB -> EC2) to mathematically prevent direct internet access to the application tier.
* **VPC Endpoints:** Database queries to DynamoDB are routed through private Gateway Endpoints, ensuring sensitive data never traverses the public internet.
* **WAF Integration:** Layer 7 Web Application Firewall actively mitigates OWASP Top 10 vulnerabilities (XSS, SQLi).

### 2. High Availability & Scalability
* **Auto Scaling:** Integrated EC2 Target Tracking Policies (70% CPU threshold) with immutable Launch Templates.
* **Stateless Authentication:** Transitioned from database-backed sessions to stateless Cognito JWT validation via Express middleware, enabling infinite horizontal scaling.

### 3. Advanced Persistence & Caching
* **Single-Table Design:** Consolidated Users, Search History, and Sentiment Scorecards into a single DynamoDB table using `PK` and `SK` access patterns for consistent $O(1)$ read latency.

### 4. AI & Event-Driven Microservices
* **NLP Batch Processing:** Engineered resilient data-transformation pipelines to chunk and sanitize data against strict AWS Comprehend API limits (5,000 bytes/25 items), handling partial batch failures gracefully.
* **Conversational NLU:** Built a Backend-For-Frontend (BFF) proxy Lambda to securely manage stateful Amazon Lex sessions without exposing AWS credentials to the browser.
* **Fan-Out Pub/Sub:** Decoupled the newsletter registration flow using Amazon SNS, handling idempotent asynchronous email verifications.

---

## 💻 Local Development Setup

### Prerequisites
* Node.js (v18+)
* Docker & Docker Compose
* Terraform CLI
* AWS CLI (configured with appropriate credentials)

### Running the Application

**1. Clone the repository**
```bash
git clone https://github.com/yourusername/cloudcritics.git
cd cloudcritics
```

**2. Start the Backend & Frontend via Docker Compose**
```bash
# This spins up the Express API (port 3001) and React Frontend (port 3000)
docker-compose up --build
```

**3. Environment Variables**
Copy the example environment files and populate them with your AWS resource ARNs (generated via Terraform outputs).
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

---

## ☁️ Infrastructure Deployment

The infrastructure is entirely codified using Terraform. To deploy to your AWS account:

```bash
cd infra

# Initialize Terraform providers
terraform init

# Review the infrastructure execution plan
terraform plan

# Deploy the infrastructure
terraform apply
```
*(Note: Ensure you run `terraform destroy` when finished to prevent incurring continuous charges for the NAT Gateway and ALB).*

---

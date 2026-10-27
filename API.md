# WhatsApp AI Automation SaaS — API Specification

## 1. API Principles

Base path:

```text
/api/v1
```

Use:

- HTTPS
- authenticated requests
- server-side authorisation
- request validation
- pagination
- consistent JSON responses
- stable resource identifiers
- idempotency for retryable operations
- rate limiting

## 2. Authentication

Suggested endpoints:

```text
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/me
```

Example response:

```json
{
  "data": {
    "id": "user-id",
    "name": "Example User",
    "email": "user@example.com"
  }
}
```

Use the repository's existing authentication mechanism if one already exists.

## 3. Business

```text
GET    /business
PATCH  /business
GET    /business/members
POST   /business/members
PATCH  /business/members/{member}
DELETE /business/members/{member}
```

Do not allow a client to access another tenant by changing an ID.

## 4. WhatsApp

```text
GET    /whatsapp/accounts
POST   /whatsapp/accounts/connect
GET    /whatsapp/accounts/{account}
DELETE /whatsapp/accounts/{account}

GET    /whatsapp/phone-numbers
POST   /whatsapp/phone-numbers/sync

GET    /whatsapp/templates
POST   /whatsapp/templates/sync
```

Provider-specific connection requirements should be isolated inside the WhatsApp integration module.

## 5. Webhooks

```text
GET  /webhooks/whatsapp
POST /webhooks/whatsapp
POST /webhooks/payment
```

Webhook requirements:

1. Verify provider challenge/signature as required.
2. Identify provider.
3. Resolve tenant.
4. Check duplicate external event ID.
5. Persist event.
6. Return success quickly.
7. Queue processing.
8. Mark event processed/failed.

Never perform long AI work directly inside the webhook HTTP request.

## 6. Customers

```text
GET    /customers
POST   /customers
GET    /customers/{customer}
PATCH  /customers/{customer}
DELETE /customers/{customer}

POST   /customers/{customer}/tags
DELETE /customers/{customer}/tags/{tag}
POST   /customers/{customer}/assign
```

Query parameters:

```text
search
status
tag
assigned_user
source
page
per_page
sort
```

## 7. Conversations

```text
GET   /conversations
POST  /conversations/{conversation}/assign
POST  /conversations/{conversation}/close
POST  /conversations/{conversation}/reopen
PATCH /conversations/{conversation}
GET   /conversations/{conversation}/messages
POST  /conversations/{conversation}/messages
POST  /conversations/{conversation}/notes
```

Example send request:

```json
{
  "type": "text",
  "body": "Hello, how can I help?"
}
```

The API should create a message record and queue external delivery where appropriate.

## 8. Messages

```text
GET /conversations/{conversation}/messages
POST /conversations/{conversation}/messages
GET /messages/{message}
```

Message direction:

```text
inbound
outbound
```

Message types may include:

```text
text
image
video
audio
document
template
interactive
system
```

## 9. Products

```text
GET    /products
POST   /products
GET    /products/{product}
PATCH  /products/{product}
DELETE /products/{product}

GET    /product-categories
POST   /product-categories
PATCH  /product-categories/{category}
DELETE /product-categories/{category}
```

Product list parameters:

```text
search
category
status
stock_status
page
per_page
```

## 10. Orders

```text
GET   /orders
POST  /orders
GET   /orders/{order}
PATCH /orders/{order}
POST  /orders/{order}/confirm
POST  /orders/{order}/cancel
```

Order creation:

```json
{
  "customer_id": "customer-id",
  "items": [
    {
      "product_id": "product-id",
      "quantity": 2
    }
  ],
  "notes": "Deliver in the evening"
}
```

The server must calculate authoritative prices. Never trust client-submitted totals.

## 11. Automation

```text
GET    /automations
POST   /automations
GET    /automations/{automation}
PATCH  /automations/{automation}
DELETE /automations/{automation}

POST   /automations/{automation}/activate
POST   /automations/{automation}/pause
POST   /automations/{automation}/test

GET    /automations/{automation}/runs
GET    /automation-runs/{run}
```

## 12. Automation Definition

Initial representation can be JSON:

```json
{
  "trigger": {
    "type": "message_received"
  },
  "nodes": [
    {
      "key": "welcome",
      "type": "send_message",
      "config": {
        "body": "Welcome!"
      }
    },
    {
      "key": "ai",
      "type": "ai",
      "config": {
        "agent_id": "agent-id"
      }
    }
  ]
}
```

The actual schema must be versioned so future workflow changes do not silently break existing automations.

## 13. AI

```text
GET   /ai/agents
POST  /ai/agents
GET   /ai/agents/{agent}
PATCH /ai/agents/{agent}
DELETE /ai/agents/{agent}

POST  /ai/agents/{agent}/test
GET   /ai/usage
```

## 14. Knowledge Base

```text
GET    /knowledge/sources
POST   /knowledge/sources
GET    /knowledge/sources/{source}
DELETE /knowledge/sources/{source}

POST   /knowledge/documents
GET    /knowledge/documents
DELETE /knowledge/documents/{document}
POST   /knowledge/documents/{document}/reprocess
```

Document processing should be asynchronous.

## 15. Campaigns

```text
GET    /campaigns
POST   /campaigns
GET    /campaigns/{campaign}
PATCH  /campaigns/{campaign}
DELETE /campaigns/{campaign}

POST   /campaigns/{campaign}/test
POST   /campaigns/{campaign}/schedule
POST   /campaigns/{campaign}/pause
POST   /campaigns/{campaign}/cancel

GET    /campaigns/{campaign}/metrics
```

Campaign sending must use approved provider mechanisms and business-configured templates.

## 16. Billing

```text
GET  /billing/plans
GET  /billing/subscription
POST /billing/checkout
POST /billing/change-plan
POST /billing/cancel
GET  /billing/invoices
GET  /billing/usage
```

Provider webhooks:

```text
POST /webhooks/payment
```

## 17. Analytics

```text
GET /analytics/overview
GET /analytics/conversations
GET /analytics/customers
GET /analytics/leads
GET /analytics/orders
GET /analytics/campaigns
GET /analytics/ai
GET /analytics/usage
```

All analytics endpoints must enforce tenant scope.

## 18. Pagination

Recommended response:

```json
{
  "data": [],
  "meta": {
    "current_page": 1,
    "per_page": 25,
    "total": 100
  }
}
```

Use cursor pagination for very large/high-volume streams when appropriate.

## 19. Error Format

Recommended:

```json
{
  "message": "Validation failed.",
  "errors": {
    "phone": [
      "The phone field is required."
    ]
  },
  "code": "VALIDATION_ERROR"
}
```

Do not expose stack traces or secrets in production.

## 20. HTTP Status Conventions

```text
200 OK
201 Created
202 Accepted
204 No Content
400 Bad Request
401 Unauthenticated
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
429 Rate Limited
500 Server Error
502 Provider Error
503 Service Unavailable
```

## 21. Idempotency

Operations that may be retried should support idempotency.

Examples:

- outbound message creation
- payment handling
- webhook processing
- campaign scheduling

Use provider IDs or client idempotency keys where appropriate.

## 22. Authorisation

Every protected endpoint must check:

1. authenticated user
2. business membership
3. role/permission
4. ownership/tenant scope
5. resource-level policy where needed

## 23. Rate Limiting

Apply appropriate limits to:

- login
- password reset
- public webhook endpoints
- AI test endpoints
- message sending
- campaign actions
- expensive analytics

Provider-specific sending limits must also be respected.

## 24. API Security Rules

Never:

- accept arbitrary business_id as proof of tenant access
- expose provider credentials
- trust client-calculated order totals
- skip validation
- return internal exception traces
- synchronously perform large AI/document operations in ordinary HTTP requests

## 25. API Versioning

Start with:

```text
/api/v1
```

Breaking changes should use a new API version rather than silently changing existing contracts.

## 26. Testing Requirements

At minimum, feature tests should cover:

- authentication
- tenant isolation
- customer CRUD
- conversation access
- message sending
- webhook idempotency
- automation execution
- AI handover
- order totals
- subscription limits
- billing webhook processing
- permission enforcement

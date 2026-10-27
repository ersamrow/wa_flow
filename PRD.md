# WhatsApp AI Automation SaaS — Product Requirements Document

## 1. Product Summary

Build a multi-tenant SaaS platform that helps small and medium businesses automate customer communication and sales through the official WhatsApp Business Platform.

The product combines:

- WhatsApp messaging
- Unified inbox
- CRM
- Automation workflows
- AI customer assistant
- Knowledge base
- Product catalogue
- Orders
- Campaigns
- Notifications
- Billing and usage metering
- Analytics
- Super-admin operations

### Product principle

The product is not merely a chatbot. It should become a WhatsApp operating system for SMBs:

`WhatsApp + CRM + AI + Automation + Sales + Orders + Support + Analytics`

## 2. Target Customers

Initial target:

- Indian SMBs
- Retailers
- Kids-wear and clothing sellers
- Service businesses
- Clinics
- Education businesses
- Restaurants
- Wholesalers
- Real-estate businesses
- E-commerce sellers

Start with one vertical where reusable automations can create fast customer value. Retail/e-commerce is a suitable initial vertical because product enquiries, catalogue sharing, lead capture, order updates and follow-ups are easy to standardise.

## 3. Goals

### Business goals

- Generate recurring SaaS revenue.
- Reduce manual customer-support work.
- Improve lead response speed.
- Increase lead-to-order conversion.
- Make automation usable by non-technical businesses.
- Keep AI and infrastructure costs predictable.
- Create an extensible platform for additional channels later.

### Product goals

- A business can connect its official WhatsApp number.
- Incoming WhatsApp messages appear in a unified inbox.
- Agents can manually reply.
- Basic automations can respond automatically.
- AI can answer from business-approved knowledge.
- AI can hand conversations to humans.
- Businesses can manage customers, products and orders.
- Campaigns can be created and measured.
- Usage and subscription limits are enforced.
- Every tenant's data remains isolated.

## 4. Non-Goals for MVP

Do not initially build:

- Native mobile applications
- Voice AI
- Instagram integration
- Facebook Messenger integration
- SMS platform
- Advanced white-labeling
- Complex enterprise SSO
- Fully autonomous financial actions
- Unlimited AI usage
- Arbitrarily complex visual workflow editing

Build the core engine first. Add these after the core product is reliable.

## 5. User Roles

### Owner

Full access including billing and business settings.

### Admin

Business configuration, users, WhatsApp, CRM, automation, campaigns and reports.

### Manager

Customers, inbox, automation, campaigns and reports.

### Agent

Inbox and customer interactions.

### Viewer

Read-only access where permitted.

## 6. Main User Journey

1. Register.
2. Create business.
3. Invite team members.
4. Connect official WhatsApp Business Platform account.
5. Verify phone/webhook connection.
6. Import or create customers.
7. Add products/services.
8. Configure business profile and FAQs.
9. Create or activate an automation.
10. Configure AI knowledge.
11. Test with a controlled conversation.
12. Activate automation.
13. Customer sends WhatsApp message.
14. Webhook is received.
15. Message is stored.
16. Customer/conversation is identified.
17. Automation and AI determine the response.
18. Response is queued and sent.
19. Delivery/read status is recorded.
20. Human agent can take over at any time.
21. Business sees analytics and usage.

## 7. MVP Features

### Authentication and tenancy

- Registration
- Login/logout
- Password reset
- Business creation
- Team members
- Roles and permissions
- Tenant isolation
- Business settings

### WhatsApp

- Official WhatsApp Business Platform integration
- Phone number connection
- Webhook verification
- Incoming messages
- Outgoing messages
- Text/media support
- Message statuses
- Template support
- Error handling
- Webhook idempotency

### Inbox

- Conversation list
- Chat view
- Search
- Unread state
- Assignment
- Tags
- Internal notes
- Customer profile
- AI/human mode
- Attachments

### CRM

- Customers
- Leads
- Status
- Tags
- Custom fields
- Source
- Assigned agent
- Activity history

### Automation

- Message received trigger
- New customer trigger
- Tag trigger
- Schedule trigger
- Order/payment triggers where applicable
- Conditions
- Send message
- Send template
- Add/remove tag
- Assign agent
- Create lead
- Wait/delay
- AI action
- Human handover
- Webhook action
- Run history
- Error logging

### AI

- Business-specific assistant
- FAQ/knowledge base
- Product knowledge
- Document ingestion
- Retrieval-based answers
- Guardrails
- Human handover
- AI usage tracking

### Products

- Categories
- Products
- SKU
- Price
- Images
- Variants
- Stock/status
- Product search

### Orders

- Create order
- Order items
- Status
- Payment state
- Customer association
- Order notifications

### Campaigns

- Audience filters
- Approved templates
- Scheduling
- Queue-based sending
- Delivery/read/failure metrics

### Billing

- Plans
- Subscription
- Trial
- Upgrade/downgrade
- Cancellation
- Usage tracking
- Invoice records
- Payment webhooks
- Grace period

### Admin

- Businesses
- Users
- WhatsApp connections
- Subscriptions
- Usage
- Campaigns
- System errors
- Audit logs

## 8. Functional Requirements

### FR-01 Multi-tenancy

Every tenant-owned record MUST belong to a business.

The backend MUST enforce tenant scoping. Frontend filtering alone is not acceptable.

### FR-02 WhatsApp webhooks

Webhook processing MUST:

- Validate provider signatures where supported.
- Identify the correct tenant.
- Be idempotent.
- Persist the provider event/message identifier.
- Return quickly.
- Queue expensive processing.
- Record failures.

### FR-03 Messaging

Messages MUST have lifecycle/status information sufficient to determine:

- queued
- sent
- delivered
- read
- failed

Provider-specific statuses should be normalised into internal statuses.

### FR-04 Inbox

Agents MUST be able to:

- view conversations
- send replies
- assign conversations
- add notes
- add/remove tags
- switch between AI and human handling

### FR-05 Automation

Automation execution MUST be asynchronous when an action may be slow, externally dependent, or expensive.

Automation runs MUST be traceable.

### FR-06 AI

AI MUST be grounded in business-approved information.

When information is unavailable or confidence is insufficient, the system should avoid inventing facts and may hand the conversation to a human.

### FR-07 Usage

Track at minimum:

- WhatsApp messages
- AI requests/tokens/cost
- campaigns
- automation executions
- contacts
- users
- storage

### FR-08 Billing

Subscription limits MUST be checked server-side.

A frontend-only usage restriction is invalid.

## 9. Non-Functional Requirements

### Security

- HTTPS
- Secure authentication
- Authorisation policies
- Tenant isolation
- Rate limiting
- Request validation
- Secret management
- Encrypted sensitive credentials
- Webhook verification
- Audit logs
- Backups

### Performance

Targets for a healthy production deployment:

- Normal API requests should generally complete within 500 ms where practical.
- Dashboard pages should avoid loading unnecessary records.
- Heavy work should use queues.
- Lists must be paginated.
- Avoid N+1 database queries.
- Add indexes based on real query patterns.

### Reliability

- Idempotent webhook processing
- Retry policies
- Failed job handling
- Dead-letter/failed-job visibility
- Monitoring
- Database backups
- Safe deployments

## 10. AI Cost Strategy

Do not call an expensive AI model for every message.

Preferred decision path:

1. Rule-based response where possible.
2. Exact/semantic knowledge lookup where sufficient.
3. Lower-cost model for normal questions.
4. Stronger model only for complex cases.
5. Human handover when appropriate.

AI cost must be visible per tenant.

## 11. Suggested Plans

Initial commercial structure:

| Plan | Indicative price | Purpose |
|---|---:|---|
| Starter | ₹999/month | Small businesses |
| Business | ₹2,499/month | Growing businesses |
| Pro | ₹4,999/month | Higher usage |
| Enterprise | Custom | Large/agency customers |

These are product-planning placeholders, not provider pricing.

WhatsApp/provider charges and AI usage should be tracked separately so the business does not accidentally sell unlimited variable-cost usage.

## 12. Analytics

Track:

### Business metrics

- Customers
- Leads
- Conversations
- Orders
- Revenue
- Conversion
- Response time

### AI metrics

- AI conversations
- AI resolution
- Human handover
- AI requests
- Token usage
- Estimated cost

### Campaign metrics

- Sent
- Delivered
- Read
- Failed
- Replies
- Leads
- Orders

### SaaS metrics

- MRR
- ARPU
- Churn
- Active businesses
- Usage per business
- Gross margin
- AI cost/customer
- Messaging cost/customer

## 13. Acceptance Criteria

MVP is considered usable when:

- A new business can register.
- Tenant data is isolated.
- A business can connect its official WhatsApp account.
- Incoming messages are received and stored.
- An agent can reply.
- Conversation status is tracked.
- A basic automation can reply automatically.
- AI can answer from configured knowledge.
- AI can hand over to an agent.
- Customers can be tagged and assigned.
- Products can be stored and searched.
- Usage is recorded.
- Subscription limits are enforced.
- Errors are visible to administrators.
- Automated tests cover critical flows.

## 14. Product Principles

1. Prefer simple architecture over premature complexity.
2. Keep controllers thin.
3. Reuse existing project conventions.
4. Avoid unnecessary dependencies.
5. Use queues for expensive work.
6. Make integrations replaceable through service interfaces.
7. Never trust tenant IDs supplied by clients.
8. Never expose secrets to the frontend.
9. Make webhook processing idempotent.
10. Measure before optimising.
11. Do not rewrite unrelated working code.
12. Every important feature needs tests.

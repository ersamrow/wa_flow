# WhatsApp AI Automation SaaS — Database Design

## 1. Database

Initial recommendation:

- MySQL
- InnoDB
- UTC timestamps at application/database boundary
- UUID/ULID or integer IDs according to existing project conventions
- Foreign keys for strong relational integrity where appropriate

If the existing application already uses one identifier strategy consistently, preserve it.

## 2. Core Rules

1. Every tenant-owned table should have `business_id`.
2. Add indexes based on query patterns.
3. Use foreign keys for internal relational data where practical.
4. Use soft deletes only where business recovery/audit value justifies them.
5. Never store provider secrets in plaintext.
6. Store provider IDs needed for idempotency.
7. Use decimal types for monetary values.
8. Never use floating point for money.
9. Use JSON only for genuinely flexible structures.
10. Avoid unbounded JSON as a replacement for relational data.

## 3. businesses

Purpose: tenant/business account.

Fields:

```text
id
name
slug
legal_name
email
phone
country
timezone
currency
status
settings_json
created_at
updated_at
deleted_at
```

Indexes:

```text
unique(slug)
index(status)
```

## 4. users

Fields:

```text
id
name
email
password
email_verified_at
status
last_login_at
created_at
updated_at
```

Index:

```text
unique(email)
```

## 5. business_users

Business membership.

```text
id
business_id
user_id
role_id
status
created_at
updated_at
```

Constraints:

```text
unique(business_id, user_id)
```

## 6. roles

```text
id
name
slug
created_at
updated_at
```

## 7. permissions

```text
id
name
slug
created_at
updated_at
```

## 8. role_permissions

```text
role_id
permission_id
```

## 9. whatsapp_accounts

```text
id
business_id
provider
provider_account_id
display_name
status
credentials_encrypted
metadata_json
last_synced_at
created_at
updated_at
```

Indexes:

```text
index(business_id)
unique(provider, provider_account_id)
```

## 10. whatsapp_phone_numbers

```text
id
business_id
whatsapp_account_id
provider_phone_number_id
phone_number
display_name
status
verification_status
metadata_json
created_at
updated_at
```

Indexes:

```text
index(business_id)
unique(provider_phone_number_id)
index(phone_number)
```

## 11. whatsapp_templates

```text
id
business_id
whatsapp_phone_number_id
provider_template_id
name
language
category
status
components_json
metadata_json
created_at
updated_at
```

Unique provider identifiers where applicable.

## 12. webhook_events

Store inbound provider events for audit/idempotency.

```text
id
business_id nullable
provider
external_event_id
event_type
payload_json
status
processed_at
error_message
created_at
updated_at
```

Indexes:

```text
unique(provider, external_event_id)
index(business_id, created_at)
index(status)
```

## 13. customers

```text
id
business_id
name
phone
email
address
country
city
source
status
assigned_user_id nullable
custom_fields_json
last_contacted_at
created_at
updated_at
deleted_at
```

Indexes:

```text
index(business_id, phone)
index(business_id, status)
index(business_id, assigned_user_id)
index(business_id, created_at)
```

Consider a tenant-scoped unique phone constraint if the product requires one customer record per phone number.

## 14. tags

```text
id
business_id
name
slug
created_at
updated_at
```

Unique:

```text
unique(business_id, slug)
```

## 15. customer_tags

```text
customer_id
tag_id
```

Unique pair:

```text
unique(customer_id, tag_id)
```

## 16. conversations

```text
id
business_id
customer_id
whatsapp_phone_number_id
status
channel
assigned_user_id nullable
mode
priority
last_message_at
unread_count
metadata_json
created_at
updated_at
closed_at nullable
```

Suggested statuses:

```text
open
pending
closed
```

Suggested modes:

```text
ai
human
hybrid
```

Indexes:

```text
index(business_id, status)
index(business_id, assigned_user_id, status)
index(business_id, last_message_at)
index(customer_id)
```

## 17. conversation_participants

```text
id
conversation_id
type
external_id nullable
name nullable
metadata_json
created_at
updated_at
```

## 18. messages

```text
id
business_id
conversation_id
customer_id nullable
direction
message_type
provider_message_id nullable
status
body nullable
template_name nullable
metadata_json
sent_at nullable
delivered_at nullable
read_at nullable
failed_at nullable
created_at
updated_at
```

Indexes:

```text
unique(provider_message_id) where provider guarantees global uniqueness
index(business_id, conversation_id, created_at)
index(conversation_id, created_at)
index(business_id, status)
```

Provider IDs may need a composite uniqueness rule if they are only unique per account.

## 19. message_media

```text
id
business_id
message_id
storage_disk
storage_path
mime_type
file_name
file_size
provider_media_id nullable
metadata_json
created_at
updated_at
```

## 20. products

```text
id
business_id
category_id nullable
name
slug
sku
description
price
compare_at_price nullable
currency
status
stock_quantity
metadata_json
created_at
updated_at
deleted_at
```

Indexes:

```text
index(business_id, status)
index(business_id, category_id)
index(business_id, sku)
index(business_id, name)
```

## 21. product_categories

```text
id
business_id
name
slug
parent_id nullable
sort_order
status
created_at
updated_at
```

## 22. product_variants

```text
id
product_id
sku
name
attributes_json
price nullable
stock_quantity
status
created_at
updated_at
```

## 23. orders

```text
id
business_id
customer_id
order_number
status
payment_status
currency
subtotal
discount
tax
shipping
total
notes
metadata_json
created_at
updated_at
```

Indexes:

```text
unique(business_id, order_number)
index(business_id, status)
index(business_id, payment_status)
index(customer_id, created_at)
```

Money fields should use `DECIMAL`.

## 24. order_items

```text
id
order_id
product_id nullable
product_variant_id nullable
name
sku nullable
quantity
unit_price
discount
total
metadata_json
created_at
updated_at
```

## 25. payments

```text
id
business_id
order_id nullable
provider
provider_payment_id
amount
currency
status
paid_at nullable
failure_reason nullable
metadata_json
created_at
updated_at
```

Indexes:

```text
index(business_id, status)
unique(provider, provider_payment_id)
```

## 26. automations

```text
id
business_id
name
description
status
trigger_type
version
settings_json
created_by
created_at
updated_at
```

Statuses:

```text
draft
active
paused
archived
```

## 27. automation_nodes

```text
id
automation_id
node_key
node_type
position_json
config_json
sort_order
created_at
updated_at
```

Node types may include:

```text
trigger
condition
send_message
send_template
tag
assign
delay
ai
human_handover
webhook
create_lead
```

## 28. automation_runs

```text
id
business_id
automation_id
conversation_id nullable
customer_id nullable
status
current_node_key nullable
context_json
started_at
completed_at nullable
failed_at nullable
error_message nullable
created_at
updated_at
```

## 29. automation_run_logs

```text
id
automation_run_id
node_key
status
input_json
output_json
error_message nullable
started_at
completed_at nullable
created_at
```

## 30. ai_agents

```text
id
business_id
name
status
system_instructions
model_config_json
handover_config_json
created_at
updated_at
```

## 31. knowledge_sources

```text
id
business_id
type
name
source_url nullable
status
metadata_json
created_at
updated_at
```

Types:

```text
document
website
faq
product
custom
```

## 32. knowledge_documents

```text
id
business_id
knowledge_source_id
file_name
mime_type
storage_path nullable
content_hash
status
metadata_json
created_at
updated_at
```

## 33. knowledge_chunks

```text
id
business_id
knowledge_document_id
chunk_index
content
embedding_reference nullable
metadata_json
created_at
updated_at
```

If a vector database is introduced later, retain the source/chunk IDs for traceability.

## 34. ai_conversations

```text
id
business_id
conversation_id
ai_agent_id
status
model
input_tokens
output_tokens
estimated_cost
started_at
completed_at
created_at
updated_at
```

## 35. ai_usage

```text
id
business_id
provider
model
request_count
input_tokens
output_tokens
estimated_cost
period_start
period_end
created_at
updated_at
```

## 36. campaigns

```text
id
business_id
name
status
template_id
audience_definition_json
scheduled_at nullable
started_at nullable
completed_at nullable
created_by
created_at
updated_at
```

## 37. campaign_recipients

```text
id
campaign_id
customer_id
status
provider_message_id nullable
sent_at nullable
delivered_at nullable
read_at nullable
failed_at nullable
failure_reason nullable
created_at
updated_at
```

## 38. plans

```text
id
name
slug
price_monthly
price_yearly nullable
currency
limits_json
features_json
status
created_at
updated_at
```

## 39. subscriptions

```text
id
business_id
plan_id
provider
provider_subscription_id nullable
status
trial_ends_at nullable
current_period_start
current_period_end
cancel_at_period_end
cancelled_at nullable
created_at
updated_at
```

## 40. usage_records

```text
id
business_id
metric
quantity
period_start
period_end
metadata_json
created_at
updated_at
```

Metrics:

```text
whatsapp_messages
ai_requests
ai_tokens
campaign_messages
automation_runs
contacts
users
storage_bytes
```

## 41. invoices

```text
id
business_id
subscription_id
provider_invoice_id nullable
invoice_number
status
subtotal
tax
total
currency
issued_at
due_at nullable
paid_at nullable
metadata_json
created_at
updated_at
```

## 42. audit_logs

```text
id
business_id nullable
user_id nullable
action
subject_type
subject_id nullable
ip_address nullable
user_agent nullable
old_values_json nullable
new_values_json nullable
created_at
```

## 43. system_logs

Use application logging infrastructure rather than unnecessarily duplicating framework logs in MySQL. A database table should only be introduced if there is a concrete product/admin requirement.

## 44. Important Relationships

```text
Business
 ├── Users
 ├── WhatsApp Accounts
 ├── Customers
 ├── Conversations
 ├── Products
 ├── Automations
 ├── AI Agents
 ├── Campaigns
 └── Subscription

Customer
 ├── Conversations
 ├── Orders
 ├── Tags
 └── Activities

Conversation
 ├── Messages
 └── Automation Runs

Order
 ├── Order Items
 └── Payments
```

## 45. Migration Strategy

For every migration:

1. Add table/column.
2. Add required indexes.
3. Add foreign keys where safe.
4. Consider existing production data.
5. Avoid destructive changes in one deployment.
6. Backfill large datasets asynchronously.
7. Add constraints after data is clean if necessary.

## 46. Query Optimisation Rules

Before adding an index:

- Identify actual query.
- Check filter/order columns.
- Consider cardinality.
- Check existing indexes.
- Avoid excessive indexes on high-write tables.

For conversations/messages, indexes must reflect real inbox queries because these tables can become the highest-volume tables.

## 47. Data Retention

Retention should be configurable by product/legal requirements.

Potentially large data:

- raw webhook payloads
- message media
- message history
- AI logs
- campaign recipient records
- automation logs

Do not retain unlimited data without a reason.

## 48. Backup Requirements

Production:

- automated database backups
- tested restore procedure
- object storage backup/versioning where appropriate
- retention policy
- backup monitoring

A backup is not considered reliable until restore has been tested.

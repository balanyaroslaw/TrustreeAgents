Build a small payment processing simulator: a backend service that simulates card payments. It never touches real money, real cards or personal data. No authentication, no user interface, nothing beyond what is listed here.

1. Create test payments through the API
POST /payments with the header Idempotency-Key and the JSON body {"amount": <integer>, "currency": "<3 uppercase letters, e.g. USD>"}. Any other field is rejected.
The amount is a positive integer in minor units (cents). Never floating point, anywhere: not in the database, not in the API, not in the code.
A new payment is pending. The response is 201 with id, amount, currency, status, createdAt.
Every request is validated; an invalid request returns 400 with an error body that names the problem.
Card numbers, CVV, cardholder names and other personal data are never accepted, stored or logged. A request containing them is rejected, and the rejected values do not appear in the error body or the logs.
2. Store transactions and manage statuses
PostgreSQL with migrations. One database user, no extra tables beyond what is needed.
Statuses: pending -> authorized -> captured; pending or authorized -> failed; captured -> refunded. Any other transition is rejected with 422. failed and refunded never change again. Refunds are full-payment only; there are no partial refunds.
Every payment has an append-only history of status changes, each with a timestamp and the event that caused it (the creation entry has no event). The database itself refuses to update or delete history rows. A status change and its history entry are written in one transaction.
3. Receive simulated webhooks
POST /webhooks/provider with the header X-Webhook-Signature (hex HMAC-SHA256 of the raw body, secret from WEBHOOK_SECRET) and the body {"eventId": "...", "paymentId": "...", "status": "authorized|captured|failed|refunded"}.
A missing or invalid signature returns 400 and changes nothing. A valid signature with a malformed body or an invalid identifier also returns 400; the body itself is never stored or logged, only the event id (if valid), the time and the reason.
A valid signature with a valid body always returns 200, even if nothing changes.
A stale event (earlier or equal status) is recorded as ignored. A conflicting event such as failed after captured is recorded as rejected with its reason. An event for an unknown payment is recorded as rejected. None of these changes a payment.
A documented command, npm run webhook -- <paymentId> <status> [eventId], signs an event and sends it to the running service, so the provider can be simulated without computing signatures by hand.
4. Idempotency
The same Idempotency-Key with the same body returns the original payment and creates nothing new. The same key with a different body returns 409. Two simultaneous requests with the same key create exactly one payment; the database decides this, not an application check followed by an insert.
The same webhook eventId delivered twice, even at the same moment, has the effect of one delivery: one status change, one history entry, 200 for both.
Idempotency keys and event ids must match ^[A-Za-z0-9_-]{8,64}$, otherwise the request is invalid (400). This keeps personal data such as an email out of identifier fields.
5. View status and history
GET /payments/:id returns one payment with its status; unknown id returns 404.
GET /payments?status=&page=&pageSize= lists payments with their full history, newest first. pageSize defaults to 20, maximum 100. An invalid status or paging value returns 400.
6. Tests and local setup
Docker Compose starts PostgreSQL on 127.0.0.1:55432 with a healthcheck and creates both the application database and a separate test database on first start. Every compose variable has a default (${VAR:-default}), so nothing needs a .env file. The committed .env.example holds placeholders only.
The app and the tests work on a fresh clone with no .env: the database URL and the webhook secret fall back to documented local defaults.
Unit tests cover the domain rules and the status transitions. Integration tests run against the real PostgreSQL and cover every endpoint. Idempotency and duplicate webhooks are proven with genuinely concurrent requests and a check of the final database state; mocks cannot prove atomicity. Tests check behaviour, never the text of the README or of source files.
npm test starts the Compose database itself, waits until it is healthy, then runs unit and integration tests together. If the database is unreachable it fails with one clear message.
A GitHub Actions workflow runs the same command against a PostgreSQL service.
Tests import the source directly, never the build output. Integration tests use their own database and clean up between tests, so two runs in a row give the same result. The test runner exits on its own: close pools, servers and timers; no force-exit flag.
No specific Node version is required anywhere. No scratch or helper files other than the webhook command.
Done when

The service starts from documented commands on a fresh clone, npm test passes twice in a row, and the README explains setup, configuration and running the tests, with one worked example of copy-pasteable commands: create a payment, simulate a signed authorization webhook and a signed capture webhook, replay one to show nothing changes, and list the payment with its pending, authorized and captured history.
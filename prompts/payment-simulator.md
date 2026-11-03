Build a payment processing simulator: a backend service that simulates card
payments. It never touches real money, real cards or personal data.

Domain rules — these are the product, get them exactly right:

- Amounts are integers in the currency's minor units (cents). Never floating point,
  anywhere: not in the database, not in the API, not in the code.
- Every payment carries an explicit ISO 4217 currency code. A payment and its
  refunds are always in the same currency, and amounts of different currencies are
  never added.
- A payment moves through statuses: pending -> authorized -> captured;
  pending or authorized -> failed; captured -> refunded. Any other transition is
  rejected. A terminal status never changes again.
- Creating a payment requires an idempotency key. The same key with the same request
  body returns the original payment and creates nothing new. The same key with a
  different body is rejected as a conflict. Two requests with the same key arriving
  at the same time result in exactly one payment.
- Webhook events from the simulated provider carry a provider event id and a
  signature. An event whose signature does not verify is rejected and changes
  nothing. The same event id delivered twice has the effect of one delivery,
  including when both deliveries arrive at the same time.
- An event that describes a status earlier than the payment's current status does
  not move the payment backwards, and is recorded as ignored rather than failing.
- Every payment keeps an append-only history of its status changes, each with a
  timestamp and the event that caused it.

API:

- create a payment
- read one payment with its current status
- list payments with their history, filterable by status
- receive a provider webhook

Interface rules:

- every request body is validated; an invalid request is rejected with an error body
  that names the problem
- an idempotency conflict returns 409, a rejected status transition returns 422, an
  unknown payment returns 404, a webhook with a bad signature returns 400
- card numbers, CVV, cardholder names and any other personal data are never accepted,
  never stored and never logged. A request that contains them is rejected.

Stack and project rules:

- TypeScript on Node, NestJS, PostgreSQL with migrations.
- Docker Compose for the database, published on port 55432 so it cannot collide with
  another PostgreSQL already running on the host.
- Configuration comes from environment variables with a committed example file; no
  secrets in the source.
- Automated tests: unit tests for the domain rules, and integration tests against the
  real PostgreSQL from Docker Compose. Idempotency and duplicate-webhook behaviour are
  proven with genuinely concurrent requests and a check of the final state; mocks
  cannot prove atomicity.
- Tests import the source modules directly, never the build output.
- The test runner must exit on its own when the suite finishes: close database pools,
  servers and timers in teardown. Do not use a force-exit flag to hide an open handle.
- Integration tests use their own database and clean up between tests, so running the
  suite twice in a row gives the same result.
- Do not require a specific Node version anywhere.

Done when: the service starts from a documented set of commands, the full test suite
passes against the Docker database, and the README explains setup, configuration, how
to run the tests, and walks through one worked example: creating a payment and then
delivering a webhook that captures it.

- Refunds in this version are full-payment refunds only, triggered by a refunded
  webhook. There are no partial refunds and no individual refund records.

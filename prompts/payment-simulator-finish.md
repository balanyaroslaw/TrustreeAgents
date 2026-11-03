Finish the payment processing simulator. Most of it is already built and
committed; inspect the existing code first and plan only what is missing or wrong.

The one known defect to fix

Provider event ids and idempotency keys are opaque identifiers: a valid one
matches ^[A-Za-z0-9_-]{8,64}$ and nothing else. A value outside that shape is
rejected as an invalid body with 400. This is how the service keeps personal data
out of identifier fields: it constrains the format rather than trying to detect
personal data, so an email address or a name in an event id is simply an invalid
identifier. Existing stored identifiers that do not match are not migrated or
deleted; only new input is validated.

A rejected body is recorded as the provider event id (when it is a valid shape),
the timestamp and the reason. The payload itself is never stored and never logged.

What must be true when the work is done

Check each of these against the code that already exists, and implement only what
is missing or does not hold:

- Amounts are integers in minor units everywhere, with an explicit ISO 4217
  currency, and amounts of different currencies are never added.
- Allowed status transitions only: pending -> authorized -> captured; pending or
  authorized -> failed; captured -> refunded. A terminal status never changes
  again. Refunds are full-payment refunds triggered by a refunded webhook; there
  are no partial refunds.
- Creating a payment requires an idempotency key. The same key with the same body
  returns the original payment; the same key with a different body returns 409;
  two concurrent requests with the same key produce exactly one payment.
- Webhook signatures are verified. An invalid signature returns 400. A valid
  signature with an unparseable body, or with an identifier outside the shape
  above, returns 400. A valid signature with a valid body always returns 200, even
  when the event changes nothing.
- A duplicate provider event id has the effect of one delivery, including when
  both deliveries arrive at the same time.
- A stale event is recorded as ignored; a conflicting-branch event such as failed
  after captured is recorded as rejected with its reason; an event for an unknown
  payment is recorded as rejected, keeping its event id so a duplicate is still
  detected. None of these change a payment.
- Every payment has an append-only history of its status changes with timestamps
  and the event that caused each one.
- The API can create a payment, read one payment with its status, list payments
  with their history filtered by status, and receive a provider webhook. The 404
  rule applies to the read endpoints, never to the webhook endpoint.
- No card numbers, CVV, cardholder names or other personal data are accepted,
  stored or logged anywhere.
- The README explains setup, configuration, how to run the tests, and walks
  through creating a payment and then delivering a webhook that captures it.

Automated coverage must include the concurrent cases against the real database:
two simultaneous creates with the same idempotency key, and the same webhook event
delivered twice at the same time. Mocks cannot prove atomicity.

Project conventions, which are not acceptance criteria

- Tests import the source modules directly, never the build output.
- The test runner exits on its own when the suite finishes: close database pools,
  servers and timers in teardown. Do not use a force-exit flag.
- Integration tests use their own database and clean up between tests, so running
  the suite twice in a row gives the same result.
- No external runtime dependencies beyond what the project already uses, and no
  requirement on a specific Node version.

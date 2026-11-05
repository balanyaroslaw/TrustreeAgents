Add partial refunds to the existing payment simulator. Inspect the existing code, tests and
README first, follow their conventions, and change only what this feature needs. Everything
that works today keeps working: existing endpoints, status rules and tests stay valid unless
this text says otherwise.

Behaviour

- A captured payment can be refunded in parts, several times. The sum of all refunds of a
  payment never exceeds its original amount. A refund is in the payment's currency; amounts
  are positive integers in minor units, never floating point, and sums are computed without
  leaving integer arithmetic.
- New endpoint: POST /payments/:id/refunds with the header Idempotency-Key and the JSON body
  {"amount": <integer>}; any other field is rejected. It returns 201 with the refund (id,
  paymentId, amount, createdAt) and applies the same identifier rules as the other endpoints.
  - The same key with the same body returns the original refund and creates nothing new. The
    same key with a different body returns 409.
  - A refund larger than the remaining refundable amount, or on a payment that is not captured
    or partially refunded, returns 422 with an error that names the problem and, when relevant,
    the remaining refundable amount. An unknown payment returns 404. A malformed amount or id
    returns 400.
  - Two simultaneous refunds on the same payment that together exceed the original amount
    result in exactly one success; the database decides this, not an application check
    followed by an insert.
- Statuses: add partially_refunded. captured -> partially_refunded -> refunded, and
  captured -> refunded when one refund covers the whole amount. A refund that brings the total
  to exactly the original amount makes the payment refunded. refunded stays terminal. The
  database enforces the transition table as it does today.
- The existing refunded webhook keeps working: it refunds whatever remains refundable in full
  and records that as a refund. On a payment that is already refunded it is recorded as
  ignored. Webhook idempotency and the always-200 rule are unchanged.
- Every refund is stored as its own record and appends an entry to the payment's append-only
  history (status after the refund, the refunded amount, the refund id, a timestamp). The
  refund record and the history entry are written in one transaction with the status change.
- Reading: GET /payments/:id and the list endpoint include the refunded amount, the remaining
  refundable amount and the refunds with their history entries. Pagination and filters keep
  working, and the status filter accepts partially_refunded.

Data

- A forward-only migration adds the refunds table and the new status. Existing data survives:
  each payment that is already refunded gets one refund record for its full amount, so the
  rule "refunds add up to the amount of a refunded payment" holds for old and new payments.

Quality

- Documentation is updated in the same change: the README API section, the status diagram or
  transition table, and the worked example with one partial refund followed by the remainder.
- Tests are updated and extended: unit tests for the refund arithmetic and the transition
  table; integration tests against the real database for the success path, every error code
  above, idempotent replay, the migration of an already refunded payment, and genuinely
  concurrent refunds that would together exceed the amount, with a check of the final stored
  state. All existing tests still pass, npm test passes twice in a row, and the test runner
  exits on its own. Tests check behaviour, not the text of files.
- No new runtime dependencies, no scratch files.

Defect report for the existing payment simulator: when identical webhook events arrive at
the same moment, a payment is sometimes processed twice (a status change, a history entry
or a refund is applied more than once, or the stored state ends up inconsistent). Find the
cause, fix it, and prove the fix with automated tests. Inspect the existing code, tests and
README first and follow their conventions.

What must be true when the work is done

- The cause is identified and written down: the exact code location, and the interleaving of
  two deliveries that produces the double processing. The written explanation goes in the
  final summary of the work and in a short "Concurrency guarantees" section of the README.
- The fix removes the cause at the root, in the database transaction and constraints, so it
  holds with several application instances. It does not rely on sleeps, retries, an
  in-memory lock or a single process.
- The same event id delivered concurrently any number of times has the effect of exactly one
  delivery: one status change, one history entry, one refund record where relevant, and a 200
  response for every delivery.
- The same holds for the other writers that touch the same payment: concurrent deliveries of
  different events for one payment, a webhook racing with a refund request, and a webhook
  racing with a replayed payment creation. The final stored state is always one that a
  sequential execution could have produced, with no lost update and no duplicated history.
- Automated tests prove it against the real PostgreSQL, with genuinely concurrent requests
  and a check of the final stored state (payment row, history rows, event records, refunds).
  They make the competing deliveries meet inside the critical section deterministically
  rather than relying on timing luck, and they also run many deliveries per round over
  several rounds. For each test the report names the guard it depends on, so a reader can see
  which change would make it fail.
- If no double processing can be reproduced against the current code, say so with the
  evidence (which guard serialises the deliveries and where), and instead close the nearest
  real gap that a failing test can demonstrate, for example the same event id arriving for
  two different payments. Do not invent a defect and do not change behaviour that is correct.
- Everything that worked before still works: existing endpoints, status rules and tests stay
  valid, npm test passes twice in a row, and the test runner exits on its own.
- No new runtime dependencies and no scratch files.

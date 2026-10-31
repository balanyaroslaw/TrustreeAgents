import { IssueCategory } from '../common/issue-category.enum';
import { ChecklistItem } from './checklist-item.enum';

export const CHECKLIST_QUESTIONS: Readonly<Record<ChecklistItem, string>> = {
  [ChecklistItem.MoneyRepresentation]:
    'Are amounts integers in minor units, never floats, with the currency always explicit and ' +
    'never mixed?',
  [ChecklistItem.RefundLimits]:
    'Is the total of all refunds prevented from exceeding the captured amount, and is that ' +
    'check atomic rather than read-then-write?',
  [ChecklistItem.Idempotency]:
    'Is there an idempotency key for state-changing requests, enforced by a database unique ' +
    'constraint, with a repeated key returning the original result and a reused key with a ' +
    'different payload rejected?',
  [ChecklistItem.Concurrency]:
    'Is every check-then-act sequence protected (unique constraint, ON CONFLICT, SELECT FOR ' +
    'UPDATE or a transaction), so two concurrent identical requests cannot both proceed?',
  [ChecklistItem.StatusTransitions]:
    'Are only allowed status transitions possible, are terminal states immutable, and are ' +
    'out-of-order events handled?',
  [ChecklistItem.WebhookHandling]:
    'Is the webhook signature verified, are replays and duplicate event ids rejected, and is ' +
    'the raw event stored?',
  [ChecklistItem.SecretsAndPii]:
    'Are card numbers, CVV, secrets and tokens kept out of the database, logs and source code?',
  [ChecklistItem.ErrorsAndConsistency]:
    'Are errors propagated rather than swallowed, and are related writes inside one transaction ' +
    'so partial state cannot persist?',
  [ChecklistItem.ApiContract]:
    'Is input validated, and are status codes and error bodies correct (for example a conflict ' +
    'on an idempotency clash)?',
  [ChecklistItem.TestQuality]:
    'Do the tests prove the acceptance criteria and the risky behaviour (concurrency against a ' +
    'real database), without being weakened, skipped or tautological?',
};

// Which issue category a checklist item belongs to, used to cross-check the reported issues
// against the checklist answers.
export const CHECKLIST_ITEM_CATEGORIES: Readonly<Record<ChecklistItem, IssueCategory>> = {
  [ChecklistItem.MoneyRepresentation]: IssueCategory.PaymentSafety,
  [ChecklistItem.RefundLimits]: IssueCategory.PaymentSafety,
  [ChecklistItem.Idempotency]: IssueCategory.PaymentSafety,
  [ChecklistItem.Concurrency]: IssueCategory.Concurrency,
  [ChecklistItem.StatusTransitions]: IssueCategory.Correctness,
  [ChecklistItem.WebhookHandling]: IssueCategory.Security,
  [ChecklistItem.SecretsAndPii]: IssueCategory.Security,
  [ChecklistItem.ErrorsAndConsistency]: IssueCategory.ErrorHandling,
  [ChecklistItem.ApiContract]: IssueCategory.ApiContract,
  [ChecklistItem.TestQuality]: IssueCategory.TestQuality,
};

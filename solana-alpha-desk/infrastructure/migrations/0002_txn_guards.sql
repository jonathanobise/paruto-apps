-- Compare-and-swap guard for atomic batches (D1 has no interactive transactions).
-- A batch starts with INSERT INTO txn_guards (ok) SELECT <condition>; if the condition is false the CHECK
-- fails and the whole batch rolls back. The batch ends by deleting its guard row.
CREATE TABLE txn_guards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ok INTEGER NOT NULL CHECK (ok = 1)
);

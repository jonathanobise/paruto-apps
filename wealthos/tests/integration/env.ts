// Environment for integration tests (applied before each test file).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://wealthos_app:wealthos_app_dev@localhost:5432/wealthos_test";
process.env.APP_ENCRYPTION_KEY = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
process.env.APP_ORIGIN = "http://localhost:3100";
process.env.EMAIL_TRANSPORT = "outbox";
process.env.SCRYPT_LOG_N = "12";
(process.env as Record<string, string>).NODE_ENV = "test";

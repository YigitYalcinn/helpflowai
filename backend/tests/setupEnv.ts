// Runs before any test file imports the app, so the app reads these values.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/helpflow_test?schema=public";
process.env.JWT_SECRET = "test-secret-with-enough-length";
// Tests must be deterministic and free: always use the rule-based AI fallback.
process.env.OPENAI_API_KEY = "";

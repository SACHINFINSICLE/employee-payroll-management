-- STEP 1: First, run this to find the enum type names
-- ================================================
SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname;

-- STEP 2: After finding the correct names, run the ALTER TYPE commands
-- The hr_remark_type worked, so payment_status might have a different name
-- Common possibilities: payment_status, paymentstatus, payment_status_enum

-- Try these one by one until one works:
-- ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'Nil';
-- ALTER TYPE paymentstatus ADD VALUE IF NOT EXISTS 'Nil';
-- ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'Nil';

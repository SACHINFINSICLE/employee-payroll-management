-- Add payment_mode column to employees table
-- Options: 'INR Account' (default), 'AUD Account'

-- Create enum type for payment mode
DO $$ BEGIN
    CREATE TYPE payment_mode_type AS ENUM ('INR Account', 'AUD Account');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add the column with default value 'INR Account'
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS payment_mode payment_mode_type DEFAULT 'INR Account'::payment_mode_type;

-- Update any existing NULL values to the default
UPDATE employees SET payment_mode = 'INR Account' WHERE payment_mode IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE employees 
ALTER COLUMN payment_mode SET NOT NULL;

-- Add to field_access_settings for visibility/edit control
INSERT INTO field_access_settings (field_name, display_name, hr_can_edit, finance_can_edit, hr_can_view, finance_can_view, is_visible, field_order)
VALUES ('payment_mode', 'Payment Mode', true, true, true, true, true, 50)
ON CONFLICT (field_name) DO NOTHING;

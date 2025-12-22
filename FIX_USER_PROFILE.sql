-- EMERGENCY FIX: Check and create user profile
-- Run this in Supabase SQL Editor

-- Step 1: Check if table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
        RAISE NOTICE 'user_profiles table does NOT exist - creating it now...';
        
        -- Create the table
        CREATE TABLE user_profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          full_name TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('hr', 'finance', 'admin')),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX idx_user_profiles_email ON user_profiles(email);
        CREATE INDEX idx_user_profiles_role ON user_profiles(role);
        
        -- Enable RLS
        ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view all profiles" ON user_profiles
          FOR SELECT TO authenticated USING (true);
        
        CREATE POLICY "Users can update own profile" ON user_profiles
          FOR UPDATE TO authenticated
          USING (auth.uid() = id)
          WITH CHECK (auth.uid() = id);
        
        RAISE NOTICE 'user_profiles table created successfully!';
    ELSE
        RAISE NOTICE 'user_profiles table already exists';
    END IF;
END $$;

-- Step 2: Check if current user has a profile
DO $$
DECLARE
    user_count INTEGER;
    current_user_id UUID;
    current_user_email TEXT;
BEGIN
    -- Get current user info
    SELECT id, email INTO current_user_id, current_user_email
    FROM auth.users
    WHERE id = auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE 'No authenticated user found - please log in first';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Current user ID: %', current_user_id;
    RAISE NOTICE 'Current user email: %', current_user_email;
    
    -- Check if profile exists
    SELECT COUNT(*) INTO user_count
    FROM user_profiles
    WHERE id = current_user_id;
    
    IF user_count = 0 THEN
        RAISE NOTICE 'Profile does NOT exist for this user - creating it now...';
        
        -- Create profile for current user
        INSERT INTO user_profiles (id, email, full_name, role)
        VALUES (
            current_user_id,
            current_user_email,
            COALESCE(current_user_email, 'Admin User'),
            'admin'  -- Default to admin role
        );
        
        RAISE NOTICE 'Profile created successfully with admin role!';
    ELSE
        RAISE NOTICE 'Profile already exists for this user';
        
        -- Show the profile
        RAISE NOTICE 'Profile details:';
        PERFORM id, email, full_name, role FROM user_profiles WHERE id = current_user_id;
    END IF;
END $$;

-- Step 3: Verify the fix
SELECT 
    'SUCCESS: Profile exists' as status,
    id,
    email,
    full_name,
    role,
    created_at
FROM user_profiles
WHERE id = auth.uid();

-- If you see a row above, the fix worked!
-- If you see no rows, run this manually with your user ID:
/*
INSERT INTO user_profiles (id, email, full_name, role)
VALUES (
    '3a2452b3-8d15-4f37-b613-fcf6917a079d',  -- Your user ID from the error
    'your@email.com',  -- Your email
    'Your Name',       -- Your name
    'admin'            -- Your role
);
*/

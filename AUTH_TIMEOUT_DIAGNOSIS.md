# Auth Timeout Diagnosis Guide

## Current Issue
Getting timeout error after 8 seconds:
```
[Auth] Initialization timeout after 8s - possible network issue
```

## Diagnostic Steps

### Step 1: Check Console Logs
After refreshing the page, you should see these logs in order:

```
[Auth] 🚀 Starting auth initialization...
[Auth] ✓ getSession completed in XXXms
[Auth] Session found, fetching profile...
[Auth] Starting profile fetch for user: <user-id>
[Auth] Profile fetch completed in XXXms
[Auth] Profile data received: { role: 'admin', email: '...' }
[Auth] Loading complete
[Auth] ✅ Total auth initialization: XXXms
```

**If you DON'T see these logs, note which one is missing.**

### Step 2: Identify the Bottleneck

#### Scenario A: Timeout before "getSession completed"
**Problem:** Session retrieval is slow
**Possible causes:**
- Supabase is down or slow
- Network connectivity issue
- Browser blocking requests

**Solution:**
1. Check Supabase dashboard status
2. Check browser network tab for failed requests
3. Try in different browser

#### Scenario B: Timeout after "Session found" but before "Profile fetch completed"
**Problem:** Database query is hanging
**Possible causes:**
- `user_profiles` table doesn't exist
- RLS policies are blocking the query
- No data in the table for this user

**Solution:**
1. Run the `user_profiles_migration.sql` in Supabase SQL Editor
2. Check if user exists in `user_profiles` table
3. Verify RLS policies

#### Scenario C: Timeout with error message
**Problem:** Query is failing
**Check the error message for details**

### Step 3: Verify Database Setup

Run these queries in Supabase SQL Editor:

```sql
-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
);

-- 2. Check if your user has a profile
SELECT * FROM user_profiles 
WHERE id = auth.uid();

-- 3. Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 4. Test the exact query that's timing out
SELECT id, role, full_name, email, created_at, updated_at
FROM user_profiles
WHERE id = auth.uid();
```

### Step 4: Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for requests to Supabase:
   - `https://lejgupfetoonfoohacrp.supabase.co/auth/v1/...`
   - `https://lejgupfetoonfoohacrp.supabase.co/rest/v1/user_profiles...`

**Check:**
- Are requests completing?
- What's the response time?
- Any errors (red in network tab)?

## Common Issues & Solutions

### Issue 1: Table Doesn't Exist
**Symptoms:** Error in console about table not found

**Solution:**
```bash
# Run the migration
# Copy contents of user_profiles_migration.sql
# Paste in Supabase SQL Editor
# Execute
```

### Issue 2: User Not in user_profiles Table
**Symptoms:** Query returns no data

**Solution:**
```sql
-- Manually insert your user
INSERT INTO user_profiles (id, email, full_name, role)
VALUES (
  '<your-user-id>',  -- Get from auth.users
  'your@email.com',
  'Your Name',
  'admin'
);
```

### Issue 3: RLS Blocking Query
**Symptoms:** Query times out or returns empty

**Solution:**
```sql
-- Temporarily disable RLS to test
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Test query
SELECT * FROM user_profiles WHERE id = auth.uid();

-- If it works, re-enable and fix policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
```

### Issue 4: Slow Network
**Symptoms:** All requests are slow (> 2 seconds)

**Solution:**
- Check internet connection
- Try different network
- Check Supabase region (should be close to you)

### Issue 5: Browser Cache Issue
**Symptoms:** Works in incognito, not in normal browser

**Solution:**
```bash
# Clear browser cache
# Or clear localStorage
localStorage.clear()
# Refresh page
```

## Quick Fix: Bypass Profile Fetch

If you need to get the app working immediately while diagnosing:

```typescript
// In AuthContext.tsx, temporarily comment out profile fetch
if (session?.user) {
  // TEMPORARY: Skip profile fetch
  // await fetchProfile(session.user.id, mounted, clearTimeoutFn)
  clearTimeoutFn()
  setLoading(false)
}
```

**Note:** This will break role-based features, but lets you access the app.

## Expected Timings

With proper setup:
- `getSession`: 50-200ms (from localStorage)
- `fetchProfile`: 100-500ms (database query)
- **Total: 150-700ms**

If you're seeing > 2000ms consistently, there's a problem.

## Next Steps

1. **Run the diagnostic** - Check console logs
2. **Verify table exists** - Run SQL queries above
3. **Check network** - Look at DevTools Network tab
4. **Report findings** - Share which scenario matches your issue

## Test Query

Run this in Supabase SQL Editor to test the exact query:

```sql
-- This should return your profile instantly
SELECT id, role, full_name, email, created_at, updated_at
FROM user_profiles
WHERE id = auth.uid();

-- If it times out here, the issue is in the database
-- If it works here but times out in app, it's a network/config issue
```

## Emergency Workaround

If nothing works and you need to proceed:

1. Disable auth temporarily
2. Or increase timeout to 30 seconds
3. Or skip profile fetch and hardcode role

But **fix the root cause** - don't rely on workarounds.

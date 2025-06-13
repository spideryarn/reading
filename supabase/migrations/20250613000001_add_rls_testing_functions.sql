-- RLS Testing Support Functions
-- These functions allow test code to simulate authentication context for RLS validation

-- Function to set the current user ID for RLS evaluation in tests
-- This simulates what auth.uid() would return in a real authenticated session
CREATE OR REPLACE FUNCTION set_current_user_id(user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Set local variable that auth.uid() can read
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_id::text)::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset the authentication context (cleanup)
CREATE OR REPLACE FUNCTION reset_current_user_id()
RETURNS VOID AS $$
BEGIN
  -- Clear the authentication context
  PERFORM set_config('request.jwt.claims', null, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get the currently simulated user ID (for debugging)
CREATE OR REPLACE FUNCTION get_current_test_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to the appropriate roles
GRANT EXECUTE ON FUNCTION set_current_user_id(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION reset_current_user_id() TO service_role;
GRANT EXECUTE ON FUNCTION get_current_test_user_id() TO service_role;

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'RLS testing support functions created successfully at %', NOW();
  RAISE NOTICE 'Functions: set_current_user_id, reset_current_user_id, get_current_test_user_id';
END $$;
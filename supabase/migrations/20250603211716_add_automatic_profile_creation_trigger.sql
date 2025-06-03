-- Migration: Add automatic profile creation trigger
-- Description: Create database trigger to automatically create profiles when users register
-- This ensures every auth.users record has a corresponding public.profiles record

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, preferences)
  VALUES (NEW.id, '{}');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add comment for documentation
COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates a profile in public.profiles when a new user registers in auth.users';
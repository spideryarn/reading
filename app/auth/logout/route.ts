import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createClient()

  try {
    // Sign out the user
    const { error } = await supabase.auth.signOut()

    if (error) {
      return Response.json(
        { error: 'Failed to sign out' },
        { status: 500 }
      )
    }

    // Return success response
    return Response.json(
      { message: 'Successfully signed out' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Logout error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle GET requests to /auth/logout for direct navigation
export async function GET(request: NextRequest) {
  const supabase = createClient()

  try {
    // Sign out the user
    await supabase.auth.signOut()

    // Redirect to home page after logout
    return Response.redirect(new URL('/', request.url))
  } catch (error) {
    console.error('Logout error:', error)
    // Even if logout fails, redirect to home
    return Response.redirect(new URL('/', request.url))
  }
}
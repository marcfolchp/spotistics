import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/client';

/**
 * GET /api/social/debug-users
 * Debug endpoint to check if users exist in the database
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('spotify_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Get all public users
    const { data: allUsers, error: allError } = await supabase
      .from('users')
      .select('user_id, display_name, is_public')
      .eq('is_public', true)
      .limit(100);

    // Get specific user if query param provided
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    let specificUser = null;
    if (userId) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (!error && data) {
        specificUser = data;
      }
    }

    return NextResponse.json({
      totalPublicUsers: allUsers?.length || 0,
      allUsers: allUsers || [],
      specificUser,
      error: allError?.message,
    });
  } catch (error: any) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to debug users' },
      { status: 500 }
    );
  }
}


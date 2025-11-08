import { createSupabaseServerClient } from './client';

/**
 * Store or update user refresh token in Supabase
 */
export async function storeUserRefreshToken(
  userId: string,
  refreshToken: string
): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('user_tokens')
    .upsert({
      user_id: userId,
      refresh_token: refreshToken,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error storing refresh token:', error);
    throw new Error(`Failed to store refresh token: ${error.message}`);
  }
}

/**
 * Get user refresh token from Supabase
 */
export async function getUserRefreshToken(userId: string): Promise<string | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('user_tokens')
    .select('refresh_token')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No data found
      return null;
    }
    console.error('Error fetching refresh token:', error);
    throw new Error(`Failed to fetch refresh token: ${error.message}`);
  }

  return data?.refresh_token || null;
}

/**
 * Get all users with refresh tokens (for background sync)
 */
export async function getAllUsersWithTokens(): Promise<Array<{ user_id: string; refresh_token: string }>> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('user_tokens')
    .select('user_id, refresh_token')
    .not('refresh_token', 'is', null);

  if (error) {
    console.error('Error fetching users with tokens:', error);
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return data || [];
}

/**
 * Delete user refresh token (on logout)
 */
export async function deleteUserRefreshToken(userId: string): Promise<void> {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('user_tokens')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting refresh token:', error);
    throw new Error(`Failed to delete refresh token: ${error.message}`);
  }
}


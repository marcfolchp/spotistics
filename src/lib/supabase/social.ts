import { createSupabaseServerClient } from './client';
import type { User, FriendRequest, Friend } from './types';

/**
 * Create or update user profile
 */
export async function upsertUserProfile(
  userId: string,
  displayName: string | null,
  profileImageUrl: string | null,
  spotifyProfileUrl: string | null
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('users')
    .upsert({
      user_id: userId,
      display_name: displayName,
      profile_image_url: profileImageUrl,
      spotify_profile_url: spotifyProfileUrl,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error upserting user profile:', error);
    throw error;
  }
}

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId: string): Promise<User | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .eq('is_public', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Error getting user profile:', error);
    throw error;
  }

  return data;
}

/**
 * Search for users by user_id (username) or display name
 * Uses exact matching to preserve accents and special characters
 */
export async function searchUsers(query: string, limit: number = 20): Promise<User[]> {
  const supabase = createSupabaseServerClient();
  
  // Escape special characters for LIKE queries
  const escapedQuery = query.replace(/[%_\\]/g, '\\$&');
  
  // Search by user_id (exact match, case-sensitive to preserve accents) and display_name
  // Use 'like' instead of 'ilike' to preserve case and accents
  // Also try case-insensitive search as fallback for better discoverability
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_public', true)
    .or(`user_id.ilike.%${escapedQuery}%,display_name.ilike.%${escapedQuery}%,user_id.like.%${escapedQuery}%,display_name.like.%${escapedQuery}%`)
    .limit(limit);

  if (error) {
    console.error('Error searching users:', error);
    console.error('Query:', query);
    console.error('Escaped query:', escapedQuery);
    throw error;
  }

  console.log(`Search for "${query}" found ${data?.length || 0} users`);
  return data || [];
}

/**
 * Get all public users (for discovery)
 */
export async function getPublicUsers(limit: number = 50): Promise<User[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_public', true)
    .limit(limit);

  if (error) {
    console.error('Error getting public users:', error);
    throw error;
  }

  return data || [];
}

/**
 * Send a friend request
 */
export async function sendFriendRequest(fromUserId: string, toUserId: string): Promise<FriendRequest> {
  const supabase = createSupabaseServerClient();
  // Check if request already exists
  const existing = await getFriendRequest(fromUserId, toUserId);
  if (existing) {
    if (existing.status === 'pending') {
      // Return the existing request instead of throwing an error
      return existing;
    }
    if (existing.status === 'accepted') {
      throw new Error('Already friends');
    }
  }

  const { data, error } = await supabase
    .from('friend_requests')
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    // If it's a unique constraint error, the request already exists
    if (error.code === '23505') {
      const existing = await getFriendRequest(fromUserId, toUserId);
      if (existing) {
        return existing;
      }
    }
    console.error('Error sending friend request:', error);
    throw error;
  }

  return data;
}

/**
 * Get friend request between two users
 */
export async function getFriendRequest(
  fromUserId: string,
  toUserId: string
): Promise<FriendRequest | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .or(`and(from_user_id.eq.${fromUserId},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${fromUserId})`)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error getting friend request:', error);
    throw error;
  }

  return data;
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(requestId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId);

  if (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
}

/**
 * Reject a friend request
 */
export async function rejectFriendRequest(requestId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId);

  if (error) {
    console.error('Error rejecting friend request:', error);
    throw error;
  }
}

/**
 * Get pending friend requests for a user (received requests)
 */
export async function getPendingFriendRequests(userId: string): Promise<FriendRequest[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting pending friend requests:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get sent friend requests for a user
 */
export async function getSentFriendRequests(userId: string): Promise<FriendRequest[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('from_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting sent friend requests:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get all friends for a user
 */
export async function getFriends(userId: string): Promise<User[]> {
  const supabase = createSupabaseServerClient();
  
  // First, get friend IDs
  const { data: friendsData, error: friendsError } = await supabase
    .from('friends')
    .select('friend_id')
    .eq('user_id', userId);

  if (friendsError) {
    console.error('Error getting friends:', friendsError);
    throw friendsError;
  }

  if (!friendsData || friendsData.length === 0) {
    return [];
  }

  // Then, get user profiles for each friend
  const friendIds = friendsData.map((f) => f.friend_id);
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('*')
    .in('user_id', friendIds)
    .eq('is_public', true);

  if (usersError) {
    console.error('Error getting friend profiles:', usersError);
    throw usersError;
  }

  return usersData || [];
}

/**
 * Check if two users are friends
 */
export async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('friends')
    .select('id')
    .eq('user_id', userId1)
    .eq('friend_id', userId2)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return false;
    }
    console.error('Error checking friendship:', error);
    throw error;
  }

  return !!data;
}

/**
 * Cancel/retract a sent friend request
 */
export async function cancelFriendRequest(requestId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('id', requestId);

  if (error) {
    console.error('Error canceling friend request:', error);
    throw error;
  }
}

/**
 * Remove a friend
 */
export async function removeFriend(userId: string, friendId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  // Remove bidirectional friendship
  const { error: error1 } = await supabase
    .from('friends')
    .delete()
    .eq('user_id', userId)
    .eq('friend_id', friendId);

  const { error: error2 } = await supabase
    .from('friends')
    .delete()
    .eq('user_id', friendId)
    .eq('friend_id', userId);

  // Also update friend request status
  await supabase
    .from('friend_requests')
    .update({ status: 'rejected' })
    .or(`and(from_user_id.eq.${userId},to_user_id.eq.${friendId}),and(from_user_id.eq.${friendId},to_user_id.eq.${userId})`);

  if (error1 || error2) {
    console.error('Error removing friend:', error1 || error2);
    throw error1 || error2;
  }
}


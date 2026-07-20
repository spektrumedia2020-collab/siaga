import 'package:supabase_flutter/supabase_flutter.dart';

/// Centralized Supabase service for the mobile app
/// Provides typed access to Supabase client and common operations
class SupabaseService {
  final SupabaseClient _client;

  SupabaseService(this._client);

  /// Get the Supabase client instance
  SupabaseClient get client => _client;

  /// Check if user is authenticated
  bool get isAuthenticated => _client.auth.currentUser != null;

  /// Get current user
  User? get currentUser => _client.auth.currentUser;

  /// Initialize Supabase (call once at app startup)
  static Future<SupabaseService> initialize({
    required String url,
    required String anonKey,
  }) async {
    await Supabase.initialize(
      url: url,
      publishableKey: anonKey,
    );
    return SupabaseService(Supabase.instance.client);
  }

  /// Sign out current user
  Future<void> signOut() async {
    await _client.auth.signOut();
  }
}

/// Global Supabase service instance
final supabaseService = SupabaseService(Supabase.instance.client);
import 'package:flutter_riverpod/flutter_riverpod.dart';
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

/// Riverpod provider (lazy): SupabaseService hanya dibuat saat pertama kali
/// diakses, yaitu SETELAH Supabase.initialize() selesai di main().
/// Ganti pemakaian global `supabaseService` dengan ref.read(supabaseServiceProvider).
final supabaseServiceProvider = Provider<SupabaseService>((ref) {
  return SupabaseService(Supabase.instance.client);
});

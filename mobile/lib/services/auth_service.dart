import 'package:supabase_flutter/supabase_flutter.dart';

/// Service for handling officer authentication
/// Uses Supabase Auth with proper password verification via Edge Function/RPC
class AuthService {
  final SupabaseClient _client;

  AuthService(this._client);

  /// Login officer using Supabase Auth
  /// Officer must be created in Supabase Auth table
  /// Returns AuthResponse if successful, throws error otherwise
  Future<AuthResponse?> loginOfficer(String email, String password) async {
    try {
      // Use Supabase Auth for authentication
      final response = await _client.auth.signInWithPassword(
        email: email,
        password: password,
      );
      
      return response;
    } catch (error) {
      // If auth fails, try legacy check via RPC (if available)
      // This requires the check_officer_login RPC to be set up in Supabase
      rethrow;
    }
  }

  /// Alternative: Check officer credentials via RPC
  /// This is more secure than plain-text comparison in client
  /// Requires Supabase to have bcrypt comparison in database function
  Future<bool> checkOfficerCredentials(String email, String password) async {
    try {
      final response = await _client.rpc('check_officer_login', params: {
        'p_email': email,
        'p_password': password,
      });
      
      return response as bool? ?? false;
    } catch (error) {
      print('Auth check error: $error');
      return false;
    }
  }

  /// Get current officer user profile
  Future<Map<String, dynamic>?> getCurrentOfficerProfile() async {
    try {
      final user = _client.auth.currentUser;
      if (user == null) return null;

      // Get officer profile from officers table
      final response = await _client
          .from('officers')
          .select('id, code, name, phone, market_id')
          .eq('user_id', user.id)
          .maybeSingle();

      return response;
    } catch (error) {
      print('Error getting officer profile: $error');
      return null;
    }
  }

  /// Logout current user
  Future<void> logout() async {
    await _client.auth.signOut();
  }

  /// Check if user is authenticated
  bool isAuthenticated() {
    return _client.auth.currentUser != null;
  }
}

/// Usage example:
/// ```dart
/// final authService = AuthService(Supabase.instance.client);
/// final session = await authService.loginOfficer(email, password);
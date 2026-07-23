import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../shared/models/stall.dart';

// Auth State Provider
final authProvider = StateProvider<bool>((ref) => false);

// Supabase Client Provider
final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

// Stall Repository Provider
final stallRepositoryProvider = Provider((ref) {
  return null; // Will be initialized after Supabase setup
});

// Stall State Provider
final stallProvider = FutureProvider.autoDispose.family<Stall?, String>((ref, lapakId) async {
  // Will be implemented with repository
  return null;
});
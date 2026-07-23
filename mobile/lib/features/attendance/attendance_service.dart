import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import '../../shared/models/stall.dart';

class AttendanceService {
  final SupabaseClient _client;
  final Uuid _uuid = const Uuid();

  AttendanceService(this._client);

  /// Check if location service is enabled
  Future<bool> isLocationServiceEnabled() async {
    return await Geolocator.isLocationServiceEnabled();
  }

  /// Check location permission status
  Future<LocationPermission> checkPermission() async {
    return await Geolocator.checkPermission();
  }

  /// Request location permission
  Future<LocationPermission> requestPermission() async {
    return await Geolocator.requestPermission();
  }

  /// Get current position
  Future<Position?> getCurrentPosition() async {
    bool serviceEnabled = await isLocationServiceEnabled();
    if (!serviceEnabled) return null;

    LocationPermission permission = await checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await requestPermission();
      if (permission == LocationPermission.denied) return null;
    }

    if (permission == LocationPermission.deniedForever) return null;

    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
    } catch (e) {
      return null;
    }
  }

  /// Record check-in attendance
  Future<bool> checkIn({
    required int officerId,
    required String officerName,
    required int marketId,
  }) async {
    try {
      final position = await getCurrentPosition();

      final response = await _client.from('attendance').insert({
        'id': _uuid.v4(),
        'officer_id': officerId,
        'officer_name': officerName,
        'market_id': marketId,
        'check_in': DateTime.now().toIso8601String(),
        'check_in_lat': position?.latitude,
        'check_in_lng': position?.longitude,
        'status': 'present',
      }).select().single();

      return response != null;
    } catch (e) {
      print('Check-in failed: $e');
      return false;
    }
  }

  /// Record check-out attendance
  Future<bool> checkOut({
    required String attendanceId,
  }) async {
    try {
      final position = await getCurrentPosition();

      final response = await _client.from('attendance').update({
        'check_out': DateTime.now().toIso8601String(),
        'check_out_lat': position?.latitude,
        'check_out_lng': position?.longitude,
      }).eq('id', attendanceId).select().single();

      return response != null;
    } catch (e) {
      print('Check-out failed: $e');
      return false;
    }
  }

  /// Get today's attendance for officer
  Future<Map<String, dynamic>?> getTodayAttendance(int officerId) async {
    try {
      final today = DateTime.now();
      final startOfDay = DateTime(today.year, today.month, today.day);
      
      final response = await _client
          .from('attendance')
          .select()
          .eq('officer_id', officerId)
          .gte('check_in', startOfDay.toIso8601String())
          .maybeSingle();

      if (response != null) {
        return Map<String, dynamic>.from(response);
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
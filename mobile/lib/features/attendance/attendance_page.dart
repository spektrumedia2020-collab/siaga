import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../../services/local/database_service.dart';

class AttendancePage extends ConsumerStatefulWidget {
  const AttendancePage({super.key});

  @override
  ConsumerState<AttendancePage> createState() => _AttendancePageState();
}

class _AttendancePageState extends ConsumerState<AttendancePage> {
  bool _isLoading = false;
  String? _errorMessage;
  bool _isCheckedIn = false;
  DateTime? _checkInTime;

  @override
  void initState() {
    super.initState();
    _checkTodayAttendance();
    _ensureLocationPermission();
  }
  
  Future<void> _ensureLocationPermission() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return;
      
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }
    } on Exception {
      // ignore
    }
  }

  Future<void> _checkTodayAttendance() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    try {
      final today = DateTime.now();
      final startOfDay = DateTime(today.year, today.month, today.day);

      final response = await Supabase.instance.client
          .from('attendance')
          .select('check_in, check_out')
          .eq('officer_id', user.id)
          .gte('check_in', startOfDay.toIso8601String())
          .maybeSingle();

      if (mounted && response != null) {
        final checkIn = response['check_in'] != null 
            ? DateTime.parse(response['check_in'] as String) 
            : null;
        final checkOut = response['check_out'] != null;

        setState(() {
          _isCheckedIn = checkIn != null && !checkOut;
          _checkInTime = checkIn;
        });
      } else if (response == null) {
        await _loadLocalAttendance(user.id);
      }
    } on Exception {
      await _loadLocalAttendance(user.id);
    }
  }

  Future<void> _loadLocalAttendance(String officerId) async {
    final row = await DatabaseService().localAttendanceForOfficer(officerId, DateTime.now());
    if (!mounted || row == null) return;
    final checkIn = row['check_in'] != null ? DateTime.tryParse(row['check_in'] as String) : null;
    setState(() {
      _isCheckedIn = checkIn != null && row['check_out'] == null;
      _checkInTime = checkIn;
    });
  }

  Future<void> _pushCheckIn({
    required String clientUuid,
    required String officerName,
    required int marketId,
    required DateTime at,
    required double lat,
    required double lng,
  }) async {
    final database = DatabaseService();
    final client = Supabase.instance.client;
    final base = <String, dynamic>{
      'officer_id': client.auth.currentUser?.id,
      'officer_name': officerName,
      'market_id': marketId,
      'check_in': at.toIso8601String(),
      'check_in_lat': lat,
      'check_in_lng': lng,
      'status': 'present',
    };

    try {
      final response = await client
          .from('attendance')
          .insert({...base, 'client_uuid': clientUuid})
          .select('id')
          .single();
      await database.markAttendanceSynced(clientUuid, serverId: (response['id'] as num?)?.toInt());
      return;
    } on PostgrestException {
      // Older database without attendance.client_uuid (migration 027).
    } on Exception {
      return; // offline; the coordinator syncs it later
    }

    try {
      final response = await client.from('attendance').insert(base).select('id').single();
      await database.markAttendanceSynced(clientUuid, serverId: (response['id'] as num?)?.toInt());
    } on Exception {
      // offline; the coordinator syncs it later
    }
  }

  Future<void> _handleCheckIn() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _errorMessage = 'Aktifkan GPS terlebih dahulu';
        });
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.deniedForever) {
        setState(() {
          _errorMessage = 'Izin lokasi ditolak permanen, buka pengaturan aplikasi';
        });
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );

      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) throw Exception('User tidak terautentikasi');

      Map<String, dynamic>? officerProfile = await Supabase.instance.client
          .from('officers')
          .select('market_id, name')
          .eq('user_id', user.id)
          .maybeSingle();

      // Fallback to users table if officers profile not found
      if (officerProfile == null) {
        final userProfile = await Supabase.instance.client
            .from('users')
            .select('market_id, nama as name')
            .eq('auth_uid', user.id)
            .maybeSingle();

        if (userProfile != null) {
          officerProfile = {
            'market_id': userProfile['market_id'],
            'name': userProfile['name'] ?? 'Petugas',
          };
        }
      }

      if (officerProfile == null) {
        throw Exception('Profil officer tidak ditemukan. Hubungi admin untuk membuat profil Anda.');
      }

      final officerName = officerProfile['name']?.toString() ?? 'Petugas';
      final marketId = (officerProfile['market_id'] as num?)?.toInt();
      if (marketId == null) throw Exception('Pasar petugas belum diatur');

      final database = DatabaseService();
      final clientUuid = const Uuid().v4();
      final checkInAt = DateTime.now();

      await database.queueAttendanceCheckIn(
        clientUuid: clientUuid,
        officerId: user.id,
        officerName: officerName,
        marketId: marketId,
        checkIn: checkInAt.toIso8601String(),
        lat: position.latitude,
        lng: position.longitude,
      );
      await _pushCheckIn(
        clientUuid: clientUuid,
        officerName: officerName,
        marketId: marketId,
        at: checkInAt,
        lat: position.latitude,
        lng: position.longitude,
      );

      if (mounted) {
        setState(() {
          _isCheckedIn = true;
          _checkInTime = checkInAt;
        });
      }
    } on Exception catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Check-in gagal: ${e.toString()}';
        });
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleCheckOut() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) throw Exception('User tidak terautentikasi');

      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _errorMessage = 'Aktifkan GPS terlebih dahulu';
        });
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          setState(() {
            _errorMessage = 'Berikan izin lokasi untuk absensi';
          });
          return;
        }
      }
      if (permission == LocationPermission.deniedForever) {
        setState(() {
          _errorMessage = 'Izin lokasi ditolak permanen, buka pengaturan aplikasi';
        });
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );

      final database = DatabaseService();
      final checkOutAt = DateTime.now();
      final local = await database.localAttendanceForOfficer(user.id, DateTime.now());
      if (local != null) {
        await database.queueAttendanceCheckOut(
          clientUuid: local['id'] as String,
          checkOut: checkOutAt.toIso8601String(),
          lat: position.latitude,
          lng: position.longitude,
        );
      }

      try {
        final attendance = await Supabase.instance.client
            .from('attendance')
            .select('id')
            .eq('officer_id', user.id)
            .filter('check_out', 'is', 'null')
            .maybeSingle();

        if (attendance != null) {
          await Supabase.instance.client.from('attendance').update({
            'check_out': checkOutAt.toIso8601String(),
            'check_out_lat': position.latitude,
            'check_out_lng': position.longitude,
          }).eq('id', attendance['id']);
          if (local != null) {
            await database.markAttendanceSynced(
              local['id'] as String,
              serverId: (attendance['id'] as num?)?.toInt(),
            );
          }
        }
      } on Exception {
        // Offline: the local row keeps the checkout and syncs later.
        if (local == null) rethrow;
      }

      if (mounted) {
        setState(() {
          _isCheckedIn = false;
          _checkInTime = null;
        });
      }
    } on Exception catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Check-out gagal: ${e.toString()}';
        });
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Kembali',
          onPressed: () => GoRouter.of(context).go('/dashboard'),
        ),
        title: Row(
          children: [
            Container(
              width: 24,
              height: 24,
              padding: const EdgeInsets.all(0.5),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Image.asset(
                'assets/logo.jpeg',
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => Icon(Icons.store_mall_directory, color: Theme.of(context).colorScheme.onPrimary, size: 18),
              ),
            ),
            const SizedBox(width: 8),
            const Text('SiAga Officer', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Theme.of(context).colorScheme.onPrimary,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              elevation: 1,
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(18))),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Absensi Hari Ini', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    if (_checkInTime != null) ...[
                      Text('Jam Masuk: ${DateFormat('HH:mm').format(_checkInTime!)}', style: Theme.of(context).textTheme.bodyLarge),
                      const SizedBox(height: 8),
                      Text(
                        'Status: ${_isCheckedIn ? "Masuk" : "Selesai"}',
                        style: TextStyle(fontSize: 16, color: _isCheckedIn ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.secondary),
                      ),
                    ] else ...[
                      Text('Belum absen masuk', style: Theme.of(context).textTheme.bodyMedium),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            if (_errorMessage != null) ...[
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(_errorMessage!, style: TextStyle(color: Theme.of(context).colorScheme.error), textAlign: TextAlign.center),
              ),
            ],
            ElevatedButton(
              onPressed: _isLoading ? null : (_isCheckedIn ? _handleCheckOut : _handleCheckIn),
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              child: _isLoading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(_isCheckedIn ? 'Check-out' : 'Check-in', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(height: 12),
            const Text('Pastikan GPS sudah aktif untuk melakukan absensi.', style: TextStyle(fontSize: 12, color: Colors.grey), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
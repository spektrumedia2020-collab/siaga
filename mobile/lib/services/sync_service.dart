import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../shared/models/outbox_entry.dart';
import 'local/database_service.dart';

class SyncService {
  SyncService(this._client, {DatabaseService? database})
      : _database = database ?? DatabaseService();

  final SupabaseClient _client;
  final DatabaseService _database;

  Future<bool> isConnected() async {
    final results = await Connectivity().checkConnectivity();
    if (results.contains(ConnectivityResult.none)) return false;
    try {
      await _client.from('markets').select('id').limit(1).timeout(const Duration(seconds: 6));
      return true;
    } on Exception {
      return false;
    }
  }

  Future<int> syncPendingTransactions() async {
    if (!await isConnected()) return 0;

    final entries = await _database.dueOutboxEntries();
    var synced = 0;

    for (final entry in entries) {
      try {
        int? serverId;
        if (entry.kind == OutboxEntry.kindBillPayment) {
          await _pushBillPayment(entry);
        } else {
          serverId = await _pushDailyPayment(entry);
        }
        await _database.markOutboxSynced(entry.clientUuid, serverId: serverId);
        synced++;
      } on PostgrestException catch (e) {
        final code = e.code ?? '';
        final retryable = code == '401' || code == '403' || code.startsWith('5');
        if (retryable) {
          final attempts = entry.attempts + 1;
          await _database.markOutboxRetry(
            entry.clientUuid,
            error: e.message,
            attempts: attempts,
            nextAttemptAt: _nextAttempt(attempts),
          );
        } else {
          await _database.markOutboxFailed(entry.clientUuid, error: e.message);
        }
      } on Exception catch (e) {
        final attempts = entry.attempts + 1;
        await _database.markOutboxRetry(
          entry.clientUuid,
          error: e.toString(),
          attempts: attempts,
          nextAttemptAt: _nextAttempt(attempts),
        );
      }
    }

    return synced;
  }

  Future<int?> _pushDailyPayment(OutboxEntry entry) async {
    await _client.from('transactions').upsert(
      {
        'uuid_transaction': entry.clientUuid,
        'transaction_date': entry.occurredAt.toUtc().toIso8601String(),
        'created_at': entry.occurredAt.toUtc().toIso8601String(),
        'market_id': entry.marketId,
        'stall_id': entry.stallId,
        'rate_id': entry.rateId,
        'officer_id': entry.officerId,
        'amount': entry.amount,
        'payment_method': entry.paymentMethod,
        'payer_name': entry.payerName,
        'note': entry.note,
        'status': 'paid',
        'source': 'MOBILE',
        'sync_status': 'SYNCED',
      },
      onConflict: 'uuid_transaction',
      ignoreDuplicates: true,
    );

    final row = await _client
        .from('transactions')
        .select('id')
        .eq('uuid_transaction', entry.clientUuid)
        .maybeSingle();
    return (row?['id'] as num?)?.toInt();
  }

  Future<void> _pushBillPayment(OutboxEntry entry) async {
    await _client.rpc('pay_retribution_bills', params: {
      'p_stall_id': entry.stallId,
      'p_amount': entry.amount,
      'p_types_id': entry.typesId,
      'p_payment_method': entry.paymentMethod ?? 'Tunai',
      'p_payer_name': entry.payerName,
      'p_note': entry.note,
      'p_client_uuid': entry.clientUuid,
    });
  }

  Future<int> syncAttendance() async {
    if (!await isConnected()) return 0;

    final rows = await _database.unsyncedAttendance();
    var synced = 0;

    for (final row in rows) {
      final clientUuid = row['id'] as String;
      final payload = <String, dynamic>{
        'client_uuid': clientUuid,
        'officer_id': row['officer_id'],
        'officer_name': row['officer_name'],
        'market_id': row['market_id'],
        'check_in': _toUtc(row['check_in']),
        'check_out': _toUtc(row['check_out']),
        'check_in_lat': row['check_in_lat'],
        'check_in_lng': row['check_in_lng'],
        'check_out_lat': row['check_out_lat'],
        'check_out_lng': row['check_out_lng'],
        'status': row['status'],
      };

      try {
        final response = await _client
            .from('attendance')
            .insert(payload)
            .select('id')
            .single();
        await _database.markAttendanceSynced(
          clientUuid,
          serverId: (response['id'] as num?)?.toInt(),
        );
        synced++;
      } on PostgrestException catch (e) {
        // The unique index on client_uuid is partial, so ON CONFLICT is not
        // usable from PostgREST; a retried check-in arrives as a duplicate.
        if (e.code != '23505') continue;
        try {
          final response = await _client
              .from('attendance')
              .update(payload..remove('client_uuid'))
              .eq('client_uuid', clientUuid)
              .select('id')
              .maybeSingle();
          if (response != null) {
            await _database.markAttendanceSynced(
              clientUuid,
              serverId: (response['id'] as num?)?.toInt(),
            );
            synced++;
          }
        } on Exception {
          // Keep the local row; the next sync retries it.
        }
      } on Exception {
        // Keep the local row; the next sync retries it.
      }
    }

    return synced;
  }

  DateTime _nextAttempt(int attempts) {
    final exponent = attempts <= 1 ? 0 : (attempts - 1).clamp(0, 6);
    final seconds = 30 * (1 << exponent);
    return DateTime.now().add(Duration(seconds: seconds.clamp(30, 1800)));
  }

  /// Local timestamps are stored without an offset; the server expects the
  /// real instant, otherwise attendance times shift by the device offset.
  String? _toUtc(Object? value) {
    final text = value?.toString();
    if (text == null || text.isEmpty) return null;
    final parsed = DateTime.tryParse(text);
    if (parsed == null) return text;
    return parsed.toUtc().toIso8601String();
  }

  Future<Map<String, int>> syncAll() async {
    return {
      'transactions': await syncPendingTransactions(),
      'attendance': await syncAttendance(),
    };
  }

  Future<int> getPendingCount() => _database.pendingOutboxCount();
}

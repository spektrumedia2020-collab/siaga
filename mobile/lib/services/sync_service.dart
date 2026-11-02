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
      if (entry.kind != OutboxEntry.kindDailyPayment) continue;
      try {
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
        final serverId = (row?['id'] as num?)?.toInt();
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

  DateTime _nextAttempt(int attempts) {
    final exponent = attempts <= 1 ? 0 : (attempts - 1).clamp(0, 6);
    final seconds = 30 * (1 << exponent);
    return DateTime.now().add(Duration(seconds: seconds.clamp(30, 1800)));
  }

  Future<Map<String, int>> syncAll() async {
    return {'transactions': await syncPendingTransactions()};
  }

  Future<int> getPendingCount() => _database.pendingOutboxCount();
}

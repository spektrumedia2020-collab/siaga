import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../shared/models/stall.dart' as models;
import 'local/database_service.dart';

class SyncService {
  final SupabaseClient _client;

  SyncService(this._client);

  /// Check if device has internet connection
  Future<bool> isConnected() async {
    final connectivityResult = await Connectivity().checkConnectivity();
    return connectivityResult != ConnectivityResult.none;
  }

  /// Sync pending transactions to Supabase
  Future<int> syncPendingTransactions() async {
    if (!await isConnected()) return 0;

    final pendingTransactions = await DatabaseService().getPendingTransactions();
    int syncedCount = 0;

    for (final transaction in pendingTransactions) {
      try {
        await _client.from('transactions').insert({
          'stall_id': transaction.stallId,
          'payer_name': transaction.payerName,
          'amount': transaction.amount,
          'payment_method': transaction.paymentMethod,
          'status': transaction.status,
          'note': transaction.note,
          'created_at': transaction.createdAt?.toIso8601String(),
        });

        // Mark as synced
        await DatabaseService().markTransactionSynced(transaction.id?.toString() ?? transaction.stallId.toString());
        syncedCount++;
      } catch (e) {
        // ignore error, continue syncing
      }
    }

    return syncedCount;
  }

  /// Sync all pending data
  Future<Map<String, int>> syncAll() async {
    final result = <String, int>{};
    
    result['transactions'] = await syncPendingTransactions();
    
    return result;
  }

  /// Get pending transactions count
  Future<int> getPendingCount() async {
    final pending = await DatabaseService().getPendingTransactions();
    return pending.length;
  }

  /// Add transaction to offline queue
  Future<void> queueTransaction({
    required int stallId,
    required String payerName,
    required double amount,
    required String paymentMethod,
    required String status,
    String? note,
  }) async {
    final tx = models.Transaction(
      stallId: stallId,
      payerName: payerName,
      amount: amount,
      paymentMethod: paymentMethod,
      status: status,
      note: note,
    );

    await DatabaseService().insertTransaction(tx);
  }
}
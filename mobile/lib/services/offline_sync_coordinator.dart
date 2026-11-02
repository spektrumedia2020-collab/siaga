import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/widgets.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'local/database_service.dart';
import 'market_cache_service.dart';
import 'sync_service.dart';

class SyncStatus {
  const SyncStatus({
    this.online = false,
    this.syncing = false,
    this.pending = 0,
    this.failed = 0,
    this.masterSyncedAt,
  });

  final bool online;
  final bool syncing;
  final int pending;
  final int failed;
  final DateTime? masterSyncedAt;

  SyncStatus copyWith({
    bool? online,
    bool? syncing,
    int? pending,
    int? failed,
    DateTime? masterSyncedAt,
  }) {
    return SyncStatus(
      online: online ?? this.online,
      syncing: syncing ?? this.syncing,
      pending: pending ?? this.pending,
      failed: failed ?? this.failed,
      masterSyncedAt: masterSyncedAt ?? this.masterSyncedAt,
    );
  }
}

class SyncResult {
  const SyncResult({
    this.online = false,
    this.syncedTransactions = 0,
    this.masterSynced = false,
    this.pending = 0,
    this.failed = 0,
  });

  final bool online;
  final int syncedTransactions;
  final bool masterSynced;
  final int pending;
  final int failed;
}

class OfflineSyncCoordinator with WidgetsBindingObserver {
  OfflineSyncCoordinator._internal();

  static final OfflineSyncCoordinator instance = OfflineSyncCoordinator._internal();

  static const _marketKey = 'officer_market_id';

  final ValueNotifier<SyncStatus> status = ValueNotifier(const SyncStatus());

  final DatabaseService _database = DatabaseService();
  late final SyncService _syncService =
      SyncService(Supabase.instance.client, database: _database);
  late final MarketCacheService _cacheService =
      MarketCacheService(Supabase.instance.client, database: _database);

  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  Timer? _timer;
  bool _started = false;
  bool _running = false;
  int? _marketId;

  Future<void> configure({required int marketId, int? officerId}) async {
    final changed = _marketId != marketId;
    _marketId = marketId;
    await _database.setMeta(_marketKey, marketId.toString());
    if (officerId != null) {
      await _database.setMeta('officer_user_id', officerId.toString());
    }
    if (changed && _started) {
      unawaited(syncNow());
    }
  }

  Future<void> start() async {
    if (_started) return;
    _started = true;
    final stored = await _database.getMeta(_marketKey);
    _marketId ??= int.tryParse(stored ?? '');
    WidgetsBinding.instance.addObserver(this);

    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((results) {
      if (results.contains(ConnectivityResult.none)) {
        unawaited(refreshStatus(online: false));
      } else {
        unawaited(syncNow());
      }
    });
    _timer = Timer.periodic(const Duration(minutes: 2), (_) {
      unawaited(syncNow());
    });

    await refreshStatus();
    unawaited(syncNow());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(syncNow(forceMaster: true));
    }
  }

  Future<void> refreshStatus({bool? online}) async {
    status.value = status.value.copyWith(
      online: online ?? status.value.online,
      pending: await _database.pendingOutboxCount(),
      failed: await _database.failedOutboxCount(),
      masterSyncedAt: await _cacheService.lastSyncedAt(),
    );
  }

  Future<SyncResult> syncNow({bool forceMaster = false, bool retryFailed = false}) async {
    if (_running) {
      return SyncResult(
        online: status.value.online,
        pending: status.value.pending,
        failed: status.value.failed,
      );
    }
    _running = true;
    status.value = status.value.copyWith(syncing: true);

    try {
      final online = await _syncService.isConnected();
      if (!online) {
        await refreshStatus(online: false);
        return SyncResult(
          online: false,
          pending: status.value.pending,
          failed: status.value.failed,
        );
      }

      if (retryFailed) {
        await _database.resetFailedOutbox();
      }
      final synced = await _syncService.syncPendingTransactions();
      var masterSynced = false;
      final marketId = _marketId;
      if (marketId != null && (forceMaster || await _cacheService.isStale())) {
        try {
          await _cacheService.syncMarket(marketId);
          masterSynced = true;
        } on Exception {
          masterSynced = false;
        }
      }

      await refreshStatus(online: true);
      return SyncResult(
        online: true,
        syncedTransactions: synced,
        masterSynced: masterSynced,
        pending: status.value.pending,
        failed: status.value.failed,
      );
    } on Exception {
      await refreshStatus(online: false);
      return SyncResult(
        online: false,
        pending: status.value.pending,
        failed: status.value.failed,
      );
    } finally {
      _running = false;
      status.value = status.value.copyWith(syncing: false);
    }
  }

  Future<void> dispose() async {
    await _connectivitySubscription?.cancel();
    _timer?.cancel();
    if (_started) {
      WidgetsBinding.instance.removeObserver(this);
      _started = false;
    }
  }
}

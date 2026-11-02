import 'dart:math' as math;

import 'package:supabase_flutter/supabase_flutter.dart';

import 'local/database_service.dart';

class MarketCacheSummary {
  const MarketCacheSummary({
    required this.stalls,
    required this.rates,
    required this.types,
    required this.bills,
  });

  final int stalls;
  final int rates;
  final int types;
  final int bills;
}

class MarketCacheService {
  MarketCacheService(this._client, {DatabaseService? database})
      : _database = database ?? DatabaseService();

  static const metaMarketId = 'master_market_id';
  static const metaSyncedAt = 'master_synced_at';
  static const maxAge = Duration(hours: 6);
  static const _pageSize = 1000;

  final SupabaseClient _client;
  final DatabaseService _database;

  Future<MarketCacheSummary> syncMarket(int marketId) async {
    final stalls = await _fetchAll('stalls', 'id, code, number, sector_id, owner_id, status', marketId);
    final sectors = await _fetchAll('market_sectors', 'id, name', marketId);
    final types = await _fetchAll('retribution_types', 'id, code, name, category, unit, billing_period', marketId);
    final rates = await _fetchAll(
      'retribution_rates',
      'id, stall_id, types_id, amount, collection_period, collection_anchor',
      marketId,
    );
    final bills = await _fetchAll('retribution_bill_balances',
        'id, stall_id, types_id, period_kind, period_start, period_end, period_year, amount_due, amount_paid, outstanding, status, is_open, due_date',
        marketId);
    final paidToday = await _fetchPaidToday(marketId);

    final sectorNames = {
      for (final sector in sectors) (sector['id'] as num).toInt(): sector['name']?.toString() ?? '',
    };
    final ownerIds = stalls
        .map((stall) => (stall['owner_id'] as num?)?.toInt())
        .whereType<int>()
        .toSet()
        .toList();
    final owners = await _fetchOwners(ownerIds);

    final now = DateTime.now().toIso8601String();
    final stallRows = stalls.map((stall) {
      final ownerId = (stall['owner_id'] as num?)?.toInt();
      final sectorId = (stall['sector_id'] as num?)?.toInt();
      final owner = ownerId == null ? null : owners[ownerId];
      return <String, dynamic>{
        'id': (stall['id'] as num).toInt(),
        'market_id': marketId,
        'code': stall['code']?.toString(),
        'number': stall['number']?.toString(),
        'sector_id': sectorId,
        'sector_name': sectorId == null ? null : sectorNames[sectorId],
        'owner_id': ownerId,
        'owner_name': owner?['name']?.toString(),
        'owner_phone': owner?['phone']?.toString(),
        'owner_nik': owner?['nik']?.toString(),
        'owner_address': owner?['address']?.toString(),
        'status': stall['status']?.toString(),
        'updated_at': now,
      };
    }).toList();

    final typeRows = types.map((type) {
      return <String, dynamic>{
        'id': (type['id'] as num).toInt(),
        'market_id': marketId,
        'code': type['code']?.toString(),
        'name': type['name']?.toString(),
        'category': type['category']?.toString(),
        'unit': type['unit']?.toString(),
        'billing_period': type['billing_period']?.toString(),
        'updated_at': now,
      };
    }).toList();

    final rateRows = rates.map((rate) {
      return <String, dynamic>{
        'id': (rate['id'] as num).toInt(),
        'stall_id': (rate['stall_id'] as num?)?.toInt(),
        'types_id': (rate['types_id'] as num).toInt(),
        'amount': (rate['amount'] as num?)?.toDouble(),
        'collection_period': rate['collection_period']?.toString(),
        'collection_anchor': (rate['collection_anchor'] as num?)?.toInt(),
        'updated_at': now,
      };
    }).toList();

    final billRows = bills.map((bill) {
      return <String, dynamic>{
        'id': (bill['id'] as num).toInt(),
        'stall_id': (bill['stall_id'] as num).toInt(),
        'types_id': (bill['types_id'] as num).toInt(),
        'period_kind': bill['period_kind']?.toString(),
        'period_start': bill['period_start']?.toString(),
        'period_end': bill['period_end']?.toString(),
        'period_year': (bill['period_year'] as num?)?.toInt(),
        'amount_due': (bill['amount_due'] as num?)?.toDouble(),
        'amount_paid': (bill['amount_paid'] as num?)?.toDouble(),
        'outstanding': (bill['outstanding'] as num?)?.toDouble(),
        'status': bill['status']?.toString(),
        'is_open': (bill['is_open'] == true) ? 1 : 0,
        'due_date': bill['due_date']?.toString(),
        'updated_at': now,
      };
    }).toList();

    await _database.replaceStalls(stallRows);
    await _database.replaceTypes(typeRows);
    await _database.replaceRates(rateRows);
    await _database.replaceBills(billRows);
    await _database.replacePaidToday(paidToday);
    await _database.setMeta(metaMarketId, marketId.toString());
    await _database.setMeta(metaSyncedAt, now);

    return MarketCacheSummary(
      stalls: stallRows.length,
      rates: rateRows.length,
      types: typeRows.length,
      bills: billRows.length,
    );
  }

  Future<List<Map<String, dynamic>>> _fetchAll(String table, String select, int marketId) async {
    final rows = <Map<String, dynamic>>[];
    for (var from = 0;; from += _pageSize) {
      final data = await _client
          .from(table)
          .select(select)
          .eq('market_id', marketId)
          .order('id')
          .range(from, from + _pageSize - 1);
      final page = (data as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      rows.addAll(page);
      if (page.length < _pageSize) break;
    }
    return rows;
  }

  Future<List<Map<String, dynamic>>> _fetchPaidToday(int marketId) async {
    final now = DateTime.now().toUtc();
    final start = DateTime.utc(now.year, now.month, now.day);
    final end = start.add(const Duration(days: 1)).subtract(const Duration(milliseconds: 1));
    final rows = <Map<String, dynamic>>[];
    for (var from = 0;; from += _pageSize) {
      final data = await _client
          .from('transactions')
          .select('id, stall_id, rate_id, amount, created_at')
          .eq('market_id', marketId)
          .eq('status', 'paid')
          .gte('created_at', start.toIso8601String())
          .lte('created_at', end.toIso8601String())
          .order('id')
          .range(from, from + _pageSize - 1);
      final page = (data as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      rows.addAll(page);
      if (page.length < _pageSize) break;
    }
    return rows.map((map) {
      return <String, dynamic>{
        'stall_id': (map['stall_id'] as num).toInt(),
        'rate_id': (map['rate_id'] as num?)?.toInt() ?? 0,
        'amount': (map['amount'] as num?)?.toDouble(),
        'paid_at': map['created_at']?.toString(),
      };
    }).toList();
  }

  Future<Map<int, Map<String, dynamic>>> _fetchOwners(List<int> ownerIds) async {
    final owners = <int, Map<String, dynamic>>{};
    for (var index = 0; index < ownerIds.length; index += 200) {
      final chunk = ownerIds.sublist(index, math.min(index + 200, ownerIds.length));
      if (chunk.isEmpty) continue;
      List<dynamic> data;
      try {
        data = await _client
            .from('stall_owners')
            .select('id, name, nik, phone, address')
            .inFilter('id', chunk) as List<dynamic>;
      } on PostgrestException {
        data = await _client.from('stall_owners').select('id, name').inFilter('id', chunk) as List<dynamic>;
      }
      for (final row in data) {
        final map = Map<String, dynamic>.from(row as Map);
        owners[(map['id'] as num).toInt()] = map;
      }
    }
    return owners;
  }

  Future<DateTime?> lastSyncedAt() => _database.getMetaDate(metaSyncedAt);

  Future<bool> isStale() async {
    final syncedAt = await lastSyncedAt();
    if (syncedAt == null) return true;
    return DateTime.now().difference(syncedAt) > maxAge;
  }

  Future<bool> hasCache() async => (await _database.cachedStallCount()) > 0;

  Future<Map<String, dynamic>?> findStall(String lapakId) => _database.findStall(lapakId: lapakId);

  Future<List<Map<String, dynamic>>> typesForMarket(int marketId) => _database.typesForMarket(marketId);

  Future<Map<String, dynamic>?> typeById(int typesId) => _database.typeById(typesId);

  Future<List<Map<String, dynamic>>> ratesForStall(int stallId) => _database.ratesForStall(stallId);

  Future<List<Map<String, dynamic>>> billsForStall(int stallId) => _database.billsForStall(stallId);

  Future<bool> isPaidToday({required int stallId, int? rateId, double? amount}) =>
      _database.isPaidToday(stallId: stallId, rateId: rateId, amount: amount);
}

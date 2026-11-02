import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';
import 'package:uuid/uuid.dart';
import '../../shared/models/outbox_entry.dart';

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();

  static const _databaseName = 'siaga_offline.db';
  static const _databaseVersion = 3;

  static Database? _database;

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final documentsDirectory = await getApplicationDocumentsDirectory();
    final path = join(documentsDirectory.path, _databaseName);

    return openDatabase(
      path,
      version: _databaseVersion,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    await _createOfflineTables(db);
    await _createAttendanceTable(db);
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      await _createOfflineTables(db);
      await _migrateLegacyTransactions(db);
      await db.execute('DROP TABLE IF EXISTS stalls');
    }
    if (oldVersion < 3) {
      await _addColumnIfMissing(db, 'outbox', 'types_id', 'INTEGER');
      await _addColumnIfMissing(db, 'attendance', 'server_id', 'INTEGER');
    }
  }

  Future<void> _addColumnIfMissing(Database db, String table, String column, String type) async {
    final info = await db.rawQuery('PRAGMA table_info($table)');
    final exists = info.any((row) => row['name'] == column);
    if (!exists) {
      await db.execute('ALTER TABLE $table ADD COLUMN $column $type');
    }
  }

  Future<void> _migrateLegacyTransactions(Database db) async {
    final tables = await db.rawQuery(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'transactions'",
    );
    if (tables.isEmpty) return;

    final rows = await db.query('transactions', where: 'is_synced = ?', whereArgs: [0]);
    final batch = db.batch();
    for (final row in rows) {
      final createdAt = DateTime.tryParse(row['created_at'] as String? ?? '') ?? DateTime.now();
      batch.insert('outbox', {
        'client_uuid': const Uuid().v4(),
        'kind': OutboxEntry.kindDailyPayment,
        'stall_id': row['stall_id'] as int?,
        'amount': (row['amount'] as num?)?.toDouble() ?? 0,
        'payment_method': row['payment_method'] as String?,
        'payer_name': row['payer_name'] as String?,
        'note': row['note'] as String?,
        'occurred_at': createdAt.toIso8601String(),
        'status': 'pending',
        'attempts': 0,
        'created_at': createdAt.toIso8601String(),
      }, conflictAlgorithm: ConflictAlgorithm.ignore);
    }
    await batch.commit(noResult: true);
    await db.execute('DROP TABLE IF EXISTS transactions');
  }

  Future<void> _createOfflineTables(Database db) async {
    await db.execute('''
      CREATE TABLE IF NOT EXISTS outbox (
        client_uuid TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        market_id INTEGER,
        stall_id INTEGER,
        rate_id INTEGER,
        types_id INTEGER,
        officer_id INTEGER,
        amount REAL NOT NULL,
        payment_method TEXT,
        payer_name TEXT,
        note TEXT,
        occurred_at TEXT NOT NULL,
        stall_code TEXT,
        stall_label TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at TEXT,
        last_error TEXT,
        server_id INTEGER,
        created_at TEXT NOT NULL
      )
    ''');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_outbox_due ON outbox(status, next_attempt_at)');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS cache_stalls (
        id INTEGER PRIMARY KEY,
        market_id INTEGER,
        code TEXT,
        number TEXT,
        sector_id INTEGER,
        sector_name TEXT,
        owner_id INTEGER,
        owner_name TEXT,
        owner_phone TEXT,
        owner_nik TEXT,
        owner_address TEXT,
        status TEXT,
        updated_at TEXT
      )
    ''');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_cache_stalls_code ON cache_stalls(market_id, code)');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS cache_rates (
        id INTEGER PRIMARY KEY,
        stall_id INTEGER,
        types_id INTEGER,
        amount REAL,
        collection_period TEXT,
        collection_anchor INTEGER,
        updated_at TEXT
      )
    ''');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_cache_rates_stall ON cache_rates(stall_id)');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS cache_types (
        id INTEGER PRIMARY KEY,
        market_id INTEGER,
        code TEXT,
        name TEXT,
        category TEXT,
        unit TEXT,
        billing_period TEXT,
        updated_at TEXT
      )
    ''');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_cache_types_market ON cache_types(market_id)');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS cache_bills (
        id INTEGER PRIMARY KEY,
        stall_id INTEGER,
        types_id INTEGER,
        period_kind TEXT,
        period_start TEXT,
        period_end TEXT,
        period_year INTEGER,
        amount_due REAL,
        amount_paid REAL,
        outstanding REAL,
        status TEXT,
        is_open INTEGER,
        due_date TEXT,
        updated_at TEXT
      )
    ''');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_cache_bills_stall ON cache_bills(stall_id)');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS cache_paid_today (
        stall_id INTEGER NOT NULL,
        rate_id INTEGER NOT NULL DEFAULT 0,
        amount REAL,
        paid_at TEXT,
        PRIMARY KEY (stall_id, rate_id)
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS cache_meta (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    ''');
  }

  Future<void> _createAttendanceTable(Database db) async {
    await db.execute('''
      CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        officer_id TEXT,
        officer_name TEXT,
        market_id INTEGER,
        check_in TEXT,
        check_out TEXT,
        check_in_lat REAL,
        check_in_lng REAL,
        check_out_lat REAL,
        check_out_lng REAL,
        status TEXT,
        is_synced INTEGER DEFAULT 0,
        server_id INTEGER
      )
    ''');
  }

  // ---------------------------------------------------------------- outbox
  Future<String> enqueueTransaction(OutboxEntry entry) async {
    final db = await database;
    await db.insert(
      'outbox',
      entry.toMap(),
      conflictAlgorithm: ConflictAlgorithm.ignore,
    );
    return entry.clientUuid;
  }

  Future<List<OutboxEntry>> dueOutboxEntries({DateTime? now}) async {
    final db = await database;
    final timestamp = (now ?? DateTime.now()).toIso8601String();
    final rows = await db.query(
      'outbox',
      where: "status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)",
      whereArgs: [timestamp],
      orderBy: 'created_at ASC',
    );
    return rows.map(OutboxEntry.fromMap).toList();
  }

  Future<void> markOutboxSynced(String clientUuid, {int? serverId}) async {
    final db = await database;
    await db.update(
      'outbox',
      {'status': 'done', 'server_id': serverId, 'last_error': null, 'next_attempt_at': null},
      where: 'client_uuid = ?',
      whereArgs: [clientUuid],
    );
  }

  Future<void> markOutboxRetry(
    String clientUuid, {
    required String error,
    required DateTime nextAttemptAt,
    required int attempts,
  }) async {
    final db = await database;
    await db.update(
      'outbox',
      {
        'status': 'pending',
        'attempts': attempts,
        'last_error': error,
        'next_attempt_at': nextAttemptAt.toIso8601String(),
      },
      where: 'client_uuid = ?',
      whereArgs: [clientUuid],
    );
  }

  Future<void> markOutboxFailed(String clientUuid, {required String error}) async {
    final db = await database;
    await db.update(
      'outbox',
      {'status': 'failed', 'last_error': error, 'next_attempt_at': null},
      where: 'client_uuid = ?',
      whereArgs: [clientUuid],
    );
  }

  Future<int> pendingOutboxCount() async {
    final db = await database;
    final count = Sqflite.firstIntValue(
      await db.rawQuery("SELECT COUNT(*) FROM outbox WHERE status = 'pending'"),
    );
    return count ?? 0;
  }

  Future<int> failedOutboxCount() async {
    final db = await database;
    final count = Sqflite.firstIntValue(
      await db.rawQuery("SELECT COUNT(*) FROM outbox WHERE status = 'failed'"),
    );
    return count ?? 0;
  }

  Future<int> resetFailedOutbox() async {
    final db = await database;
    return db.update(
      'outbox',
      {'status': 'pending', 'attempts': 0, 'next_attempt_at': null, 'last_error': null},
      where: "status = 'failed'",
    );
  }

  Future<double> pendingBillPayments({required int stallId, int? typesId}) async {
    final db = await database;
    final rows = await db.query(
      'outbox',
      where: "kind = ? AND stall_id = ? AND status = 'pending'",
      whereArgs: [OutboxEntry.kindBillPayment, stallId],
    );
    return rows
        .where((row) => typesId == null || (row['types_id'] as int?) == typesId)
        .fold<double>(0, (sum, row) => sum + ((row['amount'] as num?)?.toDouble() ?? 0));
  }

  Future<bool> hasOpenBillPayments() async {
    final db = await database;
    final rows = await db.query(
      'outbox',
      where: "kind = ? AND status IN ('pending', 'failed')",
      whereArgs: [OutboxEntry.kindBillPayment],
      limit: 1,
    );
    return rows.isNotEmpty;
  }

  Future<List<OutboxEntry>> outboxEntries({int limit = 50}) async {
    final db = await database;
    final rows = await db.query(
      'outbox',
      where: "status IN ('pending', 'failed')",
      orderBy: 'created_at DESC',
      limit: limit,
    );
    return rows.map(OutboxEntry.fromMap).toList();
  }

  Future<OutboxEntry?> outboxEntry(String clientUuid) async {
    final db = await database;
    final rows = await db.query(
      'outbox',
      where: 'client_uuid = ?',
      whereArgs: [clientUuid],
      limit: 1,
    );
    return rows.isEmpty ? null : OutboxEntry.fromMap(rows.first);
  }

  Future<bool> hasPendingDailyToday({
    required int stallId,
    int? rateId,
    double? amount,
    required DateTime day,
  }) async {
    final db = await database;
    final start = DateTime(day.year, day.month, day.day).toIso8601String();
    final end = DateTime(day.year, day.month, day.day, 23, 59, 59).toIso8601String();
    final rows = await db.query(
      'outbox',
      where: "stall_id = ? AND status IN ('pending', 'failed') AND occurred_at >= ? AND occurred_at <= ?",
      whereArgs: [stallId, start, end],
    );
    return rows.any((row) {
      final rowRateId = row['rate_id'] as int?;
      final rowAmount = (row['amount'] as num?)?.toDouble();
      if (rateId != null) return rowRateId == rateId;
      return rowRateId == null && amount != null && rowAmount == amount;
    });
  }

  // ------------------------------------------------------------ cache meta
  Future<void> setMeta(String key, String value) async {
    final db = await database;
    await db.insert(
      'cache_meta',
      {'key': key, 'value': value},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<String?> getMeta(String key) async {
    final db = await database;
    final rows = await db.query('cache_meta', where: 'key = ?', whereArgs: [key], limit: 1);
    if (rows.isEmpty) return null;
    return rows.first['value'] as String?;
  }

  Future<DateTime?> getMetaDate(String key) async {
    final value = await getMeta(key);
    return value == null ? null : DateTime.tryParse(value);
  }

  Future<void> replaceStalls(List<Map<String, dynamic>> rows) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.delete('cache_stalls');
      final batch = txn.batch();
      for (final row in rows) {
        batch.insert('cache_stalls', row, conflictAlgorithm: ConflictAlgorithm.replace);
      }
      await batch.commit(noResult: true);
    });
  }

  Future<void> replaceRates(List<Map<String, dynamic>> rows) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.delete('cache_rates');
      final batch = txn.batch();
      for (final row in rows) {
        batch.insert('cache_rates', row, conflictAlgorithm: ConflictAlgorithm.replace);
      }
      await batch.commit(noResult: true);
    });
  }

  Future<void> replaceTypes(List<Map<String, dynamic>> rows) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.delete('cache_types');
      final batch = txn.batch();
      for (final row in rows) {
        batch.insert('cache_types', row, conflictAlgorithm: ConflictAlgorithm.replace);
      }
      await batch.commit(noResult: true);
    });
  }

  Future<void> replaceBills(List<Map<String, dynamic>> rows) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.delete('cache_bills');
      final batch = txn.batch();
      for (final row in rows) {
        batch.insert('cache_bills', row, conflictAlgorithm: ConflictAlgorithm.replace);
      }
      await batch.commit(noResult: true);
    });
  }

  Future<void> replacePaidToday(List<Map<String, dynamic>> rows) async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.delete('cache_paid_today');
      final batch = txn.batch();
      for (final row in rows) {
        batch.insert('cache_paid_today', row, conflictAlgorithm: ConflictAlgorithm.replace);
      }
      await batch.commit(noResult: true);
    });
  }

  Future<void> clearCache() async {
    final db = await database;
    await db.transaction((txn) async {
      await txn.delete('cache_stalls');
      await txn.delete('cache_rates');
      await txn.delete('cache_types');
      await txn.delete('cache_bills');
      await txn.delete('cache_paid_today');
      await txn.delete('cache_meta');
    });
  }

  // ----------------------------------------------------------- cache reads
  Future<Map<String, dynamic>?> findStall({required String lapakId}) async {
    final db = await database;
    final byCode = await db.query('cache_stalls', where: 'code = ?', whereArgs: [lapakId], limit: 1);
    if (byCode.isNotEmpty) return Map<String, dynamic>.from(byCode.first);

    final numericId = int.tryParse(lapakId);
    if (numericId != null) {
      final byId = await db.query('cache_stalls', where: 'id = ?', whereArgs: [numericId], limit: 1);
      if (byId.isNotEmpty) return Map<String, dynamic>.from(byId.first);
    }
    return null;
  }

  Future<Map<String, dynamic>?> stallById(int stallId) async {
    final db = await database;
    final rows = await db.query('cache_stalls', where: 'id = ?', whereArgs: [stallId], limit: 1);
    return rows.isEmpty ? null : Map<String, dynamic>.from(rows.first);
  }

  Future<List<Map<String, dynamic>>> ratesForStall(int stallId) async {
    final db = await database;
    final rows = await db.query('cache_rates', where: 'stall_id = ?', whereArgs: [stallId]);
    return rows.map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<List<Map<String, dynamic>>> typesForMarket(int marketId) async {
    final db = await database;
    final rows = await db.query(
      'cache_types',
      where: 'market_id = ?',
      whereArgs: [marketId],
      orderBy: 'name',
    );
    return rows.map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<Map<String, dynamic>?> typeById(int typesId) async {
    final db = await database;
    final rows = await db.query('cache_types', where: 'id = ?', whereArgs: [typesId], limit: 1);
    return rows.isEmpty ? null : Map<String, dynamic>.from(rows.first);
  }

  Future<List<Map<String, dynamic>>> billsForStall(int stallId) async {
    final db = await database;
    final rows = await db.query(
      'cache_bills',
      where: 'stall_id = ?',
      whereArgs: [stallId],
      orderBy: 'period_year ASC, id ASC',
    );
    return rows.map((e) => Map<String, dynamic>.from(e)).toList();
  }

  Future<bool> isPaidToday({
    required int stallId,
    int? rateId,
    double? amount,
  }) async {
    final db = await database;
    final rows = await db.query(
      'cache_paid_today',
      where: 'stall_id = ?',
      whereArgs: [stallId],
    );
    return rows.any((row) {
      final rowRateId = row['rate_id'] as int? ?? 0;
      final rowAmount = (row['amount'] as num?)?.toDouble();
      if (rateId != null) return rowRateId == rateId;
      return rowRateId == 0 && amount != null && rowAmount == amount;
    });
  }

  Future<int> cachedStallCount() async {
    final db = await database;
    final count = Sqflite.firstIntValue(await db.rawQuery('SELECT COUNT(*) FROM cache_stalls'));
    return count ?? 0;
  }

  // ------------------------------------------------------------- attendance
  Future<int> insertAttendance(Map<String, dynamic> attendance) async {
    final db = await database;
    return db.insert('attendance', {
      ...attendance,
      'is_synced': attendance['is_synced'] ?? 0,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<String> queueAttendanceCheckIn({
    required String clientUuid,
    required String officerId,
    required String officerName,
    required int marketId,
    required String checkIn,
    double? lat,
    double? lng,
    String status = 'present',
    int? serverId,
    bool synced = false,
  }) async {
    await insertAttendance({
      'id': clientUuid,
      'officer_id': officerId,
      'officer_name': officerName,
      'market_id': marketId,
      'check_in': checkIn,
      'check_in_lat': lat,
      'check_in_lng': lng,
      'status': status,
      'server_id': serverId,
      'is_synced': synced ? 1 : 0,
    });
    return clientUuid;
  }

  Future<void> queueAttendanceCheckOut({
    required String clientUuid,
    required String checkOut,
    double? lat,
    double? lng,
  }) async {
    final db = await database;
    await db.update(
      'attendance',
      {
        'check_out': checkOut,
        'check_out_lat': lat,
        'check_out_lng': lng,
        'is_synced': 0,
      },
      where: 'id = ?',
      whereArgs: [clientUuid],
    );
  }

  Future<List<Map<String, dynamic>>> unsyncedAttendance() async {
    final db = await database;
    final rows = await db.query('attendance', where: 'is_synced = ?', whereArgs: [0]);
    return rows.map((row) => Map<String, dynamic>.from(row)).toList();
  }

  Future<void> markAttendanceSynced(String clientUuid, {int? serverId}) async {
    final db = await database;
    await db.update(
      'attendance',
      {'is_synced': 1, 'server_id': serverId},
      where: 'id = ?',
      whereArgs: [clientUuid],
    );
  }

  Future<Map<String, dynamic>?> localAttendanceForOfficer(String officerId, DateTime day) async {
    final db = await database;
    final start = DateTime(day.year, day.month, day.day).toIso8601String();
    final end = DateTime(day.year, day.month, day.day, 23, 59, 59).toIso8601String();
    final rows = await db.query(
      'attendance',
      where: 'officer_id = ? AND check_in >= ? AND check_in <= ?',
      whereArgs: [officerId, start, end],
      orderBy: 'check_in DESC',
      limit: 1,
    );
    return rows.isEmpty ? null : Map<String, dynamic>.from(rows.first);
  }

  // ---------------------------------------------------------------- legacy
  Future<void> clearAll() async {
    final db = await database;
    await db.delete('outbox');
    await db.delete('attendance');
    await clearCache();
  }
}

import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import '../../shared/models/stall.dart' as models;

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();

  static Database? _database;

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final documentsDirectory = await getApplicationDocumentsDirectory();
    final path = join(documentsDirectory.path, 'siaga_offline.db');

    return await openDatabase(
      path,
      version: 1,
      onCreate: _onCreate,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    // Create tables for offline support
    await db.execute('''
      CREATE TABLE transactions (
        id TEXT PRIMARY KEY,
        stall_id INTEGER,
        payer_name TEXT,
        amount REAL,
        payment_method TEXT,
        status TEXT,
        note TEXT,
        created_at TEXT,
        is_synced INTEGER DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE attendance (
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
        is_synced INTEGER DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE stalls (
        id INTEGER PRIMARY KEY,
        owner_id INTEGER,
        code TEXT,
        number TEXT,
        is_synced INTEGER DEFAULT 1
      )
    ''');
  }

  // Transaction methods
  Future<int> insertTransaction(models.Transaction transaction) async {
    final db = await database;
    return await db.insert('transactions', {
      'id': transaction.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
      'stall_id': transaction.stallId,
      'payer_name': transaction.payerName,
      'amount': transaction.amount,
      'payment_method': transaction.paymentMethod,
      'status': transaction.status,
      'note': transaction.note,
      'created_at': transaction.createdAt?.toIso8601String(),
      'is_synced': 0,
    });
  }

  Future<List<models.Transaction>> getPendingTransactions() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'transactions',
      where: 'is_synced = ?',
      whereArgs: [0],
    );

    return maps.map((e) => models.Transaction(
      id: e['id'] as int?,
      stallId: (e['stall_id'] as int?) ?? 0,
      payerName: e['payer_name'] as String,
      amount: (e['amount'] as num).toDouble(),
      paymentMethod: e['payment_method'] as String,
      status: e['status'] as String,
      note: e['note'] as String?,
      createdAt: DateTime.tryParse(e['created_at'] as String? ?? ''),
    )).toList();
  }

  Future<void> markTransactionSynced(String id) async {
    final db = await database;
    await db.update(
      'transactions',
      {'is_synced': 1},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> deleteTransaction(String id) async {
    final db = await database;
    await db.delete('transactions', where: 'id = ?', whereArgs: [id]);
  }

  // Attendance methods
  Future<int> insertAttendance(Map<String, dynamic> attendance) async {
    final db = await database;
    return await db.insert('attendance', {
      ...attendance,
      'is_synced': 0,
    });
  }

  Future<void> clearAll() async {
    final db = await database;
    await db.delete('transactions');
    await db.delete('attendance');
  }

  Future<int> getPendingTransactionsCount() async {
    final db = await database;
    final count = Sqflite.firstIntValue(
      await db.rawQuery('SELECT COUNT(*) FROM transactions WHERE is_synced = 0'),
    );
    return count ?? 0;
  }
}

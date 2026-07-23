import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class HistoryPage extends ConsumerStatefulWidget {
  const HistoryPage({super.key});

  @override
  ConsumerState<HistoryPage> createState() => _HistoryPageState();
}

class _HistoryPageState extends ConsumerState<HistoryPage> {
  List<Map<String, dynamic>> _transactions = [];
  bool _isLoading = true;
  String? _errorMessage;
  DateTime _selectedDate = DateTime.now();
  bool _filterToday = true;

  @override
  void initState() {
    super.initState();
    _loadTransactions();
  }

  Future<void> _loadTransactions() async {
    setState(() => _isLoading = true);

    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) throw Exception('User tidak terautentikasi');

      var query = Supabase.instance.client
          .from('transactions')
          .select('''
            id, stall_id, payer_name, amount, payment_method, status, note, created_at
          ''');

      if (_filterToday) {
        final now = DateTime.now();
        final start = DateTime(now.year, now.month, now.day).toUtc().toIso8601String();
        final end = DateTime(now.year, now.month, now.day, 23, 59, 59).toUtc().toIso8601String();
        query = query.gte('created_at', start).lte('created_at', end);
      } else {
        final start = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day).toUtc().toIso8601String();
        final end = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day, 23, 59, 59).toUtc().toIso8601String();
        query = query.gte('created_at', start).lte('created_at', end);
      }

      final response = await query.order('created_at', ascending: false).limit(100);

      if (mounted) {
        setState(() {
          _transactions = (response as List)
              .map((e) => Map<String, dynamic>.from(e as Map))
              .toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Gagal memuat riwayat: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'id', symbol: 'Rp ', decimalDigits: 0);

    if (_isLoading) return const Center(child: CircularProgressIndicator());
    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 72, color: Colors.grey[400]),
              const SizedBox(height: 16),
              Text(_errorMessage!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _loadTransactions, child: const Text('Coba Lagi')),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadTransactions,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Riwayat Transaksi', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          // Date filter
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _selectedDate,
                      firstDate: DateTime(2024),
                      lastDate: DateTime.now(),
                    );
                    if (picked != null && mounted) {
                      setState(() {
                        _selectedDate = picked;
                        _filterToday = false;
                      });
                      _loadTransactions();
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.orange[50],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.orange[200]!),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.calendar_today, size: 16, color: Colors.orange[700]),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _filterToday ? 'Hari Ini' : DateFormat('EEEE, dd MMMM yyyy', 'id').format(_selectedDate),
                            style: TextStyle(fontSize: 13, color: Colors.orange[900]),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: () {
                  setState(() {
                    _filterToday = true;
                    _selectedDate = DateTime.now();
                  });
                  _loadTransactions();
                },
                child: const Text('Hari Ini'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_transactions.isEmpty)
            Container(
              padding: const EdgeInsets.all(32),
              alignment: Alignment.center,
              child: Column(
                children: [
                  Icon(Icons.receipt_long, size: 72, color: Colors.grey[300]),
                  const SizedBox(height: 16),
                  Text('Belum ada transaksi', style: TextStyle(color: Colors.grey[500])),
                ],
              ),
            )
          else ...[
            Text('${_transactions.length} transaksi', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
            const SizedBox(height: 8),
            ..._transactions.map((tx) => _buildTransactionCard(tx, currency)),
          ],
        ],
      ),
    );
  }

  Widget _buildTransactionCard(Map<String, dynamic> tx, NumberFormat currency) {
    final createdAt = DateTime.tryParse(tx['created_at'] ?? '');
    final amount = (tx['amount'] as num?)?.toDouble() ?? 0;
    final status = tx['status']?.toString() ?? 'paid';
    final isPaid = status == 'paid';
    final method = tx['payment_method']?.toString() ?? '-';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: isPaid ? Colors.green[50] : Colors.orange[50],
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                isPaid ? Icons.check_circle : Icons.pending,
                color: isPaid ? Colors.green : Colors.orange,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tx['payer_name']?.toString() ?? 'Unknown',
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.store, size: 12, color: Colors.grey[500]),
                      const SizedBox(width: 4),
                      Text('Lapak #${tx['stall_id'] ?? '-'}', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                      const SizedBox(width: 12),
                      Icon(Icons.payment, size: 12, color: Colors.grey[500]),
                      const SizedBox(width: 4),
                      Text(method, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    createdAt != null
                        ? DateFormat('dd MMM yyyy, HH:mm', 'id').format(createdAt)
                        : 'Unknown date',
                    style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  currency.format(amount),
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: isPaid ? Colors.green[800] : Colors.orange[800]),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: isPaid ? Colors.green[50] : Colors.orange[50],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    isPaid ? 'Lunas' : 'Pending',
                    style: TextStyle(fontSize: 10, color: isPaid ? Colors.green[700] : Colors.orange[700]),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
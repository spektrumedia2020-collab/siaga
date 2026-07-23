import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';

class ReconciliationPage extends ConsumerStatefulWidget {
  const ReconciliationPage({super.key});

  @override
  ConsumerState<ReconciliationPage> createState() => _ReconciliationPageState();
}

class _ReconciliationPageState extends ConsumerState<ReconciliationPage> {
  bool loading = true;
  String? errorMessage;
  int totalTargetStalls = 0;
  int paidStalls = 0;
  int unpaidStalls = 0;
  double expectedRevenue = 0;
  double actualRevenue = 0;
  double variance = 0;
  List<Map<String, dynamic>> paidList = [];
  List<Map<String, dynamic>> unpaidList = [];
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _loadReconciliation();
  }

  Future<void> _loadReconciliation() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        setState(() { loading = false; errorMessage = 'User tidak terautentikasi'; });
        return;
      }
      final officer = await Supabase.instance.client
          .from('users').select('market_id').eq('auth_uid', user.id).maybeSingle();
      final marketId = officer?['market_id'] as int?;
      if (marketId == null) { setState(() { loading = false; errorMessage = 'Tidak ada penugasan'; }); return; }

      final stallsList = await Supabase.instance.client
          .from('stalls').select('id, code, number, stall_owners(name)').eq('market_id', marketId).order('number');
      final stalls = (stallsList as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      totalTargetStalls = stalls.length;

      final start = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day).toUtc().toIso8601String();
      final end = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day, 23, 59, 59).toUtc().toIso8601String();

      final txList = await Supabase.instance.client
          .from('transactions').select('stall_id, amount').gte('created_at', start).lte('created_at', end);
      final txs = (txList as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();

      double actual = 0;
      final paidIds = <int>{};
      for (final tx in txs) {
        actual += (tx['amount'] as num?)?.toDouble() ?? 0;
        if (tx['stall_id'] is int) paidIds.add(tx['stall_id'] as int);
      }

      final paid = <Map<String, dynamic>>[];
      final unpaid = <Map<String, dynamic>>[];
      for (final s in stalls) {
        final id = s['id'] as int;
        final owner = s['stall_owners'] is Map ? (s['stall_owners'] as Map)['name']?.toString() ?? '-' : '-';
        final row = {'id': id, 'code': s['code']?.toString() ?? '$id', 'number': s['number']?.toString() ?? '-', 'owner_name': owner};
        if (paidIds.contains(id)) paid.add(row); else unpaid.add(row);
      }

      double expected = 0;
      try {
        final rates = await Supabase.instance.client
            .from('retribution_rates').select('amount, stall_id').eq('market_id', marketId);
        final rateMap = <int, double>{};
        for (final r in (rates as List).map((e) => Map<String, dynamic>.from(e as Map))) {
          if (r['stall_id'] is int) rateMap[r['stall_id'] as int] = (r['amount'] as num?)?.toDouble() ?? 0;
        }
        for (final s in stalls) { if (rateMap.containsKey(s['id'])) expected += rateMap[s['id']]!; }
      } catch (_) { expected = actual; }

      if (mounted) setState(() { actualRevenue = actual; expectedRevenue = expected; variance = expected - actual; paidStalls = paid.length; unpaidStalls = unpaid.length; paidList = paid; unpaidList = unpaid; loading = false; });
    } catch (e) { if (mounted) setState(() { loading = false; errorMessage = 'Gagal: $e'; }); }
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
    if (loading) return const Center(child: CircularProgressIndicator());
    if (errorMessage != null) {
      return Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.error_outline, size: 72, color: Colors.grey[400]), const SizedBox(height: 16), Text(errorMessage!, textAlign: TextAlign.center), const SizedBox(height: 16), ElevatedButton(onPressed: _loadReconciliation, child: const Text('Coba Lagi'))])));
    }
    return RefreshIndicator(
      onRefresh: _loadReconciliation,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Rekonsiliasi', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          // Date picker
          InkWell(
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
                  loading = true;
                });
                _loadReconciliation();
              }
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.orange[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.orange[200]!),
              ),
              child: Row(
                children: [
                  Icon(Icons.calendar_today, color: Colors.orange[700], size: 20),
                  const SizedBox(width: 12),
                  Text(
                    DateFormat('EEEE, dd MMMM yyyy', 'id').format(_selectedDate),
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.orange[900]),
                  ),
                  const Spacer(),
                  Icon(Icons.arrow_drop_down, color: Colors.orange[700]),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          _buildSummaryCards(currency),
          const SizedBox(height: 20),
          _buildDetailSection(title: 'Lunas', items: paidList, color: Colors.green),
          const SizedBox(height: 16),
          _buildDetailSection(title: 'Belum Lunas', items: unpaidList, color: Colors.red),
        ],
      ),
    );
  }

  Widget _buildSummaryCards(NumberFormat currency) {
    return Column(children: [
      Row(children: [
        Expanded(child: _StatCard(title: 'Target', value: '$totalTargetStalls lapak', color: Colors.blue)),
        const SizedBox(width: 12),
        Expanded(child: _StatCard(title: 'Lunas', value: '$paidStalls', color: Colors.green)),
        const SizedBox(width: 12),
        Expanded(child: _StatCard(title: 'Belum', value: '$unpaidStalls', color: Colors.red)),
      ]),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: _StatCard(title: 'Expected', value: currency.format(expectedRevenue), color: Colors.orange)),
        const SizedBox(width: 12),
        Expanded(child: _StatCard(title: 'Actual', value: currency.format(actualRevenue), color: Colors.teal)),
      ]),
      const SizedBox(height: 12),
      _StatCard(title: 'Variance', value: currency.format(variance), color: variance >= 0 ? Colors.green : Colors.red),
    ]);
  }

  Widget _buildDetailSection({required String title, required List<Map<String, dynamic>> items, required Color color}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(title, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
      const SizedBox(height: 8),
      items.isEmpty
          ? Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(12)), child: Text('Tidak ada data', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey[600])))
          : ListView.builder(shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), itemCount: items.length, itemBuilder: (c, i) { final item = items[i]; return Card(margin: const EdgeInsets.only(bottom: 8), child: ListTile(title: Text('${item['code']} #${item['number']}'), subtitle: Text(item['owner_name']?.toString() ?? ''), trailing: Icon(Icons.check_circle, color: color))); }),
    ]);
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final Color color;
  const _StatCard({required this.title, required this.value, required this.color});
  @override
  Widget build(BuildContext context) {
    return Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(16), border: Border.all(color: color.withOpacity(0.3))), child: Column(children: [Text(title, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)), const SizedBox(height: 6), Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey[800]))]));
  }
}


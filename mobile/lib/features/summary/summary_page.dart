import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme/app_theme.dart';

/// Full page with Scaffold + AppBar for standalone route
class SummaryPage extends ConsumerWidget {
  const SummaryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Kembali ke Dashboard',
          onPressed: () => GoRouter.of(context).go('/dashboard'),
        ),
        title: Row(
          children: [
            Container(
              width: 24, height: 24,
              padding: const EdgeInsets.all(0.5),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(6)),
              child: Image.asset('assets/logo.jpeg', fit: BoxFit.contain,
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
      body: const SummaryPageBody(),
    );
  }
}

/// Body-only widget for use inside DashboardPage tabs (no Scaffold/AppBar)
class SummaryPageBody extends StatefulWidget {
  const SummaryPageBody({super.key});

  @override
  State<SummaryPageBody> createState() => _SummaryPageBodyState();
}

class _SummaryPageBodyState extends State<SummaryPageBody> {
  bool _loading = true;
  String? _error;
  String _period = 'month';

  double _todayRevenue = 0;
  int _todayTxCount = 0;
  double _periodRevenue = 0;
  int _periodTxCount = 0;
  int _approvedSetoranCount = 0;
  double _approvedSetoranAmount = 0;
  List<_DailyPoint> _daily = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });

    try {
      final client = Supabase.instance.client;
      final now = DateTime.now();

      final todayStart = DateTime(now.year, now.month, now.day).toUtc().toIso8601String();
      final todayEnd = DateTime(now.year, now.month, now.day, 23, 59, 59).toUtc().toIso8601String();

      DateTime periodStart;
      DateTime periodEnd = DateTime(now.year, now.month, now.day, 23, 59, 59);

      switch (_period) {
        case 'today': periodStart = DateTime(now.year, now.month, now.day); break;
        case '7days': periodStart = now.subtract(const Duration(days: 6)); periodStart = DateTime(periodStart.year, periodStart.month, periodStart.day); break;
        case 'year': periodStart = DateTime(now.year, 1, 1); break;
        case 'month': default: periodStart = DateTime(now.year, now.month, 1); break;
      }

      final periodStartStr = periodStart.toUtc().toIso8601String();
      final periodEndStr = periodEnd.toUtc().toIso8601String();

      final todayTx = await client.from('transactions').select('amount').gte('created_at', todayStart).lte('created_at', todayEnd);
      final periodTx = await client.from('transactions').select('amount, created_at').gte('created_at', periodStartStr).lte('created_at', periodEndStr);
      final approvedSetoran = await client.from('setoran').select('total_amount').eq('status', 'approved').gte('created_at', periodStartStr).lte('created_at', periodEndStr);

      final todayList = todayTx as List;
      final periodList = periodTx as List;
      final setoranList = approvedSetoran as List;

      final todayRevenue = todayList.fold<double>(0.0, (sum, tx) => sum + ((tx['amount'] as num?)?.toDouble() ?? 0.0));
      final periodRevenue = periodList.fold<double>(0.0, (sum, tx) => sum + ((tx['amount'] as num?)?.toDouble() ?? 0.0));
      final approvedAmount = setoranList.fold<double>(0.0, (sum, s) => sum + ((s['total_amount'] as num?)?.toDouble() ?? 0.0));

      final daily = <_DailyPoint>[];
      if (_period == '7days') {
        for (int i = 0; i < 7; i++) {
          final d = now.subtract(Duration(days: 6 - i));
          final ds = DateTime(d.year, d.month, d.day).toUtc().toIso8601String();
          final de = DateTime(d.year, d.month, d.day, 23, 59, 59).toUtc().toIso8601String();
          final dayTx = periodList.where((tx) {
            final ts = DateTime.tryParse(tx['created_at']?.toString() ?? '')?.toUtc();
            return ts != null && ts.isAfter(DateTime.parse(ds).subtract(const Duration(seconds: 1))) && ts.isBefore(DateTime.parse(de).add(const Duration(seconds: 1)));
          }).toList();
          daily.add(_DailyPoint(date: d, amount: dayTx.fold<double>(0.0, (sum, tx) => sum + ((tx['amount'] as num?)?.toDouble() ?? 0.0))));
        }
      } else if (_period == 'month' || _period == 'today') {
        final daysInMonth = DateTime(now.year, now.month + 1, 0).day;
        final step = max(1, (daysInMonth / 10).floor());
        for (int i = 0; i < daysInMonth; i += step) {
          final d = DateTime(now.year, now.month, i + 1);
          final ds = DateTime(d.year, d.month, d.day).toUtc().toIso8601String();
          final de = DateTime(d.year, d.month, d.day, 23, 59, 59).toUtc().toIso8601String();
          final dayTx = periodList.where((tx) {
            final ts = DateTime.tryParse(tx['created_at']?.toString() ?? '')?.toUtc();
            return ts != null && ts.isAfter(DateTime.parse(ds).subtract(const Duration(seconds: 1))) && ts.isBefore(DateTime.parse(de).add(const Duration(seconds: 1)));
          }).toList();
          daily.add(_DailyPoint(date: d, amount: dayTx.fold<double>(0.0, (sum, tx) => sum + ((tx['amount'] as num?)?.toDouble() ?? 0.0))));
        }
      }

      if (mounted) {
        setState(() {
          _todayRevenue = todayRevenue;
          _todayTxCount = todayList.length;
          _periodRevenue = periodRevenue;
          _periodTxCount = periodList.length;
          _approvedSetoranCount = setoranList.length;
          _approvedSetoranAmount = approvedAmount;
          _daily = daily;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() { _error = 'Gagal memuat rekap: ${e.toString()}'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'id', symbol: 'Rp ', decimalDigits: 0);
    final dateFormat = DateFormat('dd MMM', 'id');

    if (_loading) return const Center(child: CircularProgressIndicator());

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 56, color: Colors.red[300]),
              const SizedBox(height: 16),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('Coba Lagi')),
            ],
          ),
        ),
      );
    }

    final titleMap = { 'today': 'Hari Ini', '7days': '7 Hari Terakhir', 'month': 'Bulan Ini', 'year': 'Tahun Ini' };

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Rekap Retribusi', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _periodChip('Hari Ini', _period == 'today', () { setState(() => _period = 'today'); _load(); })),
            const SizedBox(width: 8),
            Expanded(child: _periodChip('7 Hari', _period == '7days', () { setState(() => _period = '7days'); _load(); })),
            const SizedBox(width: 8),
            Expanded(child: _periodChip('Bulan Ini', _period == 'month', () { setState(() => _period = 'month'); _load(); })),
            const SizedBox(width: 8),
            Expanded(child: _periodChip('Tahun Ini', _period == 'year', () { setState(() => _period = 'year'); _load(); })),
          ]),
          const SizedBox(height: 20),
          Text('Ringkasan ${titleMap[_period] ?? 'Periode'}', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _SummaryCard(title: 'Pendapatan', value: _period == 'today' ? _todayRevenue : _periodRevenue, icon: Icons.trending_up, color: Colors.green)),
            const SizedBox(width: 12),
            Expanded(child: _SummaryCard(title: 'Setoran Disetujui', value: _approvedSetoranAmount, subtitle: '$_approvedSetoranCount setoran', icon: Icons.check_circle, color: Colors.purple)),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _SummaryCard(title: 'Transaksi', value: _period == 'today' ? _todayTxCount : _periodTxCount, isAmount: false, icon: Icons.receipt_long, color: Colors.orange)),
            const SizedBox(width: 12),
            Expanded(child: _SummaryCard(title: 'Pendapatan Hari Ini', value: _todayRevenue, icon: Icons.today, color: Colors.teal)),
          ]),
          const SizedBox(height: 24),
          if (_daily.isNotEmpty) ...[
            Text('Grafik Pendapatan', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _MiniBarChart(daily: _daily, currency: currency, dateFormat: dateFormat),
          ],
        ],
      ),
    );
  }

  Widget _periodChip(String label, bool active, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        decoration: BoxDecoration(
          color: active ? AppTheme.primaryGreen : Colors.grey[200],
          borderRadius: BorderRadius.circular(20),
        ),
        child: Center(
          child: Text(label, style: TextStyle(color: active ? Colors.white : Colors.black87, fontSize: 12, fontWeight: FontWeight.w600)),
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String title;
  final dynamic value;
  final String? subtitle;
  final IconData icon;
  final Color color;
  final bool isAmount;
  const _SummaryCard({required this.title, required this.value, this.subtitle, required this.icon, required this.color, this.isAmount = true});

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'id', symbol: 'Rp ', decimalDigits: 0);
    final displayValue = isAmount ? currency.format(value ?? 0) : '${value ?? 0}';
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 6),
            Expanded(child: Text(title, style: TextStyle(fontSize: 11, color: Colors.grey[700], fontWeight: FontWeight.w500))),
          ]),
          const SizedBox(height: 10),
          Text(displayValue, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
          if (subtitle != null) ...[const SizedBox(height: 4), Text(subtitle!, style: TextStyle(fontSize: 11, color: Colors.grey[600]))],
        ],
      ),
    );
  }
}

class _DailyPoint {
  final DateTime date;
  final double amount;
  const _DailyPoint({required this.date, required this.amount});
}

class _MiniBarChart extends StatelessWidget {
  final List<_DailyPoint> daily;
  final NumberFormat currency;
  final DateFormat dateFormat;
  const _MiniBarChart({required this.daily, required this.currency, required this.dateFormat});

  @override
  Widget build(BuildContext context) {
    if (daily.isEmpty) return const SizedBox.shrink();
    final maxAmount = daily.map((e) => e.amount).fold<double>(0.0, max);
    if (maxAmount == 0) {
      return SizedBox(height: 140, child: Center(child: Text('Belum ada data', style: TextStyle(color: Colors.grey[500]))));
    }
    return Container(
      height: 180,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: daily.map((p) {
          final ratio = maxAmount == 0 ? 0.0 : (p.amount / maxAmount);
          final barHeight = max(ratio * 120.0, 6.0);
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3),
              child: Column(
                children: [
                  Flexible(child: Container(height: barHeight, decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary, borderRadius: BorderRadius.circular(6)))),
                  const SizedBox(height: 6),
                  Text(dateFormat.format(p.date), style: const TextStyle(fontSize: 10), overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
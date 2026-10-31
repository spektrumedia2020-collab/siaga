import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class LapakPage extends ConsumerStatefulWidget {
  const LapakPage({super.key, required this.lapakId});
  final String lapakId;

  @override
  ConsumerState<LapakPage> createState() => _LapakPageState();
}

class _LapakPageState extends ConsumerState<LapakPage> {
  String? ownerName;
  bool loadingOwner = true;
  Map<String, dynamic>? stallData;
  List<Map<String, dynamic>> retributionTypes = [];
  List<Map<String, dynamic>> transactionHistory = [];
  List<Map<String, dynamic>> billRows = [];
  Map<int, String> billTypeNames = {};
  Set<int> _dailyTypeIds = <int>{};
  final int _selectedTabIndex = 0;
  String? _accessDeniedMessage;
  bool _alreadyCollectedDailyToday = false;

  @override
  void initState() {
    super.initState();
    _loadLapakData();
  }

  Future<void> _loadLapakData() async {
    try {
      final supabase = Supabase.instance.client;
      Map<String, dynamic>? row;

      final stallByCode = await supabase
          .from('stalls')
          .select('id, code, number, status, sector_id, owner_id, market_id')
          .eq('code', widget.lapakId)
          .maybeSingle();
      if (stallByCode != null) {
        row = Map<String, dynamic>.from(stallByCode as Map);
      } else {
        final idNumeric = int.tryParse(widget.lapakId);
        if (idNumeric != null) {
          final stallById = await supabase
              .from('stalls')
              .select('id, code, number, status, sector_id, owner_id, market_id')
              .eq('id', idNumeric)
              .maybeSingle();
          if (stallById != null) {
            row = Map<String, dynamic>.from(stallById as Map);
          }
        }
      }

      if (row == null) {
        if (mounted) setState(() => loadingOwner = false);
        return;
      }

      final ownerId = row['owner_id'];
      final sectorId = row['sector_id'];
      final marketId = row['market_id'];
      final stallId = row['id'] as int;
      final user = supabase.auth.currentUser;

      final now = DateTime.now().toUtc();
      final startOfDay = DateTime.utc(now.year, now.month, now.day);
      final startOfNextDay = startOfDay.add(const Duration(days: 1));

      // Fetch everything that only needs the stall row in parallel.
      final results = await Future.wait<dynamic>([
        user == null
            ? Future<dynamic>.value(null)
            : supabase
                .from('users')
                .select('id_user, market_id')
                .eq('auth_uid', user.id)
                .maybeSingle(),
        ownerId == null
            ? Future<dynamic>.value(null)
            : supabase
                .from('stall_owners')
                .select('name, nik, phone, address')
                .eq('id', ownerId)
                .maybeSingle(),
        sectorId == null
            ? Future<dynamic>.value(null)
            : supabase
                .from('market_sectors')
                .select('name')
                .eq('id', sectorId)
                .maybeSingle(),
        supabase
            .from('retribution_rates')
            .select('id, amount, types_id')
            .eq('stall_id', stallId)
            .eq('market_id', marketId),
        supabase
            .from('retribution_types')
            .select('id, code, name, category, unit, notes')
            .order('name'),
        supabase
            .from('transactions')
            .select('id, rate_id, amount')
            .eq('stall_id', stallId)
            .eq('status', 'paid')
            .gte('created_at', startOfDay.toIso8601String())
            .lt('created_at', startOfNextDay.toIso8601String()),
        supabase
            .from('transactions')
            .select('id, amount, payment_method, status, created_at')
            .eq('stall_id', stallId)
            .order('created_at', ascending: false)
            .limit(20),
      ]);

      final officerRow = results[0] == null ? null : Map<String, dynamic>.from(results[0] as Map);
      final ownerRow = results[1] == null ? null : Map<String, dynamic>.from(results[1] as Map);
      final sectorRow = results[2] == null ? null : Map<String, dynamic>.from(results[2] as Map);
      final rateRows = (results[3] as List).cast<Map<String, dynamic>>();
      final typeRows = (results[4] as List).cast<Map<String, dynamic>>();
      final todayRows = (results[5] as List).cast<Map<String, dynamic>>();
      final historyRows = (results[6] as List).cast<Map<String, dynamic>>();

      _accessDeniedMessage = null;
      final officerMarketId = officerRow?['market_id'] as int?;
      final officerUserId = officerRow?['id_user'] as int?;
      if (user == null) {
        _accessDeniedMessage = 'Sesi petugas tidak ditemukan. Silakan login kembali.';
      } else if (officerMarketId == null || officerUserId == null) {
        _accessDeniedMessage = 'Profil petugas atau penugasan pasar belum tersedia.';
      } else if (officerMarketId != marketId) {
        _accessDeniedMessage = 'Lapak ini bukan wilayah tugas Anda.';
      } else {
        final assignedSector = await supabase
            .from('market_sectors')
            .select('id')
            .eq('id', sectorId ?? -1)
            .eq('market_id', officerMarketId)
            .eq('officer_id', officerUserId)
            .maybeSingle();
        if (assignedSector == null) {
          _accessDeniedMessage = 'Lapak ini berada di sektor yang bukan tugas Anda.';
        }
      }

      if (_accessDeniedMessage != null) {
        if (mounted) {
          setState(() {
            loadingOwner = false;
            retributionTypes = [];
          });
        }
        return;
      }

      final dailyTypeIds = typeRows
          .where((type) {
            final text = '${type['code'] ?? ''} ${type['name'] ?? ''} ${type['unit'] ?? ''}'.toUpperCase();
            return text.contains('HARIAN') || text.contains('HARI');
          })
          .map((type) => (type['id'] as num).toInt())
          .toSet();

      final dailyRateIds = rateRows
          .where((rate) => dailyTypeIds.contains((rate['types_id'] as num).toInt()))
          .map((rate) => (rate['id'] as num).toInt())
          .toSet();
      final dailyAmounts = rateRows
          .where((rate) => dailyTypeIds.contains((rate['types_id'] as num).toInt()))
          .map((rate) => (rate['amount'] as num).toDouble())
          .toSet();

      _alreadyCollectedDailyToday = todayRows.any((transaction) {
        final rateId = transaction['rate_id'];
        final amount = (transaction['amount'] as num?)?.toDouble();
        return dailyRateIds.contains(rateId) ||
            (rateId == null && amount != null && dailyAmounts.contains(amount));
      });

      final rateMap = <int, double>{};
      for (final rate in rateRows) {
        rateMap[(rate['types_id'] as num).toInt()] = (rate['amount'] as num).toDouble();
      }
      final loadedTypes = typeRows
          .where((type) => rateMap.containsKey((type['id'] as num).toInt()))
          .map((type) {
            final copy = Map<String, dynamic>.from(type);
            copy['rate'] = rateMap[(type['id'] as num).toInt()];
            return copy;
          })
          .toList();

      if (mounted) {
        setState(() {
          stallData = row;
          loadingOwner = false;
          ownerName = ownerRow?['name']?.toString();
          _ownerNIK = ownerRow?['nik']?.toString();
          _ownerPhone = ownerRow?['phone']?.toString();
          _ownerAddress = ownerRow?['address']?.toString();
          _sectorName = sectorRow?['name']?.toString();
          retributionTypes = loadedTypes;
          transactionHistory = historyRows;
          _dailyTypeIds = dailyTypeIds;
        });
      }

      // Bills load after the main content so they never delay the page.
      unawaited(_loadBills(stallId));
    } on Exception catch (e) {
      debugPrint('Error in _loadLapakData: $e');
      if (mounted) {
        setState(() => loadingOwner = false);
      }
    }
  }

  Future<void> _loadBills(int stallId) async {
    final supabase = Supabase.instance.client;
    final data = await supabase
        .from('retribution_bill_balances')
        .select('types_id, period_year, amount_due, amount_paid, outstanding, status, due_date')
        .eq('stall_id', stallId)
        .order('period_year', ascending: true);

    final rows = (data as List)
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();

    final typeIds = rows
        .map((row) => (row['types_id'] as num?)?.toInt())
        .whereType<int>()
        .toSet()
        .toList();

    final names = <int, String>{};
    if (typeIds.isNotEmpty) {
      final types = await supabase
          .from('retribution_types')
          .select('id, name')
          .inFilter('id', typeIds);
      for (final type in (types as List)) {
        names[(type['id'] as num).toInt()] =
            (type['name'] ?? 'Tagihan tahunan').toString();
      }
    }

    if (mounted) {
      setState(() {
        billRows = rows;
        billTypeNames = names;
      });
    }
  }

  String? _ownerNIK;
  String? _ownerPhone;
  String? _ownerAddress;
  String? _sectorName;

  void _selectRetributionType(String typeId) {
    final stallId = (stallData?['id'] ?? widget.lapakId).toString();
    context.go('/transaction/$stallId/$typeId');
  }

  @override
  Widget build(BuildContext context) {
    final stallCode = stallData?['code'] ?? widget.lapakId;
    final stallNumber = stallData?['number'] ?? '-';
    final stallStatus = stallData?['status'] ?? 'AKTIF';
    final isActive = stallStatus == 'AKTIF';

    return DefaultTabController(
      length: 3,
      initialIndex: _selectedTabIndex,
      child: Scaffold(
        backgroundColor: Colors.grey[50],
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.go('/dashboard', extra: 2),
          ),
          title: const Text(
            'Siaga',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
          actions: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isActive ? const Color(0xFF1D4E89).withValues(alpha: 0.1) : Colors.red.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isActive ? const Color(0xFF1D4E89).withValues(alpha: 0.3) : Colors.red.withValues(alpha: 0.3),
                ),
              ),
              child: Text(
                stallStatus,
                style: TextStyle(
                  fontSize: 13,
                  color: isActive ? const Color(0xFF1D4E89) : Colors.red[700],
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: Column(
          children: [
            // Stall header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.grey.withValues(alpha: 0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          stallCode,
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[800],
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'No. $stallNumber',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: isActive ? const Color(0xFFE6EDF7) : Colors.red[50],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isActive ? const Color(0xFF9DB6D8) : Colors.red[200]!,
                      ),
                    ),
                    child: Text(
                      isActive ? 'Aktif' : 'Tidak Aktif',
                      style: TextStyle(
                        fontSize: 12,
                        color: isActive ? const Color(0xFF1D4E89) : Colors.red[700],
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Tab bar
            Container(
              color: Colors.white,
              child: TabBar(
                tabs: const [
                  Tab(text: 'Retribusi'),
                  Tab(text: 'Informasi'),
                  Tab(text: 'Riwayat'),
                ],
                labelColor: Colors.orange[700],
                unselectedLabelColor: Colors.grey[600],
                indicatorColor: Colors.orange[700],
                indicatorWeight: 3,
              ),
            ),
            // Tab content
            if (loadingOwner) const LinearProgressIndicator(minHeight: 2),
            Expanded(
              child: TabBarView(
                children: [
                  _buildRetributionTab(),
                  _buildInfoTab(),
                  _buildHistoryTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRetributionTab() {
    if (_accessDeniedMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.location_off_outlined, size: 64, color: Colors.red[400]),
              const SizedBox(height: 16),
              Text(
                _accessDeniedMessage!,
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.red[700], fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Text(
                'Penagihan untuk lapak ini tidak diizinkan.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey[600]),
              ),
            ],
          ),
        ),
      );
    }

    final dailyTypes = retributionTypes
        .where((type) => _dailyTypeIds.contains((type['id'] as num?)?.toInt()))
        .toList();
    final otherTypes = retributionTypes
        .where((type) => !_dailyTypeIds.contains((type['id'] as num?)?.toInt()))
        .toList();

    final children = <Widget>[];

    if (dailyTypes.isNotEmpty) {
      children.add(_buildSectionHeader('Retribusi Harian'));
      if (_alreadyCollectedDailyToday) {
        children.add(_buildDailyPaidCard());
      } else {
        children.addAll(dailyTypes.map(_buildTypeCard));
      }
    }

    children.add(_buildBillsSection());

    if (otherTypes.isNotEmpty) {
      children.add(_buildSectionHeader('Retribusi Lain'));
      for (final type in otherTypes) {
        final typeId = (type['id'] as num?)?.toInt();
        children.add(_buildTypeCard(
          type,
          disabled: typeId != null && _typeIsLunas(typeId),
        ));
      }
    }

    if (children.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              'Belum ada jenis retribusi',
              style: TextStyle(color: Colors.grey[600], fontSize: 16),
            ),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: children,
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(top: 4, bottom: 10),
      child: Text(
        title,
        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF1D4E89)),
      ),
    );
  }

  Widget _buildDailyPaidCard() {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFE6EDF7),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF9DB6D8)),
      ),
      child: const Row(
        children: [
          Icon(Icons.task_alt, size: 32, color: Color(0xFF2A5690)),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'Retribusi harian sudah dibayar hari ini',
              style: TextStyle(color: Color(0xFF1D4E89), fontSize: 15, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  bool _typeIsLunas(int typeId) {
    final bills = billRows
        .where((bill) => (bill['types_id'] as num?)?.toInt() == typeId)
        .toList();
    if (bills.isEmpty) return false;
    return bills.every((bill) {
      final status = (bill['status'] ?? '').toString();
      final outstanding = (bill['outstanding'] as num?)?.toDouble() ?? 0;
      return status == 'LUNAS' || status == 'DIBATALKAN' || outstanding <= 0;
    });
  }

  Widget _buildTypeCard(Map<String, dynamic> type, {bool disabled = false}) {
    final typeName = type['name'] ?? 'Tidak diketahui';
    final typeCode = type['code'] ?? '-';
    final amount = (type['rate'] as num?)?.toDouble() ?? 0;
    final typeId = (type['id'] as num?)?.toInt();
    final hasBills = typeId != null &&
        billRows.any((bill) => (bill['types_id'] as num?)?.toInt() == typeId);
    final onTap = disabled || typeId == null
        ? null
        : (hasBills
            ? () => _openBillPayment(typeId)
            : () => _selectRetributionType(typeId.toString()));

    return Opacity(
      opacity: disabled ? 0.6 : 1,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: disabled
                          ? [Colors.grey[300]!, Colors.grey[400]!]
                          : [Colors.orange[300]!, Colors.orange[500]!],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.payments_outlined,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        typeName,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        typeCode,
                        style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                      ),
                      const SizedBox(height: 6),
                      if (amount > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF5478B5), Color(0xFF2A5690)],
                            ),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Rp ${amount.toStringAsFixed(0)}',
                            style: const TextStyle(
                              fontSize: 14,
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        )
                      else
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: Colors.grey[200],
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Belum ada tarif',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                if (disabled)
                  const Text(
                    'Lunas',
                    style: TextStyle(
                      color: Color(0xFF2E7D32),
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  )
                else
                  Icon(
                    Icons.arrow_forward_ios,
                    size: 16,
                    color: Colors.orange[700],
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBillsSection() {
    final openBills = billRows
        .where((bill) => (bill['status'] ?? '') != 'DIBATALKAN')
        .toList();
    if (openBills.isEmpty) return const SizedBox.shrink();

    final totalOutstanding = openBills.fold<double>(
      0,
      (sum, bill) => sum + ((bill['outstanding'] as num?)?.toDouble() ?? 0),
    );

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFC7D5EA)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Tagihan Tahunan',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF1D4E89)),
              ),
              Text(
                'Sisa Rp ${_formatAmount(totalOutstanding)}',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: totalOutstanding > 0 ? const Color(0xFFB3261E) : const Color(0xFF2E7D32),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...openBills.map(_buildBillCard),
          if (totalOutstanding > 0) ...[
            const SizedBox(height: 4),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _openBillPayment,
                icon: const Icon(Icons.payments_outlined, size: 18),
                label: const Text('Bayar / Cicil Tagihan'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1D4E89),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBillCard(Map<String, dynamic> bill) {
    final year = bill['period_year']?.toString() ?? '-';
    final typeName = billTypeNames[(bill['types_id'] as num?)?.toInt()] ?? 'Tagihan tahunan';
    final due = (bill['amount_due'] as num?)?.toDouble() ?? 0;
    final paid = (bill['amount_paid'] as num?)?.toDouble() ?? 0;
    final outstanding = (bill['outstanding'] as num?)?.toDouble() ?? 0;
    final status = (bill['status'] ?? '').toString();
    final statusLabel = switch (status) {
      'LUNAS' => 'Lunas',
      'CICILAN' => 'Cicilan',
      'DIBATALKAN' => 'Dibatalkan',
      _ => 'Belum lunas',
    };
    final statusColor = switch (status) {
      'LUNAS' => const Color(0xFF2E7D32),
      'CICILAN' => const Color(0xFFB26A00),
      'DIBATALKAN' => Colors.grey,
      _ => const Color(0xFFB3261E),
    };
    final dueDate = bill['due_date']?.toString();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F9FC),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text('$year · $typeName', style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  statusLabel,
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: statusColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Tagihan Rp ${_formatAmount(due)} · Dibayar Rp ${_formatAmount(paid)}',
            style: TextStyle(fontSize: 12, color: Colors.grey[700]),
          ),
          const SizedBox(height: 2),
          Text(
            'Sisa Rp ${_formatAmount(outstanding)}',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: outstanding > 0 ? const Color(0xFFB3261E) : const Color(0xFF2E7D32),
            ),
          ),
          if (dueDate != null && dueDate.length >= 10)
            Text(
              'Jatuh tempo ${dueDate.substring(0, 10)}',
              style: TextStyle(fontSize: 11, color: Colors.grey[500]),
            ),
        ],
      ),
    );
  }

  String _formatAmount(num value) => value
      .toStringAsFixed(0)
      .replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (match) => '.');

  Future<void> _openBillPayment([int? typeId]) async {
    final stallId = (stallData?['id'] as num?)?.toInt();
    if (stallId == null) return;

    final openBills = billRows
        .where((bill) =>
            ((bill['outstanding'] as num?)?.toDouble() ?? 0) > 0 &&
            (typeId == null || (bill['types_id'] as num?)?.toInt() == typeId))
        .toList();
    final totalOutstanding = openBills.fold<double>(
      0,
      (sum, bill) => sum + ((bill['outstanding'] as num?)?.toDouble() ?? 0),
    );
    if (totalOutstanding <= 0) return;

    final amountController = TextEditingController();
    final payerController = TextEditingController(text: ownerName ?? '');
    final noteController = TextEditingController(text: 'Cicilan tagihan tahunan');
    var method = 'Tunai';
    var saving = false;
    String? message;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            Future<void> submit() async {
              final amount = double.tryParse(amountController.text.trim()) ?? 0;
              if (amount <= 0) {
                setDialogState(() => message = 'Jumlah pembayaran harus lebih dari 0');
                return;
              }
              if (amount > totalOutstanding) {
                setDialogState(() => message = 'Jumlah melebihi total tunggakan Rp ${_formatAmount(totalOutstanding)}');
                return;
              }
              setDialogState(() {
                saving = true;
                message = null;
              });
              try {
                final result = await Supabase.instance.client.rpc(
                  'pay_retribution_bills',
                  params: {
                    'p_stall_id': stallId,
                    'p_amount': amount,
                    'p_types_id': typeId,
                    'p_payment_method': method,
                    'p_payer_name': payerController.text.trim(),
                    'p_note': noteController.text.trim(),
                  },
                );
                final allocations = (result as List)
                    .map((e) => Map<String, dynamic>.from(e as Map))
                    .toList();
                await _loadBills(stallId);
                if (!mounted || !dialogContext.mounted) return;
                Navigator.of(dialogContext).pop();
                final remaining = billRows.fold<double>(
                  0,
                  (sum, bill) => sum + ((bill['outstanding'] as num?)?.toDouble() ?? 0),
                );
                final detail = allocations
                    .map((a) => 'Tahun ${a['period_year']}: Rp ${_formatAmount((a['amount'] as num?) ?? 0)}')
                    .join('\n');
                await showDialog<void>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Pembayaran berhasil'),
                    content: Text('$detail\n\nSisa tunggakan: Rp ${_formatAmount(remaining)}'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: const Text('Tutup'),
                      ),
                    ],
                  ),
                );
              } on PostgrestException catch (e) {
                setDialogState(() {
                  saving = false;
                  message = e.message;
                });
              } on Exception catch (e) {
                setDialogState(() {
                  saving = false;
                  message = e.toString();
                });
              }
            }

            return AlertDialog(
              title: const Text('Bayar Tagihan Tahunan'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Total tunggakan Rp ${_formatAmount(totalOutstanding)}',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: amountController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: false),
                      decoration: const InputDecoration(
                        labelText: 'Jumlah dibayar',
                        hintText: 'Boleh sebagian (cicilan)',
                      ),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      initialValue: method,
                      decoration: const InputDecoration(labelText: 'Metode'),
                      items: const [
                        DropdownMenuItem(value: 'Tunai', child: Text('Tunai')),
                        DropdownMenuItem(value: 'QRIS', child: Text('QRIS')),
                      ],
                      onChanged: (value) => setDialogState(() => method = value ?? 'Tunai'),
                    ),
                    TextField(
                      controller: payerController,
                      decoration: const InputDecoration(labelText: 'Nama pembayar'),
                    ),
                    TextField(
                      controller: noteController,
                      decoration: const InputDecoration(labelText: 'Catatan'),
                    ),
                    if (message != null) ...[
                      const SizedBox(height: 8),
                      Text(message!, style: const TextStyle(color: Colors.red, fontSize: 12)),
                    ],
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: saving ? null : () => Navigator.of(dialogContext).pop(),
                  child: const Text('Batal'),
                ),
                ElevatedButton(
                  onPressed: saving ? null : submit,
                  child: Text(saving ? 'Menyimpan...' : 'Simpan Pembayaran'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildInfoTab() {
    final sectorName = _sectorName ?? 'Belum ditentukan';
    final ownerName = this.ownerName ?? 'Belum ada pemilik';
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stall Info Card
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withValues(alpha: 0.1),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: (stallData?['status'] == 'AKTIF') ? const Color(0xFF1D4E89) : Colors.grey,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              stallData?['code'] ?? widget.lapakId,
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.black87,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'No. ${stallData?['number'] ?? '-'}',
                              style: TextStyle(
                                fontSize: 17,
                                color: Colors.grey[600],
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Divider(height: 1, color: Colors.grey[200]),
                  const SizedBox(height: 20),
                  _buildInfoRow(
                    icon: Icons.location_on_outlined,
                    iconColor: Colors.blue,
                    label: 'Sektor',
                    value: sectorName,
                    valueColor: Colors.blue[700],
                  ),
                  const SizedBox(height: 16),
                  if (ownerName != 'Belum ada pemilik') ...[
                    _buildInfoRow(
                      icon: Icons.person_outline,
                      iconColor: Colors.purple,
                      label: 'Pemilik',
                      value: ownerName,
                    ),
                    const SizedBox(height: 12),
                    if (_ownerPhone != null && _ownerPhone!.isNotEmpty)
                      _buildInfoRow(
                        icon: Icons.phone_outlined,
                        iconColor: const Color(0xFF1D4E89),
                        label: 'Telepon',
                        value: _ownerPhone!,
                      ),
                    const SizedBox(height: 12),
                    if (_ownerNIK != null && _ownerNIK!.isNotEmpty)
                      _buildInfoRow(
                        icon: Icons.badge_outlined,
                        iconColor: Colors.orange,
                        label: 'NIK',
                        value: _ownerNIK!,
                      ),
                    const SizedBox(height: 12),
                    if (_ownerAddress != null && _ownerAddress!.isNotEmpty)
                      _buildInfoRow(
                        icon: Icons.home_outlined,
                        iconColor: const Color(0xFF1D4E89),
                        label: 'Alamat',
                        value: _ownerAddress!,
                      ),
                  ] else ...[
                    _buildInfoRow(
                      icon: Icons.person_outline,
                      iconColor: Colors.grey,
                      label: 'Pemilik',
                      value: 'Belum ada pemilik',
                      valueColor: Colors.grey[500],
                    ),
                  ]
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryTab() {
    if (transactionHistory.isEmpty) {
      return Center(
        child: Column(
          children: [
            Icon(Icons.history_outlined, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              'Belum ada riwayat transaksi',
              style: TextStyle(color: Colors.grey[600], fontSize: 16),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: transactionHistory.length,
      itemBuilder: (context, index) {
        final transaction = transactionHistory[index];
        final amount = transaction['amount'] ?? 0;
        final paymentMethod = transaction['payment_method'] ?? '-';
        final status = transaction['status'] ?? 'pending';
        final date = transaction['created_at'] != null 
            ? DateTime.parse(transaction['created_at'].toString()).toLocal()
            : DateTime.now();
        
        Color statusColor = Colors.grey;
        String statusText = 'Pending';
        if (status == 'paid' || status == 'success') {
          statusColor = const Color(0xFF1D4E89);
          statusText = 'Berhasil';
        } else if (status == 'failed') {
          statusColor = Colors.red;
          statusText = 'Gagal';
        }
        
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: Colors.grey.withValues(alpha: 0.05),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.purple[300]!, Colors.purple[500]!],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.receipt_long,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Rp ${(amount as num).toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 4),
                      Text(
                        '$paymentMethod • ${date.day}/${date.month}/${date.year}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                ),
                child: Text(
                  statusText,
                  style: TextStyle(
                    fontSize: 12,
                    color: statusColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
    Color? valueColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: iconColor),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 15,
                    color: valueColor ?? Colors.black87,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
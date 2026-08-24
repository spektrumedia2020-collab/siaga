import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:go_router/go_router.dart';
import '../../core/ui_helpers.dart';
import 'setoran_form_dialog.dart';

class SetoranPage extends ConsumerStatefulWidget {
  const SetoranPage({super.key});

  @override
  ConsumerState<SetoranPage> createState() => _SetoranPageState();
}

class _SetoranPageState extends ConsumerState<SetoranPage> {
  List<Map<String, dynamic>> _setoranList = [];
  bool _isLoading = true;
  String? _errorMessage;
  String _filterStatus = 'all';
  DateTime _selectedDate = DateTime.now();
  bool _filterByDate = false;
  double _dailyRevenue = 0;
  int _dailyTransactionCount = 0;
  bool _loadingRevenue = false;

  @override
  void initState() {
    super.initState();
    _loadSetoran();
  }

  Future<void> _loadDailyRevenue() async {
    setState(() => _loadingRevenue = true);
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;

      final startOfDay =
          DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day)
              .toUtc()
              .toIso8601String();
      final endOfDay = DateTime(
              _selectedDate.year, _selectedDate.month, _selectedDate.day, 23, 59, 59)
          .toUtc()
          .toIso8601String();

      final txResponse = await Supabase.instance.client
          .from('transactions')
          .select('amount')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay);

      if (mounted) {
        final transactions = txResponse as List;
        final total = transactions.fold(
            0.0,
            (sum, tx) =>
                sum + ((tx['amount'] as num?)?.toDouble() ?? 0.0));
        setState(() {
          _dailyRevenue = total;
          _dailyTransactionCount = transactions.length;
          _loadingRevenue = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loadingRevenue = false);
    }
  }

  Future<void> _loadSetoran() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) throw Exception('User tidak terautentikasi');

      var query = Supabase.instance.client
          .from('setoran')
          .select('''
            id, officer_id, market_id, total_amount, transaction_count,
            note, proof_image_url, status, rejection_reason,
            approved_by_treasurer, approved_by_head,
            approved_at_treasurer, approved_at_head,
            created_at, updated_at
          ''');

      if (_filterByDate) {
        final startOfDay =
            DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day)
                .toUtc()
                .toIso8601String();
        final endOfDay = DateTime(
                _selectedDate.year, _selectedDate.month, _selectedDate.day, 23, 59, 59)
            .toUtc()
            .toIso8601String();
        query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
        _loadDailyRevenue();
      }

      if (_filterStatus != 'all') {
        query = query.eq('status', _filterStatus);
      }

      final response = await query
          .order('created_at', ascending: false)
          .limit(100);

      if (mounted) {
        final data = (response as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        setState(() {
          _setoranList = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Gagal memuat setoran: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _createSetoran() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    try {
      final officerData = await Supabase.instance.client
          .from('users')
          .select('market_id')
          .eq('auth_uid', user.id)
          .maybeSingle();

      if (officerData == null) {
        if (mounted) {
          showErrorSnackBar(context, 'Data petugas tidak ditemukan');
        }
        return;
      }

      final marketId = officerData['market_id'] as int;
      await _showCreateSetoranDialog(user.id, marketId);
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, 'Gagal: ${e.toString()}');
      }
    }
  }

  Future<void> _showCreateSetoranDialog(
      String officerId, int marketId) async {
    final initialDate = _filterByDate ? _selectedDate : DateTime.now();
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => SetoranFormDialog(
        officerId: officerId,
        marketId: marketId,
        initialDate: initialDate,
        filterByDate: _filterByDate,
      ),
    );

    if (result == true && mounted) {
      _loadSetoran();
    }
  }

  void _showSetoranDetail(Map<String, dynamic> setoran) {
    final currency =
        NumberFormat.currency(locale: 'id', symbol: 'Rp ', decimalDigits: 0);
    final dateFormat = DateFormat('dd MMM yyyy HH:mm', 'id');
    final createdAt =
        DateTime.tryParse(setoran['created_at']?.toString() ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return DraggableScrollableSheet(
          initialChildSize: 0.7,
          minChildSize: 0.5,
          maxChildSize: 0.9,
          expand: false,
          builder: (context, scrollController) {
            return Padding(
              padding: const EdgeInsets.all(20),
              child: ListView(
                controller: scrollController,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text('Detail Setoran',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  _buildStatusBadge(setoran['status']?.toString() ?? ''),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.green[50],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.account_balance_wallet,
                            color: Colors.green, size: 32),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Total Setoran',
                                style: TextStyle(
                                    fontSize: 12, color: Colors.green[800])),
                            const SizedBox(height: 4),
                            Text(
                              currency.format(
                                  (setoran['total_amount'] as num?)?.toDouble() ??
                                      0),
                              style: const TextStyle(
                                  fontSize: 22, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  _infoRow(
                      Icons.receipt_long, 'Jumlah Transaksi',
                      '${setoran['transaction_count'] ?? 0} transaksi'),
                  if (createdAt != null)
                    _infoRow(Icons.calendar_today, 'Tanggal',
                        dateFormat.format(createdAt)),
                  if (setoran['note'] != null &&
                      (setoran['note'] as String).isNotEmpty)
                    _infoRow(
                        Icons.notes, 'Catatan', setoran['note'] as String),
                  if (setoran['rejection_reason'] != null &&
                      (setoran['rejection_reason'] as String).isNotEmpty)
                    _infoRow(Icons.error_outline, 'Alasan Ditolak',
                        setoran['rejection_reason'] as String,
                        iconColor: Colors.red),
                  if (setoran['proof_image_url'] != null &&
                      (setoran['proof_image_url'] as String).isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Bukti Setoran',
                              style: TextStyle(fontWeight: FontWeight.w600)),
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              setoran['proof_image_url'] as String,
                              height: 180,
                              width: double.infinity,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) =>
                                  Container(
                                height: 180,
                                color: Colors.grey[200],
                                child: const Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.broken_image,
                                          size: 40, color: Colors.grey),
                                      SizedBox(height: 8),
                                      Text('Gagal memuat gambar'),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 24),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _infoRow(IconData icon, String label, String value,
      {Color? iconColor}) {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: iconColor ?? Colors.grey[600]),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                        fontWeight: FontWeight.w500)),
                const SizedBox(height: 2),
                Text(value,
                    style: const TextStyle(fontSize: 14)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color bgColor;
    Color textColor;
    String label;
    IconData icon;

    switch (status) {
      case 'pending_treasurer':
        bgColor = Colors.orange[50]!;
        textColor = Colors.orange[800]!;
        label = 'Menunggu ACC Bendahara';
        icon = Icons.hourglass_empty;
        break;
      case 'pending_head':
        bgColor = Colors.blue[50]!;
        textColor = Colors.blue[800]!;
        label = 'Menunggu ACC Kepala Pasar';
        icon = Icons.hourglass_top;
        break;
      case 'approved':
        bgColor = Colors.green[50]!;
        textColor = Colors.green[800]!;
        label = 'Disetujui';
        icon = Icons.check_circle;
        break;
      case 'rejected':
        bgColor = Colors.red[50]!;
        textColor = Colors.red[800]!;
        label = 'Ditolak';
        icon = Icons.cancel;
        break;
      default:
        bgColor = Colors.grey[50]!;
        textColor = Colors.grey[800]!;
        label = status;
        icon = Icons.help;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18, color: textColor),
          const SizedBox(width: 6),
          Text(label,
              style: TextStyle(
                  color: textColor,
                  fontWeight: FontWeight.w600,
                  fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildDateFilterBar(DateFormat dateFormat) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.blue[50],
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.blue[200]!),
        ),
        child: Row(
          children: [
            Icon(Icons.calendar_today, size: 16, color: Colors.blue[700]),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Filter: ${dateFormat.format(_selectedDate)}',
                style: TextStyle(fontSize: 13, color: Colors.blue[800]),
              ),
            ),
            InkWell(
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _selectedDate,
                  firstDate: DateTime(2024),
                  lastDate: DateTime.now(),
                );
                if (picked != null && mounted) {
                  setState(() => _selectedDate = picked);
                  _loadSetoran();
                }
              },
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.blue[100],
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Icon(Icons.edit_calendar, size: 16, color: Colors.blue[700]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDailyRevenueCard(NumberFormat currency, DateFormat dateFormat) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Colors.green[50]!, Colors.green[100]!],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.green[200]!),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.trending_up, color: Colors.green[700], size: 20),
                const SizedBox(width: 8),
                Text(
                  'Pendapatan ${dateFormat.format(_selectedDate)}',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.green[800],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (_loadingRevenue)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: LinearProgressIndicator(),
              )
            else ...[
              Text(
                currency.format(_dailyRevenue),
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.green[900],
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '$_dailyTransactionCount transaksi',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.green[700],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color bgColor;
    Color textColor;
    String label;

    switch (status) {
      case 'pending_treasurer':
        bgColor = Colors.orange;
        textColor = Colors.white;
        label = 'Bendahara';
        break;
      case 'pending_head':
        bgColor = Colors.blue;
        textColor = Colors.white;
        label = 'Kepala Pasar';
        break;
      case 'approved':
        bgColor = Colors.green;
        textColor = Colors.white;
        label = 'Disetujui';
        break;
      case 'rejected':
        bgColor = Colors.red;
        textColor = Colors.white;
        label = 'Ditolak';
        break;
      default:
        bgColor = Colors.grey;
        textColor = Colors.white;
        label = status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(label,
          style: TextStyle(
              color: textColor, fontSize: 10, fontWeight: FontWeight.w600)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currency =
        NumberFormat.currency(locale: 'id', symbol: 'Rp ', decimalDigits: 0);
    final dateFormat = DateFormat('dd MMM yyyy', 'id');

    if (_isLoading && _setoranList.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Setoran')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_errorMessage != null && _setoranList.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Setoran')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                const SizedBox(height: 16),
                Text(
                  _errorMessage!,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.red[700], fontSize: 14),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: _loadSetoran,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Coba Lagi'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Kembali ke Dashboard',
          onPressed: () => context.go('/dashboard'),
        ),
        title: const Text('Setoran'),
        actions: [
          IconButton(
            icon: Icon(
              Icons.calendar_today,
              color: _filterByDate ? Colors.yellowAccent : Colors.white,
            ),
            tooltip: 'Filter tanggal',
            onPressed: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _selectedDate,
                firstDate: DateTime(2024),
                lastDate: DateTime.now(),
              );
              if (picked != null && mounted) {
                setState(() {
                  _selectedDate = picked;
                  _filterByDate = true;
                });
                _loadSetoran();
              }
            },
          ),
          if (_filterByDate)
            IconButton(
              icon: const Icon(Icons.clear),
              tooltip: 'Reset filter tanggal',
              onPressed: () {
                setState(() {
                  _filterByDate = false;
                  _selectedDate = DateTime.now();
                });
                _loadSetoran();
              },
            ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              setState(() => _filterStatus = value);
              _loadSetoran();
            },
            itemBuilder: (context) => [
              _filterMenuItem('all', 'Semua', Icons.all_inclusive),
              _filterMenuItem('pending_treasurer', 'Menunggu Bendahara', Icons.hourglass_empty),
              _filterMenuItem('pending_head', 'Menunggu Kepala Pasar', Icons.hourglass_top),
              _filterMenuItem('approved', 'Disetujui', Icons.check_circle),
              _filterMenuItem('rejected', 'Ditolak', Icons.cancel),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadSetoran,
        child: _setoranList.isEmpty
            ? ListView(
                children: [
                  if (_filterByDate)
                    _buildDateFilterBar(dateFormat),
                  SizedBox(
                    height: MediaQuery.of(context).size.height * 0.25,
                  ),
                  Icon(Icons.account_balance_wallet,
                      size: 72, color: Colors.grey[300]),
                  const SizedBox(height: 16),
                  Center(
                    child: Text('Belum ada setoran',
                        style: TextStyle(color: Colors.grey[500])),
                  ),
                  const SizedBox(height: 8),
                  Center(
                    child: Text(
                      _filterByDate
                          ? 'Tidak ada setoran pada tanggal ini'
                          : 'Tekan tombol + untuk membuat setoran baru',
                      style: TextStyle(
                          color: Colors.grey[400], fontSize: 12),
                    ),
                  ),
                ],
              )
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _setoranList.length + (_filterByDate ? 2 : 0),
                itemBuilder: (context, index) {
                  if (_filterByDate && index == 0) {
                    return Column(
                      children: [
                        _buildDateFilterBar(dateFormat),
                        _buildDailyRevenueCard(currency, dateFormat),
                        const SizedBox(height: 8),
                      ],
                    );
                  }

                  final adjustedIndex = _filterByDate ? index - 1 : index;
                  if (adjustedIndex >= _setoranList.length) return const SizedBox.shrink();

                  final setoran = _setoranList[adjustedIndex];
                  final amount =
                      (setoran['total_amount'] as num?)?.toDouble() ?? 0;
                  final createdAt = DateTime.tryParse(
                      setoran['created_at']?.toString() ?? '');
                  final status =
                      setoran['status']?.toString() ?? 'pending_treasurer';
                  final txCount = setoran['transaction_count'] ?? 0;

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    elevation: 1,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: () => _showSetoranDetail(_setoranList[adjustedIndex]),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _buildStatusChip(status),
                                if (createdAt != null)
                                  Text(
                                    dateFormat.format(createdAt),
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.grey[500]),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              currency.format(amount),
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Icon(Icons.receipt_long,
                                    size: 14, color: Colors.grey[500]),
                                const SizedBox(width: 4),
                                Text(
                                  '$txCount transaksi',
                                  style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey[600]),
                                ),
                                if (setoran['note'] != null &&
                                    (setoran['note'] as String).isNotEmpty)
                                  ...[
                                    const SizedBox(width: 12),
                                    Icon(Icons.notes,
                                        size: 14, color: Colors.grey[400]),
                                  ],
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _createSetoran,
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Setor Baru'),
      ),
    );
  }

  PopupMenuItem<String> _filterMenuItem(
      String value, String label, IconData icon) {
    return PopupMenuItem(
      value: value,
      child: Row(
        children: [
          Icon(icon,
              size: 18,
              color: _filterStatus == value ? Colors.green : Colors.grey),
          const SizedBox(width: 8),
          Text(label,
              style: TextStyle(
                  fontWeight: _filterStatus == value
                      ? FontWeight.bold
                      : FontWeight.normal)),
        ],
      ),
    );
  }
}
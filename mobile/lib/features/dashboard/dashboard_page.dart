import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';

import '../shop/shop_page.dart';
import '../history/history_page.dart';
import '../summary/summary_page.dart';
import '../../services/sync_service.dart';

class DashboardPage extends StatefulWidget {
  final int initialTab;
  const DashboardPage({super.key, this.initialTab = 0});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  late int _currentIndex;
  double _todayRevenue = 0;
  int _paidStalls = 0;
  int _targetStalls = 50;
  bool _loadingStats = true;
  String _marketName = '';
  String _marketAddress = '';
  bool _isOfflineMode = false;
  bool _isSyncing = false;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialTab;
    _loadTodayStats();
  }

  Future<void> _toggleOfflineMode() async {
    setState(() => _isOfflineMode = !_isOfflineMode);
    final mode = _isOfflineMode ? 'Offline' : 'Online';
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Mode $mode aktif'), behavior: SnackBarBehavior.floating),
      );
    }
  }

  Future<void> _syncData() async {
    setState(() => _isSyncing = true);

    try {
      final client = Supabase.instance.client;
      final syncService = SyncService(client);
      final result = await syncService.syncAll();

      int total = 0;
      final parts = <String>[];
      result.forEach((key, value) {
        if (value > 0) {
          total += (value as int);
          parts.add('$key: $value');
        }
      });

      if (mounted) {
        if (total > 0) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Sinkronisasi selesai: ${parts.join(', ')}'), behavior: SnackBarBehavior.floating),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Tidak ada data yang perlu disinkronkan'), behavior: SnackBarBehavior.floating),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Sinkronisasi gagal'), behavior: SnackBarBehavior.floating),
        );
      }
    } finally {
      if (mounted) setState(() => _isSyncing = false);
    }
  }

  Future<void> _loadTodayStats() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;

      final officerResponse = await Supabase.instance.client
          .from('users')
          .select('market_id, markets!users_market_id_fkey(name, address)')
          .eq('auth_uid', user.id)
          .maybeSingle();

      if (mounted) {
        final marketData = officerResponse?['markets'];
        if (marketData != null) {
          setState(() {
            _marketName = (marketData['name']?.toString() ?? '').toUpperCase();
            _marketAddress = marketData['address']?.toString() ?? '';
          });
        } else {
          final marketId = officerResponse?['market_id'];
          if (marketId != null) {
            final marketResponse = await Supabase.instance.client
                .from('markets')
                .select('name, address')
                .eq('id', marketId)
                .maybeSingle();
            if (mounted && marketResponse != null) {
              setState(() {
                _marketName = marketResponse['name']?.toString().toUpperCase() ?? '';
                _marketAddress = marketResponse['address']?.toString() ?? '';
              });
            }
          }
        }
      }

      final now = DateTime.now();
      final startOfDay = DateTime(now.year, now.month, now.day).toUtc().toIso8601String();
      final endOfDay = DateTime(now.year, now.month, now.day, 23, 59, 59).toUtc().toIso8601String();

      final marketId = officerResponse?['market_id'];
      dynamic response;
      try {
        var todayQuery = Supabase.instance.client
            .from('transactions')
            .select('amount, stall_id, market_id')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);

        if (marketId != null) {
          todayQuery = todayQuery.eq('market_id', marketId);
        }

        response = await todayQuery;
      } catch (e) {
        final errorString = e.toString();
        if (errorString.contains('42703') || errorString.contains('market_id')) {
          response = await Supabase.instance.client
              .from('transactions')
              .select('amount, stall_id')
              .gte('created_at', startOfDay)
              .lte('created_at', endOfDay);
        } else {
          rethrow;
        }
      }

      if (mounted) {
        final txList = (response as List);
        final filtered = marketId != null ? txList.where((tx) => tx['market_id'] == null || tx['market_id'] == marketId).toList() : txList;
        setState(() {
          _todayRevenue = filtered.fold(0.0, (sum, tx) => sum + ((tx['amount'] as num?)?.toDouble() ?? 0.0));
          _paidStalls = filtered.map((tx) => tx['stall_id']).toSet().length;
          _loadingStats = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loadingStats = false);
    }
  }

  List<Widget> get _pages => [
    DashboardHomePage(
      todayRevenue: _todayRevenue,
      paidStalls: _paidStalls,
      targetStalls: _targetStalls,
      loadingStats: _loadingStats,
      marketName: _marketName,
      marketAddress: _marketAddress,
      isOfflineMode: _isOfflineMode,
      isSyncing: _isSyncing,
      onToggleOffline: _toggleOfflineMode,
      onSync: _syncData,
    ),
    const BottomScanPage(),
    const ShopPageBody(),
    const SummaryPageBody(),
    const HistoryPage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white, width: 1.5),
              ),
              clipBehavior: Clip.antiAlias,
                child: Center(
                    child: Transform.scale(
                      scale: 1.25,
                      child: Image.asset(
                        'assets/logo.jpeg',
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) => Icon(Icons.store_mall_directory, color: Theme.of(context).colorScheme.onPrimary, size: 32),
                      ),
                    ),
                  ),
            ),
            const SizedBox(width: 8),
            const Text('SiAga Officer', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        toolbarHeight: 56,
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Theme.of(context).colorScheme.onPrimary,
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: (value) {
              if (value == 'profile') {
                context.go('/profile');
              } else if (value == 'about') {
                showAboutDialog(
                  context: context,
                  applicationName: 'SiAga Officer',
                  applicationVersion: '1.0.0',
                  children: [const Text('Aplikasi Retribusi Pasar Digital\nPerumda Pasar Karya Makassar')],
                );
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'profile', child: Text('Profil')),
              const PopupMenuItem(value: 'about', child: Text('Tentang')),
            ],
          ),
        ],
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFE7E7E7), Color(0xFFF5F5F5)],
          ),
        ),
        child: IndexedStack(index: _currentIndex, children: _pages),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, -2)),
          ],
        ),
        child: BottomAppBar(
          color: Theme.of(context).brightness == Brightness.dark
              ? const Color(0xFF1B1B1B)
              : const Color(0xFFF5F5F5),
          height: 70,
          shape: const CircularNotchedRectangle(),
          notchMargin: 6,
          child: Row(
            children: [
              Expanded(child: _NavItem(icon: Icons.home, label: 'Home', index: 0, currentIndex: _currentIndex, onTap: (i) => setState(() => _currentIndex = i))),
              Expanded(child: _NavItem(icon: Icons.storefront, label: 'Lapak', index: 2, currentIndex: _currentIndex, onTap: (i) => setState(() => _currentIndex = i))),
              const SizedBox(width: 56),
              Expanded(child: _NavItem(icon: Icons.insert_chart_outlined, label: 'Rekap', index: 3, currentIndex: _currentIndex, onTap: (i) => setState(() => _currentIndex = i))),
              Expanded(child: _NavItem(icon: Icons.history, label: 'Riwayat', index: 4, currentIndex: _currentIndex, onTap: (i) => setState(() => _currentIndex = i))),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => setState(() => _currentIndex = 1),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Theme.of(context).colorScheme.onPrimary,
        shape: const CircleBorder(),
        child: const Icon(Icons.qr_code_scanner, size: 32),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final int index;
  final int currentIndex;
  final Function(int) onTap;

  const _NavItem({required this.icon, required this.label, required this.index, required this.currentIndex, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isActive = currentIndex == index;
    final color = isActive
        ? Theme.of(context).colorScheme.primary
        : (Theme.of(context).brightness == Brightness.dark ? Colors.grey[400] : Colors.grey[600]);
    return InkWell(
      onTap: () => onTap(index),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 2),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(label, style: TextStyle(fontSize: 10, color: color, fontWeight: isActive ? FontWeight.w600 : FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}

class DashboardHomePage extends StatelessWidget {
  final double todayRevenue;
  final int paidStalls;
  final int targetStalls;
  final bool loadingStats;
  final String marketName;
  final String marketAddress;
  final bool isOfflineMode;
  final bool isSyncing;
  final VoidCallback onToggleOffline;
  final VoidCallback onSync;

  const DashboardHomePage({
    super.key,
    required this.todayRevenue,
    required this.paidStalls,
    required this.targetStalls,
    required this.loadingStats,
    required this.marketName,
    required this.marketAddress,
    required this.isOfflineMode,
    required this.isSyncing,
    required this.onToggleOffline,
    required this.onSync,
  });

  @override
  Widget build(BuildContext context) {
    final currentUser = Supabase.instance.client.auth.currentUser;
    final userName = currentUser?.userMetadata?['name'] ?? 'Petugas';

    return RefreshIndicator(
      onRefresh: () async {},
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildGreetingSection(context, userName, marketName, marketAddress),
            const SizedBox(height: 20),
            if (!loadingStats) ...[
              _buildStatsCards(context),
              const SizedBox(height: 4),
            ] else
              const Center(child: CircularProgressIndicator()),
            _buildAnnouncementCard(),
            const SizedBox(height: 20),
            const Text('Menu Cepat', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: 3,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 1.0,
              children: [
                _MenuCard(icon: Icons.receipt_long, title: 'Transaksi', subtitle: 'Baru', color: const Color(0xFFE8F5E9), iconColor: const Color(0xFF1F7A1F), onTap: () => context.go('/shop')),
                _MenuCard(icon: Icons.person_pin, title: 'Absensi', subtitle: 'Check-In/Out', color: const Color(0xFFFFF3E0), iconColor: const Color(0xFFE65100), onTap: () => context.go('/attendance')),
                _MenuCard(icon: Icons.insert_chart, title: 'Rekap', subtitle: 'Ringkasan', color: const Color(0xFFE0F7FA), iconColor: const Color(0xFF00838F), onTap: () => context.go('/summary')),
                _MenuCard(icon: isOfflineMode ? Icons.wifi_off : Icons.wifi, title: isOfflineMode ? 'Offline' : 'Online', subtitle: isOfflineMode ? 'Mode Offline' : 'Terhubung', color: isOfflineMode ? const Color(0xFFFFEBEE) : const Color(0xFFE8F5E9), iconColor: isOfflineMode ? const Color(0xFFD32F2F) : const Color(0xFF2E7D32), onTap: isSyncing ? () {} : onToggleOffline),
                _MenuCard(icon: Icons.sync, title: 'Sinkron', subtitle: isSyncing ? 'Menyinkronkan...' : 'Data', color: const Color(0xFFE3F2FD), iconColor: const Color(0xFF1565C0), onTap: isSyncing ? () {} : onSync),
                _MenuCard(icon: Icons.account_balance_wallet, title: 'Setoran', subtitle: 'Deposit', color: const Color(0xFFE8F5E9), iconColor: const Color(0xFF1F7A1F), onTap: () => context.go('/setoran')),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsCards(BuildContext context) {
    final currencyFormat = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
    final progress = targetStalls > 0 ? (paidStalls / targetStalls).clamp(0.0, 1.0) : 0.0;

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F5E9),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFA5D6A7), width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF1F7A1F).withOpacity(0.15),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.payments, color: const Color(0xFF1F7A1F), size: 24),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            currencyFormat.format(todayRevenue),
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1F7A1F)),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text('Pendapatan Hari Ini', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF3E0),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFCC8050), width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFE65100).withOpacity(0.15),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.storefront, color: const Color(0xFFE65100), size: 24),
                        const SizedBox(width: 8),
                        Text(
                          '$paidStalls/$targetStalls',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFFE65100)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Lapak Lunas (${(progress * 100).toInt()}%)',
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
      ],
    );
  }

  Widget _buildGreetingSection(BuildContext context, String userName, String marketName, String marketAddress) {
    final hour = DateTime.now().hour;
    String greeting;
    if (hour < 12) greeting = 'Selamat pagi';
    else if (hour < 15) greeting = 'Selamat siang';
    else if (hour < 19) greeting = 'Selamat sore';
    else greeting = 'Selamat malam';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Theme.of(context).colorScheme.primary, Theme.of(context).colorScheme.primary.withOpacity(0.8)]),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            '$greeting, $userName!',
            style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            'Anda bertugas di Pasar $marketName',
            style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 14),
            textAlign: TextAlign.center,
          ),
          if (marketAddress.isNotEmpty)
            Text(
              marketAddress,
              style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
              textAlign: TextAlign.center,
            ),
        ],
      ),
    );
  }

  Widget _buildAnnouncementCard() {
    final now = DateTime.now();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFD9D9D9), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(color: const Color(0xFFFFF3E0), borderRadius: BorderRadius.circular(8)),
            child: const Text('📢 Pengumuman', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFE65100))),
          ),
          const SizedBox(height: 12),
          const Text('Target Harian', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text('Target retribusi hari ini: 50 transaksi', style: TextStyle(fontSize: 14, color: Colors.grey[600])),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.calendar_today, size: 14, color: Colors.grey[500]),
              const SizedBox(width: 6),
              Text(DateFormat('dd MMMM yyyy').format(now), style: TextStyle(fontSize: 12, color: Colors.grey[500])),
            ],
          ),
        ],
      ),
    );
  }
}

class _MenuCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final Color iconColor;
  final VoidCallback onTap;

  const _MenuCard({required this.icon, required this.title, required this.subtitle, required this.color, required this.iconColor, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFD9D9D9), width: 1.0),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 6,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: iconColor, size: 24),
              const SizedBox(height: 6),
              Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600), textAlign: TextAlign.center),
              const SizedBox(height: 1),
              Text(subtitle, style: TextStyle(fontSize: 9, color: Colors.grey[600]), textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}


class BottomScanPage extends ConsumerStatefulWidget {
  const BottomScanPage({super.key});

  @override
  ConsumerState<BottomScanPage> createState() => _BottomScanPageState();
}

class _BottomScanPageState extends ConsumerState<BottomScanPage> {
  String? scannedCode;
  bool _isNavigating = false;

  void _openTransaction() {
    if (scannedCode == null || _isNavigating) return;
    _isNavigating = true;
    context.go('/lapak/$scannedCode');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Column(
        children: [
          Expanded(
            child: MobileScanner(
              onDetect: (capture) {
                final value = capture.barcodes.first.rawValue;
                if (value != null && value != scannedCode) {
                  setState(() => scannedCode = value);
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('QR terdeteksi: $value')),
                    );
                  }
                }
              },
            ),
          ),
          Container(
            color: Colors.black,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  scannedCode != null ? 'Lapak Terbaca: $scannedCode' : 'Arahkan kamera ke QR lapak',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Colors.white),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: scannedCode == null ? null : _openTransaction,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: const Text('Buka Lapak'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}


class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  Map<String, dynamic>? _officerProfile;
  bool _loading = true;
  String? _avatarUrl;
  double _totalRevenue = 0;
  int _ranking = 0;
  bool _loadingStats = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
    _loadStats();
  }

  Future<void> _loadStats() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;

      final officerResponse = await Supabase.instance.client
          .from('users')
          .select('id_user, market_id')
          .eq('auth_uid', user.id)
          .maybeSingle();

      if (officerResponse == null) return;

      final userId = officerResponse['id_user'];
      final marketId = officerResponse['market_id'];

      final now = DateTime.now();
      final startOfMonth = DateTime(now.year, now.month, 1).toUtc().toIso8601String();
      final endOfMonth = DateTime(now.year, now.month + 1, 1).toUtc().toIso8601String();

      dynamic transactions;
      try {
        transactions = await Supabase.instance.client
            .from('transactions')
            .select('amount, user_id, market_id')
            .eq('market_id', marketId)
            .gte('created_at', startOfMonth)
            .lt('created_at', endOfMonth);
      } catch (e) {
        final errorString = e.toString();
        if (errorString.contains('42703') || errorString.contains('market_id')) {
          transactions = await Supabase.instance.client
              .from('transactions')
              .select('amount, user_id')
              .gte('created_at', startOfMonth)
              .lt('created_at', endOfMonth);
        } else {
          rethrow;
        }
      }

      final txList = (transactions as List).where((tx) => tx['market_id'] == null || tx['market_id'] == marketId).toList();
      final total = txList.fold<double>(0.0, (sum, tx) => sum + ((tx['amount'] as num?)?.toDouble() ?? 0.0));

      final leaderboard = <int, double>{};
      for (final tx in txList) {
        final uid = tx['user_id'] as int?;
        final amt = (tx['amount'] as num?)?.toDouble() ?? 0.0;
        if (uid != null) {
          leaderboard[uid] = (leaderboard[uid] ?? 0.0) + amt;
        }
      }

      final sortedEntries = leaderboard.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
      final rank = sortedEntries.indexWhere((e) => e.key == userId) + 1;

      if (mounted) {
        setState(() {
          _totalRevenue = total;
          _ranking = rank > 0 ? rank : 0;
          _loadingStats = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loadingStats = false);
    }
  }

  Future<void> _loadProfile() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;

      final officerResponse = await Supabase.instance.client
          .from('users')
          .select('nama, email, no_hp, id_role, market_id, avatar_url, roles(name), markets!users_market_id_fkey(name, address)')
          .eq('auth_uid', user.id)
          .maybeSingle();

      if (mounted) {
        setState(() {
          _officerProfile = officerResponse == null ? null : Map<String, dynamic>.from(officerResponse as Map);
          _avatarUrl = officerResponse?['avatar_url']?.toString();
          _loading = false;
        });
      }
    } catch (e) {
      print('Error loading profile: $e');
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    await Supabase.instance.client.auth.signOut();
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;
    final email = user?.email ?? _officerProfile?['email'] ?? '-';
    final name = _officerProfile?['nama'] ?? user?.userMetadata?['name'] ?? 'Petugas';
    final phone = _officerProfile?['no_hp'] ?? '-';
    String role = _officerProfile?['roles']?['name']?.toString() ?? 'Petugas';
    final roleMap = {
      'ADMIN': 'Admin',
      'MARKET_HEAD': 'Kepala Pasar',
      'OFFICER': 'Petugas',
      'TREASURER': 'Bendahara',
      'MERCHANT': 'Pedagang',
    };
    role = roleMap[role.toUpperCase()] ?? role;
    final rawMarketName = _officerProfile?['markets']?['name']?.toString() ?? '-';
    final marketName = rawMarketName != '-' ? 'PASAR $rawMarketName' : '-';
    final marketAddress = _officerProfile?['markets']?['address']?.toString() ?? '';

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Scaffold(
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.only(top: 48, left: 16, right: 16, bottom: 24),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary,
              borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(24), bottomRight: Radius.circular(24)),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                      tooltip: 'Kembali',
                      onPressed: () => GoRouter.of(context).go('/dashboard'),
                    ),
                    const Spacer(),
                    Text('Profil', style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white, fontWeight: FontWeight.bold)),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.settings, color: Colors.white),
                      tooltip: 'Pengaturan',
                      onPressed: () {},
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Stack(
                  children: [
                    CircleAvatar(
                      radius: 48,
                      backgroundColor: Colors.white,
                      backgroundImage: _avatarUrl != null ? NetworkImage(_avatarUrl!) : null,
                      child: _avatarUrl == null ? Icon(Icons.person, size: 56, color: Theme.of(context).colorScheme.primary) : null,
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: IconButton.filled(
                        onPressed: () async {
                          final picker = ImagePicker();
                          final source = await showModalBottomSheet<ImageSource>(
                            context: context,
                            showDragHandle: true,
                            builder: (context) => SafeArea(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  ListTile(
                                    leading: const Icon(Icons.camera_alt),
                                    title: const Text('Ambil foto dari kamera'),
                                    onTap: () => Navigator.pop(context, ImageSource.camera),
                                  ),
                                  ListTile(
                                    leading: const Icon(Icons.photo_library),
                                    title: const Text('Pilih dari galeri'),
                                    onTap: () => Navigator.pop(context, ImageSource.gallery),
                                  ),
                                ],
                              ),
                            ),
                          );

                          if (source == null) return;
                          final xfile = await picker.pickImage(source: source, maxWidth: 512, maxHeight: 512, imageQuality: 85);
                          if (xfile == null) return;
                          final bytes = await xfile.readAsBytes();
                          final currentUser = Supabase.instance.client.auth.currentUser;
                          if (currentUser == null) return;
                          final filename = '${currentUser.id}_${DateTime.now().millisecondsSinceEpoch}.jpg';
                      final storage = Supabase.instance.client.storage.from('avatars');
                      await storage.uploadBinary(filename, bytes);
                      final publicUrl = storage.getPublicUrl(filename);

                      final authUser = Supabase.instance.client.auth.currentUser;
                      if (authUser != null) {
                        await Supabase.instance.client.from('users').update({'avatar_url': publicUrl}).eq('auth_uid', authUser.id);
                      }

                      if (mounted) {
                        setState(() => _avatarUrl = publicUrl);
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Foto profil berhasil diperbarui'), behavior: SnackBarBehavior.floating));
                      }
                        },
                        icon: const Icon(Icons.camera_alt),
                      ),
                    )
                  ],
                ),
                const SizedBox(height: 16),
                Text(name, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(role, style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 14)),
              ],
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _StatCard(
                          label: _loadingStats ? '-' : NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0).format(_totalRevenue),
                          title: 'Total Omset',
                          icon: Icons.payments,
                          color: const Color(0xFFE8F5E9),
                          iconColor: const Color(0xFF1F7A1F),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _StatCard(
                          label: _loadingStats ? '-' : '$_ranking',
                          title: 'Ranking Leaderboard',
                          icon: Icons.emoji_events,
                          color: const Color(0xFFFFF3E0),
                          iconColor: const Color(0xFFE65100),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Card(
                    elevation: 1,
                    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(18))),
                    child: Column(
                      children: [
                        _ProfileTile(icon: Icons.email_outlined, label: 'Email', value: email),
                        const Divider(height: 1, indent: 16, endIndent: 16),
                        _ProfileTile(icon: Icons.phone_outlined, label: 'Telepon', value: phone),
                        const Divider(height: 1, indent: 16, endIndent: 16),
                        _ProfileTile(icon: Icons.store_mall_directory_outlined, label: 'Wilayah Kerja', value: marketName, subtitle: marketAddress),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _logout,
                      icon: const Icon(Icons.logout),
                      label: const Text('Keluar'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text('v1.0.0', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String title;
  final IconData icon;
  final Color color;
  final Color iconColor;

  const _StatCard({required this.label, required this.title, required this.icon, required this.color, required this.iconColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.6), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: iconColor, size: 24),
          const SizedBox(height: 12),
          Text(label, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: iconColor)),
          const SizedBox(height: 4),
          Text(title, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
        ],
      ),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final String? subtitle;

  const _ProfileTile({required this.icon, required this.label, required this.value, this.subtitle});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: Theme.of(context).colorScheme.primary),
      title: Text(label, style: Theme.of(context).textTheme.bodySmall),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: Theme.of(context).textTheme.bodyLarge),
          if (subtitle != null && subtitle!.isNotEmpty)
            Text(subtitle!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey)),
        ],
      ),
    );
  }
}

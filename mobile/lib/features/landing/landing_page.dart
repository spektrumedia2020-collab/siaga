import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme/app_theme.dart';
import '../../services/sync_service.dart';
import '../../services/local/database_service.dart';
import '../../core/ui_helpers.dart';

class LandingPage extends StatefulWidget {
  const LandingPage({super.key});

  @override
  State<LandingPage> createState() => _LandingPageState();
}

class _LandingPageState extends State<LandingPage> {
  bool _isOnlineMode = true;
  int _pendingCount = 0;
  bool _syncing = false;

  @override
  void initState() {
    super.initState();
    _checkPendingCount();
  }

  Future<void> _checkPendingCount() async {
    final count = await DatabaseService().getPendingTransactionsCount();
    if (mounted) {
      setState(() {
        _pendingCount = count;
      });
    }
  }

  Future<void> _toggleOnlineMode() async {
    setState(() {
      _isOnlineMode = !_isOnlineMode;
    });

    if (_isOnlineMode) {
      // If switching to online mode, try to sync
      await _syncNow();
    }
  }

  Future<void> _syncNow() async {
    if (!_isOnlineMode) {
      // Show message that sync is not available in offline mode
      if (mounted) {
        showInfoSnackBar(context, 'Sinkronisasi hanya tersedia dalam mode online');
      }
      return;
    }

    setState(() {
      _syncing = true;
    });

    try {
      final syncService = SyncService(Supabase.instance.client);
      final result = await syncService.syncAll();

      if (mounted) {
        final syncedTx = result['transactions'] ?? 0;
        setState(() {
          _pendingCount = 0;
          _syncing = false;
        });

        showSuccessSnackBar(context, 'Sinkronisasi berhasil: $syncedTx transaksi');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _syncing = false;
        });

        showErrorSnackBar(context, 'Sinkronisasi gagal: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              // Header Section
              Container(
                width: double.infinity,
                padding: const EdgeInsets.only(top: 60, bottom: 40, left: 24, right: 24),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      AppTheme.primaryGreen,
                      AppTheme.primaryDark,
                    ],
                  ),
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(32),
                    bottomRight: Radius.circular(32),
                  ),
                ),
                child: Column(
                  children: [
                    // Logo
                    Container(
                      width: 88,
                      height: 88,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.15),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Image.asset(
                          'assets/logo.jpeg',
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) => const Icon(
                            Icons.account_balance,
                            size: 44,
                            color: AppTheme.primaryGreen,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'SiAga Officer',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Aplikasi Petugas Retribusi Pasar',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.85),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Online/Offline Toggle Card
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: _isOnlineMode ? Colors.green[50] : Colors.orange[50],
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: _isOnlineMode ? Colors.green[200]! : Colors.orange[200]!,
                      width: 2,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _isOnlineMode ? Icons.wifi : Icons.wifi_off,
                        color: _isOnlineMode ? Colors.green[700] : Colors.orange[700],
                        size: 32,
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _isOnlineMode ? 'Mode Online' : 'Mode Offline',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: _isOnlineMode ? Colors.green[900] : Colors.orange[900],
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _isOnlineMode
                                  ? 'Terhubung ke server'
                                  : 'Menyimpan data locally',
                              style: TextStyle(
                                fontSize: 12,
                                color: _isOnlineMode ? Colors.green[700] : Colors.orange[700],
                              ),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: _isOnlineMode,
                        onChanged: (_) => _toggleOnlineMode(),
                        activeColor: Colors.green,
                        inactiveThumbColor: Colors.orange,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Sync Button
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _syncing ? null : _syncNow,
                    icon: _syncing
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : const Icon(Icons.sync, size: 20),
                    label: Text(
                      _syncing ? 'Menyinkronkan...' : 'Sinkronkan Data',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryGreen,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  ),
                ),
              ),

              if (_pendingCount > 0) ...[
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Text(
                    '$_pendingCount transaksi menunggu sinkronisasi',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],

              const SizedBox(height: 32),

              // Quick Action Menu
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 4,
                          height: 20,
                          decoration: BoxDecoration(
                            color: AppTheme.primaryGreen,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                        const SizedBox(width: 10),
                        const Text(
                          'Menu Cepat',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: _QuickMenuCard(
                            icon: Icons.qr_code_scanner,
                            title: 'Scan QR',
                            subtitle: 'Scan Lapak',
                            color: const Color(0xFFE3F2FD),
                            iconColor: const Color(0xFF1565C0),
                            onTap: () => context.go('/scan'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _QuickMenuCard(
                            icon: Icons.receipt_long,
                            title: 'Transaksi',
                            subtitle: 'Catat Bayaran',
                            color: const Color(0xFFE8F5E9),
                            iconColor: AppTheme.primaryGreen,
                            onTap: () => context.go('/transaction'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _QuickMenuCard(
                            icon: Icons.person_pin,
                            title: 'Absensi',
                            subtitle: 'Check-In/Out',
                            color: const Color(0xFFFFF3E0),
                            iconColor: const Color(0xFFE65100),
                            onTap: () => context.go('/attendance'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _QuickMenuCard(
                            icon: Icons.history,
                            title: 'Riwayat',
                            subtitle: 'Lihat Histori',
                            color: const Color(0xFFF3E5F5),
                            iconColor: const Color(0xFF7B1FA2),
                            onTap: () => context.go('/history'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Footer
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Text(
                  '© 2026 SiAga Officer v1.0.0',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[400],
                  ),
                ),
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickMenuCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final Color iconColor;
  final VoidCallback onTap;

  const _QuickMenuCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.iconColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: iconColor, size: 28),
              const SizedBox(height: 12),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
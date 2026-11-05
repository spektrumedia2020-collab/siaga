import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../services/offline_sync_coordinator.dart';
import '../../core/ui_helpers.dart';

class LandingPage extends StatefulWidget {
  const LandingPage({super.key});

  @override
  State<LandingPage> createState() => _LandingPageState();
}

class _LandingPageState extends State<LandingPage> {
  final OfflineSyncCoordinator _coordinator = OfflineSyncCoordinator.instance;

  @override
  void initState() {
    super.initState();
    _coordinator.start();
  }

  Future<void> _syncNow() async {
    final result = await _coordinator.syncNow(forceMaster: true, retryFailed: true);
    if (!mounted) return;
    if (!result.online) {
      showInfoSnackBar(context, 'Tidak ada sinyal. Transaksi tetap tersimpan di perangkat.');
      return;
    }
    showSuccessSnackBar(
      context,
      'Sinkron selesai: ${result.syncedTransactions} transaksi terkirim, ${result.pending} menunggu',
    );
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
                      AppTheme.headerLight,
                      AppTheme.headerLightTo,
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
                            color: AppTheme.primaryNavy.withValues(alpha: 0.18),
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
                            color: AppTheme.primaryNavy,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'SiAga Officer',
                      style: TextStyle(
                        color: AppTheme.navyInk,
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Aplikasi Petugas Retribusi Pasar',
                      style: TextStyle(
                        color: AppTheme.navyInk.withValues(alpha: 0.75),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Connection status card
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: ValueListenableBuilder<SyncStatus>(
                  valueListenable: _coordinator.status,
                  builder: (context, status, _) {
                    return Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: status.online ? AppTheme.headerLight : Colors.orange[50],
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: status.online ? const Color(0xFF93C5FD) : Colors.orange[200]!,
                          width: 2,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            status.online ? Icons.wifi : Icons.wifi_off,
                            color: status.online ? const Color(0xFF1D4E89) : Colors.orange[700],
                            size: 32,
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  status.online ? 'Terhubung' : 'Mode Offline',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: status.online ? const Color(0xFF0B1F3A) : Colors.orange[900],
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  status.online
                                      ? 'Status koneksi mengikuti jaringan perangkat'
                                      : 'Pembayaran disimpan di perangkat dan dikirim otomatis saat ada sinyal',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: status.online ? const Color(0xFF1D4E89) : Colors.orange[700],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 16),

              // Sync Button
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: ValueListenableBuilder<SyncStatus>(
                  valueListenable: _coordinator.status,
                  builder: (context, status, _) {
                    return SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: status.syncing ? null : _syncNow,
                        icon: status.syncing
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
                          status.syncing ? 'Menyinkronkan...' : 'Sinkronkan Data',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryNavy,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),

              ValueListenableBuilder<SyncStatus>(
                valueListenable: _coordinator.status,
                builder: (context, status, _) {
                  if (status.pending == 0 && status.failed == 0) {
                    return const SizedBox.shrink();
                  }
                  final parts = <String>[];
                  if (status.pending > 0) parts.add('${status.pending} menunggu sinkron');
                  if (status.failed > 0) parts.add('${status.failed} gagal sinkron');
                  return Padding(
                    padding: const EdgeInsets.only(top: 8, left: 24, right: 24),
                    child: Text(
                      parts.join(' · '),
                      style: TextStyle(
                        fontSize: 12,
                        color: status.failed > 0 ? Colors.red[700] : Colors.grey[600],
                      ),
                      textAlign: TextAlign.center,
                    ),
                  );
                },
              ),

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
                            color: AppTheme.primaryNavy,
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
                            color: const Color(0xFFE6EDF7),
                            iconColor: AppTheme.primaryNavy,
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
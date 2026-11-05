import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/qr_payload.dart';

class ScanPage extends ConsumerStatefulWidget {
  const ScanPage({super.key});

  @override
  ConsumerState<ScanPage> createState() => _ScanPageState();
}

class _ScanPageState extends ConsumerState<ScanPage> {
  String? scannedCode;
  bool _isNavigating = false;

  void _handleDetection(BarcodeCapture capture) {
    if (_isNavigating) return;
    final raw = capture.barcodes.isEmpty ? null : capture.barcodes.first.rawValue;
    final code = raw == null ? null : extractStallCode(raw);
    if (code == null || code == scannedCode) return;
    scannedCode = code;
    _isNavigating = true;
    HapticFeedback.mediumImpact();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.go('/lapak/$code');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan QR Lapak'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Theme.of(context).colorScheme.onPrimary,
      ),
      body: Column(
        children: [
          Expanded(
            child: MobileScanner(onDetect: _handleDetection),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              scannedCode != null
                  ? 'Membuka lapak $scannedCode...'
                  : 'Arahkan kamera ke QR lapak',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
        ],
      ),
    );
  }
}
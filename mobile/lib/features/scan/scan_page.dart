import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class ScanPage extends ConsumerStatefulWidget {
  const ScanPage({super.key});

  @override
  ConsumerState<ScanPage> createState() => _ScanPageState();
}

class _ScanPageState extends ConsumerState<ScanPage> {
  String? scannedCode;
  bool _isNavigating = false;

  void _openLapak() {
    if (scannedCode == null || _isNavigating) return;
    _isNavigating = true;
    context.go('/lapak/$scannedCode');
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
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  scannedCode != null ? 'Lapak Terbaca: $scannedCode' : 'Arahkan kamera ke QR lapak',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: scannedCode == null ? null : _openLapak,
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
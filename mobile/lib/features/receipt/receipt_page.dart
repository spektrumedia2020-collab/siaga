import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/theme/app_theme.dart';

class ReceiptPage extends ConsumerStatefulWidget {
  const ReceiptPage({super.key, required this.receipt});
  final Map<String, dynamic> receipt;

  @override
  ConsumerState<ReceiptPage> createState() => _ReceiptPageState();
}

class _ReceiptPageState extends ConsumerState<ReceiptPage> {
  String get _receiptText {
    return '''Bukti Transaksi SiAga Officer
ID Transaksi: ${widget.receipt['transactionId']}
Stall ID: ${widget.receipt['stallId'] ?? widget.receipt['lapakId']}
Nama Pembayar: ${widget.receipt['payerName']}
Jumlah: Rp ${widget.receipt['amount']}
Metode: ${widget.receipt['method']}
Catatan: ${widget.receipt['note']}
Tanggal: ${widget.receipt['createdAt']}
''';
  }

  Future<void> _shareReceipt() async {
    await SharePlus.instance.share(
      ShareParams(text: _receiptText, subject: 'Bukti Transaksi SiAga Officer'),
    );
  }

  Future<void> _printReceipt() async {
    await Printing.layoutPdf(onLayout: (format) async {
      final pdf = pw.Document();
      pdf.addPage(
        pw.Page(
          pageFormat: format,
          build: (context) => pw.Padding(
            padding: const pw.EdgeInsets.all(20),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text('Bukti Transaksi SiAga Officer', style: pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold)),
                pw.SizedBox(height: 16),
                pw.Text('ID Transaksi: ${widget.receipt['transactionId']}', style: const pw.TextStyle(fontSize: 14)),
                pw.Text('Stall ID: ${widget.receipt['stallId'] ?? widget.receipt['lapakId']}', style: const pw.TextStyle(fontSize: 14)),
                pw.Text('Nama Pembayar: ${widget.receipt['payerName']}', style: const pw.TextStyle(fontSize: 14)),
                pw.Text('Jumlah: Rp ${widget.receipt['amount']}', style: const pw.TextStyle(fontSize: 14)),
                pw.Text('Metode: ${widget.receipt['method']}', style: const pw.TextStyle(fontSize: 14)),
                pw.Text('Catatan: ${widget.receipt['note']}', style: const pw.TextStyle(fontSize: 14)),
                pw.Text('Tanggal: ${widget.receipt['createdAt']}', style: const pw.TextStyle(fontSize: 14)),
              ],
            ),
          ),
        ),
      );
      return pdf.save();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bukti Transaksi'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Theme.of(context).colorScheme.onPrimary,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              elevation: 1,
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(18))),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Bukti Transaksi', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    Text('ID Transaksi: ${widget.receipt['transactionId']}', style: Theme.of(context).textTheme.bodyMedium),
                    const SizedBox(height: 6),
                    Text('Stall ID: ${widget.receipt['stallId'] ?? widget.receipt['lapakId']}', style: Theme.of(context).textTheme.bodyMedium),
                    const SizedBox(height: 6),
                    Text('Nama Pembayar: ${widget.receipt['payerName']}', style: Theme.of(context).textTheme.bodyMedium),
                    const SizedBox(height: 6),
                    Text('Jumlah: Rp ${widget.receipt['amount']}', style: Theme.of(context).textTheme.bodyMedium),
                    const SizedBox(height: 6),
                    Text('Metode: ${widget.receipt['method']}', style: Theme.of(context).textTheme.bodyMedium),
                    const SizedBox(height: 6),
                    Text('Catatan: ${widget.receipt['note']}', style: Theme.of(context).textTheme.bodyMedium),
                    const SizedBox(height: 6),
                    Text('Tanggal: ${widget.receipt['createdAt']}', style: Theme.of(context).textTheme.bodyMedium),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _shareReceipt,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: const Text('Bagikan Struk', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _printReceipt,
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.surface,
                foregroundColor: Theme.of(context).colorScheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 16),
                side: BorderSide(color: Theme.of(context).colorScheme.primary),
              ),
              child: const Text('Print Bukti', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () {
                // Navigate to shop page (lapak list) with dashboard index 2
                context.go('/shop');
              },
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: const Text('Transaksi Baru', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }
}
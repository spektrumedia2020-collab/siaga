import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme/app_theme.dart';

class PaymentPage extends ConsumerStatefulWidget {
  const PaymentPage({super.key, required this.lapakId});
  final String lapakId;

  @override
  ConsumerState<PaymentPage> createState() => _PaymentPageState();
}

class _PaymentPageState extends ConsumerState<PaymentPage> {
  final _payerController = TextEditingController();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  String _paymentMethod = 'Tunai';
  bool _saving = false;
  String? _message;
  int? _stallId;
  String? _retributionTypeName;

  @override
  void initState() {
    super.initState();
    _loadOwnerName();
    _loadRetributionType();
  }

  Future<void> _loadRetributionType() async {
    final typeId = GoRouterState.of(context).uri.queryParameters['type'];
    if (typeId == null) return;

    try {
      final supabase = Supabase.instance.client;
      final result = await supabase.from('retribution_types').select('name, amount').eq('id', typeId).maybeSingle();
      if (result != null && mounted) {
        final amount = result['amount'];
        if (amount != null) {
          setState(() {
            _retributionTypeName = result['name']?.toString();
            _amountController.text = amount.toString();
            _noteController.text = 'Jenis: $_retributionTypeName';
          });
        }
      }
    } catch (e) {
      // ignore
    }
  }

  Future<void> _loadOwnerName() async {
    try {
      final supabase = Supabase.instance.client;
      final lapakId = widget.lapakId;
      
      final stallByCode = await supabase.from('stalls').select('owner_id, code, number').eq('code', lapakId).maybeSingle();

      Map<String, dynamic>? row;
      if (stallByCode != null) {
        row = Map<String, dynamic>.from(stallByCode as Map);
      } else {
        final idNumeric = int.tryParse(lapakId);
        if (idNumeric != null) {
          final stallById = await supabase.from('stalls').select('owner_id, code, number').eq('id', idNumeric).maybeSingle();
          if (stallById != null) {
            row = Map<String, dynamic>.from(stallById as Map);
          }
        }
      }

      if (row == null) {
        final legacy = await supabase.from('lapak').select('id_pemilik, kode_lapak, nomor_lapak').or('kode_lapak.eq.$lapakId,id_lapak.eq.$lapakId').maybeSingle();
        if (legacy != null) {
          row = Map<String, dynamic>.from(legacy as Map);
        }
      }

      String? ownerName;
      int? stallId;
      if (row != null) {
        stallId = row['id'];
        final ownerId = row['owner_id'] ?? row['id_pemilik'];
        if (ownerId != null) {
          final owner = await supabase.from('stall_owners').select('name').eq('id', ownerId).maybeSingle();
          if (owner != null && owner['name'] != null) {
            ownerName = owner['name'] as String;
          } else {
            final legacyOwner = await supabase.from('pemilik_lapak').select('nama_pemilik').eq('id_pemilik', ownerId).maybeSingle();
            if (legacyOwner != null && legacyOwner['nama_pemilik'] != null) {
              ownerName = legacyOwner['nama_pemilik'] as String;
            }
          }
        }
      }

      if (ownerName != null && ownerName.isNotEmpty) {
        _payerController.text = ownerName;
      }
      if (stallId != null) {
        _stallId = stallId;
      }
    } catch (e) {
      // ignore errors silently
    }
  }

  Future<void> _savePayment() async {
    final payer = _payerController.text.trim();
    final amount = double.tryParse(_amountController.text) ?? 0;
    final note = _noteController.text.trim();

    if (payer.isEmpty || amount <= 0) {
      setState(() => _message = 'Isi nama dan jumlah pembayaran dengan benar');
      return;
    }

    setState(() {
      _saving = true;
      _message = null;
    });

    try {
      final supabase = Supabase.instance.client;
      final response = await supabase.from('transactions').insert({
        'stall_id': _stallId,
        'payer_name': payer,
        'amount': amount,
        'payment_method': _paymentMethod,
        'status': 'paid',
        'note': note,
      }).select().single();

      if (!mounted) return;

      final receipt = {
        'stallId': _stallId,
        'lapakId': widget.lapakId,
        'payerName': payer,
        'amount': amount,
        'method': _paymentMethod,
        'note': note,
        'createdAt': DateTime.now().toIso8601String(),
        'transactionId': response['id']?.toString() ?? 'N/A',
      };

      context.go('/receipt', extra: receipt);
    } catch (e) {
      if (!mounted) return;
      setState(() => _message = 'Gagal menyimpan pembayaran: $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bayar Retribusi'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Theme.of(context).colorScheme.onPrimary,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_retributionTypeName != null) ...[
              Text('Jenis Retribusi: $_retributionTypeName', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
            ],
            Text('Lapak: ${widget.lapakId}', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            TextField(controller: _payerController, decoration: const InputDecoration(labelText: 'Nama Pembayar', prefixIcon: Icon(Icons.person_outline))),
            const SizedBox(height: 12),
            TextField(controller: _amountController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Jumlah (Rp)', prefixIcon: Icon(Icons.payments_outlined))),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _paymentMethod,
              decoration: const InputDecoration(labelText: 'Metode Pembayaran', prefixIcon: Icon(Icons.payment_outlined)),
              items: const [
                DropdownMenuItem(value: 'QRIS', child: Text('QRIS')),
                DropdownMenuItem(value: 'Tunai', child: Text('Tunai')),
              ],
              onChanged: (value) {
                if (value != null) setState(() => _paymentMethod = value);
              },
            ),
            const SizedBox(height: 12),
            TextField(controller: _noteController, decoration: const InputDecoration(labelText: 'Catatan (opsional)', prefixIcon: Icon(Icons.notes_outlined))),
            const SizedBox(height: 16),
            if (_message != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(_message!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ),
            ElevatedButton(
              onPressed: _saving ? null : _savePayment,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _saving
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Simpan Transaksi', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }
}
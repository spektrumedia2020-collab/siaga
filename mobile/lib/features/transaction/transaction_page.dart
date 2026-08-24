import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class TransactionPage extends ConsumerStatefulWidget {
  const TransactionPage({super.key, required this.lapakId, required this.typeId});
  final String lapakId;
  final String typeId;

  @override
  ConsumerState<TransactionPage> createState() => _TransactionPageState();
}

class _TransactionPageState extends ConsumerState<TransactionPage> {
  final _nameController = TextEditingController();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  String _paymentMethod = 'Tunai';
  bool _saving = false;
  String? _message;
  bool _messageIsError = false;
  int? _stallId;
  String? _retributionTypeName;
  List<Map<String, dynamic>> _retributionTypes = [];
  bool _loadingTypes = true;
  bool _loadingPaymentData = true;
  bool _typeLoaded = false;

  @override
  void initState() {
    super.initState();
    if (widget.typeId == 'UNKNOWN') {
      _loadRetributionTypes();
    } else {
      _loadPaymentData();
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _loadRetributionTypes() async {
    if (!mounted) return;
    setState(() => _loadingTypes = true);
    try {
      final supabase = Supabase.instance.client;
      final result = await supabase.from('retribution_types').select('id, name').order('name');
      final List<Map<String, dynamic>> loaded = (result as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      for (final t in loaded) {
        final id = t['id'];
        if (id != null) {
          try {
            final rate = await supabase.from('retribution_rates').select('amount').eq('types_id', id).maybeSingle();
            if (rate != null && rate['amount'] != null) {
              t['amount'] = rate['amount'];
            }
          } catch (_) {}
        }
      }
      if (mounted) {
        setState(() {
          _retributionTypes = loaded;
          _loadingTypes = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loadingTypes = false);
    }
  }

  void _onRetributionTypeSelected(String typeId) {
    context.go('/transaction/${widget.lapakId}/$typeId');
  }

  Future<void> _loadPaymentData() async {
    if (!mounted) return;
    try {
      final supabase = Supabase.instance.client;
      final lapakId = widget.lapakId;
      debugPrint('DEBUG TransactionPage: loading payment data for lapakId=$lapakId, typeId=${widget.typeId}');

      Map<String, dynamic>? row;

      // Try lookup by code or id
      final stallByCode = await supabase.from('stalls').select('id, owner_id, code, number').eq('code', lapakId).maybeSingle();
      if (stallByCode != null) {
        row = Map<String, dynamic>.from(stallByCode as Map);
        debugPrint('DEBUG TransactionPage: Found stall by code=$lapakId, id=${row['id']}');
      } else {
        final idNumeric = int.tryParse(lapakId);
        if (idNumeric != null) {
          final stallById = await supabase.from('stalls').select('id, owner_id, code, number').eq('id', idNumeric).maybeSingle();
          if (stallById != null) {
            row = Map<String, dynamic>.from(stallById as Map);
            debugPrint('DEBUG TransactionPage: Found stall by id=$idNumeric, code=${row['code']}');
          }
        }
      }

      // Fallback ke tabel legacy jika ada
      if (row == null) {
        try {
          final legacy = await supabase.from('lapak').select('id_lapak, id_pemilik, kode_lapak');
          final List<dynamic> legacyList = legacy as List;
          final match = legacyList.where((e) {
            final m = Map<String, dynamic>.from(e as Map);
            return m['kode_lapak']?.toString() == lapakId || m['id_lapak']?.toString() == lapakId;
          }).toList();
          if (match.isNotEmpty) {
            row = Map<String, dynamic>.from(match.first as Map);
            debugPrint('DEBUG TransactionPage: Found stall in legacy table');
          }
        } catch (e) {
          debugPrint('DEBUG TransactionPage: Legacy lookup failed: $e');
        }
      }

      if (row != null) {
        _stallId = (row['id'] ?? int.tryParse(row['id_lapak']?.toString() ?? ''));
        debugPrint('DEBUG TransactionPage: stallId resolved to $_stallId');
        final ownerId = row['owner_id'] ?? row['id_pemilik'];
        if (ownerId != null) {
          try {
            final owner = await supabase.from('stall_owners').select('name').eq('id', ownerId).maybeSingle();
            if (owner != null && owner['name'] != null) {
              _nameController.text = owner['name'] as String;
            }
          } catch (e) {
            debugPrint('DEBUG TransactionPage: Owner lookup failed: $e');
          }
        }
      } else {
        debugPrint('DEBUG TransactionPage: Stall not found for lapakId=$lapakId');
      }

      // Load retribution type info dan amount dari retribution_rates
      final typeIdNumeric = int.tryParse(widget.typeId);
      if (typeIdNumeric != null) {
        try {
          final typeResult = await supabase.from('retribution_types').select('id, name').eq('id', typeIdNumeric).maybeSingle();
          if (typeResult != null) {
            _retributionTypeName = typeResult['name']?.toString();
            _typeLoaded = true;
            debugPrint('DEBUG TransactionPage: Found type name: $_retributionTypeName');
            // Ambil amount dari retribution_rates sesuai stall_id atau market_id
            final stallIdLocal = _stallId;
            if (stallIdLocal != null) {
              try {
                // Cari rate khusus untuk stall ini dulu
                final rateForStall = await supabase
                    .from('retribution_rates')
                    .select('amount')
                    .eq('types_id', typeIdNumeric)
                    .eq('stall_id', stallIdLocal)
                    .maybeSingle();
                if (rateForStall != null && rateForStall['amount'] != null) {
                  _amountController.text = rateForStall['amount'].toString();
                  debugPrint('DEBUG TransactionPage: Found amount for stall: ${rateForStall['amount']}');
                } else {
                  // Jika tidak ada, cari rate yang berlaku untuk semua stall di market ini
                  final ratesForType = await supabase
                      .from('retribution_rates')
                      .select('amount, market_id, stall_id')
                      .eq('types_id', typeIdNumeric);
                  final List<dynamic> ratesList = ratesForType as List;
                  // Cari yang stall_id null (berlaku untuk market)
                  final rateForMarket = ratesList.cast<Map<String, dynamic>>().firstWhere(
                    (r) => r['stall_id'] == null,
                    orElse: () => <String, dynamic>{},
                  );
                  if (rateForMarket.isNotEmpty && rateForMarket['amount'] != null) {
                    _amountController.text = rateForMarket['amount'].toString();
                    debugPrint('DEBUG TransactionPage: Found amount for market: ${rateForMarket['amount']}');
                  } else if (ratesList.isNotEmpty && ratesList.first['amount'] != null) {
                    _amountController.text = ratesList.first['amount'].toString();
                    debugPrint('DEBUG TransactionPage: Found amount (any): ${ratesList.first['amount']}');
                  } else {
                    debugPrint('DEBUG TransactionPage: No rate found for types_id=$typeIdNumeric');
                  }
                }
              } catch (e) {
                debugPrint('DEBUG TransactionPage: Rate lookup error: $e');
              }
            } else {
              // Fallback: ambil rate tanpa filter stall
              try {
                final ratesForType = await supabase
                    .from('retribution_rates')
                    .select('amount, stall_id')
                    .eq('types_id', typeIdNumeric);
                final List<dynamic> ratesList = ratesForType as List;
                final rateAny = ratesList.cast<Map<String, dynamic>>().firstWhere(
                  (r) => r['stall_id'] == null,
                  orElse: () => ratesList.isNotEmpty ? Map<String, dynamic>.from(ratesList.first as Map) : <String, dynamic>{},
                );
                if (rateAny.isNotEmpty && rateAny['amount'] != null) {
                  _amountController.text = rateAny['amount'].toString();
                  debugPrint('DEBUG TransactionPage: Found amount (no stall): ${rateAny['amount']}');
                }
              } catch (e) {
                debugPrint('DEBUG TransactionPage: Rate lookup error: $e');
              }
            }
            _noteController.text = 'Jenis: $_retributionTypeName';
          } else {
            debugPrint('DEBUG TransactionPage: Type not found for id=$typeIdNumeric');
          }
        } catch (e) {
          debugPrint('DEBUG TransactionPage: Type lookup error: $e');
        }
      } else {
        debugPrint('DEBUG TransactionPage: typeId not numeric: ${widget.typeId}');
      }

      if (mounted) {
        setState(() {
          _loadingPaymentData = false;
        });
      }
    } catch (e) {
      debugPrint('DEBUG TransactionPage: _loadPaymentData error: $e');
      if (mounted) setState(() => _loadingPaymentData = false);
    }
  }

  Future<void> _saveTransaction() async {
    setState(() {
      _saving = true;
      _message = null;
      _messageIsError = false;
    });

    try {
      final supabase = Supabase.instance.client;

      final payerName = _nameController.text.trim();
      final amount = double.tryParse(_amountController.text);

      if (payerName.isEmpty) {
        setState(() {
          _message = 'Nama pembayar harus diisi';
          _messageIsError = true;
          _saving = false;
        });
        return;
      }

      if (amount == null || amount <= 0) {
        setState(() {
          _message = 'Jumlah pembayaran harus lebih dari 0';
          _messageIsError = true;
          _saving = false;
        });
        return;
      }

      // Simpan ke database — pakai kolom `amount` tunggal (finalisasi skema 2.4)
      final insertBody = <String, dynamic>{};
      if (_stallId != null) {
        insertBody['stall_id'] = _stallId;
      }
      insertBody['amount'] = amount;
      insertBody['payer_name'] = payerName;
      insertBody['payment_method'] = _paymentMethod;
      insertBody['note'] = _noteController.text.trim();
      insertBody['status'] = 'paid';

      // CATATAN KEAMANAN: blok "bypass RLS" telah DIHAPUS (audit item 1.1).
      // Validasi market kini ditangani server-side oleh trigger
      // trg_validate_transaction_market di Supabase — client tidak boleh
      // mencoba melewati kebijilan keamanan database.
      final response = await supabase.from('transactions').insert(insertBody).select().single();

      if (!mounted) return;

      // Navigasi ke halaman receipt
      final receipt = {
        'transactionId': response['id']?.toString() ?? 'N/A',
        'stallId': _stallId,
        'lapakId': widget.lapakId,
        'payerName': payerName,
        'amount': amount,
        'method': _paymentMethod,
        'note': _noteController.text.trim(),
        'createdAt': DateTime.now().toIso8601String(),
      };

      context.go('/receipt', extra: receipt);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _message = 'Gagal menyimpan transaksi: $e';
        _messageIsError = true;
      });
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Transaksi Retribusi'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Theme.of(context).colorScheme.onPrimary,
        actions: [
          Text(widget.lapakId, style: const TextStyle(fontSize: 12, color: Colors.white70)),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (widget.typeId == 'UNKNOWN') ...[
                  Text('Pilih Jenis Retribusi', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 12),
                  _buildRetributionSelector(),
                ] else ...[
                  Row(
                    children: [
                      Icon(Icons.receipt_long, color: Theme.of(context).colorScheme.primary, size: 28),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Jenis Retribusi', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                            Text(
                              _retributionTypeName ?? 'Memuat...',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _nameController,
                    readOnly: true,
                    decoration: const InputDecoration(
                      labelText: 'Nama Pembayar',
                      prefixIcon: Icon(Icons.person_outline),
                      border: OutlineInputBorder(),
                      filled: true,
                      fillColor: Color(0xFFF5F5F5),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _amountController,
                    readOnly: true,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Jumlah (Rp)',
                      prefixIcon: Icon(Icons.payments_outlined),
                      border: OutlineInputBorder(),
                      filled: true,
                      fillColor: Color(0xFFF5F5F5),
                    ),
                  ),
                  const SizedBox(height: 16),
                  InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Metode Pembayaran',
                      prefixIcon: Icon(Icons.payment_outlined),
                      border: OutlineInputBorder(),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _paymentMethod,
                        isDense: true,
                        items: const [
                          DropdownMenuItem(value: 'QRIS', child: Text('QRIS')),
                          DropdownMenuItem(value: 'Tunai', child: Text('Tunai')),
                        ],
                        onChanged: (value) {
                          if (value != null) setState(() => _paymentMethod = value);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _noteController,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'Catatan (opsional)',
                      prefixIcon: Icon(Icons.notes_outlined),
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 24),
                  if (_message != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _messageIsError
                            ? Colors.red.withOpacity(0.1)
                            : Colors.green.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _messageIsError ? Colors.red : Colors.green,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _messageIsError ? Icons.error_outline : Icons.check_circle,
                            color: _messageIsError ? Colors.red : Colors.green,
                          ),
                          const SizedBox(width: 8),
                          Expanded(child: Text(_message!)),
                        ],
                      ),
                    ),
                  const SizedBox(height: 16),
                  if (_loadingPaymentData)
                    const Center(child: Padding(
                      padding: EdgeInsets.all(16.0),
                      child: CircularProgressIndicator(),
                    ))
                  else
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _saving ? null : _saveTransaction,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Theme.of(context).colorScheme.primary,
                          foregroundColor: Theme.of(context).colorScheme.onPrimary,
                        ),
                        child: _saving
                            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Text('Bayar Sekarang', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                      ),
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRetributionSelector() {
    if (_loadingTypes) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_retributionTypes.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.orange[50],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.orange[200]!),
        ),
        child: Column(
          children: [
            Icon(Icons.info_outline, color: Colors.orange[700], size: 40),
            const SizedBox(height: 12),
            Text(
              'Tidak ada jenis retribusi',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.orange[900], fontSize: 14),
            ),
          ],
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: _retributionTypes.map((type) {
        final typeId = type['id'];
        final name = type['name'];
        final amount = type['amount'];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            title: Text(
              name ?? 'Tidak diketahui',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            subtitle: amount != null
                ? Text(
                    'Rp ${(amount as num).toStringAsFixed(0)}',
                    style: TextStyle(color: Colors.green[700], fontWeight: FontWeight.w700, fontSize: 16),
                  )
                : null,
            trailing: Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey[400]),
            onTap: () {
              if (typeId != null) _onRetributionTypeSelected(typeId.toString());
            },
          ),
        );
      }).toList(),
    );
  }
}
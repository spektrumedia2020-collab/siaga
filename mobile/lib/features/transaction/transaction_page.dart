import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../../services/local/database_service.dart';
import '../../services/offline_sync_coordinator.dart';
import '../../shared/models/outbox_entry.dart';

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
  int? _marketId;
  int? _rateId;
  int? _officerId;
  bool _fromCache = false;
  String? _collectionPeriod;
  String? _retributionTypeName;
  bool _isDailyRetribution = false;
  List<Map<String, dynamic>> _retributionTypes = [];
  bool _loadingTypes = true;
  bool _loadingPaymentData = true;

  bool get _isPeriodBilled => _collectionPeriod == 'MINGGUAN' || _collectionPeriod == 'BULANAN';

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
      final database = DatabaseService();
      _officerId ??= int.tryParse(await database.getMeta('officer_user_id') ?? '');
      final marketId = int.tryParse(await database.getMeta('officer_market_id') ?? '');
      if (marketId != null) {
        final cachedTypes = await database.typesForMarket(marketId);
        if (cachedTypes.isNotEmpty) {
          final loaded = cachedTypes
              .map((type) => <String, dynamic>{
                    'id': (type['id'] as num).toInt(),
                    'name': type['name'],
                  })
              .toList();
          if (mounted) {
            setState(() {
              _retributionTypes = loaded;
              _loadingTypes = false;
            });
          }
          return;
        }
      }

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
          } on Exception catch (_) {}
        }
      }
      if (mounted) {
        setState(() {
          _retributionTypes = loaded;
          _loadingTypes = false;
        });
      }
    } on Exception {
      if (mounted) setState(() => _loadingTypes = false);
    }
  }

  void _onRetributionTypeSelected(String typeId) {
    context.go('/transaction/${widget.lapakId}/$typeId');
  }

  Future<void> _loadPaymentData() async {
    if (!mounted) return;
    if (await _loadFromCache()) return;
    try {
      final supabase = Supabase.instance.client;
      final lapakId = widget.lapakId;
      debugPrint('DEBUG TransactionPage: loading payment data for lapakId=$lapakId, typeId=${widget.typeId}');

      Map<String, dynamic>? row;

      // Try lookup by code or id
      final stallByCode = await supabase.from('stalls').select('id, owner_id, code, number, market_id').eq('code', lapakId).maybeSingle();
      if (stallByCode != null) {
        row = Map<String, dynamic>.from(stallByCode as Map);
        debugPrint('DEBUG TransactionPage: Found stall by code=$lapakId, id=${row['id']}');
      } else {
        final idNumeric = int.tryParse(lapakId);
        if (idNumeric != null) {
          final stallById = await supabase.from('stalls').select('id, owner_id, code, number, market_id').eq('id', idNumeric).maybeSingle();
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
        } on Exception catch (e) {
          debugPrint('DEBUG TransactionPage: Legacy lookup failed: $e');
        }
      }

      if (row != null) {
        _stallId = (row['id'] ?? int.tryParse(row['id_lapak']?.toString() ?? ''));
        _marketId = row['market_id'] as int?;
        debugPrint('DEBUG TransactionPage: stallId resolved to $_stallId');
        final ownerId = row['owner_id'] ?? row['id_pemilik'];
        if (ownerId != null) {
          try {
            final owner = await supabase.from('stall_owners').select('name').eq('id', ownerId).maybeSingle();
            if (owner != null && owner['name'] != null) {
              _nameController.text = owner['name'] as String;
            }
          } on Exception catch (e) {
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
          final typeResult = await supabase.from('retribution_types').select('id, name, code, unit').eq('id', typeIdNumeric).maybeSingle();
          if (typeResult != null) {
            _retributionTypeName = typeResult['name']?.toString();
            final typeText = '${typeResult['code'] ?? ''} ${typeResult['name'] ?? ''} ${typeResult['unit'] ?? ''}'.toUpperCase();
            _isDailyRetribution = typeText.contains('HARIAN') || typeText.contains('HARI');
            debugPrint('DEBUG TransactionPage: Found type name: $_retributionTypeName');
            // Ambil amount dari retribution_rates sesuai stall_id atau market_id
            final stallIdLocal = _stallId;
            if (stallIdLocal != null) {
              try {
                // Cari rate khusus untuk stall ini dulu
                final rateForStall = await supabase
                    .from('retribution_rates')
                    .select('id, amount, market_id, collection_period')
                    .eq('types_id', typeIdNumeric)
                    .eq('stall_id', stallIdLocal)
                    .eq('market_id', _marketId ?? 0)
                    .maybeSingle();
                if (rateForStall != null && rateForStall['amount'] != null) {
                  _rateId = rateForStall['id'] as int?;
                  _collectionPeriod = rateForStall['collection_period']?.toString();
                  _amountController.text = rateForStall['amount'].toString();
                  debugPrint('DEBUG TransactionPage: Found amount for stall: ${rateForStall['amount']}');
                } else {
                  // Jika tidak ada, cari rate yang berlaku untuk semua stall di market ini
                  debugPrint('DEBUG TransactionPage: No rate found for stall=$_stallId, market=$_marketId, type=$typeIdNumeric');
                }
              } on Exception catch (e) {
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
              } on Exception catch (e) {
                debugPrint('DEBUG TransactionPage: Rate lookup error: $e');
              }
            }
            _noteController.text = 'Jenis: $_retributionTypeName';
          } else {
            debugPrint('DEBUG TransactionPage: Type not found for id=$typeIdNumeric');
          }
        } on Exception catch (e) {
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
    } on Exception catch (e) {
      debugPrint('DEBUG TransactionPage: _loadPaymentData error: $e');
      if (mounted) setState(() => _loadingPaymentData = false);
    }
  }

  Future<bool> _loadFromCache() async {
    final database = DatabaseService();
    _officerId ??= int.tryParse(await database.getMeta('officer_user_id') ?? '');
    final stall = await database.findStall(lapakId: widget.lapakId);
    if (stall == null) return false;

    final stallId = (stall['id'] as num?)?.toInt();
    _stallId = stallId;
    _marketId = (stall['market_id'] as num?)?.toInt();
    _nameController.text = stall['owner_name']?.toString() ?? '';

    final typeId = int.tryParse(widget.typeId);
    if (typeId != null) {
      final type = await database.typeById(typeId);
      if (type != null) {
        _retributionTypeName = type['name']?.toString();
        final typeText = '${type['code'] ?? ''} ${type['name'] ?? ''} ${type['unit'] ?? ''}'.toUpperCase();
        _isDailyRetribution = typeText.contains('HARIAN') || typeText.contains('HARI');
        _noteController.text = 'Jenis: $_retributionTypeName';
      }
      if (stallId != null) {
        final rates = await database.ratesForStall(stallId);
        final matches = rates.where((rate) => (rate['types_id'] as num?)?.toInt() == typeId).toList();
        if (matches.isNotEmpty) {
          _rateId = (matches.first['id'] as num?)?.toInt();
          _collectionPeriod = matches.first['collection_period']?.toString();
          final rateAmount = (matches.first['amount'] as num?)?.toDouble();
          if (rateAmount != null) _amountController.text = rateAmount.toStringAsFixed(0);
        }
      }
    }

    _fromCache = true;
    if (mounted) setState(() => _loadingPaymentData = false);
    return true;
  }

  Future<void> _saveTransaction() async {
    setState(() {
      _saving = true;
      _message = null;
      _messageIsError = false;
    });

    try {
      final supabase = Supabase.instance.client;
      final database = DatabaseService();

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

      if (_stallId == null) {
        setState(() {
          _message = 'Data lapak belum tersedia offline. Sinkronkan data lapak saat ada sinyal.';
          _messageIsError = true;
          _saving = false;
        });
        return;
      }

      if (_isPeriodBilled) {
        setState(() {
          _message = 'Lapak ini ditagih ${_collectionPeriod == 'MINGGUAN' ? 'mingguan' : 'bulanan'}. '
              'Gunakan pembayaran tagihan periode, bukan penagihan harian.';
          _messageIsError = true;
          _saving = false;
        });
        return;
      }

      _officerId ??= int.tryParse(await database.getMeta('officer_user_id') ?? '');
      if (_officerId == null) {
        try {
          final user = supabase.auth.currentUser;
          if (user != null) {
            final officer = await supabase
                .from('users')
                .select('id_user')
                .eq('auth_uid', user.id)
                .maybeSingle();
            _officerId = (officer?['id_user'] as num?)?.toInt();
            if (_officerId != null) {
              await database.setMeta('officer_user_id', _officerId.toString());
            }
          }
        } on Exception {
          _officerId = null;
        }
      }

      if (_isDailyRetribution) {
        final localDuplicate = await database.hasPendingDailyToday(
              stallId: _stallId!,
              rateId: _rateId,
              amount: amount,
              day: DateTime.now(),
            ) ||
            await database.isPaidToday(stallId: _stallId!, rateId: _rateId, amount: amount);
        if (localDuplicate) {
          setState(() {
            _message = 'Retribusi harian lapak ini sudah ditarik hari ini. Penagihan ganda ditolak.';
            _messageIsError = true;
            _saving = false;
          });
          return;
        }

        // The server check only runs when reachable; offline relies on the cache above.
        try {
          final now = DateTime.now().toUtc();
          final startOfDay = DateTime.utc(now.year, now.month, now.day);
          final startOfNextDay = startOfDay.add(const Duration(days: 1));
          final existingTransactions = await supabase
              .from('transactions')
              .select('id, rate_id, amount')
              .eq('stall_id', _stallId!)
              .eq('status', 'paid')
              .gte('created_at', startOfDay.toIso8601String())
              .lt('created_at', startOfNextDay.toIso8601String());

          final dailyTransactionExists = (existingTransactions as List).any((transaction) =>
              (_rateId != null && transaction['rate_id'] == _rateId) ||
              (transaction['rate_id'] == null && amount == (transaction['amount'] as num?)?.toDouble()));
          if (dailyTransactionExists) {
            setState(() {
              _message = 'Retribusi harian lapak ini sudah ditarik hari ini. Penagihan ganda ditolak.';
              _messageIsError = true;
              _saving = false;
            });
            return;
          }
        } on Exception {
          // Offline: the local cache check above is the guard.
        }
      }

      final clientUuid = const Uuid().v4();
      final occurredAt = DateTime.now();
      await database.enqueueTransaction(OutboxEntry(
        clientUuid: clientUuid,
        kind: OutboxEntry.kindDailyPayment,
        marketId: _marketId,
        stallId: _stallId,
        rateId: _rateId,
        officerId: _officerId,
        amount: amount,
        paymentMethod: _paymentMethod,
        payerName: payerName,
        note: _noteController.text.trim(),
        occurredAt: occurredAt,
        stallCode: widget.lapakId,
        status: 'pending',
        attempts: 0,
        createdAt: occurredAt,
      ));

      final syncResult = await OfflineSyncCoordinator.instance.syncNow();
      final entry = await database.outboxEntry(clientUuid);
      final synced = entry?.status == 'done';

      if (!mounted) return;

      final receipt = {
        'transactionId': synced ? (entry?.serverId?.toString() ?? clientUuid) : clientUuid,
        'stallId': _stallId,
        'lapakId': widget.lapakId,
        'payerName': payerName,
        'amount': amount,
        'method': _paymentMethod,
        'note': _noteController.text.trim(),
        'createdAt': occurredAt.toIso8601String(),
        'pendingSync': !synced,
        'offline': !syncResult.online,
      };

      context.go('/receipt', extra: receipt);
    } on Exception catch (e) {
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
                  if (_isPeriodBilled)
                    Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFEBEE),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFFFCDD2)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.event_repeat, size: 16, color: Color(0xFFB3261E)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Lapak ini ditagih ${_collectionPeriod == 'MINGGUAN' ? 'mingguan' : 'bulanan'}. '
                              'Penagihan harian dinonaktifkan; bayar melalui tagihan periode.',
                              style: const TextStyle(fontSize: 12, color: Color(0xFF8C1D18)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (_fromCache)
                    Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF3E0),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFFFCC80)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.cloud_off, size: 16, color: Color(0xFFE65100)),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Data lapak tersimpan di perangkat. Pembayaran dikirim otomatis saat ada sinyal.',
                              style: TextStyle(fontSize: 12, color: Color(0xFF8C4A00)),
                            ),
                          ),
                        ],
                      ),
                    ),
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
                            ? Colors.red.withValues(alpha: 0.1)
                            : const Color(0xFF1D4E89).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _messageIsError ? Colors.red : const Color(0xFF1D4E89),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _messageIsError ? Icons.error_outline : Icons.check_circle,
                            color: _messageIsError ? Colors.red : const Color(0xFF1D4E89),
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
                        onPressed: _saving || _isPeriodBilled ? null : _saveTransaction,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Theme.of(context).colorScheme.primary,
                          foregroundColor: Theme.of(context).colorScheme.onPrimary,
                        ),
                        child: _saving
                            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : Text(
                                _isPeriodBilled
                                    ? 'Gunakan Tagihan ${_collectionPeriod == 'MINGGUAN' ? 'Mingguan' : 'Bulanan'}'
                                    : 'Bayar Sekarang',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                              ),
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
                    style: const TextStyle(color: Color(0xFF1D4E89), fontWeight: FontWeight.w700, fontSize: 16),
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
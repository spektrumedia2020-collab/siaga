import 'dart:io';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/ui_helpers.dart';

class SetoranFormDialog extends StatefulWidget {
  final String officerId;
  final int marketId;
  final DateTime initialDate;
  final bool filterByDate;

  const SetoranFormDialog({
    super.key,
    required this.officerId,
    required this.marketId,
    required this.initialDate,
    required this.filterByDate,
  });

  @override
  State<SetoranFormDialog> createState() => _SetoranFormDialogState();
}

class _SetoranFormDialogState extends State<SetoranFormDialog> {
  final _noteController = TextEditingController();
  final ImagePicker _picker = ImagePicker();
  XFile? _selectedImage;
  DateTime _selectedDate = DateTime.now();
  double _amount = 0;
  int _txCount = 0;
  bool _loading = false;
  bool _updatingRevenue = false;

  @override
  void initState() {
    super.initState();
    _selectedDate = widget.initialDate;
    _loadRevenue();
  }

  Future<void> _loadRevenue() async {
    setState(() => _updatingRevenue = true);
    try {
      final startOfDay = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day)
          .toUtc()
          .toIso8601String();
      final endOfDay = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day, 23, 59, 59)
          .toUtc()
          .toIso8601String();
      final txResponse = await Supabase.instance.client
          .from('transactions')
          .select('amount')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay);
      final transactions = txResponse as List;
      final total = transactions.fold(
          0.0, (sum, tx) => sum + ((tx['amount'] as num?)?.toDouble() ?? 0.0));
      if (mounted) {
        setState(() {
          _amount = total;
          _txCount = transactions.length;
          _updatingRevenue = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _updatingRevenue = false);
    }
  }

  Future<void> _pickImage() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  leading: const Icon(Icons.camera_alt),
                  title: const Text('Kamera'),
                  onTap: () => Navigator.of(ctx).pop(ImageSource.camera),
                ),
                ListTile(
                  leading: const Icon(Icons.photo_library),
                  title: const Text('Galeri'),
                  onTap: () => Navigator.of(ctx).pop(ImageSource.gallery),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (source == null) return;

    final image = await _picker.pickImage(
      source: source,
      imageQuality: 80,
      preferredCameraDevice: CameraDevice.rear,
    );

    if (image != null && mounted) {
      setState(() => _selectedImage = image);
    }
  }

  Future<void> _submit() async {
    setState(() => _loading = true);
    try {
      final client = Supabase.instance.client;
      String? imageUrl;

      if (_selectedImage != null) {
        final fileName =
            'setoran/${widget.officerId}_${DateTime.now().millisecondsSinceEpoch}.jpg';
        await client.storage
            .from('setoran-bukti')
            .upload(fileName, File(_selectedImage!.path), fileOptions: const FileOptions(
              contentType: 'image/jpeg',
              upsert: true,
            ));
        imageUrl = client.storage.from('setoran-bukti').getPublicUrl(fileName);
      }

      final startOfDay = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day)
          .toUtc()
          .toIso8601String();
      final endOfDay = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day, 23, 59, 59)
          .toUtc()
          .toIso8601String();
      final txResponse = await client
          .from('transactions')
          .select('amount')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay);
      final transactions = txResponse as List;
      final totalAmount = transactions.fold(
          0.0, (sum, tx) => sum + ((tx['amount'] as num?)?.toDouble() ?? 0.0));
      final txCount = transactions.length;

      await client.from('setoran').insert({
        'officer_id': widget.officerId,
        'market_id': widget.marketId,
        'total_amount': totalAmount,
        'transaction_count': txCount,
        'note': _noteController.text.isEmpty ? null : _noteController.text,
        'proof_image_url': imageUrl,
        'status': 'pending_treasurer',
      });

      if (mounted) {
        Navigator.of(context).pop(true);
        showSuccessSnackBar(context, 'Setoran berhasil dibuat!');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        showErrorSnackBar(context, 'Gagal membuat setoran: ${e.toString()}');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currency = NumberFormat.currency(locale: 'id', symbol: 'Rp ', decimalDigits: 0);
    final dateFormat = DateFormat('EEEE, dd MMMM yyyy', 'id');

    return StatefulBuilder(
      builder: (context, setLocalState) {
        return AlertDialog(
          title: const Text('Buat Setoran Baru'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _selectedDate,
                      firstDate: DateTime(2024),
                      lastDate: DateTime.now(),
                    );
                    if (picked != null && mounted) {
                      setLocalState(() => _selectedDate = picked);
                      _loadRevenue();
                    }
                  },
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.blue[50],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.blue[200]!),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.calendar_today, size: 16, color: Colors.blue[700]),
                        const SizedBox(width: 8),
                        Text(dateFormat.format(_selectedDate),
                            style: TextStyle(fontSize: 13, color: Colors.blue[900])),
                        const Spacer(),
                        Icon(Icons.edit_calendar, size: 16, color: Colors.blue[500]),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green[50],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Total Pendapatan',
                          style: TextStyle(fontSize: 12, color: Colors.green[800])),
                      const SizedBox(height: 4),
                      _updatingRevenue
                          ? const LinearProgressIndicator()
                          : Text(
                              currency.format(_amount),
                              style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.green[900]),
                            ),
                      const SizedBox(height: 4),
                      Text('$_txCount transaksi',
                          style: TextStyle(fontSize: 12, color: Colors.green[600])),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _noteController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Catatan (opsional)',
                    border: OutlineInputBorder(),
                    hintText: 'Tambahkan catatan untuk setoran...',
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Bukti Setoran (opsional)',
                    style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                if (_selectedImage != null)
                  LayoutBuilder(
                    builder: (context, constraints) {
                      const height = 120.0;
                      return Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.file(
                              File(_selectedImage!.path),
                              height: height,
                              width: constraints.maxWidth,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) {
                                return Container(
                                  height: height,
                                  width: double.infinity,
                                  color: Colors.grey[200],
                                  child: const Center(
                                    child: Text('Gagal memuat gambar'),
                                  ),
                                );
                              },
                            ),
                          ),
                          Positioned(
                            top: 4,
                            right: 4,
                            child: InkWell(
                              onTap: () => setLocalState(() => _selectedImage = null),
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                                child: const Icon(Icons.close, size: 16, color: Colors.white),
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  )
                else
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _pickImage,
                          icon: Icon(Icons.camera_alt, size: 18, color: Colors.grey[700]),
                          label: Text('Kamera', style: TextStyle(color: Colors.grey[700])),
                          style: OutlinedButton.styleFrom(side: BorderSide(color: Colors.grey[300]!)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _pickImage,
                          icon: Icon(Icons.photo_library, size: 18, color: Colors.grey[700]),
                          label: Text('Galeri', style: TextStyle(color: Colors.grey[700])),
                          style: OutlinedButton.styleFrom(side: BorderSide(color: Colors.grey[300]!)),
                        ),
                      ),
                    ],
                  ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: TextButton(
                        onPressed: _loading ? null : () => Navigator.of(context).pop(),
                        child: const Text('Batal'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _loading ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          foregroundColor: Colors.white,
                        ),
                        child: _loading
                            ? const SizedBox(width: 20, height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Setorkan'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
import 'package:flutter/material.dart';

/// Helper UI konsisten untuk seluruh aplikasi (audit item 2.18).
///
/// Contoh pemakaian:
/// ```dart
/// try {
///   await supabase.from('transactions').insert(...);
///   showSuccessSnackBar(context, 'Transaksi berhasil disimpan');
/// } catch (e) {
///   showErrorSnackBar(context, 'Gagal menyimpan transaksi: $e');
/// }
/// ```

/// Tampilkan SnackBar error (merah) dengan gaya floating konsisten.
void showErrorSnackBar(BuildContext context, String message) {
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      behavior: SnackBarBehavior.floating,
      backgroundColor: Theme.of(context).colorScheme.error,
    ),
  );
}

/// Tampilkan SnackBar sukses (hijau) dengan gaya floating konsisten.
void showSuccessSnackBar(BuildContext context, String message) {
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      behavior: SnackBarBehavior.floating,
      backgroundColor: Colors.green.shade700,
    ),
  );
}

/// Tampilkan SnackBar info (netral) dengan gaya floating konsisten.
void showInfoSnackBar(BuildContext context, String message) {
  if (!context.mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      behavior: SnackBarBehavior.floating,
    ),
  );
}
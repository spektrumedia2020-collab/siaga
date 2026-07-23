import 'package:supabase_flutter/supabase_flutter.dart';
import '../shared/models/stall.dart';

class StallRepository {
  final SupabaseClient _client;

  StallRepository(this._client);

  /// Fetch stall by code or ID
  Future<Stall?> getStall(String lapakId) async {
    try {
      Map<String, dynamic>? row;

      // Try stalls table with code
      final stallByCode = await _client
          .from('stalls')
          .select('id, owner_id, code, number')
          .eq('code', lapakId)
          .maybeSingle();

      if (stallByCode != null) {
        row = Map<String, dynamic>.from(stallByCode);
      } else {
        // Try numeric id match
        final idNumeric = int.tryParse(lapakId);
        if (idNumeric != null) {
          final stallById = await _client
              .from('stalls')
              .select('id, owner_id, code, number')
              .eq('id', idNumeric)
              .maybeSingle();
          if (stallById != null) {
            row = Map<String, dynamic>.from(stallById);
          }
        }
      }

      // Fallback to legacy 'lapak' table
      if (row == null) {
        final legacy = await _client
            .from('lapak')
            .select('id_lapak, id_pemilik, kode_lapak, nomor_lapak')
            .or('kode_lapak.eq.$lapakId,id_lapak.eq.$lapakId')
            .maybeSingle();
        if (legacy != null) {
          row = Map<String, dynamic>.from(legacy);
        }
      }

      if (row == null) return null;

      final stall = Stall.fromJson(row);
      
      // Fetch owner name
      final ownerName = await _getOwnerName(row['owner_id'] ?? row['id_pemilik']);
      if (ownerName != null) {
        return stall.copyWith(ownerName: ownerName);
      }

      return stall;
    } catch (e) {
      return null;
    }
  }

  /// Get owner name by owner ID
  Future<String?> _getOwnerName(dynamic ownerId) async {
    if (ownerId == null) return null;

    try {
      // Try modern stall_owners table
      final owner = await _client
          .from('stall_owners')
          .select('name')
          .eq('id', ownerId)
          .maybeSingle();
      
      if (owner != null && owner['name'] != null) {
        return owner['name'] as String;
      }

      // Try legacy pemilik_lapak table
      final legacyOwner = await _client
          .from('pemilik_lapak')
          .select('nama_pemilik')
          .eq('id_pemilik', ownerId)
          .maybeSingle();
      
      if (legacyOwner != null && legacyOwner['nama_pemilik'] != null) {
        return legacyOwner['nama_pemilik'] as String;
      }
    } catch (e) {
      // ignore errors
    }
    return null;
  }

  /// Fetch all stalls with optional limit
  Future<List<Stall>> getAllStalls({int? limit}) async {
    try {
      List<dynamic> response;
      if (limit != null) {
        response = await _client.from('stalls').select('id, owner_id, code, number').limit(limit);
      } else {
        response = await _client.from('stalls').select('id, owner_id, code, number');
      }
      
      return response
          .map((e) => Stall.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      return [];
    }
  }
}
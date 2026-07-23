import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Full page with Scaffold + AppBar for standalone route
class ShopPage extends ConsumerStatefulWidget {
  const ShopPage({super.key});

  @override
  ConsumerState<ShopPage> createState() => _ShopPageState();
}

class _ShopPageState extends ConsumerState<ShopPage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Daftar Lapak'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Theme.of(context).colorScheme.onPrimary,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/dashboard?tab=2'),
        ),
      ),
      body: const ShopPageBody(),
    );
  }
}

/// Body-only widget for use inside DashboardPage tabs (no Scaffold/AppBar)
class ShopPageBody extends StatefulWidget {
  const ShopPageBody({super.key});

  @override
  State<ShopPageBody> createState() => _ShopPageBodyState();
}

class _ShopPageBodyState extends State<ShopPageBody> {
  List<Map<String, dynamic>> stalls = [];
  List<Map<String, dynamic>> sectors = [];
  bool loading = true;
  String? errorMessage;
  int? officerMarketId;
  String marketName = '';
  int? selectedSectorId;
  DateTime _selectedDate = DateTime.now();

  List<Map<String, dynamic>> get _filteredStalls {
    if (selectedSectorId == null) return stalls;
    return stalls.where((s) => s['sector_id'] == selectedSectorId).toList();
  }
  
  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        setState(() { loading = false; errorMessage = 'User tidak terautentikasi'; });
        return;
      }

      final officerResponse = await Supabase.instance.client
          .from('users')
          .select('id_user, market_id, markets!users_market_id_fkey(name)')
          .eq('auth_uid', user.id)
          .maybeSingle();

      if (officerResponse != null) {
        officerMarketId = officerResponse['market_id'] as int?;
        marketName = officerResponse['markets']?['name']?.toString() ?? 'Pasar tidak diketahui';
      }

      if (officerMarketId != null) {
        final client = Supabase.instance.client;
        List<Map<String, dynamic>> loadedSectors = [];
        try {
          final officerUserId = officerResponse?['id_user'] as int?;
          Future<List<dynamic>> sectorsResponse;
          if (officerUserId != null) {
            sectorsResponse = client
                .from('market_sectors')
                .select('id, name')
                .eq('officer_id', officerUserId)
                .eq('market_id', officerMarketId!)
                .order('name', ascending: true);
          } else {
            sectorsResponse = client
                .from('market_sectors')
                .select('id, name')
                .eq('market_id', officerMarketId!)
                .order('name', ascending: true);
          }
          final rawSectors = await sectorsResponse as List;
          if (rawSectors.isNotEmpty) {
            loadedSectors = rawSectors.map((e) => Map<String, dynamic>.from(e as Map)).toList();
          }
        } catch (e) { /* ignore */ }

        final stallsResponse = await client
            .from('stalls')
            .select('''
              id, code, number, status, sector_id, owner_id,
              stall_owners (id, name, nik, phone)
            ''')
            .eq('market_id', officerMarketId!)
            .order('number', ascending: true);
        final rawStalls = stallsResponse as List;

        if (mounted) {
          setState(() {
            stalls = rawStalls.map((e) => Map<String, dynamic>.from(e as Map)).toList();
            if (loadedSectors.isNotEmpty) {
              sectors = loadedSectors;
            } else {
              final uniqueSectorIds = <int>{};
              for (final stall in stalls) {
                final sectorId = stall['sector_id'];
                if (sectorId != null) uniqueSectorIds.add(sectorId as int);
              }
              sectors = uniqueSectorIds.map((id) => {'id': id, 'name': 'Sektor $id'}).toList();
            }
            if (sectors.isNotEmpty && selectedSectorId == null) {
              selectedSectorId = sectors.first['id'] as int;
            }
            loading = false;
          });
        }
      } else {
        setState(() { loading = false; errorMessage = 'Petugas tidak memiliki penugasan pasar'; });
      }
    } catch (e) {
      if (mounted) setState(() { loading = false; errorMessage = 'Gagal memuat data: $e'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    if (errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 72, color: Colors.grey[400]),
              const SizedBox(height: 16),
              Text(errorMessage!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: () { setState(() => loading = true); _loadData(); }, child: const Text('Coba Lagi')),
            ],
          ),
        ),
      );
    }
    if (stalls.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.storefront, size: 72, color: Colors.grey[400]),
              const SizedBox(height: 16),
              const Text('Tidak ada lapak di penugasan Anda', textAlign: TextAlign.center),
              if (marketName.isNotEmpty) const SizedBox(height: 8),
              if (marketName.isNotEmpty) Text('Pasar: $marketName', style: TextStyle(color: Colors.grey[600])),
            ],
          ),
        ),
      );
    }
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: Text('Pasar $marketName (${_filteredStalls.length} lapak)',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.grey[800])),
              ),
              InkWell(
                onTap: () async {
                  final rootContext = Navigator.of(context, rootNavigator: true).context;
                  final picked = await showDatePicker(
                    context: rootContext, initialDate: _selectedDate,
                    firstDate: DateTime(2024), lastDate: DateTime.now(),
                  );
                  if (picked != null && mounted) setState(() => _selectedDate = picked);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.orange[50], borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.orange[200]!),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.calendar_today, size: 16, color: Colors.orange[700]),
                      const SizedBox(width: 6),
                      Text('${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}',
                          style: TextStyle(fontSize: 13, color: Colors.orange[700], fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          color: Theme.of(context).colorScheme.surface,
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              children: sectors.map((sector) {
                final isSelected = selectedSectorId == sector['id'];
                return _SectorTab(
                  label: sector['name']?.toString() ?? '-',
                  selected: isSelected,
                  onTap: () => setState(() => selectedSectorId = sector['id'] as int),
                );
              }).toList(),
            ),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadData,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.all(12),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      for (int index = 0; index < _filteredStalls.length; index++)
                        _buildStallCard(context, _filteredStalls[index]),
                    ]),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStallCard(BuildContext context, Map<String, dynamic> stall) {
    final code = stall['code'] ?? stall['id'].toString();
    final number = stall['number'] ?? '-';
    final status = stall['status'] ?? 'AKTIF';
    final isActive = status == 'AKTIF';
    final ownerData = stall['stall_owners'] as Map<String, dynamic>?;
    final ownerName = ownerData?['name'] ?? 'Belum ada pemilik';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.orange[300]!, width: 1),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.12), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: InkWell(
        onTap: () => context.go('/lapak/$code'),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(width: 12, height: 12, decoration: BoxDecoration(color: isActive ? Colors.green : Colors.grey, shape: BoxShape.circle)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Text(code, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87)),
                      const SizedBox(width: 8),
                      Text('#$number', style: TextStyle(fontSize: 14, color: Colors.grey[500])),
                    ]),
                    const SizedBox(height: 4),
                    Text(ownerName, style: TextStyle(fontSize: 14, color: Colors.grey[700])),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey[400]),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectorTab extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _SectorTab({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        margin: const EdgeInsets.only(right: 8),
        decoration: BoxDecoration(
          color: selected ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: selected ? Theme.of(context).colorScheme.primary : Colors.grey.shade300),
        ),
        child: Text(label,
            style: TextStyle(
                color: selected ? Theme.of(context).colorScheme.onPrimary : Colors.grey[700],
                fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                fontSize: 13)),
      ),
    );
  }
}
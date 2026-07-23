import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme/app_theme.dart';

class LapakPage extends ConsumerStatefulWidget {
  const LapakPage({super.key, required this.lapakId});
  final String lapakId;

  @override
  ConsumerState<LapakPage> createState() => _LapakPageState();
}

class _LapakPageState extends ConsumerState<LapakPage> {
  String? ownerName;
  bool loadingOwner = true;
  Map<String, dynamic>? stallData;
  List<Map<String, dynamic>> retributionTypes = [];
  List<Map<String, dynamic>> transactionHistory = [];
  int _selectedTabIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadLapakData();
  }

  Future<void> _loadLapakData() async {
    try {
      final supabase = Supabase.instance.client;
      Map<String, dynamic>? row;

      // Try by code first
      final stallByCode = await supabase
          .from('stalls')
          .select('id, code, number, status, sector_id, owner_id, market_id')
          .eq('code', widget.lapakId)
          .maybeSingle();
      
      if (stallByCode != null) {
        row = Map<String, dynamic>.from(stallByCode as Map);
      } else {
        // Try by ID
        final idNumeric = int.tryParse(widget.lapakId);
        if (idNumeric != null) {
          final stallById = await supabase
              .from('stalls')
              .select('id, code, number, status, sector_id, owner_id, market_id')
              .eq('id', idNumeric)
              .maybeSingle();
          if (stallById != null) {
            row = Map<String, dynamic>.from(stallById as Map);
          }
        }
      }

      String? ownerNIK;
      String? ownerPhone;
      String? ownerAddress;
      String? sectorName;
      
      if (row != null) {
        final ownerId = row['owner_id'];
        final sectorId = row['sector_id'];
        
        // Get owner details
        if (ownerId != null) {
          try {
            print('DEBUG: Loading owner for ownerId=$ownerId');
            final owner = await supabase
                .from('stall_owners')
                .select('name, nik, phone, address')
                .eq('id', ownerId)
                .maybeSingle();
            print('DEBUG: Owner result=$owner');
            if (owner != null) {
              ownerName = owner['name']?.toString();
              ownerNIK = owner['nik']?.toString();
              ownerPhone = owner['phone']?.toString();
              ownerAddress = owner['address']?.toString();
              print('DEBUG: ownerName=$ownerName, ownerNIK=$ownerNIK');
            }
          } catch (e) {
            print('Error loading owner: $e');
          }
        } else {
          print('DEBUG: ownerId is null');
        }
        
        // Get sector name
        if (sectorId != null) {
          try {
            print('DEBUG: Loading sector for sectorId=$sectorId');
            final sector = await supabase
                .from('market_sectors')
                .select('name')
                .eq('id', sectorId)
                .maybeSingle();
            print('DEBUG: Sector result=$sector');
            sectorName = sector?['name']?.toString();
          } catch (e) {
            print('Error loading sector: $e');
          }
        } else {
          print('DEBUG: sectorId is null');
        }
        
        stallData = row;
      }

      // Load retribution types with rates
      try {
        final typesResult = await supabase
            .from('retribution_types')
            .select('id, code, name, category, unit, notes')
            .order('name');
        
        final List<dynamic> typesRaw = typesResult as List;
        List<Map<String, dynamic>> loadedTypes = typesRaw
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        
        // Load rates for this stall
        if (row != null && row['market_id'] != null) {
          final marketId = row['market_id'] as int;
          final stallId = row['id'] as int?;
          
          final ratesResult = await supabase
              .from('retribution_rates')
              .select('types_id, amount, stall_id, market_id');
          
          final List<dynamic> ratesList = ratesResult as List;
          
          // Build rate map <typeId, amount>
          final Map<int, double> rateMap = {};
          for (final rate in ratesList) {
            final rateTypeId = rate['types_id'] as int;
            final rateStallId = rate['stall_id'];
            final rateMarketId = rate['market_id'];
            final rateAmount = (rate['amount'] as num).toDouble();
            
            // For this stall or market-wide
            final applies = rateStallId == stallId || (rateStallId == null && rateMarketId == marketId);
            if (applies) {
              if (!rateMap.containsKey(rateTypeId) || rateStallId == stallId) {
                rateMap[rateTypeId] = rateAmount;
              }
            }
          }
          
          // Attach rate to type and filter to only assigned types
          loadedTypes = loadedTypes.where((type) {
            final typeId = type['id'] as int;
            if (rateMap.containsKey(typeId)) {
              type['rate'] = rateMap[typeId];
              return true;
            }
            return false;
          }).toList();
        }
        
        if (mounted) {
          setState(() {
            this.ownerName = ownerName;
            _ownerNIK = ownerNIK;
            _ownerPhone = ownerPhone;
            _ownerAddress = ownerAddress;
            _sectorName = sectorName;
            loadingOwner = false;
            retributionTypes = loadedTypes;
          });
        }
      } catch (e) {
        print('Error loading types/rates: $e');
        if (mounted) {
          setState(() => loadingOwner = false);
        }
      }
      
      // Load transaction history
      try {
        final transactionsResult = await supabase
            .from('transactions')
            .select('id, amount, payment_method, status, created_at')
            .eq('stall_id', row!['id'])
            .order('created_at', ascending: false)
            .limit(20);
        
        if (mounted) {
          setState(() {
            transactionHistory = (transactionsResult as List)
                .map((e) => Map<String, dynamic>.from(e as Map))
                .toList();
          });
        }
      } catch (e) {
        print('Error loading transactions: $e');
      }
    } catch (e) {
      print('Error in _loadLapakData: $e');
      if (mounted) {
        setState(() => loadingOwner = false);
      }
    }
  }
  
  String? _ownerNIK;
  String? _ownerPhone;
  String? _ownerAddress;
  String? _sectorName;

  void _selectRetributionType(String typeId) {
    final stallId = (stallData?['id'] ?? widget.lapakId).toString();
    context.go('/transaction/$stallId/$typeId');
  }

  @override
  Widget build(BuildContext context) {
    final stallCode = stallData?['code'] ?? widget.lapakId;
    final stallNumber = stallData?['number'] ?? '-';
    final stallStatus = stallData?['status'] ?? 'AKTIF';
    final isActive = stallStatus == 'AKTIF';
    final sectorName = _sectorName ?? 'Belum ditentukan';
    final ownerName = this.ownerName ?? 'Belum ada pemilik';

    return DefaultTabController(
      length: 3,
      initialIndex: _selectedTabIndex,
      child: Scaffold(
        backgroundColor: Colors.grey[50],
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.go('/dashboard', extra: 2),
          ),
          title: const Text(
            'Siaga',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
          actions: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isActive ? Colors.green.withOpacity(0.1) : Colors.red.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isActive ? Colors.green.withOpacity(0.3) : Colors.red.withOpacity(0.3),
                ),
              ),
              child: Text(
                stallStatus,
                style: TextStyle(
                  fontSize: 13,
                  color: isActive ? Colors.green[700] : Colors.red[700],
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: Column(
          children: [
            // Stall header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.grey.withOpacity(0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          stallCode,
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[800],
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'No. $stallNumber',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: isActive ? Colors.green[50] : Colors.red[50],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isActive ? Colors.green[200]! : Colors.red[200]!,
                      ),
                    ),
                    child: Text(
                      isActive ? 'Aktif' : 'Tidak Aktif',
                      style: TextStyle(
                        fontSize: 12,
                        color: isActive ? Colors.green[700] : Colors.red[700],
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Tab bar
            Container(
              color: Colors.white,
              child: TabBar(
                tabs: const [
                  Tab(text: 'Retribusi'),
                  Tab(text: 'Informasi'),
                  Tab(text: 'Riwayat'),
                ],
                labelColor: Colors.orange[700],
                unselectedLabelColor: Colors.grey[600],
                indicatorColor: Colors.orange[700],
                indicatorWeight: 3,
              ),
            ),
            // Tab content
            Expanded(
              child: TabBarView(
                children: [
                  _buildRetributionTab(),
                  _buildInfoTab(),
                  _buildHistoryTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRetributionTab() {
    if (retributionTypes.isEmpty) {
      return Center(
        child: Column(
          children: [
            Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              'Belum ada jenis retribusi',
              style: TextStyle(color: Colors.grey[600], fontSize: 16),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: retributionTypes.length,
      itemBuilder: (context, index) {
        final type = retributionTypes[index];
        final typeName = type['name'] ?? 'Tidak diketahui';
        final typeCode = type['code'] ?? '-';
        final amount = (type['rate'] as num?)?.toDouble() ?? 0;
        
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: Colors.grey.withOpacity(0.05),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
            child: InkWell(
              onTap: () {
                final typeId = type['id'];
                if (typeId != null) {
                  _selectRetributionType(typeId.toString());
                }
              },
              borderRadius: BorderRadius.circular(14),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.orange[300]!, Colors.orange[500]!],
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.payments_outlined,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          typeName,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          typeCode,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[500],
                          ),
                        ),
                        const SizedBox(height: 6),
                        if (amount > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Colors.green[400]!, Colors.green[600]!],
                              ),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              'Rp ${amount.toStringAsFixed(0)}',
                              style: const TextStyle(
                                fontSize: 14,
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          )
                        else
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: Colors.grey[200],
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              'Belum ada tarif',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  Icon(
                    Icons.arrow_forward_ios,
                    size: 16,
                    color: Colors.orange[700],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildInfoTab() {
    final sectorName = _sectorName ?? 'Belum ditentukan';
    final ownerName = this.ownerName ?? 'Belum ada pemilik';
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stall Info Card
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withOpacity(0.1),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: (stallData?['status'] == 'AKTIF') ? Colors.green : Colors.grey,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              stallData?['code'] ?? widget.lapakId,
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.black87,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'No. ${stallData?['number'] ?? '-'}',
                              style: TextStyle(
                                fontSize: 17,
                                color: Colors.grey[600],
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Divider(height: 1, color: Colors.grey[200]),
                  const SizedBox(height: 20),
                  _buildInfoRow(
                    icon: Icons.location_on_outlined,
                    iconColor: Colors.blue,
                    label: 'Sektor',
                    value: sectorName,
                    valueColor: Colors.blue[700],
                  ),
                  const SizedBox(height: 16),
                  if (ownerName != 'Belum ada pemilik') ...[
                    _buildInfoRow(
                      icon: Icons.person_outline,
                      iconColor: Colors.purple,
                      label: 'Pemilik',
                      value: ownerName,
                    ),
                    const SizedBox(height: 12),
                    if (_ownerPhone != null && _ownerPhone!.isNotEmpty)
                      _buildInfoRow(
                        icon: Icons.phone_outlined,
                        iconColor: Colors.green,
                        label: 'Telepon',
                        value: _ownerPhone!,
                      ),
                    const SizedBox(height: 12),
                    if (_ownerNIK != null && _ownerNIK!.isNotEmpty)
                      _buildInfoRow(
                        icon: Icons.badge_outlined,
                        iconColor: Colors.orange,
                        label: 'NIK',
                        value: _ownerNIK!,
                      ),
                    const SizedBox(height: 12),
                    if (_ownerAddress != null && _ownerAddress!.isNotEmpty)
                      _buildInfoRow(
                        icon: Icons.home_outlined,
                        iconColor: Colors.teal,
                        label: 'Alamat',
                        value: _ownerAddress!,
                      ),
                  ] else ...[
                    _buildInfoRow(
                      icon: Icons.person_outline,
                      iconColor: Colors.grey,
                      label: 'Pemilik',
                      value: 'Belum ada pemilik',
                      valueColor: Colors.grey[500],
                    ),
                  ]
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryTab() {
    if (transactionHistory.isEmpty) {
      return Center(
        child: Column(
          children: [
            Icon(Icons.history_outlined, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              'Belum ada riwayat transaksi',
              style: TextStyle(color: Colors.grey[600], fontSize: 16),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: transactionHistory.length,
      itemBuilder: (context, index) {
        final transaction = transactionHistory[index];
        final amount = transaction['amount'] ?? 0;
        final paymentMethod = transaction['payment_method'] ?? '-';
        final status = transaction['status'] ?? 'pending';
        final date = transaction['created_at'] != null 
            ? DateTime.parse(transaction['created_at'].toString()).toLocal()
            : DateTime.now();
        
        Color statusColor = Colors.grey;
        String statusText = 'Pending';
        if (status == 'paid' || status == 'success') {
          statusColor = Colors.green;
          statusText = 'Berhasil';
        } else if (status == 'failed') {
          statusColor = Colors.red;
          statusText = 'Gagal';
        }
        
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: Colors.grey.withOpacity(0.05),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.purple[300]!, Colors.purple[500]!],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.receipt_long,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Rp ${(amount as num).toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 4),
                      Text(
                        '$paymentMethod • ${date.day}/${date.month}/${date.year}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: statusColor.withOpacity(0.3)),
                ),
                child: Text(
                  statusText,
                  style: TextStyle(
                    fontSize: 12,
                    color: statusColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
    Color? valueColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: iconColor),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 15,
                    color: valueColor ?? Colors.black87,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
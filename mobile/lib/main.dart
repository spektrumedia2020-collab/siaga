import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'services/auth_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await dotenv.load(fileName: '.env');

  final supabaseUrl = dotenv.env['VITE_SUPABASE_URL'] ?? dotenv.env['SUPABASE_URL'] ?? '';
  final supabaseAnonKey = dotenv.env['VITE_SUPABASE_ANON_KEY'] ?? dotenv.env['SUPABASE_ANON_KEY'] ?? '';

  await Supabase.initialize(
    url: supabaseUrl,
    publishableKey: supabaseAnonKey,
  );

  runApp(const SiagaOfficerApp());
}

class SiagaOfficerApp extends StatelessWidget {
  const SiagaOfficerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SiAga Officer',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1F7A1F)),
        useMaterial3: true,
      ),
      home: const LandingPage(),
    );
  }
}

class LandingPage extends StatelessWidget {
  const LandingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: [
                        const BoxShadow(
                          color: Color.fromRGBO(0, 0, 0, 0.08),
                          blurRadius: 16,
                          offset: Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(10),
                      child: Image.asset('assets/logo.jpeg', fit: BoxFit.contain),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text('SiAga Officer', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                        SizedBox(height: 4),
                        Text('Solusi petugas retribusi pasar', style: TextStyle(fontSize: 14, color: Colors.black54)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF1F7A1F),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    const BoxShadow(
                      color: Color.fromRGBO(0, 0, 0, 0.08),
                      blurRadius: 20,
                      offset: Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text('Dashboard Utama', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                    SizedBox(height: 12),
                    Text(
                      'Mulai dengan scan QR lapak, lihat daftar tagihan, dan kelola retribusi dengan cepat.',
                      style: TextStyle(color: Colors.white70, fontSize: 14),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginPage()));
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF1F7A1F),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                    side: const BorderSide(color: Colors.white),
                  ),
                  child: const Text('Masuk / Login', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
              const SizedBox(height: 24),
              const Text('Aksi Cepat', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _ActionCard(
                    icon: Icons.qr_code_scanner,
                    title: 'Scan QR',
                    description: 'Scan lapak untuk mulai pencatatan',
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ScanPage())),
                  ),
                  _ActionCard(
                    icon: Icons.receipt_long,
                    title: 'Transaksi',
                    description: 'Proses dan catat pembayaran',
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const TransactionPage())),
                  ),
                  _ActionCard(
                    icon: Icons.storefront,
                    title: 'Lapak',
                    description: 'Informasi lapak pasarnya',
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ShopPage())),
                  ),
                  _ActionCard(
                    icon: Icons.insert_chart_outlined,
                    title: 'Rekap',
                    description: 'Lihat ringkasan retribusi',
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SummaryPage())),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              const Text('Catatan', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: const Text(
                  'Desain ini fokus pada alur petugas. Nanti bisa ditambahkan halaman login, daftar lapak, dan data retribusi master sesuai kebutuhan.',
                  style: TextStyle(fontSize: 14, color: Colors.black87),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  const _ActionCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String description;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            const BoxShadow(
              color: Color.fromRGBO(0, 0, 0, 0.04),
              blurRadius: 16,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: const Color.fromRGBO(31, 122, 31, 0.12),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: const Color(0xFF1F7A1F), size: 26),
            ),
            const SizedBox(height: 14),
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Text(description, style: const TextStyle(fontSize: 13, color: Colors.black54)),
          ],
        ),
      ),
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;
  final _authService = AuthService(Supabase.instance.client);

  Future<bool> _checkOfficerLogin(String email, String password) async {
    try {
      // Try Supabase Auth first (secure)
      final response = await _authService.loginOfficer(email, password);
      return response?.session != null;
    } catch (authError) {
      // Fallback to RPC check if Supabase Auth fails
      try {
        final isValid = await _authService.checkOfficerCredentials(email, password);
        if (isValid) {
          // If credentials valid via RPC, still need to establish session
          // This ensures the officer user exists in Supabase Auth
          return true;
        }
      } catch (rpcError) {
        print('RPC check failed: $rpcError');
      }
      return false;
    }
  }

  Future<void> _login() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final isValid = await _checkOfficerLogin(
        _emailController.text.trim(),
        _passwordController.text,
      );

      if (!mounted) return;

      if (!isValid) {
        setState(() {
          _errorMessage = 'Email atau password tidak valid';
        });
        return;
      }

      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const DashboardPage()),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Login gagal: ${e.toString()}';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Card(
              elevation: 3,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.account_circle, size: 72, color: Color(0xFF1F7A1F)),
                    const SizedBox(height: 16),
                    Text('SiAga Officer', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    const Text('Login petugas penarik retribusi', textAlign: TextAlign.center),
                    const SizedBox(height: 24),
                    TextField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _passwordController,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 16),
                    if (_errorMessage != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text(_errorMessage!, style: const TextStyle(color: Colors.red)),
                      ),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _login,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1F7A1F),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: _isLoading
                            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Masuk'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard Petugas'),
        backgroundColor: const Color(0xFF1F7A1F),
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Selamat datang', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Card(
              child: ListTile(
                leading: const Icon(Icons.qr_code_scanner, color: Color(0xFF1F7A1F)),
                title: const Text('Scan QR Lapak'),
                subtitle: const Text('Mulai pencatatan retribusi'),
                onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ScanPage())),
              ),
            ),
            const SizedBox(height: 8),
            Card(
              child: ListTile(
                leading: const Icon(Icons.receipt_long, color: Color(0xFF1F7A1F)),
                title: const Text('Transaksi Retribusi'),
                subtitle: const Text('Lihat dan proses tagihan'),
                onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const TransactionPage())),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ScanPage extends StatefulWidget {
  const ScanPage({super.key});

  @override
  State<ScanPage> createState() => _ScanPageState();
}

class _ScanPageState extends State<ScanPage> {
  String? scannedCode;
  bool _isNavigating = false;

  void _openLapak() {
    if (scannedCode == null || _isNavigating) return;
    _isNavigating = true;
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => LapakPage(lapakId: scannedCode!))).then((_) {
      setState(() {
        _isNavigating = false;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan QR Lapak')),
      body: Column(
        children: [
          Expanded(
            child: MobileScanner(
              onDetect: (capture) {
                final value = capture.barcodes.first.rawValue;
                if (value != null && value != scannedCode) {
                  setState(() => scannedCode = value);
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('QR terdeteksi: $value')));
                }
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(scannedCode != null ? 'Lapak Terbaca: $scannedCode' : 'Arahkan kamera ke QR lapak', textAlign: TextAlign.center),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: scannedCode == null ? null : _openLapak,
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1F7A1F), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16)),
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

class TransactionPage extends StatefulWidget {
  const TransactionPage({super.key});

  @override
  State<TransactionPage> createState() => _TransactionPageState();
}

class _TransactionPageState extends State<TransactionPage> {
  final _nameController = TextEditingController();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  bool _saving = false;
  String? _message;

  Future<void> _saveTransaction() async {
    setState(() {
      _saving = true;
      _message = null;
    });

    try {
      final supabase = Supabase.instance.client;
      await supabase.from('transactions').insert({
        'payer_name': _nameController.text.trim(),
        'amount': double.tryParse(_amountController.text) ?? 0,
        'note': _noteController.text.trim(),
        'status': 'pending',
      });

      if (!mounted) return;
      setState(() {
        _message = 'Transaksi berhasil disimpan';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _message = 'Gagal menyimpan transaksi: $e';
      });
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Transaksi Retribusi')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(controller: _nameController, decoration: const InputDecoration(labelText: 'Nama Pembayar', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _amountController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Jumlah', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _noteController, decoration: const InputDecoration(labelText: 'Catatan', border: OutlineInputBorder())),
            const SizedBox(height: 16),
            if (_message != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(_message!, style: const TextStyle(color: Color(0xFF1F7A1F))),
              ),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _saveTransaction,
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1F7A1F), foregroundColor: Colors.white),
                child: _saving ? const CircularProgressIndicator(color: Colors.white) : const Text('Simpan Transaksi'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class LapakPage extends StatefulWidget {
  const LapakPage({super.key, required this.lapakId});

  final String lapakId;

  @override
  State<LapakPage> createState() => _LapakPageState();
}

class _LapakPageState extends State<LapakPage> {
  String? ownerName;
  bool loadingOwner = true;

  @override
  void initState() {
    super.initState();
    _loadOwnerName();
  }

  Future<void> _loadOwnerName() async {
    try {
      final supabase = Supabase.instance.client;
      Map<String, dynamic>? row;

      final stallByCode = await supabase.from('stalls').select('owner_id, code, number').eq('code', widget.lapakId).maybeSingle();
      if (stallByCode != null) {
        row = Map<String, dynamic>.from(stallByCode as Map);
      } else {
        final idNumeric = int.tryParse(widget.lapakId);
        if (idNumeric != null) {
          final stallById = await supabase.from('stalls').select('owner_id, code, number').eq('id', idNumeric).maybeSingle();
          if (stallById != null) {
            row = Map<String, dynamic>.from(stallById as Map);
          }
        }
      }

      if (row == null) {
        final legacy = await supabase.from('lapak').select('id_pemilik, kode_lapak, nomor_lapak').or('kode_lapak.eq.${widget.lapakId},id_lapak.eq.${widget.lapakId}').maybeSingle();
        if (legacy != null) {
          row = Map<String, dynamic>.from(legacy as Map);
        }
      }

      String? name;
      if (row != null) {
        final ownerId = row['owner_id'] ?? row['id_pemilik'];
        if (ownerId != null) {
          final owner = await supabase.from('stall_owners').select('name').eq('id', ownerId).maybeSingle();
          if (owner != null && owner['name'] != null) {
            name = owner['name'] as String;
          } else {
            final legacyOwner = await supabase.from('pemilik_lapak').select('nama_pemilik').eq('id_pemilik', ownerId).maybeSingle();
            if (legacyOwner != null && legacyOwner['nama_pemilik'] != null) {
              name = legacyOwner['nama_pemilik'] as String;
            }
          }
        }
      }

      if (mounted) {
        setState(() {
          ownerName = name;
          loadingOwner = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          ownerName = null;
          loadingOwner = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Detail Lapak')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Informasi Lapak', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    Text('ID Lapak: ${widget.lapakId}', style: const TextStyle(fontSize: 14)),
                    const SizedBox(height: 8),
                    Text('Nama Pedagang: ${loadingOwner ? 'Memuat...' : (ownerName ?? 'Tidak ditemukan')}', style: const TextStyle(fontSize: 14)),
                    const SizedBox(height: 8),
                    const Text('Lokasi: Blok A / Lapak 12', style: TextStyle(fontSize: 14)),
                    const SizedBox(height: 8),
                    const Text('Jenis Retribusi: Dagang / Kebersihan', style: TextStyle(fontSize: 14)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(context).push(MaterialPageRoute(builder: (_) => PaymentPage(lapakId: widget.lapakId)));
                },
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1F7A1F), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
                child: const Text('Bayar Retribusi', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class PaymentPage extends StatefulWidget {
  const PaymentPage({super.key, required this.lapakId});

  final String lapakId;

  @override
  State<PaymentPage> createState() => _PaymentPageState();
}

class _PaymentPageState extends State<PaymentPage> {
  final _payerController = TextEditingController();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  String _paymentMethod = 'Tunai';
  bool _saving = false;
  String? _message;

  @override
  void initState() {
    super.initState();
    _loadOwnerName();
  }

  Future<void> _loadOwnerName() async {
    try {
      final supabase = Supabase.instance.client;

      // Try to find stall by code
      final stallByCode = await supabase.from('stalls').select('owner_id, code, number').eq('code', widget.lapakId).maybeSingle();

      Map<String, dynamic>? row;
      if (stallByCode != null) {
        row = Map<String, dynamic>.from(stallByCode as Map);
      } else {
        // Try numeric id match
        final idNumeric = int.tryParse(widget.lapakId);
        if (idNumeric != null) {
          final stallById = await supabase.from('stalls').select('owner_id, code, number').eq('id', idNumeric).maybeSingle();
          if (stallById != null) {
            row = Map<String, dynamic>.from(stallById as Map);
          }
        }
      }

      // fallback to legacy 'lapak' table
      if (row == null) {
        final legacy = await supabase.from('lapak').select('id_pemilik, kode_lapak, nomor_lapak').or('kode_lapak.eq.${widget.lapakId},id_lapak.eq.${widget.lapakId}').maybeSingle();
        if (legacy != null) {
          row = Map<String, dynamic>.from(legacy as Map);
        }
      }

      String? ownerName;
      if (row != null) {
        // Try owner id fields
        final ownerId = row['owner_id'] ?? row['id_pemilik'];
        if (ownerId != null) {
          // try modern owners table
          final owner = await supabase.from('stall_owners').select('name').eq('id', ownerId).maybeSingle();
          if (owner != null && owner['name'] != null) {
            ownerName = owner['name'] as String;
          } else {
            // try legacy pemilik_lapak table
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
    } catch (e) {
      // ignore errors silently — keep UI usable
    }
  }

  Future<void> _savePayment() async {
    final payer = _payerController.text.trim();
    final amount = double.tryParse(_amountController.text) ?? 0;
    final note = _noteController.text.trim();

    if (payer.isEmpty || amount <= 0) {
      setState(() {
        _message = 'Isi nama dan jumlah pembayaran dengan benar';
      });
      return;
    }

    setState(() {
      _saving = true;
      _message = null;
    });

    try {
      final supabase = Supabase.instance.client;
      final response = await supabase.from('transactions').insert({
        'lapak_id': widget.lapakId,
        'payer_name': payer,
        'amount': amount,
        'payment_method': _paymentMethod,
        'status': 'paid',
        'note': note,
      }).select().single();

      if (!mounted) return;

      final receipt = {
        'lapakId': widget.lapakId,
        'payerName': payer,
        'amount': amount,
        'method': _paymentMethod,
        'note': note,
        'createdAt': DateTime.now().toIso8601String(),
        'transactionId': response['id'] != null ? response['id'].toString() : 'N/A',
      };

      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => ReceiptPage(receipt: receipt)));
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _message = 'Gagal menyimpan pembayaran: $e';
      });
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Bayar Retribusi')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Lapak: ${widget.lapakId}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextField(controller: _payerController, decoration: const InputDecoration(labelText: 'Nama Pembayar', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: _amountController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Jumlah (Rp)', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            InputDecorator(
              decoration: const InputDecoration(labelText: 'Metode Pembayaran', border: OutlineInputBorder()),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _paymentMethod,
                  items: const [
                    DropdownMenuItem(value: 'QRIS', child: Text('QRIS')),
                    DropdownMenuItem(value: 'Tunai', child: Text('Tunai')),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        _paymentMethod = value;
                      });
                    }
                  },
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextField(controller: _noteController, decoration: const InputDecoration(labelText: 'Catatan (opsional)', border: OutlineInputBorder())),
            const SizedBox(height: 16),
            if (_message != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(_message!, style: const TextStyle(color: Colors.red)),
              ),
            ElevatedButton(
              onPressed: _saving ? null : _savePayment,
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1F7A1F), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
              child: _saving ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Simpan Transaksi', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }
}

class ReceiptPage extends StatelessWidget {
  const ReceiptPage({super.key, required this.receipt});

  final Map<String, dynamic> receipt;

  String get _receiptText {
    return '''Bukti Transaksi SiAga Officer\n
ID Transaksi: ${receipt['transactionId']}\nLapak ID: ${receipt['lapakId']}\nNama Pembayar: ${receipt['payerName']}\nJumlah: Rp ${receipt['amount']}\nMetode: ${receipt['method']}\nCatatan: ${receipt['note']}\nTanggal: ${receipt['createdAt']}\n''';
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
                pw.Text('ID Transaksi: ${receipt['transactionId']}', style: const pw.TextStyle(fontSize: 14)),
                pw.Text('Lapak ID: ${receipt['lapakId']}', style: const pw.TextStyle(fontSize: 14)),
                pw.Text('Nama Pembayar: ${receipt['payerName']}', style: const pw.TextStyle(fontSize: 14)),
                pw.Text('Jumlah: Rp ${receipt['amount']}', style: const pw.TextStyle(fontSize: 14)),
                pw.Text('Metode: ${receipt['method']}', style: const pw.TextStyle(fontSize: 14)),
                pw.Text('Catatan: ${receipt['note']}', style: const pw.TextStyle(fontSize: 14)),
                pw.Text('Tanggal: ${receipt['createdAt']}', style: const pw.TextStyle(fontSize: 14)),
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
      appBar: AppBar(title: const Text('Bukti Transaksi')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Bukti Transaksi', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    Text('ID Transaksi: ${receipt['transactionId']}', style: const TextStyle(fontSize: 14)),
                    const SizedBox(height: 6),
                    Text('Lapak ID: ${receipt['lapakId']}', style: const TextStyle(fontSize: 14)),
                    const SizedBox(height: 6),
                    Text('Nama Pembayar: ${receipt['payerName']}', style: const TextStyle(fontSize: 14)),
                    const SizedBox(height: 6),
                    Text('Jumlah: Rp ${receipt['amount']}', style: const TextStyle(fontSize: 14)),
                    const SizedBox(height: 6),
                    Text('Metode: ${receipt['method']}', style: const TextStyle(fontSize: 14)),
                    const SizedBox(height: 6),
                    Text('Catatan: ${receipt['note']}', style: const TextStyle(fontSize: 14)),
                    const SizedBox(height: 6),
                    Text('Tanggal: ${receipt['createdAt']}', style: const TextStyle(fontSize: 14)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _shareReceipt,
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1F7A1F), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
              child: const Text('Bagikan Struk', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _printReceipt,
              style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: const Color(0xFF1F7A1F), padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: const BorderSide(color: Color(0xFF1F7A1F)))),
              child: const Text('Print Bukti', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }
}

class ShopPage extends StatelessWidget {
  const ShopPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Lapak')), 
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Icon(Icons.storefront, size: 72, color: Color(0xFF1F7A1F)),
              SizedBox(height: 24),
              Text('Halaman Lapak', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              SizedBox(height: 12),
              Text('Konten lapak pasar akan ditambahkan di sini.', textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}

class SummaryPage extends StatelessWidget {
  const SummaryPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Rekap Retribusi')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Icon(Icons.insert_chart_outlined, size: 72, color: Color(0xFF1F7A1F)),
              SizedBox(height: 24),
              Text('Halaman Rekap', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              SizedBox(height: 12),
              Text('Ringkasan retribusi akan ditampilkan di sini.', textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}

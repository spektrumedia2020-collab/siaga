import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'config/router.dart';
import 'core/theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment variables from .env file
  await dotenv.load(fileName: '.env');

  // Supabase config from environment variables
  final supabaseUrl = dotenv.env['SUPABASE_URL'] ?? '';
  final supabaseAnonKey = dotenv.env['SUPABASE_ANON_KEY'] ?? '';

  if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
    throw Exception('SUPABASE_URL dan SUPABASE_ANON_KEY harus diisi di file .env');
  }

  await Supabase.initialize(
    url: supabaseUrl,
    publishableKey: supabaseAnonKey,
  );

  await initializeDateFormatting('id', null);

  // Set system navigation bar theme to match app theme
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    systemNavigationBarColor: Color(0xFFF5F5F5),
    systemNavigationBarIconBrightness: Brightness.dark,
  ));
  
  runApp(const ProviderScope(child: SiagaOfficerApp()));
}

class SiagaOfficerApp extends StatelessWidget {
  const SiagaOfficerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'SiAga Officer',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      themeMode: ThemeMode.system,
      builder: (context, child) {
        // Update system navigation bar color based on theme
        final brightness = Theme.of(context).brightness;
        SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle(
          systemNavigationBarColor: brightness == Brightness.dark ? Color(0xFF1B1B1B) : Color(0xFFF5F5F5),
          systemNavigationBarIconBrightness: brightness == Brightness.dark ? Brightness.light : Brightness.dark,
        ));
        return child!;
      },
      routerConfig: router,
    );
  }
}
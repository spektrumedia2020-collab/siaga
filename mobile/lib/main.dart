import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'config/router.dart';
import 'core/theme/app_theme.dart';

// Hardcoded Supabase config for development
const String _supabaseUrl = 'https://hlvsbmxpkqvniemunygh.supabase.co';
const String _supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsdnNibXhwa3F2bmllbXVueWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5ODY4ODUsImV4cCI6MjA5OTU2Mjg4NX0.ZlCbywivmbGMpeF8tRnkW0OipTSB_mKMUa_auz7vfrk';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: _supabaseUrl,
    publishableKey: _supabaseAnonKey,
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
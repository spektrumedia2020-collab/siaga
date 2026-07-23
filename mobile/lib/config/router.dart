import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Imports for all pages
import '../features/splash/splash_page.dart';
import '../features/landing/landing_page.dart';
import '../features/auth/login_page.dart';
import '../features/dashboard/dashboard_page.dart';
import '../features/scan/scan_page.dart';
import '../features/transaction/transaction_page.dart';
import '../features/lapak/lapak_page.dart';
import '../features/payment/payment_page.dart';
import '../features/receipt/receipt_page.dart';
import '../features/shop/shop_page.dart';
import '../features/summary/summary_page.dart';
import '../features/attendance/attendance_page.dart';
import '../features/history/history_page.dart';
import '../features/reconciliation/reconciliation_page.dart';
import '../features/setoran/setoran_page.dart';

// Route paths
class RoutePaths {
  static const String splash = '/';
  static const String landing = '/landing';
  static const String login = '/login';
  static const String dashboard = '/dashboard';
  static const String scan = '/scan';
  static const String transaction = '/transaction';
  static const String lapak = '/lapak';
  static const String payment = '/payment';
  static const String receipt = '/receipt';
  static const String shop = '/shop';
  static const String summary = '/summary';
  static const String attendance = '/attendance';
  static const String history = '/history';
  static const String settlement = '/settlement';
  static const String setoran = '/setoran';
  static const String profile = '/profile';
}

// Auth provider
final authProvider = StateProvider<bool>((ref) => false);

// Router notifier for auth state changes
class RouterNotifier extends ChangeNotifier {
  // Will be connected to actual auth state
}

final GoRouter router = GoRouter(
  initialLocation: RoutePaths.splash,
  refreshListenable: RouterNotifier(),
  routes: [
    // Splash Screen - first page shown
    GoRoute(
      path: RoutePaths.splash,
      builder: (context, state) => const SplashPage(),
    ),
    // Landing / Info page
    GoRoute(
      path: RoutePaths.landing,
      builder: (context, state) => const LandingPage(),
    ),
    // Auth
    GoRoute(
      path: RoutePaths.login,
      builder: (context, state) => const LoginPage(),
    ),
    // Main app pages (protected)
    GoRoute(
      path: RoutePaths.dashboard,
      builder: (context, state) => DashboardPage(initialTab: state.extra as int? ?? 0),
    ),
    GoRoute(
      path: RoutePaths.scan,
      builder: (context, state) => const ScanPage(),
    ),
    GoRoute(
      path: '${RoutePaths.transaction}/:lapakId/:typeId',
      builder: (context, state) => TransactionPage(
        lapakId: state.pathParameters['lapakId']!,
        typeId: state.pathParameters['typeId']!,
      ),
    ),
    GoRoute(
      path: '${RoutePaths.lapak}/:lapakId',
      builder: (context, state) => LapakPage(
        lapakId: state.pathParameters['lapakId']!,
      ),
    ),
    GoRoute(
      path: '${RoutePaths.payment}/:lapakId',
      builder: (context, state) => PaymentPage(
        lapakId: state.pathParameters['lapakId']!,
      ),
    ),
    GoRoute(
      path: RoutePaths.receipt,
      builder: (context, state) => ReceiptPage(
        receipt: state.extra as Map<String, dynamic>,
      ),
    ),
    GoRoute(
      path: RoutePaths.shop,
      builder: (context, state) => const ShopPage(),
    ),
    GoRoute(
      path: RoutePaths.summary,
      builder: (context, state) => const SummaryPage(),
    ),
    GoRoute(
      path: RoutePaths.attendance,
      builder: (context, state) => const AttendancePage(),
    ),
    GoRoute(
      path: RoutePaths.history,
      builder: (context, state) => const HistoryPage(),
    ),
    GoRoute(
      path: RoutePaths.profile,
      builder: (context, state) => const ProfilePage(),
    ),
    GoRoute(
      path: RoutePaths.settlement,
      builder: (context, state) => const ReconciliationPage(),
    ),
    GoRoute(
      path: RoutePaths.setoran,
      builder: (context, state) => const SetoranPage(),
    ),
  ],
);

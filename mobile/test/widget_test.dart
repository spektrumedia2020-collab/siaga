import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:siaga_officer/features/auth/login_page.dart';

void main() {
  testWidgets('login page shows app title', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: LoginPage()),
      ),
    );

    expect(find.text('SiAga Officer'), findsOneWidget);
  });
}

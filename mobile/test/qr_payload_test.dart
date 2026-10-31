import 'package:flutter_test/flutter_test.dart';
import 'package:siaga_officer/core/qr_payload.dart';

void main() {
  test('bare stall code is returned as-is', () {
    expect(extractStallCode('NGD-0150'), 'NGD-0150');
  });

  test('owner URL with code parameter', () {
    expect(
      extractStallCode('https://siaga.app/lapak/7c3b09f92e3f4147a2801e78f00bc7d6?code=NGD-0150'),
      'NGD-0150',
    );
  });

  test('legacy path uses the last segment', () {
    expect(extractStallCode('https://siaga.app/lapak/39/NGD-0150'), 'NGD-0150');
  });

  test('token-only URL cannot resolve a code', () {
    expect(extractStallCode('https://siaga.app/lapak/7c3b09f92e3f4147a2801e78f00bc7d6'), isNull);
  });
}

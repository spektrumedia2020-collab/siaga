import 'package:flutter_test/flutter_test.dart';
import 'package:siaga_officer/shared/models/outbox_entry.dart';

void main() {
  test('outbox entry round-trips through a database row map', () {
    final occurredAt = DateTime(2026, 11, 2, 9, 15);
    final entry = OutboxEntry(
      clientUuid: '9f7c1a1e-0000-4000-8000-000000000001',
      kind: OutboxEntry.kindDailyPayment,
      marketId: 39,
      stallId: 8364,
      rateId: 12345,
      typesId: 104,
      officerId: 36,
      amount: 5000,
      paymentMethod: 'Tunai',
      payerName: 'M. Saleh',
      note: 'Jenis: Sewa Tempat Harian',
      occurredAt: occurredAt,
      stallCode: 'NGD-0001',
      status: 'pending',
      attempts: 0,
      createdAt: occurredAt,
    );

    final restored = OutboxEntry.fromMap(entry.toMap());

    expect(restored.clientUuid, entry.clientUuid);
    expect(restored.kind, OutboxEntry.kindDailyPayment);
    expect(restored.marketId, 39);
    expect(restored.stallId, 8364);
    expect(restored.rateId, 12345);
    expect(restored.typesId, 104);
    expect(restored.officerId, 36);
    expect(restored.amount, 5000);
    expect(restored.payerName, 'M. Saleh');
    expect(restored.occurredAt, occurredAt);
    expect(restored.status, 'pending');
    expect(restored.isPending, isTrue);
    expect(restored.isFailed, isFalse);
    expect(restored.nextAttemptAt, isNull);
    expect(restored.serverId, isNull);
  });

  test('missing optional fields default safely', () {
    final entry = OutboxEntry.fromMap({
      'client_uuid': 'abc',
      'kind': OutboxEntry.kindDailyPayment,
      'amount': null,
      'occurred_at': null,
      'created_at': null,
    });

    expect(entry.amount, 0);
    expect(entry.status, 'pending');
    expect(entry.attempts, 0);
    expect(entry.marketId, isNull);
    expect(entry.occurredAt, isNotNull);
  });

  test('failed entries are reported as failed', () {
    final entry = OutboxEntry.fromMap({
      'client_uuid': 'abc',
      'kind': OutboxEntry.kindDailyPayment,
      'amount': 1000,
      'occurred_at': '2026-11-02T09:15:00.000',
      'created_at': '2026-11-02T09:15:00.000',
      'status': 'failed',
      'last_error': 'new row violates row-level security policy',
    });

    expect(entry.isFailed, isTrue);
    expect(entry.isPending, isFalse);
    expect(entry.lastError, contains('row-level security'));
  });
}

/// Extracts a stall code from a scanned QR value.
///
/// The printed QR now encodes the owner page URL with a `code` query
/// parameter (for example `https://siaga.app/lapak/<token>?code=NGD-0150`).
/// Older labels may still contain a bare code or the legacy
/// `/lapak/<marketId>/<code>` path.
String? extractStallCode(String raw) {
  final trimmed = raw.trim();
  if (trimmed.isEmpty) return null;

  final uri = Uri.tryParse(trimmed);
  if (uri != null && (uri.scheme == 'http' || uri.scheme == 'https')) {
    final queryCode = uri.queryParameters['code'];
    if (queryCode != null && queryCode.trim().isNotEmpty) {
      return queryCode.trim();
    }

    final segments = uri.pathSegments;
    if (segments.length >= 3 && segments.first == 'lapak') {
      final last = Uri.decodeComponent(segments.last).trim();
      if (last.isNotEmpty) return last;
    }

    return null;
  }

  return trimmed;
}

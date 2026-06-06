import { DiagnosticSummaryScreen } from '@/src/modules/diagnostics/screens/DiagnosticSummaryScreen';
import { ConsentStackGuard } from '@/src/modules/legal/ConsentStackGuard';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';

export default function DiagnosticoResumenRoute() {
  return (
    <ConsentStackGuard blockedHref={LEGAL_ACCEPT_HREF}>
      <DiagnosticSummaryScreen />
    </ConsentStackGuard>
  );
}

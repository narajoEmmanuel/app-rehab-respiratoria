import { DiagnosticExamScreen } from '@/src/modules/diagnostics/screens/DiagnosticExamScreen';
import { ConsentStackGuard } from '@/src/modules/legal/ConsentStackGuard';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';

export default function DiagnosticoRoute() {
  return (
    <ConsentStackGuard blockedHref={LEGAL_ACCEPT_HREF}>
      <DiagnosticExamScreen />
    </ConsentStackGuard>
  );
}

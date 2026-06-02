import { CSTAT_DOWN, CSTAT_OPERATIONAL, CSTAT_SLOWDOWN } from '@monitor-sefaz/catalog';
import { ServiceState } from '../domain/types.js';

/** Mapeia o `cStat` (ou falha de transporte) para um `ServiceState` normalizado. */
export class StatusClassifier {
  public classify(cStat: number | null, transportFailed: boolean): ServiceState {
    if (transportFailed || cStat === null) {
      return ServiceState.Error;
    }
    switch (cStat) {
      case CSTAT_OPERATIONAL:
        return ServiceState.Operational;
      case CSTAT_SLOWDOWN:
        return ServiceState.SlowDown;
      case CSTAT_DOWN:
        return ServiceState.Down;
      default:
        // cStat desconhecido (rejeições, erros de schema): tratamos como erro.
        return ServiceState.Error;
    }
  }
}

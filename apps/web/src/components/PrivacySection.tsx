import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { useT } from '../i18n';
import { Icon } from './Icon';
import type { AppConfig, TelemetryConfig } from '../types';

interface Props {
  cfg: AppConfig;
  setCfg: Dispatch<SetStateAction<AppConfig>>;
}

function generateInstallationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Older webviews / test runners that lack crypto.randomUUID. The output
  // is opaque and non-PII; we only need uniqueness across installs.
  return `inst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function PrivacySection({ cfg, setCfg }: Props): JSX.Element {
  const t = useT();
  const telemetry: TelemetryConfig = cfg.telemetry ?? {};
  // `installationId === undefined` means the user has never seen the consent
  // surface. After the first decision it's either a uuid (opted in) or
  // `null` (declined). That gates the consent card vs the toggle row.
  const hasMadeConsentDecision = cfg.installationId !== undefined;

  function patchTelemetry(patch: Partial<TelemetryConfig>): void {
    setCfg((c) => ({ ...c, telemetry: { ...(c.telemetry ?? {}), ...patch } }));
  }

  function shareUsage(): void {
    setCfg((c) => ({
      ...c,
      installationId: generateInstallationId(),
      telemetry: { metrics: true, content: true, artifactManifest: false },
    }));
  }

  function declineUsage(): void {
    setCfg((c) => ({
      ...c,
      installationId: null,
      telemetry: { metrics: false, content: false, artifactManifest: false },
    }));
  }

  return (
    <section className="settings-section">
      <div className="section-head">
        <div>
          <h3>{t('settings.privacy')}</h3>
          <p className="hint">{t('settings.privacyHint')}</p>
        </div>
      </div>

      {!hasMadeConsentDecision ? (
        <ConsentCard onShare={shareUsage} onDecline={declineUsage} />
      ) : (
        <>
          <div className="settings-privacy-toggles">
            <ToggleRow
              label={t('settings.privacyMetrics')}
              hint={t('settings.privacyMetricsHint')}
              checked={telemetry.metrics === true}
              onChange={(v) => patchTelemetry({ metrics: v })}
            />
            <ToggleRow
              label={t('settings.privacyContent')}
              hint={t('settings.privacyContentHint')}
              checked={telemetry.content === true}
              onChange={(v) => patchTelemetry({ content: v })}
            />
            <ToggleRow
              label={t('settings.privacyArtifacts')}
              hint={t('settings.privacyArtifactsHint')}
              checked={telemetry.artifactManifest === true}
              onChange={(v) => patchTelemetry({ artifactManifest: v })}
            />
          </div>

          <div className="settings-subsection">
            <div className="section-head">
              <div>
                <h4>{t('settings.privacyInstallationId')}</h4>
                <p className="hint">{t('settings.privacyDataDeletionHint')}</p>
              </div>
            </div>
            <div className="settings-field">
              <input
                type="text"
                readOnly
                value={cfg.installationId ?? t('settings.privacyOptedOut')}
                aria-label={t('settings.privacyInstallationId')}
              />
            </div>
            <button
              type="button"
              className="ghost"
              onClick={declineUsage}
              style={{ alignSelf: 'flex-start' }}
            >
              <Icon name="refresh" size={13} />
              <span style={{ marginLeft: 6 }}>{t('settings.privacyDataDeletion')}</span>
            </button>
          </div>
        </>
      )}
    </section>
  );
}

interface ToggleRowProps {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

// Reuses .toggle-row (label + hint + iOS-style switch) — same control
// NewProjectPanel uses for "speaker notes" / "animations" toggles, so the
// Privacy panel reads as native to the rest of the app.
function ToggleRow({ label, hint, checked, onChange }: ToggleRowProps): JSX.Element {
  return (
    <button
      type="button"
      className={`toggle-row${checked ? ' on' : ''}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <div className="toggle-row-text">
        <span className="toggle-row-label">{label}</span>
        <span className="toggle-row-hint">{hint}</span>
      </div>
      <span className="toggle-row-switch" aria-hidden />
    </button>
  );
}

interface ConsentProps {
  onShare: () => void;
  onDecline: () => void;
}

function ConsentCard({ onShare, onDecline }: ConsentProps): JSX.Element {
  const t = useT();
  return (
    <div className="settings-subsection">
      <div className="section-head">
        <div>
          <h4>{t('settings.privacyConsentKicker')}</h4>
          <p className="hint">{t('settings.privacyConsentLead')}</p>
        </div>
      </div>

      <dl className="settings-privacy-disclosure">
        <div>
          <dt>{t('settings.privacyMetrics')}</dt>
          <dd>{t('settings.privacyMetricsHint')}</dd>
        </div>
        <div>
          <dt>{t('settings.privacyContent')}</dt>
          <dd>{t('settings.privacyContentHint')}</dd>
        </div>
      </dl>

      <p className="hint">{t('settings.privacyConsentFooter')}</p>

      {/* Two-column seg-control gives both buttons identical visual weight,
          which is what GDPR/EDPB asks for ("equal prominence" between
          accept and reject). The accept side carries the active highlight
          to mark it as the affirmative action without making the reject
          side smaller or dimmer. */}
      <div
        className="seg-control"
        role="group"
        aria-label={t('settings.privacyConsentKicker')}
        style={{ ['--seg-cols' as string]: 2 } as CSSProperties}
      >
        <button type="button" className="seg-btn active" onClick={onShare}>
          <span className="seg-title">{t('settings.privacyConsentShare')}</span>
        </button>
        <button type="button" className="seg-btn" onClick={onDecline}>
          <span className="seg-title">{t('settings.privacyConsentDecline')}</span>
        </button>
      </div>
    </div>
  );
}

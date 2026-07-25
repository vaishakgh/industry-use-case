import { DEFAULT_SYSTEM_CONFIG } from './defaults';
import { SYSTEM_CONFIG_ENV_VARS, SystemConfigValidationError, loadSystemConfig } from './loader';

describe('loadSystemConfig', () => {
  it('applies default values when no environment variables are set', () => {
    const config = loadSystemConfig({});
    expect(config).toEqual(DEFAULT_SYSTEM_CONFIG);
  });

  it('applies default values when environment variables are set to empty strings', () => {
    const env = Object.fromEntries(Object.values(SYSTEM_CONFIG_ENV_VARS).map((name) => [name, '']));
    const config = loadSystemConfig(env);
    expect(config).toEqual(DEFAULT_SYSTEM_CONFIG);
  });

  it('overrides scalar defaults with explicit environment values', () => {
    const config = loadSystemConfig({
      [SYSTEM_CONFIG_ENV_VARS.transcriptionConfidenceThreshold]: '0.9',
      [SYSTEM_CONFIG_ENV_VARS.maxVoiceRetries]: '5',
      [SYSTEM_CONFIG_ENV_VARS.maxClarifyingAttempts]: '4',
      [SYSTEM_CONFIG_ENV_VARS.sessionTimeoutMinutes]: '20',
      [SYSTEM_CONFIG_ENV_VARS.stageRetryMaxAttempts]: '5',
      [SYSTEM_CONFIG_ENV_VARS.stageRetryBackoffSeconds]: '10',
    });

    expect(config.transcriptionConfidenceThreshold).toBe(0.9);
    expect(config.maxVoiceRetries).toBe(5);
    expect(config.maxClarifyingAttempts).toBe(4);
    expect(config.sessionTimeoutMinutes).toBe(20);
    expect(config.stageRetryMaxAttempts).toBe(5);
    expect(config.stageRetryBackoffSeconds).toBe(10);
  });

  it('overrides list defaults with comma-separated environment values', () => {
    const config = loadSystemConfig({
      [SYSTEM_CONFIG_ENV_VARS.supportedImageFormats]: 'JPEG, WEBP',
      [SYSTEM_CONFIG_ENV_VARS.supportedDocumentFormats]: 'PDF,TXT',
    });

    expect(config.supportedImageFormats).toEqual(['JPEG', 'WEBP']);
    expect(config.supportedDocumentFormats).toEqual(['PDF', 'TXT']);
  });

  it('overrides the auto-approval threshold with explicit environment values', () => {
    const config = loadSystemConfig({
      [SYSTEM_CONFIG_ENV_VARS.autoApprovalMaxSeverityRating]: 'Medium',
      [SYSTEM_CONFIG_ENV_VARS.autoApprovalMaxEstimatedRepairCost]: '5000',
    });

    expect(config.autoApprovalThreshold).toEqual({
      maxSeverityRating: 'Medium',
      maxEstimatedRepairCost: 5000,
    });
  });

  describe('sessionTimeoutMinutes range validation (Requirement 9.6: default 15, range 5-30)', () => {
    it.each([5, 15, 30])('accepts the boundary/default value %d', (minutes) => {
      const config = loadSystemConfig({
        [SYSTEM_CONFIG_ENV_VARS.sessionTimeoutMinutes]: String(minutes),
      });
      expect(config.sessionTimeoutMinutes).toBe(minutes);
    });

    it.each([4, 31, 0, -5])('rejects an out-of-range value %d', (minutes) => {
      expect(() =>
        loadSystemConfig({
          [SYSTEM_CONFIG_ENV_VARS.sessionTimeoutMinutes]: String(minutes),
        }),
      ).toThrow(SystemConfigValidationError);
    });
  });

  describe('range/type validation for other configured values', () => {
    it('rejects a non-numeric threshold value', () => {
      expect(() =>
        loadSystemConfig({
          [SYSTEM_CONFIG_ENV_VARS.fieldConfidenceThreshold]: 'not-a-number',
        }),
      ).toThrow(SystemConfigValidationError);
    });

    it('rejects a confidence threshold outside [0, 1]', () => {
      expect(() =>
        loadSystemConfig({
          [SYSTEM_CONFIG_ENV_VARS.transcriptionConfidenceThreshold]: '1.5',
        }),
      ).toThrow(SystemConfigValidationError);

      expect(() =>
        loadSystemConfig({
          [SYSTEM_CONFIG_ENV_VARS.damageAssessmentConfidenceThreshold]: '-0.1',
        }),
      ).toThrow(SystemConfigValidationError);
    });

    it('rejects a non-integer attempt count', () => {
      expect(() =>
        loadSystemConfig({
          [SYSTEM_CONFIG_ENV_VARS.maxClarifyingAttempts]: '2.5',
        }),
      ).toThrow(SystemConfigValidationError);
    });

    it('rejects a non-positive maximum size/count value', () => {
      expect(() =>
        loadSystemConfig({
          [SYSTEM_CONFIG_ENV_VARS.maxPhotosPerClaim]: '0',
        }),
      ).toThrow(SystemConfigValidationError);

      expect(() =>
        loadSystemConfig({
          [SYSTEM_CONFIG_ENV_VARS.maxPhotoFileSizeBytes]: '-1',
        }),
      ).toThrow(SystemConfigValidationError);
    });

    it('rejects an empty supported-format list', () => {
      expect(() =>
        loadSystemConfig({
          [SYSTEM_CONFIG_ENV_VARS.supportedImageFormats]: '',
        }),
      ).not.toThrow(); // empty string falls back to default, not an empty explicit list

      expect(() =>
        loadSystemConfig({
          [SYSTEM_CONFIG_ENV_VARS.supportedImageFormats]: ' , ,',
        }),
      ).toThrow(SystemConfigValidationError);
    });

    it('rejects an invalid severity rating for the auto-approval threshold', () => {
      expect(() =>
        loadSystemConfig({
          [SYSTEM_CONFIG_ENV_VARS.autoApprovalMaxSeverityRating]: 'Extreme',
        }),
      ).toThrow(SystemConfigValidationError);
    });
  });
});

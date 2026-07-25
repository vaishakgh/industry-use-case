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

describe('documented default values (design.md "Configuration values referenced above" / Requirement 9.6)', () => {
  // These assert literal values (independent of the DEFAULT_SYSTEM_CONFIG import used
  // in the "applies default values" test above) so a regression that changes a literal
  // in defaults.ts without updating the documentation is caught explicitly per field.
  it('matches the literal default for every SystemConfig field when no env vars are set', () => {
    const config = loadSystemConfig({});

    expect(config.transcriptionConfidenceThreshold).toBe(0.75);
    expect(config.maxVoiceRetries).toBe(3);
    expect(config.maxConfirmAttempts).toBe(3);
    expect(config.fieldConfidenceThreshold).toBe(0.75);
    // Requirement 2.3/2.6, called out explicitly in design.md.
    expect(config.maxClarifyingAttempts).toBe(3);
    expect(config.maxPhotosPerClaim).toBe(10);
    expect(config.supportedImageFormats).toEqual(['JPEG', 'PNG', 'HEIC']);
    expect(config.maxPhotoFileSizeBytes).toBe(10 * 1024 * 1024);
    expect(config.maxPhotoResubmissions).toBe(2);
    expect(config.damageAssessmentConfidenceThreshold).toBe(0.6);
    expect(config.autoApprovalThreshold).toEqual({
      maxSeverityRating: 'Low',
      maxEstimatedRepairCost: 2000,
    });
    expect(config.fraudFrequencyThreshold).toBe(3);
    expect(config.fraudFrequencyWindowDays).toBe(365);
    // Requirement 7.2/7.3, matches the Step Functions Retry block called out in design.md.
    expect(config.stageRetryMaxAttempts).toBe(3);
    expect(config.stageRetryBackoffSeconds).toBe(5);
    expect(config.auditRetentionPeriodDays).toBe(2555);
    // Requirement 9.6: default 15, range 5-30, called out explicitly in design.md.
    expect(config.sessionTimeoutMinutes).toBe(15);
    expect(config.maxDisputeReasonLength).toBe(2000);
    expect(config.supportedDocumentFormats).toEqual(['PDF', 'JPEG', 'PNG']);
    expect(config.maxDocumentFileSizeBytes).toBe(10 * 1024 * 1024);
  });
});

describe('range validation for every range-validated numeric field (Requirement 9.6)', () => {
  const unitIntervalFields: ReadonlyArray<{ name: string; envVar: string }> = [
    { name: 'transcriptionConfidenceThreshold', envVar: SYSTEM_CONFIG_ENV_VARS.transcriptionConfidenceThreshold },
    { name: 'fieldConfidenceThreshold', envVar: SYSTEM_CONFIG_ENV_VARS.fieldConfidenceThreshold },
    {
      name: 'damageAssessmentConfidenceThreshold',
      envVar: SYSTEM_CONFIG_ENV_VARS.damageAssessmentConfidenceThreshold,
    },
  ];

  describe.each(unitIntervalFields)('$name (must be within [0, 1])', ({ name, envVar }) => {
    it.each([0, 1])('accepts the boundary value %d', (value) => {
      const config = loadSystemConfig({ [envVar]: String(value) });
      expect((config as unknown as Record<string, number>)[name]).toBe(value);
    });

    it.each([-0.01, 1.01])('rejects the out-of-range value %d', (value) => {
      expect(() => loadSystemConfig({ [envVar]: String(value) })).toThrow(SystemConfigValidationError);
    });
  });

  const nonNegativeIntegerFields: ReadonlyArray<{ name: string; envVar: string }> = [
    { name: 'maxVoiceRetries', envVar: SYSTEM_CONFIG_ENV_VARS.maxVoiceRetries },
    { name: 'maxConfirmAttempts', envVar: SYSTEM_CONFIG_ENV_VARS.maxConfirmAttempts },
    { name: 'maxClarifyingAttempts', envVar: SYSTEM_CONFIG_ENV_VARS.maxClarifyingAttempts },
    { name: 'maxPhotoResubmissions', envVar: SYSTEM_CONFIG_ENV_VARS.maxPhotoResubmissions },
    { name: 'fraudFrequencyThreshold', envVar: SYSTEM_CONFIG_ENV_VARS.fraudFrequencyThreshold },
    { name: 'stageRetryMaxAttempts', envVar: SYSTEM_CONFIG_ENV_VARS.stageRetryMaxAttempts },
  ];

  describe.each(nonNegativeIntegerFields)('$name (must be >= 0)', ({ name, envVar }) => {
    it('accepts the boundary value 0', () => {
      const config = loadSystemConfig({ [envVar]: '0' });
      expect((config as unknown as Record<string, number>)[name]).toBe(0);
    });

    it('rejects the out-of-range value -1', () => {
      expect(() => loadSystemConfig({ [envVar]: '-1' })).toThrow(SystemConfigValidationError);
    });
  });

  it('accepts the boundary value 0 for stageRetryBackoffSeconds (must be >= 0)', () => {
    const config = loadSystemConfig({ [SYSTEM_CONFIG_ENV_VARS.stageRetryBackoffSeconds]: '0' });
    expect(config.stageRetryBackoffSeconds).toBe(0);
  });

  it('rejects a negative stageRetryBackoffSeconds', () => {
    expect(() =>
      loadSystemConfig({ [SYSTEM_CONFIG_ENV_VARS.stageRetryBackoffSeconds]: '-1' }),
    ).toThrow(SystemConfigValidationError);
  });

  it('accepts the boundary value 0 for autoApprovalMaxEstimatedRepairCost (must be >= 0)', () => {
    const config = loadSystemConfig({ [SYSTEM_CONFIG_ENV_VARS.autoApprovalMaxEstimatedRepairCost]: '0' });
    expect(config.autoApprovalThreshold.maxEstimatedRepairCost).toBe(0);
  });

  it('rejects a negative autoApprovalMaxEstimatedRepairCost', () => {
    expect(() =>
      loadSystemConfig({ [SYSTEM_CONFIG_ENV_VARS.autoApprovalMaxEstimatedRepairCost]: '-1' }),
    ).toThrow(SystemConfigValidationError);
  });

  const positiveIntegerFields: ReadonlyArray<{ name: string; envVar: string }> = [
    { name: 'maxPhotosPerClaim', envVar: SYSTEM_CONFIG_ENV_VARS.maxPhotosPerClaim },
    { name: 'maxPhotoFileSizeBytes', envVar: SYSTEM_CONFIG_ENV_VARS.maxPhotoFileSizeBytes },
    { name: 'fraudFrequencyWindowDays', envVar: SYSTEM_CONFIG_ENV_VARS.fraudFrequencyWindowDays },
    { name: 'auditRetentionPeriodDays', envVar: SYSTEM_CONFIG_ENV_VARS.auditRetentionPeriodDays },
    { name: 'maxDisputeReasonLength', envVar: SYSTEM_CONFIG_ENV_VARS.maxDisputeReasonLength },
    { name: 'maxDocumentFileSizeBytes', envVar: SYSTEM_CONFIG_ENV_VARS.maxDocumentFileSizeBytes },
  ];

  describe.each(positiveIntegerFields)('$name (must be > 0)', ({ name, envVar }) => {
    it('accepts the boundary value 1', () => {
      const config = loadSystemConfig({ [envVar]: '1' });
      expect((config as unknown as Record<string, number>)[name]).toBe(1);
    });

    it('rejects the out-of-range value 0', () => {
      expect(() => loadSystemConfig({ [envVar]: '0' })).toThrow(SystemConfigValidationError);
    });
  });
});

import { describe, expect, it } from 'vitest'

import { validateMigrationTarget } from '../../server/db/migration-target'

describe('migration target guard', () => {
  it('accepts an explicitly named non-production branch', () => {
    expect(validateMigrationTarget('development', {})).toBe('development')
    expect(validateMigrationTarget('dev-products', {})).toBe('dev-products')
  })

  it.each([undefined, '', 'Development', '../production', 'a']) (
    'rejects an invalid branch label',
    (target) => {
      expect(() => validateMigrationTarget(target, {})).toThrow(
        'Specify the intended Neon branch',
      )
    },
  )

  it('requires a separate production confirmation', () => {
    expect(() => validateMigrationTarget('production', {})).toThrow(
      'Production migrations require explicit confirmation.',
    )
    expect(
      validateMigrationTarget('production', {
        ALLOW_PRODUCTION_MIGRATION: 'true',
      }),
    ).toBe('production')
  })
})

export function validateMigrationTarget(
  target: string | undefined,
  env: Readonly<Record<string, string | undefined>>,
): string {
  if (!target || !/^[a-z][a-z0-9-]{1,62}$/.test(target)) {
    throw new Error(
      'Specify the intended Neon branch: npm run db:migrate -- --target development',
    )
  }

  if (target === 'production' && env.ALLOW_PRODUCTION_MIGRATION !== 'true') {
    throw new Error('Production migrations require explicit confirmation.')
  }

  return target
}

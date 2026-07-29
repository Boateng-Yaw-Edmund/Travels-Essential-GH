import { defineConfig } from '@neon/config/v1'

export default defineConfig({
  auth: true,
  branch: (branch) => {
    if (branch.exists || branch.isDefault) {
      return {}
    }

    const costConsciousCompute = {
      postgres: {
        computeSettings: {
          autoscalingLimitMinCu: 0.25,
          autoscalingLimitMaxCu: 1,
        },
      },
    }

    if (branch.name === 'development') {
      return costConsciousCompute
    }

    return {
      ...costConsciousCompute,
      ttl: '7d',
    }
  },
})

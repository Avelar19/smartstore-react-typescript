import { Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core'
import type { Icon } from '@tabler/icons-react'

interface StatCardProps {
  label: string
  value: string
  icon: Icon
  hint?: string
}

export function StatCard({ label, value, icon: StatIcon, hint }: StatCardProps) {
  return (
    <Paper withBorder p="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {label}
          </Text>
          <Text fz={28} fw={800} lh={1.2}>
            {value}
          </Text>
          {hint && (
            <Text size="xs" c="dimmed">
              {hint}
            </Text>
          )}
        </Stack>
        <ThemeIcon variant="light" size={40}>
          <StatIcon size={22} stroke={1.6} aria-hidden />
        </ThemeIcon>
      </Group>
    </Paper>
  )
}

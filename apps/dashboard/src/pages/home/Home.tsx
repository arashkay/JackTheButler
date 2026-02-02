import { Bot, MessageSquare, Cpu, Plug } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components';
import { StatsBar } from '@/components/shared/StatsCard';
import { ActionItems } from '@/components/shared/ActionItems';
import { useSystemStatus } from '@/hooks/useSystemStatus';

export function HomePage() {
  const { providers, extensions, isLoading } = useSystemStatus();

  const stats = [
    {
      label: 'AI Provider',
      value: providers?.completion ?? 'None',
      icon: Bot,
      variant: providers?.completion ? 'success' : 'error',
    },
    {
      label: 'Embeddings',
      value: providers?.embedding ?? 'None',
      icon: Cpu,
      variant: providers?.embedding ? 'success' : 'error',
    },
    {
      label: 'Channels',
      value: extensions?.channel ?? 0,
      icon: MessageSquare,
      variant: (extensions?.channel ?? 0) > 0 ? 'success' : 'warning',
    },
    {
      label: 'Extensions',
      value: (extensions?.ai ?? 0) + (extensions?.channel ?? 0) + (extensions?.pms ?? 0) + (extensions?.tool ?? 0),
      icon: Plug,
      variant: 'default',
    },
  ] as const;

  return (
    <PageContainer>
      <PageHeader />

      <div className="space-y-6">
        {/* System Status */}
        {!isLoading && <StatsBar items={[...stats]} />}

        {/* Getting Started */}
        <ActionItems />
      </div>
    </PageContainer>
  );
}

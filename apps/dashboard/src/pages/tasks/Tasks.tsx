import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ListTodo } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { PageContainer, PageHeader, EmptyState } from '@/components';

type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
type TaskSource = 'manual' | 'auto' | 'automation';

interface Task {
  id: string;
  conversationId: string | null;
  source: TaskSource;
  type: string;
  department: string;
  roomNumber: string | null;
  description: string;
  priority: string;
  status: TaskStatus;
  assignedTo: string | null;
  assignedName?: string;
  dueAt: string | null;
  createdAt: string;
}

const statusFilters: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const sourceFilters: { value: TaskSource | 'all'; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'auto', label: 'Auto' },
  { value: 'manual', label: 'Manual' },
];

const sourceColors: Record<string, string> = {
  auto: 'bg-indigo-100 text-indigo-700',
  manual: 'bg-gray-100 text-gray-600',
  automation: 'bg-teal-100 text-teal-700',
};

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  standard: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export function TasksPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<TaskSource | 'all'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter, sourceFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      const queryString = params.toString();
      return api.get<{ tasks: Task[] }>(`/tasks${queryString ? `?${queryString}` : ''}`);
    },
    refetchInterval: 10000,
  });

  const claimMutation = useMutation({
    mutationFn: (taskId: string) => api.post(`/tasks/${taskId}/claim`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => api.post(`/tasks/${taskId}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const tasks = data?.tasks || [];

  return (
    <PageContainer>
      <PageHeader>
        <div className="flex gap-4">
          <div className="flex gap-1">
            {sourceFilters.map((s) => (
              <button
                key={s.value}
                onClick={() => setSourceFilter(s.value)}
                className={cn(
                  'px-3 py-1 text-sm rounded',
                  sourceFilter === s.value
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {statusFilters.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={cn(
                  'px-3 py-1 text-sm rounded',
                  statusFilter === s.value
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks found"
          description="Tasks will appear here when created by guests or staff"
        />
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Type</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Description</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Room</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Source</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Priority</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Assigned</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-3">
                    <span className="text-sm font-medium capitalize">{task.type.replace('_', ' ')}</span>
                    <div className="text-xs text-muted-foreground">{task.department}</div>
                  </td>
                  <td className="p-3 text-sm text-foreground max-w-xs truncate">
                    {task.description}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {task.roomNumber || '-'}
                  </td>
                  <td className="p-3">
                    <span className={cn('text-xs px-2 py-1 rounded', sourceColors[task.source])}>
                      {task.source === 'auto' ? 'Auto' : task.source === 'automation' ? 'Rule' : 'Manual'}
                    </span>
                    {task.conversationId && (
                      <a
                        href={`/conversations/${task.conversationId}`}
                        className="ml-2 text-xs text-primary hover:underline"
                        title="View conversation"
                      >
                        View
                      </a>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={cn('text-xs px-2 py-1 rounded capitalize', priorityColors[task.priority])}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={cn('text-xs px-2 py-1 rounded capitalize', statusColors[task.status])}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {task.assignedName || '-'}
                  </td>
                  <td className="p-3">
                    {task.status === 'pending' && (
                      <button
                        onClick={() => claimMutation.mutate(task.id)}
                        disabled={claimMutation.isPending}
                        className="text-sm text-primary hover:text-primary/80"
                      >
                        Claim
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button
                        onClick={() => completeMutation.mutate(task.id)}
                        disabled={completeMutation.isPending}
                        className="text-sm text-green-600 hover:text-green-800"
                      >
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PageContainer>
  );
}

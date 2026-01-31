import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ListTodo } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PageContainer, EmptyState } from '@/components';
import { DataTable, Column } from '@/components/DataTable';

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

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
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

  const columns: Column<Task>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (task) => (
        <div>
          <span className="text-sm font-medium capitalize">{task.type.replace('_', ' ')}</span>
          <div className="text-xs text-muted-foreground">{task.department}</div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      className: 'max-w-xs',
      render: (task) => (
        <span className="text-sm text-foreground truncate block">{task.description}</span>
      ),
    },
    {
      key: 'roomNumber',
      header: 'Room',
      render: (task) => (
        <span className="text-sm text-muted-foreground">{task.roomNumber || '-'}</span>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (task) => (
        <div className="flex items-center gap-2">
          <span className={cn('text-xs px-2 py-1 rounded', sourceColors[task.source])}>
            {task.source === 'auto' ? 'Auto' : task.source === 'automation' ? 'Rule' : 'Manual'}
          </span>
          {task.conversationId && (
            <a
              href={`/conversations/${task.conversationId}`}
              className="text-xs text-primary hover:underline"
              title="View conversation"
              onClick={(e) => e.stopPropagation()}
            >
              View
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (task) => (
        <span className={cn('text-xs px-2 py-1 rounded capitalize', priorityColors[task.priority])}>
          {task.priority}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (task) => (
        <span className={cn('text-xs px-2 py-1 rounded capitalize', statusColors[task.status])}>
          {task.status.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'assignedName',
      header: 'Assigned',
      render: (task) => (
        <span className="text-sm text-muted-foreground">{task.assignedName || '-'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (task) => (
        <div onClick={(e) => e.stopPropagation()}>
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
        </div>
      ),
    },
  ];

  const filters = (
    <div className="flex gap-1 flex-nowrap">
      {statusFilters.map((s) => (
        <button
          key={s.value}
          onClick={() => setStatusFilter(s.value)}
          className={cn(
            'px-3 py-1 text-sm rounded whitespace-nowrap',
            statusFilter === s.value
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );

  return (
    <PageContainer>
      <DataTable
        data={tasks}
        columns={columns}
        keyExtractor={(task) => task.id}
        filters={filters}
        loading={isLoading}
        emptyState={
          <EmptyState
            icon={ListTodo}
            title="No tasks found"
            description="Tasks will appear here when created by guests or staff"
          />
        }
      />
    </PageContainer>
  );
}

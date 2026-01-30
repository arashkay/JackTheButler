import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Calendar,
  LogIn,
  LogOut,
  Home,
  Users,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageContainer, SearchInput, EmptyState } from '@/components';

type ReservationStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  vipStatus: string | null;
  loyaltyTier: string | null;
}

interface Reservation {
  id: string;
  confirmationNumber: string;
  guestId: string;
  roomNumber: string | null;
  roomType: string;
  arrivalDate: string;
  departureDate: string;
  estimatedArrival: string | null;
  estimatedDeparture: string | null;
  status: ReservationStatus;
  adults: number;
  children: number;
  specialRequests: string[];
  notes: string[];
  source: string;
  createdAt: string;
  guest: Guest | null;
}

interface TodayStats {
  date: string;
  arrivals: { count: number; pending: number; checkedIn: number };
  departures: { count: number; checkedOut: number; late: number };
  inHouse: number;
  occupancyRate: number;
}

const statusFilters: { value: ReservationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'checked_out', label: 'Checked Out' },
  { value: 'cancelled', label: 'Cancelled' },
];

const statusColors: Record<ReservationStatus, string> = {
  confirmed: 'bg-blue-100 text-blue-700',
  checked_in: 'bg-green-100 text-green-700',
  checked_out: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-orange-100 text-orange-700',
};

function TodayCard({
  title,
  icon: Icon,
  value,
  subtitle,
  variant = 'default',
}: {
  title: string;
  icon: typeof Calendar;
  value: number;
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning';
}) {
  const variantStyles = {
    default: 'bg-muted/50',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-amber-50 border-amber-200',
  };

  return (
    <Card className={cn('border', variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            variant === 'success' ? 'bg-green-100' :
            variant === 'warning' ? 'bg-amber-100' : 'bg-muted'
          )}>
            <Icon className={cn(
              'w-5 h-5',
              variant === 'success' ? 'text-green-600' :
              variant === 'warning' ? 'text-amber-600' : 'text-muted-foreground'
            )} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReservationsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all');

  // Fetch today's stats
  const { data: todayData } = useQuery({
    queryKey: ['reservations', 'today'],
    queryFn: () => api.get<TodayStats>('/reservations/today'),
    refetchInterval: 30000,
  });

  // Fetch reservations list
  const { data, isLoading } = useQuery({
    queryKey: ['reservations', search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('limit', '50');
      const queryString = params.toString();
      return api.get<{ reservations: Reservation[]; total: number }>(
        `/reservations${queryString ? `?${queryString}` : ''}`
      );
    },
  });

  const reservations = data?.reservations || [];
  const today = todayData;

  return (
    <PageContainer>
      {/* Today's Dashboard */}
      {today && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <TodayCard
            title="Arrivals Today"
            icon={LogIn}
            value={today.arrivals.count}
            subtitle={`${today.arrivals.pending} pending`}
            variant="success"
          />
          <TodayCard
            title="Departures Today"
            icon={LogOut}
            value={today.departures.count}
            subtitle={today.departures.late > 0 ? `${today.departures.late} late` : undefined}
            variant="warning"
          />
          <TodayCard
            title="In-House"
            icon={Home}
            value={today.inHouse}
          />
          <TodayCard
            title="Occupancy"
            icon={Users}
            value={today.occupancyRate}
            subtitle="%"
          />
        </div>
      )}

      {/* Quick Links */}
      <div className="flex gap-2 mb-6">
        <Link
          to="/reservations/arrivals"
          className="text-sm px-3 py-1.5 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
        >
          View Arrivals
        </Link>
        <Link
          to="/reservations/departures"
          className="text-sm px-3 py-1.5 rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
        >
          View Departures
        </Link>
        <Link
          to="/reservations/in-house"
          className="text-sm px-3 py-1.5 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
        >
          In-House Guests
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="max-w-md flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by confirmation #, guest name, room..."
          />
        </div>
        <div className="flex gap-1">
          {statusFilters.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
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

      {/* Reservations List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : reservations.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No reservations found"
          description={search ? 'Try a different search term' : 'Reservations will appear here'}
        />
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Confirmation</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Guest</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Room</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Arrival</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Departure</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 text-sm font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-3">
                    <span className="text-sm font-mono font-medium">
                      {reservation.confirmationNumber}
                    </span>
                  </td>
                  <td className="p-3">
                    {reservation.guest ? (
                      <div>
                        <Link
                          to={`/guests/${reservation.guestId}`}
                          className="text-sm font-medium hover:text-primary"
                        >
                          {reservation.guest.firstName} {reservation.guest.lastName}
                        </Link>
                        {reservation.guest.vipStatus && (
                          <Badge variant="warning" className="ml-2 text-xs">
                            VIP
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unknown guest</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="text-sm">
                      {reservation.roomNumber || '-'}
                      <span className="text-muted-foreground ml-1">
                        ({reservation.roomType})
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-sm">
                    {new Date(reservation.arrivalDate).toLocaleDateString()}
                    {reservation.estimatedArrival && (
                      <span className="text-muted-foreground ml-1">
                        {reservation.estimatedArrival}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-sm">
                    {new Date(reservation.departureDate).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <Badge className={cn('capitalize', statusColors[reservation.status])}>
                      {reservation.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Link
                      to={`/reservations/${reservation.id}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Link>
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

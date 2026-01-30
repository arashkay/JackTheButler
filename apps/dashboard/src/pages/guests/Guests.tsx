import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer, StatsBar, SearchInput, EmptyState } from '@/components';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Users,
  Crown,
  Star,
  UserPlus,
  ChevronRight,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  language: string;
  loyaltyTier: string | null;
  vipStatus: string | null;
  preferences: string[];
  tags: string[];
  stayCount: number;
  totalRevenue: number;
  lastStayDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GuestStats {
  total: number;
  vip: number;
  repeatGuests: number;
  newThisMonth: number;
}

const vipColors: Record<string, string> = {
  diamond: 'bg-purple-100 text-purple-800',
  platinum: 'bg-gray-100 text-gray-800',
  gold: 'bg-yellow-100 text-yellow-800',
  silver: 'bg-slate-100 text-slate-800',
};

const loyaltyColors: Record<string, string> = {
  platinum: 'bg-gray-100 text-gray-800',
  gold: 'bg-yellow-100 text-yellow-800',
  silver: 'bg-slate-100 text-slate-800',
  member: 'bg-blue-100 text-blue-800',
};

export function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [stats, setStats] = useState<GuestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [vipFilter, setVipFilter] = useState<string>('all');
  const [loyaltyFilter, setLoyaltyFilter] = useState<string>('all');
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const fetchGuests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (vipFilter !== 'all') params.set('vipStatus', vipFilter);
      if (loyaltyFilter !== 'all') params.set('loyaltyTier', loyaltyFilter);
      params.set('limit', String(limit));
      params.set('offset', String(offset));

      const data = await api.get<{ guests: Guest[]; total: number }>(
        `/guests?${params.toString()}`
      );
      setGuests(data.guests);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guests');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api.get<GuestStats>('/guests/stats');
      setStats(data);
    } catch (err) {
      // Non-critical
    }
  };

  useEffect(() => {
    fetchGuests();
  }, [vipFilter, loyaltyFilter, offset]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSearch = () => {
    setOffset(0);
    fetchGuests();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <PageContainer>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <StatsBar
          items={[
            { label: 'Total Guests', value: stats.total, icon: Users, variant: 'default' },
            { label: 'VIP Guests', value: stats.vip, icon: Crown, variant: 'warning' },
            { label: 'Repeat Guests', value: stats.repeatGuests, icon: Star, variant: 'success' },
            { label: 'New This Month', value: stats.newThisMonth, icon: UserPlus, variant: 'default' },
          ]}
        />
      )}

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] max-w-md flex gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name, email, phone..."
          />
          <Button variant="outline" onClick={handleSearch}>
            <Search className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-2 items-center">
          <select
            value={vipFilter}
            onChange={(e) => {
              setVipFilter(e.target.value);
              setOffset(0);
            }}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All VIP Status</option>
            <option value="any">Any VIP</option>
            <option value="diamond">Diamond</option>
            <option value="platinum">Platinum</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
          </select>

          <select
            value={loyaltyFilter}
            onChange={(e) => {
              setLoyaltyFilter(e.target.value);
              setOffset(0);
            }}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Loyalty</option>
            <option value="platinum">Platinum</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="member">Member</option>
          </select>
        </div>

        <Link to="/guests/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Guest
          </Button>
        </Link>
      </div>

      {/* Guest Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-500">Loading guests...</p>
            </div>
          ) : guests.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No guests found"
              description={
                search || vipFilter !== 'all' || loyaltyFilter !== 'all'
                  ? 'Try changing your search or filters'
                  : 'Add your first guest to get started'
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Stays</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead>Last Stay</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guests.map((guest) => (
                    <TableRow key={guest.id} className="group">
                      <TableCell>
                        <Link
                          to={`/guests/${guest.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {guest.firstName} {guest.lastName}
                        </Link>
                        {guest.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {guest.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {guest.tags.length > 2 && (
                              <span className="text-xs text-gray-400">
                                +{guest.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {guest.email && (
                            <div className="text-gray-600 truncate max-w-[200px]">
                              {guest.email}
                            </div>
                          )}
                          {guest.phone && (
                            <div className="text-gray-500 text-xs">{guest.phone}</div>
                          )}
                          {!guest.email && !guest.phone && (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          {guest.vipStatus && guest.vipStatus !== 'none' && (
                            <Badge
                              className={vipColors[guest.vipStatus] || 'bg-gray-100 text-gray-800'}
                            >
                              <Crown className="w-3 h-3 mr-1" />
                              {guest.vipStatus}
                            </Badge>
                          )}
                          {guest.loyaltyTier && guest.loyaltyTier !== 'none' && (
                            <Badge
                              variant="outline"
                              className={loyaltyColors[guest.loyaltyTier] || ''}
                            >
                              {guest.loyaltyTier}
                            </Badge>
                          )}
                          {(!guest.vipStatus || guest.vipStatus === 'none') &&
                            (!guest.loyaltyTier || guest.loyaltyTier === 'none') && (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium">{guest.stayCount}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-gray-600">
                          {formatCurrency(guest.totalRevenue)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-500 text-sm">
                          {formatDate(guest.lastStayDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link to={`/guests/${guest.id}`}>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {total > limit && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-gray-500">
                    Showing {offset + 1}-{Math.min(offset + limit, total)} of {total} guests
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOffset(Math.max(0, offset - limit))}
                      disabled={offset === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOffset(offset + limit)}
                      disabled={offset + limit >= total}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { useLeads, LeadWithRelations } from '@/hooks/useLeads';
import { useLocations } from '@/hooks/useLocations';
import { useAuth } from '@/hooks/useAuth';
import { useStatusConfig } from '@/hooks/useStatusConfig';
import EnhancedLeadFormDialog from '@/components/leads/EnhancedLeadFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, Phone, MessageCircle, MapPin, User, 
  Clock, Filter, Loader2, FileText, Building, DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

function LeadCard({ lead, onClick, getStatusConfig }: { lead: LeadWithRelations; onClick: () => void; getStatusConfig: (status: string) => { name: string; label: string; color: string } }) {
  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `tel:${lead.phone}`;
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const message = encodeURIComponent(`Hi ${lead.name}, `);
    window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const statusConfig = getStatusConfig(lead.status);

  return (
    <Card hover onClick={onClick} className="animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{lead.name}</h3>
              <Badge variant={statusConfig.color as any} className="shrink-0">
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{lead.phone}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {lead.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {lead.location.name}
                </span>
              )}
              {(lead as any).property_type && (
                <span className="flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  {(lead as any).property_type}
                </span>
              )}
              {(lead as any).budget && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {(lead as any).budget}
                </span>
              )}
              {lead.lead_source && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {lead.lead_source}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(lead.created_at), 'MMM d')}
              </span>
              {lead.follow_up_count > 0 && (
                <span className="flex items-center gap-1 text-primary font-medium">
                  <FileText className="w-3 h-3" />
                  {lead.follow_up_count} follow-up{lead.follow_up_count > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="call" size="icon-sm" onClick={handleCall}>
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="whatsapp" size="icon-sm" onClick={handleWhatsApp}>
              <MessageCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LeadsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const { activeStatuses, getStatusConfig } = useStatusConfig();

  const { data: leads, isLoading, refetch } = useLeads({
    status: statusFilter !== 'all' ? statusFilter as any : undefined,
    locationId: locationFilter !== 'all' ? locationFilter : undefined,
    search: search || undefined,
  });

  const { data: locations } = useLocations();

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Leads</h1>
            <p className="text-sm text-muted-foreground">
              {leads?.length || 0} leads found
            </p>
          </div>
          {isAdmin && <EnhancedLeadFormDialog onSuccess={() => refetch()} />}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {activeStatuses.map((status) => (
                <SelectItem key={status.id} value={status.name}>{status.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <MapPin className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations?.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lead List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : leads?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-1">No leads found</h3>
              <p className="text-sm text-muted-foreground">
                {isAdmin ? 'Create your first lead to get started.' : 'No leads have been assigned to you yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {leads?.map((lead) => (
              <LeadCard 
                key={lead.id} 
                lead={lead} 
                onClick={() => navigate(`/leads/${lead.id}`)}
                getStatusConfig={getStatusConfig}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

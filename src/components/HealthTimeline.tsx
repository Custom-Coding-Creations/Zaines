'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Calendar, Pill, Activity, Scale } from 'lucide-react';
import { safeJsonResponse } from '@/lib/safe-json-response';

interface TimelineItem {
  id: string;
  type: 'vaccine' | 'medication' | 'weight' | 'activity';
  date: string;
  petId: string;
  petName: string;
  title: string;
  details?: string;
  alert?: 'critical' | 'warning' | 'info';
}

interface HealthTimelineProps {
  petId?: string;
}

export function HealthTimeline({ petId }: HealthTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [alerts, setAlerts] = useState({ critical: 0, warning: 0, info: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTimeline() {
      try {
        const url = petId
          ? `/api/health-timeline?petId=${petId}`
          : '/api/health-timeline';
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch health timeline');
        }

        const data = await safeJsonResponse<{
          timeline?: TimelineItem[];
          alerts?: { critical: number; warning: number; info: number };
        }>(response, {});
        setTimeline(data.timeline || []);
        setAlerts(data.alerts || { critical: 0, warning: 0, info: 0 });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchTimeline();
  }, [petId]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'vaccine':
        return <AlertCircle className="h-4 w-4" />;
      case 'medication':
        return <Pill className="h-4 w-4" />;
      case 'weight':
        return <Scale className="h-4 w-4" />;
      case 'activity':
        return <Activity className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getAlertBadge = (alert?: string) => {
    if (!alert) return null;

    const variants = {
      critical: 'destructive',
      warning: 'default',
      info: 'secondary',
    } as const;

    return (
      <Badge variant={variants[alert as keyof typeof variants] || 'secondary'}>
        {alert === 'critical' ? 'Urgent' : alert === 'warning' ? 'Warning' : 'Info'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health Timeline</CardTitle>
          <CardDescription>Loading health records...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health Timeline</CardTitle>
          <CardDescription className="text-red-600">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Timeline</CardTitle>
        <CardDescription>
          {alerts.critical > 0 && (
            <span className="text-red-600 font-medium">
              {alerts.critical} urgent alert{alerts.critical > 1 ? 's' : ''}
            </span>
          )}
          {alerts.warning > 0 && alerts.critical === 0 && (
            <span className="text-yellow-600 font-medium">
              {alerts.warning} warning{alerts.warning > 1 ? 's' : ''}
            </span>
          )}
          {alerts.critical === 0 && alerts.warning === 0 && (
            <span>Recent health events and upcoming reminders</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">No health records found.</p>
        ) : (
          <div className="space-y-3">
            {timeline.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3 border rounded ${
                  item.alert === 'critical'
                    ? 'border-red-200 bg-red-50'
                    : item.alert === 'warning'
                      ? 'border-yellow-200 bg-yellow-50'
                      : ''
                }`}
              >
                <div className="mt-0.5">{getIcon(item.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{item.title}</p>
                    {getAlertBadge(item.alert)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.petName} • {new Date(item.date).toLocaleDateString()}
                  </p>
                  {item.details && (
                    <p className="text-xs text-muted-foreground mt-1">{item.details}</p>
                  )}
                </div>
              </div>
            ))}
            {timeline.length > 10 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                Showing 10 of {timeline.length} events
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

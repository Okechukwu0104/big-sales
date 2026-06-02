import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Copy, Download, ExternalLink, RefreshCw, Sparkles, MessageCircle } from 'lucide-react';

const CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCiW8yKAwEjEeodvb0X';

const lagosToday = () => {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));
  return d.toISOString().slice(0, 10);
};

const typeColor: Record<string, string> = {
  promo: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  product: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  engagement: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
};

const AdminChannelAI = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const today = lagosToday();

  const { data: settings } = useQuery({
    queryKey: ['channel-ai-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('channel_ai_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: todayPack, isLoading } = useQuery({
    queryKey: ['channel-posts-today', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channel_posts')
        .select('*')
        .eq('generated_for_date', today)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: history } = useQuery({
    queryKey: ['channel-posts-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channel_posts')
        .select('*')
        .lt('generated_for_date', today)
        .order('generated_for_date', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
  });

  const generate = useMutation({
    mutationFn: async (force: boolean) => {
      const { data, error } = await supabase.functions.invoke('generate-channel-posts', {
        body: { force },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['channel-posts-today'] });
      qc.invalidateQueries({ queryKey: ['channel-posts-history'] });
      toast({ title: 'Pack ready', description: 'Today\'s 3 posts are ready to copy.' });
    },
    onError: (e: any) => toast({ title: 'Generation failed', description: e?.message, variant: 'destructive' }),
  });

  const toggleEnabled = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase.from('channel_ai_settings').update({ enabled }).eq('id', settings!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channel-ai-settings'] }),
  });

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Caption ready to paste.' });
  };

  const hasPack = (todayPack?.length || 0) >= 3;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2 text-sm hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Link>
          <Button asChild variant="outline" size="sm">
            <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" /> Open Channel
            </a>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Channel AI Assistant</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          3 ready-to-paste WhatsApp Channel posts daily • 40% promo / 40% product / 20% engagement
        </p>

        {/* Settings */}
        <Card className="mb-6">
          <CardContent className="pt-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Auto-generate daily at 8 AM (Lagos time)</p>
              <p className="text-sm text-muted-foreground">When enabled, a fresh pack is ready every morning.</p>
            </div>
            <Switch
              checked={!!settings?.enabled}
              onCheckedChange={(v) => toggleEnabled.mutate(v)}
              disabled={!settings}
            />
          </CardContent>
        </Card>

        {/* Today's pack */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Today's pack — {today}</h2>
          <Button
            onClick={() => generate.mutate(!hasPack ? false : true)}
            disabled={generate.isPending}
            size="sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${generate.isPending ? 'animate-spin' : ''}`} />
            {generate.isPending ? 'Generating…' : hasPack ? 'Regenerate' : 'Generate now'}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : !hasPack ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No pack yet for today. Click <span className="font-medium text-foreground">Generate now</span>.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {todayPack!.map((p: any) => (
              <Card key={p.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={typeColor[p.post_type]}>
                      {p.post_type.toUpperCase()}
                    </Badge>
                    {p.product_link && (
                      <a
                        href={p.product_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                      >
                        View product <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {p.image_url && (
                    <div className="flex items-start gap-3">
                      <img
                        src={p.image_url}
                        alt=""
                        className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-md border"
                        loading="lazy"
                      />
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                      >
                        <a href={p.image_url} download target="_blank" rel="noopener noreferrer">
                          <Download className="mr-2 h-4 w-4" /> Image
                        </a>
                      </Button>
                    </div>
                  )}
                  <Textarea
                    value={p.caption}
                    readOnly
                    className="min-h-[140px] font-mono text-sm"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => copy(p.caption)} className="flex-1">
                      <Copy className="mr-2 h-4 w-4" /> Copy caption
                    </Button>
                    <Button asChild variant="outline">
                      <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" /> Open Channel
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* History */}
        {history && history.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-3">Last 30 days</h2>
            <Card>
              <CardContent className="pt-6 space-y-2">
                {history.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 text-sm border-b border-border/50 pb-2 last:border-0">
                    <span className="text-muted-foreground w-24 shrink-0">{p.generated_for_date}</span>
                    <Badge variant="outline" className={typeColor[p.post_type] + ' shrink-0'}>
                      {p.post_type}
                    </Badge>
                    <span className="truncate flex-1">{p.caption.slice(0, 100)}…</span>
                    <Button size="sm" variant="ghost" onClick={() => copy(p.caption)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminChannelAI;

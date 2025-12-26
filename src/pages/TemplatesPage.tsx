import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from '@/hooks/useTemplates';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MessageSquare, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';

function TemplateForm({ 
  mode, 
  initialData, 
  onSuccess 
}: { 
  mode: 'create' | 'edit';
  initialData?: { id: string; name: string; message: string; is_active: boolean };
  onSuccess: () => void;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [message, setMessage] = useState(initialData?.message || '');
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      await createTemplate.mutateAsync({ name, message });
    } else if (initialData) {
      await updateTemplate.mutateAsync({ 
        id: initialData.id, 
        data: { name, message, is_active: isActive } 
      });
    }
    onSuccess();
  };

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Template Name *</Label>
        <Input 
          id="name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="e.g., Welcome Message"
          required 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message *</Label>
        <Textarea 
          id="message" 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          placeholder="Hi {name}, thanks for your interest..."
          rows={4}
          required
        />
        <p className="text-xs text-muted-foreground">
          Use {'{name}'} to insert the lead's name automatically
        </p>
      </div>
      {mode === 'edit' && (
        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === 'create' ? 'Create Template' : 'Save Changes')}
      </Button>
    </form>
  );
}

export default function TemplatesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: templates, isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">WhatsApp Templates</h1>
            <p className="text-sm text-muted-foreground">
              Create reusable message templates for quick communication
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" className="gap-2">
                <Plus className="w-4 h-4" /> Add Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Template</DialogTitle>
              </DialogHeader>
              <TemplateForm mode="create" onSuccess={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Templates List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : templates?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-1">No templates yet</h3>
              <p className="text-sm text-muted-foreground">
                Create message templates for quick WhatsApp replies.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {templates?.map((template) => (
              <Card key={template.id} className="animate-fade-in">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                        <h3 className="font-semibold">{template.name}</h3>
                        <Badge variant={template.is_active ? 'secondary' : 'destructive'}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {template.message}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Dialog 
                        open={editingId === template.id} 
                        onOpenChange={(open) => setEditingId(open ? template.id : null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Template</DialogTitle>
                          </DialogHeader>
                          <TemplateForm 
                            mode="edit" 
                            initialData={template}
                            onSuccess={() => setEditingId(null)} 
                          />
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete template?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTemplate.mutate(template.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

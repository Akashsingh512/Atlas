-- Create sub_locations (offices/branches) table
CREATE TABLE public.sub_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sub_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sub_locations
CREATE POLICY "Admins can manage sub_locations"
ON public.sub_locations
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active sub_locations"
ON public.sub_locations
FOR SELECT
USING ((is_active = true) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Add sub_location_id to leads table
ALTER TABLE public.leads ADD COLUMN sub_location_id UUID REFERENCES public.sub_locations(id);

-- Create index for performance
CREATE INDEX idx_sub_locations_location_id ON public.sub_locations(location_id);
CREATE INDEX idx_leads_sub_location_id ON public.leads(sub_location_id);

-- Trigger for updated_at
CREATE TRIGGER update_sub_locations_updated_at
BEFORE UPDATE ON public.sub_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
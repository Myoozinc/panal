-- Agregar nuevos valores al enum discipline_type
ALTER TYPE public.discipline_type ADD VALUE IF NOT EXISTS 'designer';
ALTER TYPE public.discipline_type ADD VALUE IF NOT EXISTS 'sound_engineer';
ALTER TYPE public.discipline_type ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.discipline_type ADD VALUE IF NOT EXISTS 'songwriter';
ALTER TYPE public.discipline_type ADD VALUE IF NOT EXISTS 'videographer';
ALTER TYPE public.discipline_type ADD VALUE IF NOT EXISTS 'photographer';
ALTER TYPE public.discipline_type ADD VALUE IF NOT EXISTS 'promoter';
ALTER TYPE public.discipline_type ADD VALUE IF NOT EXISTS 'journalist';
ALTER TYPE public.discipline_type ADD VALUE IF NOT EXISTS 'teacher';
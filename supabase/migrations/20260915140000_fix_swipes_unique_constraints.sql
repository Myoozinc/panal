-- Migration: Fix swipes unique constraints for ON CONFLICT upsert compatibility

-- 1. Eliminar duplicados si existieran antes de aplicar las restricciones únicas
DELETE FROM public.swipes a USING public.swipes b
WHERE a.id < b.id
  AND a.swiper_id = b.swiper_id
  AND (
    (a.swiped_id IS NOT NULL AND a.swiped_id = b.swiped_id)
    OR (a.target_collab_id IS NOT NULL AND a.target_collab_id = b.target_collab_id)
  );

-- 2. Restaurar la restricción única estándar para swipes de artistas
ALTER TABLE public.swipes
  DROP CONSTRAINT IF EXISTS swipes_swiper_id_swiped_id_key;
ALTER TABLE public.swipes
  ADD CONSTRAINT swipes_swiper_id_swiped_id_key UNIQUE (swiper_id, swiped_id);

-- 3. Crear restricción única estándar para swipes de squads/proyectos
ALTER TABLE public.swipes
  DROP CONSTRAINT IF EXISTS swipes_swiper_collab_key;
ALTER TABLE public.swipes
  ADD CONSTRAINT swipes_swiper_collab_key UNIQUE (swiper_id, target_collab_id);

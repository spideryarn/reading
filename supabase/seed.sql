-- Seed data for testing and development
-- This file is run after migrations during `supabase db reset`

-- Create system user for development (used for documents created without auth)
DO $$
BEGIN
  -- Check if the system user already exists
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = '00000000-0000-0000-0000-000000000001'
  ) THEN
    -- Insert system user
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000001'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      'systemtest@spideryarn.com',
      crypt('ASDFasdf1', gen_salt('bf')),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"name": "System Test User", "description": "Mock user for development foreign key constraints"}'::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  END IF;
END $$;

-- Create system user profile (without admin access for proper RLS testing)
INSERT INTO profiles (user_id, preferences, is_admin) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '{"type": "system", "description": "Mock system user for development"}'::jsonb,
  NULL  -- No admin access to ensure RLS tests work correctly
) ON CONFLICT (user_id) DO UPDATE SET 
  preferences = EXCLUDED.preferences;

-- Insert admin user (hello@spideryarn.com) with distinctive hardcoded UUID
DO $$
BEGIN
  -- Check if the admin user already exists
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = 'hello@spideryarn.com'
  ) THEN
    -- Insert admin user
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '11111111-1111-1111-1111-111111111111'::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'authenticated',
      'authenticated',
      'hello@spideryarn.com',
      crypt('ASDFasdf1', gen_salt('bf')),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"name": "Admin User"}'::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  END IF;
END $$;

-- Create admin user profile with admin access
INSERT INTO profiles (user_id, preferences, is_admin) VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '{"type": "admin"}'::jsonb,
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET 
  is_admin = NOW();

-- Insert additional test user (greg@gregdetre.com)
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at) VALUES
('7bfcabea-690c-4754-936d-1a194f4244c2', 'greg@gregdetre.com', '2025-06-03T23:18:01.600Z', '2025-06-03T23:18:01.590Z', '2025-06-03T23:18:01.603Z')
ON CONFLICT (id) DO NOTHING;

-- Insert user profile for test user
INSERT INTO public.profiles (id, user_id, preferences, created_at, updated_at) VALUES
('1cecbe4f-8eb7-4007-bb89-f2c37a761dbe', '7bfcabea-690c-4754-936d-1a194f4244c2', '{}', '2025-06-03T23:18:01.590Z', '2025-06-03T23:18:01.590Z')
ON CONFLICT (user_id) DO NOTHING;

-- AI models are now managed in code via lib/config/models.ts
-- The ai_models table has been removed as part of the model string migration
-- Model configuration is handled via model strings in format: provider:model:version[:thinking]
-- Examples: anthropic:claude-3-5-haiku:20241022, google:gemini-2.0-flash:latest

-- Documents imported from static/examples
-- Source: static/examples/Chalmers (1995) - Facing Up to the Problem of Consciousness cropped.html
-- WARNING: NEVER modify the original HTML file in static/examples/ - it should remain as-is
INSERT INTO documents (id, title, slug, html_content, plaintext_content, created_by, is_public, word_count, language_code) VALUES 
('df1772a7-2f73-4c81-a267-07497557388a', 'Chalmers (1995) - Facing Up to the Problem of Consciousness cropped', 'chalmers-1995-facing-up-to-the-problem-of-consciousness-cropped', $chalmers_cropped$<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2//EN">
<HTML>

<HEAD>
    <TITLE>Facing Up to the Problem of Consciousness</TITLE>
    <META NAME="GENERATOR" CONTENT="Mozilla/3.0Gold (X11; U; SunOS 4.1.4 sun4m) [Netscape]">
</HEAD>

<BODY TEXT="#000000" BGCOLOR="#FFFFFF" LINK="#0000EE" VLINK="#551A8B" ALINK="#FF0000">

    <!-- snipped -->

</BODY>

</HTML>$chalmers_cropped$, $chalmers_plaintext$Facing Up to the Problem of Consciousness 1 Introduction Consciousness poses the most baffling problems in the science of the mind. There is nothing that we know more intimately than conscious experience, but there is nothing that is harder to explain. All sorts of mental phenomena have yielded to scientific investigation in recent years, but consciousness has stubbornly resisted. Many have tried to explain it, but the explanations always seem to fall short of the target. Some have been led to suppose that the problem is intractable, and that no good explanation can be given. ... SNIPPED 6 Nonreductive explanation At this point some are tempted to give up, holding that we will never have a theory of conscious experience. McGinn (1989), for example, argues that the problem is too hard for our limited minds; we are "cognitively closed" with respect to the phenomenon. Others have argued that conscious experience lies outside the domain of scientific theory altogether. Although a remarkable number of phenomena have turned out to be explicable wholly in terms of entities simpler than themselves, this is not universal. In physics, it occasionally happens that an entity has to be taken as fundamental. Fundamental entities are not explained in terms of anything simpler. Instead, one takes them as basic, and gives a theory of how they relate to everything else in the world. For example, in the nineteenth century it turned out that electromagnetic processes could not be explained in terms of the wholly mechanical processes that previous physical theories appealed to, so Maxwell and others introduced electromagnetic charge and electromagnetic forces as new fundamental components of a physical theory. To explain electromagnetism, the ontology of physics had to be expanded. New basic properties and basic laws were needed to give a satisfactory account of the phenomena. Other features that physical theory takes as fundamental include mass and space-time. No attempt is made to explain these features in terms of anything simpler. But this does not rule out the possibility of a theory of mass or of space-time. There is an intricate theory of how these features interrelate, and of the basic laws they enter into. These basic principles are used to explain many familiar phenomena concerning mass, space, and time at a higher level. 7 Outline of a theory of consciousness 1. The principle of structural coherence. This is a principle of coherence between the structure of consciousness and the structure of awareness. Recall that "awareness" was used earlier to refer to the various functional phenomena that are associated with consciousness. I am now using it to refer to a somewhat more specific process in the cognitive underpinnings of experience. In particular, the contents of awareness are to be understood as those information contents that are accessible to central systems, and brought to bear in a widespread way in the control of behavior. Briefly put, we can think of awareness as direct availability for global control. To a first approximation, the contents of awareness are the contents that are directly accessible and potentially reportable, at least in a language-using system. Color Experience and Information Processing In general, any information that is consciously experienced will also be cognitively represented. The fine-grained structure of the visual field will correspond to some fine-grained structure in visual processing. The same goes for experiences in other modalities, and even for nonsensory experiences. Internal mental images have geometric properties that are represented in processing. Even emotions have structural properties, such as relative intensity, that correspond directly to a structural property of processing; where there is greater intensity, we find a greater effect on later processes. In general, precisely because the structural properties of experience are accessible and reportable, those properties will be directly represented in the structure of awareness. This principle has its limits. It allows us to recover structural properties of experience from information-processing properties, but not all properties of experience are structural properties. There are properties of experience, such as the intrinsic nature of a sensation of red, that cannot be fully captured in a structural description. The very intelligibility of inverted spectrum scenarios, where experiences of red and green are inverted but all structural properties remain the same, show that structural properties constrain experience without exhausting it. Nevertheless, the very fact that we feel compelled to leave structural properties unaltered when we imagine experiences inverted between functionally identical systems shows how central the principle of structural coherence is to our conception of our mental lives. It is not a logically necessary principle, as after all we can imagine all the information processing occurring without any experience at all, but it is nevertheless a strong and familiar constraint on the psychophysical connection. 2. The principle of organizational invariance. This principle states that any two systems with the same fine-grained functional organization will have qualitatively identical experiences. If the causal patterns of neural organization were duplicated in silicon, for example, with a silicon chip for every neuron and the same patterns of interaction, then the same experiences would arise. According to this principle, what matters for the emergence of experience is not the specific physical makeup of a system, but the abstract pattern of causal interaction between its components. This principle is controversial, of course. Some (e.g. Searle 1980) have thought that consciousness is tied to a specific biology, so that a silicon isomorph of a human need not be conscious. I believe that the principle can be given significant support by the analysis of thought-experiments, however. Very briefly: suppose (for the purposes of a reductio ad absurdum) that the principle is false, and that there could be two functionally isomorphic systems with different experiences. Perhaps only one of the systems is conscious, or perhaps both are conscious but they have different experiences. For the purposes of illustration, let us say that one system is made of neurons and the other of silicon, and that one experiences red where the other experiences blue. The two systems have the same organization, so we can imagine gradually transforming one into the other, perhaps replacing neurons one at a time by silicon chips with the same local function. We thus gain a spectrum of intermediate cases, each with the same organization, but with slightly different physical makeup and slightly different experiences. Along this spectrum, there must be two systems A and B between which we replace less than one tenth of the system, but whose experiences differ. These two systems are physically identical, except that a small neural circuit in A has been replaced by a silicon circuit in B.$chalmers_plaintext$, '11111111-1111-1111-1111-111111111111', true, 3822, 'en')
ON CONFLICT (slug) DO UPDATE SET 
  html_content = EXCLUDED.html_content,
  plaintext_content = EXCLUDED.plaintext_content,
  word_count = EXCLUDED.word_count;
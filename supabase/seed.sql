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

-- Insert admin user (hello@spideryarn.com)
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
      gen_random_uuid(),
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
INSERT INTO profiles (user_id, preferences, is_admin) 
SELECT id, '{"type": "admin"}'::jsonb, NOW()
FROM auth.users 
WHERE email = 'hello@spideryarn.com'
ON CONFLICT (user_id) DO UPDATE SET 
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

-- Insert test document for database integration testing
INSERT INTO documents (title, slug, html_content, plaintext_content, created_by, is_public) VALUES (
  'Test Document - Database Integration', 
  'test-document-database-integration',
  '<h1>Test Document - Database Integration</h1><p>This is a test document created to test the database integration for AI summarization features.</p><p>The document contains multiple paragraphs to provide sufficient content for meaningful summarization. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p><p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>',
  'Test Document - Database Integration. This is a test document created to test the database integration for AI summarization features. The document contains multiple paragraphs to provide sufficient content for meaningful summarization. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  '00000000-0000-0000-0000-000000000001',
  true
) ON CONFLICT (slug) DO NOTHING;

-- Additional documents imported from static/examples
INSERT INTO documents (id, title, slug, html_content, plaintext_content, created_by, is_public, word_count, language_code) VALUES 
('df1772a7-2f73-4c81-a267-07497557388a', 'Chalmers (1995) - Facing Up to the Problem of Consciousness cropped', 'chalmers-1995-facing-up-to-the-problem-of-consciousness-cropped', $chalmers_cropped$<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2//EN">
<HTML>

<HEAD>
    <TITLE>Facing Up to the Problem of Consciousness</TITLE>
    <META NAME="GENERATOR" CONTENT="Mozilla/3.0Gold (X11; U; SunOS 4.1.4 sun4m) [Netscape]">
</HEAD>

<BODY TEXT="#000000" BGCOLOR="#FFFFFF" LINK="#0000EE" VLINK="#551A8B" ALINK="#FF0000">

    <H2>Facing Up to the Problem of Consciousness</H2>

    <H3>1 Introduction</H3>

    <P>Consciousness poses the most baffling problems in the science of the
        mind. There is nothing that we know more intimately than conscious experience,
        but there is nothing that is harder to explain. All sorts of mental phenomena
        have yielded to scientific investigation in recent years, but consciousness
        has stubbornly resisted. Many have tried to explain it, but the explanations
        always seem to fall short of the target. Some have been led to suppose
        that the problem is intractable, and that no good explanation can be given.
    </P>

    <P>To make progress on the problem of consciousness, we have to confront
        it directly. In this paper, I first isolate the truly hard part of the
        problem, separating it from more tractable parts and giving an account
        of why it is so difficult to explain. I critique some recent work that
        uses reductive methods to address consciousness, and argue that such methods
        inevitably fail to come to grips with the hardest part of the problem.
        Once this failure is recognized, the door to further progress is opened.
        In the second half of the paper, I argue that if we move to a new kind
        of nonreductive explanation, a naturalistic account of consciousness can
        be given. I put forward my own candidate for such an account: a nonreductive
        theory based on principles of structural coherence and organizational invariance
        and a double-aspect view of information. </P>


    <H3>... SNIPPED</H3>


    <H3>6 Nonreductive explanation</H3>

    <P>At this point some are tempted to give up, holding that we will never
        have a theory of conscious experience. McGinn (1989), for example, argues
        that the problem is too hard for our limited minds; we are &quot;cognitively
        closed&quot; with respect to the phenomenon. Others have argued that conscious
        experience lies outside the domain of scientific theory altogether. </P>

    <P>I think this pessimism is premature. This is not the place to give up;
        it is the place where things get interesting. When simple methods of explanation
        are ruled out, we need to investigate the alternatives. Given that reductive
        explanation fails, <I>nonreductive</I> explanation is the natural choice.
    </P>

    <P>Although a remarkable number of phenomena have turned out to be explicable
        wholly in terms of entities simpler than themselves, this is not universal.
        In physics, it occasionally happens that an entity has to be taken as <I>fundamental</I>.
        Fundamental entities are not explained in terms of anything simpler. Instead,
        one takes them as basic, and gives a theory of how they relate to everything
        else in the world. For example, in the nineteenth century it turned out
        that electromagnetic processes could not be explained in terms of the wholly
        mechanical processes that previous physical theories appealed to, so Maxwell
        and others introduced electromagnetic charge and electromagnetic forces
        as new fundamental components of a physical theory. To explain electromagnetism,
        the ontology of physics had to be expanded. New basic properties and basic
        laws were needed to give a satisfactory account of the phenomena. </P>

    <P>Other features that physical theory takes as fundamental include mass
        and space-time. No attempt is made to explain these features in terms of
        anything simpler. But this does not rule out the possibility of a theory
        of mass or of space-time. There is an intricate theory of how these features
        interrelate, and of the basic laws they enter into. These basic principles
        are used to explain many familiar phenomena concerning mass, space, and
        time at a higher level. </P>

    <P>I suggest that a theory of consciousness should take experience as fundamental.
        We know that a theory of consciousness requires the addition of <I>something</I>
        fundamental to our ontology, as everything in physical theory is compatible
        with the absence of consciousness. We might add some entirely new nonphysical
        feature, from which experience can be derived, but it is hard to see what
        such a feature would be like. More likely, we will take experience itself
        as a fundamental feature of the world, alongside mass, charge, and space-time.
        If we take experience as fundamental, then we can go about the business
        of constructing a theory of experience. </P>

    <P>Where there is a fundamental property, there are fundamental laws. A
        nonreductive theory of experience will add new principles to the furniture
        of the basic laws of nature. These basic principles will ultimately carry
        the explanatory burden in a theory of consciousness. Just as we explain
        familiar high-level phenomena involving mass in terms of more basic principles
        involving mass and other entities, we might explain familiar phenomena
        involving experience in terms of more basic principles involving experience
        and other entities. </P>

    <P>In particular, a nonreductive theory of experience will specify basic
        principles telling us how experience depends on physical features of the
        world. These <I>psychophysical</I> principles will not interfere with physical
        laws, as it seems that physical laws already form a closed system. Rather,
        they will be a supplement to a physical theory. A physical theory gives
        a theory of physical processes, and a psychophysical theory tells us how
        those processes give rise to experience. We know that experience depends
        on physical processes, but we also know that this dependence cannot be
        derived from physical laws alone. The new basic principles postulated by
        a nonreductive theory give us the extra ingredient that we need to build
        an explanatory bridge. </P>

    <H4>The Limits of Fundamental Explanation</H4>

    <P>Of course, by taking experience as fundamental, there is a sense in
        which this approach does not tell us why there is experience in the first
        place. But this is the same for any fundamental theory. Nothing in physics
        tells us why there is matter in the first place, but we do not count this
        against theories of matter. Certain features of the world need to be taken
        as fundamental by any scientific theory. A theory of matter can still explain
        all sorts of facts about matter, by showing how they are consequences of
        the basic laws. The same goes for a theory of experience. </P>

    <P>This position qualifies as a variety of dualism, as it postulates basic
        properties over and above the properties invoked by physics. But it is
        an innocent version of dualism, entirely compatible with the scientific
        view of the world. Nothing in this approach contradicts anything in physical
        theory; we simply need to add further <I>bridging</I> principles to explain
        how experience arises from physical processes. There is nothing particularly
        spiritual or mystical about this theory - its overall shape is like that
        of a physical theory, with a few fundamental entities connected by fundamental
        laws. It expands the ontology slightly, to be sure, but Maxwell did the
        same thing. Indeed, the overall structure of this position is entirely
        naturalistic, allowing that ultimately the universe comes down to a network
        of basic entities obeying simple laws, and allowing that there may ultimately
        be a theory of consciousness cast in terms of such laws. If the position
        is to have a name, a good choice might be <I>naturalistic dualism</I>.
    </P>

    <P>If this view is right, then in some ways a theory of consciousness will
        have more in common with a theory in physics than a theory in biology.
        Biological theories involve no principles that are fundamental in this
        way, so biological theory has a certain complexity and messiness to it;
        but theories in physics, insofar as they deal with fundamental principles,
        aspire to simplicity and elegance. The fundamental laws of nature are part
        of the basic furniture of the world, and physical theories are telling
        us that this basic furniture is remarkably simple. If a theory of consciousness
        also involves fundamental principles, then we should expect the same. The
        principles of simplicity, elegance, and even beauty that drive physicists'
        search for a fundamental theory will also apply to a theory of consciousness.
    </P>

    <P>(A technical note: Some philosophers argue that even though there is
        a <I>conceptual</I> gap between physical processes and experience, there
        need be no metaphysical gap, so that experience might in a certain sense
        still be physical (e.g. Hill 1991; Levine 1983; Loar 1990). Usually this
        line of argument is supported by an appeal to the notion of <I>a posteriori</I>
        necessity (Kripke 1980). I think that this position rests on a misunderstanding
        of <I>a posteriori</I> necessity, however, or else requires an entirely
        new sort of necessity that we have no reason to believe in; see Chalmers
        1996 (also Jackson 1994 and Lewis 1994) for details. In any case, this
        position still concedes an <I>explanatory</I> gap between physical processes
        and experience. For example, the principles connecting the physical and
        the experiential will not be derivable from the laws of physics, so such
        principles must be taken as <I>explanatorily</I> fundamental. So even on
        this sort of view, the explanatory structure of a theory of consciousness
        will be much as I have described.) </P>

    <H3>7 Outline of a theory of consciousness</H3>

    <P>A nonreductive theory of consciousness will consist in a number of <I>psychophysical
            principles</I>, principles connecting the properties of physical processes
        to the properties of experience. We can think of these principles as encapsulating
        the way in which experience arises from the physical. Ultimately, these
        principles should tell us what sort of physical systems will have associated
        experiences, and for the systems that do, they should tell us what sort
        of physical properties are relevant to the emergence of experience, and
        just what sort of experience we should expect any given physical system
        to yield. This is a tall order, but there is no reason why we should not
        get started. </P>

    <P>In what follows, I present my own candidates for the psychophysical
        principles that might go into a theory of consciousness. The first two
        of these are <I>nonbasic principles</I> - systematic connections between
        processing and experience at a relatively high level. These principles
        can play a significant role in developing and constraining a theory of
        consciousness, but they are not cast at a sufficiently fundamental level
        to qualify as truly basic laws. The final principle is my candidate for
        a <I>basic principle</I> that might form the cornerstone of a fundamental
        theory of consciousness. This final principle is particularly speculative,
        but it is the kind of speculation that is required if we are ever to have
        a satisfying theory of consciousness. I can present these principles only
        briefly here; I argue for them at much greater length in Chalmers (1996).</P>

    <P><BR>
    </P>

    <P>1. <B>The principle of structural coherence</B>. This is a principle
        of coherence between the <I>structure of consciousness</I> and the <I>structure
            of awareness</I>. Recall that &quot;awareness&quot; was used earlier to
        refer to the various functional phenomena that are associated with consciousness.
        I am now using it to refer to a somewhat more specific process in the cognitive
        underpinnings of experience. In particular, the contents of awareness are
        to be understood as those information contents that are accessible to central
        systems, and brought to bear in a widespread way in the control of behavior.
        Briefly put, we can think of awareness as <I>direct availability for global
            control</I>. To a first approximation, the contents of awareness are the
        contents that are directly accessible and potentially reportable, at least
        in a language-using system. </P>

    <H4>The Consciousness-Awareness Connection</H4>

    <P>Awareness is a purely functional notion, but it is nevertheless intimately
        linked to conscious experience. In familiar cases, wherever we find consciousness,
        we find awareness. Wherever there is conscious experience, there is some
        corresponding information in the cognitive system that is available in
        the control of behavior, and available for verbal report. Conversely, it
        seems that whenever information is available for report and for global
        control, there is a corresponding conscious experience. Thus, there is
        a direct correspondence between consciousness and awareness. </P>

    <P>The correspondence can be taken further. It is a central fact about
        experience that it has a complex structure. The visual field has a complex
        geometry, for instance. There are also relations of similarity and difference
        between experiences, and relations in such things as relative intensity.
        Every subject's experience can be at least partly characterized and decomposed
        in terms of these structural properties: similarity and difference relations,
        perceived location, relative intensity, geometric structure, and so on.
        It is also a central fact that to each of these structural features, there
        is a corresponding feature in the information-processing structure of awareness.
    </P>

    <H4>Color Experience and Information Processing</H4>

    <P>Take color sensations as an example. For every distinction between color
        experiences, there is a corresponding distinction in processing. The different
        phenomenal colors that we experience form a complex three-dimensional space,
        varying in hue, saturation, and intensity. The properties of this space
        can be recovered from information-processing considerations: examination
        of the visual systems shows that waveforms of light are discriminated and
        analyzed along three different axes, and it is this three-dimensional information
        that is relevant to later processing. The three-dimensional structure of
        phenomenal color space therefore corresponds directly to the three dimensional
        structure of visual awareness. This is precisely what we would expect.
        After all, every color distinction corresponds to some reportable information,
        and therefore to a distinction that is represented in the structure of
        processing. </P>

    <P>In a more straightforward way, the geometric structure of the visual
        field is directly reflected in a structure that can be recovered from visual
        processing. Every geometric relation corresponds to something that can
        be reported and is therefore cognitively represented. If we were given
        only the story about information-processing in an agent's visual and cognitive
        system, we could not <I>directly</I> observe that agent's visual experiences,
        but we could nevertheless infer those experiences' structural properties.
    </P>

    <P>In general, any information that is consciously experienced will also
        be cognitively represented. The fine-grained structure of the visual field
        will correspond to some fine-grained structure in visual processing. The
        same goes for experiences in other modalities, and even for nonsensory
        experiences. Internal mental images have geometric properties that are
        represented in processing. Even emotions have structural properties, such
        as relative intensity, that correspond directly to a structural property
        of processing; where there is greater intensity, we find a greater effect
        on later processes. In general, precisely because the structural properties
        of experience are accessible and reportable, those properties will be directly
        represented in the structure of awareness. </P>

    <P>It is this isomorphism between the structures of consciousness and awareness
        that constitutes the principle of structural coherence. This principle
        reflects the central fact that even though cognitive processes do not conceptually
        entail facts about conscious experience, consciousness and cognition do
        not float free of one another but cohere in an intimate way. </P>

    <P>This principle has its limits. It allows us to recover structural properties
        of experience from information-processing properties, but not all properties
        of experience are structural properties. There are properties of experience,
        such as the intrinsic nature of a sensation of red, that cannot be fully
        captured in a structural description. The very intelligibility of inverted
        spectrum scenarios, where experiences of red and green are inverted but
        all structural properties remain the same, show that structural properties
        constrain experience without exhausting it. Nevertheless, the very fact
        that we feel compelled to leave structural properties unaltered when we
        imagine experiences inverted between functionally identical systems shows
        how central the principle of structural coherence is to our conception
        of our mental lives. It is not a <I>logically</I> necessary principle,
        as after all we can imagine all the information processing occurring without
        any experience at all, but it is nevertheless a strong and familiar constraint
        on the psychophysical connection. </P>

    <P>The principle of structural coherence allows for a very useful kind
        of indirect explanation of experience in terms of physical processes. For
        example, we can use facts about neural processing of visual information
        to indirectly explain the structure of color space. The facts about neural
        processing can entail and explain the structure of awareness; if we take
        the coherence principle for granted, the structure of experience will also
        be explained. Empirical investigation might even lead us to better understand
        the structure of awareness within a bat, shedding indirect light on Nagel's
        vexing question of what it is like to be a bat. This principle provides
        a natural interpretation of much existing work on the explanation of consciousness
        (e.g. Clark 1992 and Hardin 1992 on colors, and Akins 1993 on bats), although
        it is often appealed to inexplicitly. It is so familiar that it is taken
        for granted by almost everybody, and is a central plank in the cognitive
        explanation of consciousness. </P>

    <P>The coherence between consciousness and awareness also allows a natural
        interpretation of work in neuroscience directed at isolating the <I>substrate</I>
        (or the <I>neural correlate</I>) of consciousness. Various specific hypotheses
        have been put forward. For example, Crick and Koch (1990) suggest that
        40-Hz oscillations may be the neural correlate of consciousness, whereas
        Libet (1993) suggests that temporally-extended neural activity is central.
        If we accept the principle of coherence, the most <I>direct</I> physical
        correlate of consciousness is awareness: the process whereby information
        is made directly available for global control. The different specific hypotheses
        can be interpreted as empirical suggestions about how awareness might be
        achieved. For example, Crick and Koch suggest that 40-Hz oscillations are
        the gateway by which information is integrated into working memory and
        thereby made available to later processes. Similarly, it is natural to
        suppose that Libet's temporally extended activity is relevant precisely
        because only that sort of activity achieves global availability. The same
        applies to other suggested correlates such as the &quot;global workspace&quot;
        of Baars (1988), the &quot;high-quality representations&quot; of Farah
        (1994), and the &quot;selector inputs to action systems&quot; of Shallice
        (1972). All these can be seen as hypotheses about the <I>mechanisms of
            awareness</I>: the mechanisms that perform the function of making information
        directly available for global control. </P>

    <P>Given the coherence between consciousness and awareness, it follows
        that a mechanism of awareness will itself be a correlate of conscious experience.
        The question of just <I>which</I> mechanisms in the brain govern global
        availability is an empirical one; perhaps there are many such mechanisms.
        But if we accept the coherence principle, we have reason to believe that
        the processes that <I>explain</I> awareness will at the same time be part
        of the <I>basis</I> of consciousness.</P>

    <P><BR>
    </P>

    <P>2. <B>The principle of organizational invariance</B>. This principle
        states that any two systems with the same fine-grained <I>functional organization</I>
        will have qualitatively identical experiences. If the causal patterns of
        neural organization were duplicated in silicon, for example, with a silicon
        chip for every neuron and the same patterns of interaction, then the same
        experiences would arise. According to this principle, what matters for
        the emergence of experience is not the specific physical makeup of a system,
        but the abstract pattern of causal interaction between its components.
        This principle is controversial, of course. Some (e.g. Searle 1980) have
        thought that consciousness is tied to a specific biology, so that a silicon
        isomorph of a human need not be conscious. I believe that the principle
        can be given significant support by the analysis of thought-experiments,
        however. </P>

    <P>Very briefly: suppose (for the purposes of a <I>reductio ad absurdum</I>)
        that the principle is false, and that there could be two functionally isomorphic
        systems with different experiences. Perhaps only one of the systems is
        conscious, or perhaps both are conscious but they have different experiences.
        For the purposes of illustration, let us say that one system is made of
        neurons and the other of silicon, and that one experiences red where the
        other experiences blue. The two systems have the same organization, so
        we can imagine gradually transforming one into the other, perhaps replacing
        neurons one at a time by silicon chips with the same local function. We
        thus gain a spectrum of intermediate cases, each with the same organization,
        but with slightly different physical makeup and slightly different experiences.
        Along this spectrum, there must be two systems <I>A</I> and <I>B</I> between
        which we replace less than one tenth of the system, but whose experiences
        differ. These two systems are physically identical, except that a small
        neural circuit in <I>A</I> has been replaced by a silicon circuit in <I>B</I>.
    </P>

    <P>The key step in the thought-experiment is to take the relevant neural
        circuit in <I>A</I>, and install alongside it a causally isomorphic silicon
        circuit, with a switch between the two. What happens when we flip the switch?
        By hypothesis, the system's conscious experiences will change; from red
        to blue, say, for the purposes of illustration. This follows from the fact
        that the system after the change is essentially a version of <I>B</I>,
        whereas before the change it is just <I>A</I>. </P>

    <P>But given the assumptions, there is no way for the system to <I>notice</I>
        the changes! Its causal organization stays constant, so that all of its
        functional states and behavioral dispositions stay fixed. As far as the
        system is concerned, nothing unusual has happened. There is no room for
        the thought, &quot;Hmm! Something strange just happened!&quot;. In general,
        the structure of any such thought must be reflected in processing, but
        the structure of processing remains constant here. If there were to be
        such a thought it must float entirely free of the system and would be utterly
        impotent to affect later processing. (If it affected later processing,
        the systems would be functionally distinct, contrary to hypothesis). We
        might even flip the switch a number of times, so that experiences of red
        and blue dance back and forth before the system's &quot;inner eye&quot;.
        According to hypothesis, the system can never notice these &quot;dancing
        qualia&quot;. </P>

    <P>This I take to be a <I>reductio</I> of the original assumption. It is
        a central fact about experience, very familiar from our own case, that
        whenever experiences change significantly and we are paying attention,
        we can notice the change; if this were not to be the case, we would be
        led to the skeptical possibility that our experiences are dancing before
        our eyes all the time. This hypothesis has the same status as the possibility
        that the world was created five minutes ago: perhaps it is logically coherent,
        but it is not plausible. Given the extremely plausible assumption that
        changes in experience correspond to changes in processing, we are led to
        the conclusion that the original hypothesis is impossible, and that any
        two functionally isomorphic systems must have the same sort of experiences.
        To put it in technical terms, the philosophical hypotheses of &quot;absent
        qualia&quot; and &quot;inverted qualia&quot;, while logically possible,
        are empirically and nomologically impossible. </P>

    <P>(Some may worry that a silicon isomorph of a neural system might be
        impossible for technical reasons. That question is open. The invariance
        principle says only that <I>if</I> an isomorph is possible, then it will
        have the same sort of conscious experience.) </P>

    <P>There is more to be said here, but this gives the basic flavor. Once
        again, this thought experiment draws on familiar facts about the coherence
        between consciousness and cognitive processing to yield a strong conclusion
        about the relation between physical structure and experience. If the argument
        goes through, we know that the only physical properties directly relevant
        to the emergence of experience are <I>organizational</I> properties. This
        acts as a further strong constraint on a theory of consciousness.</P>

    <P><BR>
    </P>

    <H3>... SNIPPED ...</H3>


</BODY>

</HTML>$chalmers_cropped$, 'Chalmers (1995) - Facing Up to the Problem of Consciousness cropped', '00000000-0000-0000-0000-000000000001', true, 3822, 'en');
# Graph Report - .  (2026-08-10)

## Corpus Check
- 171 files · ~314,622 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1406 nodes · 2559 edges · 135 communities (72 shown, 63 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 1% AMBIGUOUS · INFERRED: 173 edges (avg confidence: 0.79)
- Token cost: 539,370 input · 0 output

## Community Hubs (Navigation)
- Photo Asset Pipeline
- CI/CD Pipeline Rationale
- Command Palette
- Card & Accordion Primitives
- Sidebar & Sheet Primitives
- Contact Form
- Achievement Badges & Grid
- Achievement State Engine
- Badge & Popover Primitives
- TypeScript & Vite Config
- Hobby Photo Belts
- Travel & Sky Photography
- Dialog & Button Primitives
- Achievement Tracker & Theme Toggle
- Projects Constellation Canvas
- Defensive Behaviour Training Loss
- Portfolio Page Sections
- Project Brand Imagery
- Router & Route Tree
- GitHub Stats & Slugs
- Resume Tools & Languages
- shadcn Component Config
- Site URL & Canonical Links
- GEDI Active Learning Research
- GitHub Actions Workflows
- Lake & Cottage Photography
- Menubar Primitive
- Landing Page Hero
- Retinal Looming Detection
- Theme & Local State
- CORnet-Mouse Architecture
- Motor Control & Arena Simulation
- Starfield Background
- Form Primitives
- Animation & Hydration Rationale
- Achievement Stats Worker
- Worker TypeScript Config
- Carousel Primitive
- Radix Runtime Dependencies
- Base Path & Asset URLs
- Lint & Build Dev Dependencies
- Package Scripts
- Freeze/Escape Midbrain Circuit
- Clinical Simulation NLP Project
- Cloud Infrastructure Skills
- Achievement Rarity Fetching
- SSR Error Handling
- Hobby Lightbox & Focus Trap
- Thalamocortical Visual Pathway
- Superior Colliculus Modules
- Derived Responsive Images
- Nav & Scroll Spy
- Chart Primitive
- Retinal Photoreceptor Circuit
- MathSoc Full-Stack Role
- Marsh McLennan DevSecOps
- Resume Identity & Roles
- BiQuadris C++ Project
- Global X Web Automation
- Breadcrumb Primitive
- Navigation Menu Primitive
- Select Primitive
- Toggle Primitives
- Dialog Primitive
- Package Manifest Fields
- Mouse Eye Geometry
- Alert Primitive
- Input OTP Primitive
- Server Config Examples
- Retinotopy Mapping
- Worker SQL Schema
- Dependency: class-variance-authority
- Dependency: cmdk
- Dependency: date-fns
- Dependency: embla-carousel-react
- Dependency: eslint
- Dependency: eslint-plugin-react-hooks
- Dependency: exif-reader
- Dependency: framer-motion
- Dependency: globals
- Dependency: @hookform/resolvers
- Dependency: @lovable.dev/vite-tanstack-config
- Dependency: lucide-react
- Dependency: nitro
- Dependency: @radix-ui/react-accordion
- Dependency: @radix-ui/react-alert-dialog
- Dependency: @radix-ui/react-aspect-ratio
- Dependency: @radix-ui/react-avatar
- Dependency: @radix-ui/react-collapsible
- Dependency: @radix-ui/react-context-menu
- Dependency: @radix-ui/react-dialog
- Dependency: @radix-ui/react-dropdown-menu
- Dependency: @radix-ui/react-hover-card
- Dependency: @radix-ui/react-label
- Dependency: @radix-ui/react-menubar
- Dependency: @radix-ui/react-navigation-menu
- Dependency: @radix-ui/react-popover
- Dependency: @radix-ui/react-progress
- Dependency: @radix-ui/react-scroll-area
- Dependency: @radix-ui/react-select
- Dependency: @radix-ui/react-separator
- Dependency: @radix-ui/react-slider
- Dependency: @radix-ui/react-slot
- Dependency: @radix-ui/react-switch
- Dependency: @radix-ui/react-tabs
- Dependency: @radix-ui/react-toggle-group
- Dependency: @radix-ui/react-tooltip
- Dependency: react
- Dependency: react-day-picker
- Dependency: react-dom
- Dependency: react-hook-form
- Dependency: recharts
- Dependency: sonner
- Dependency: tailwind-merge
- Dependency: tailwindcss
- Dependency: @tailwindcss/vite
- Dependency: @tanstack/react-query
- Dependency: @tanstack/react-router
- Dependency: @tanstack/react-start
- Dependency: @tanstack/router-plugin
- Dependency: tw-animate-css
- Dependency: vaul
- Dependency: vite-tsconfig-paths
- Dependency: zod
- Dependency: prettier
- Dependency: @types/node
- Dependency: @types/react
- Dependency: @types/react-dom
- Dependency: typescript-eslint
- Dependency: vite
- Dependency: @vitejs/plugin-react
- Route Meta Types

## God Nodes (most connected - your core abstractions)
1. `cn()` - 220 edges
2. `assetUrl()` - 41 edges
3. `Technical Skills` - 36 edges
4. `unlock()` - 35 edges
5. `trackMember()` - 22 edges
6. `ConstellationCanvas()` - 17 edges
7. `compilerOptions` - 17 edges
8. `readState()` - 16 edges
9. `scripts` - 12 edges
10. `runHobbies()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `routeTree.gen.ts — auto-generated route tree` --semantically_similar_to--> `ROUTES`  [INFERRED] [semantically similar]
  src/routes/README.md → scripts/routes.mjs
- `Fling badge (THROW_ACHIEVEMENT_SPEED)` --references--> `unlock()`  [INFERRED]
  docs/projects-constellation.md → src/lib/achievements.ts
- `Strands derived from shared tech arrays, never authored` --rationale_for--> `StrandLayer()`  [EXTRACTED]
  docs/projects-constellation.md → src/components/portfolio/constellation.tsx
- `Strand redraws coalesced through a microtask, not a rAF` --rationale_for--> `StrandLayer()`  [EXTRACTED]
  docs/projects-constellation.md → src/components/portfolio/constellation.tsx
- `ProjectCardFace()` --shares_data_with--> `Project.imageId — explicit link to derivatives`  [INFERRED]
  src/components/portfolio/constellation.tsx → docs/photo-pipeline.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Build once, audit the same artifact, then deploy it** — _github_workflows_verify_verify, _github_workflows_verify_site_build_artifact, _github_workflows_lighthouse_lighthouse, _github_workflows_deploy_deploy [EXTRACTED 1.00]
- **Pinned toolchain plus scheduled dependency updates as supply-chain control** — _github_workflows_verify_pinned_bun_toolchain, _github_workflows_verify_pinned_node_toolchain, _github_dependabot_bun_updates, _github_dependabot_github_actions_updates [INFERRED 0.75]
- **Base path and git history feed consistent robots.txt/sitemap output** — _github_workflows_verify_fetch_depth_full_history, public_robots_build_regeneration, public_robots_sitemap_pointer, _github_workflows_lighthouse_base_path_guard [INFERRED 0.75]
- **Base-path consistency contract (build, sitemap, runtime, audit must stay in step)** — docs_codebase_overview_base_path_derivation, scripts_routes_routes, src_lib_site_url, src_lib_assets_asseturl, docs_ci_cd_base_path_trick [INFERRED 0.85]
- **Hydration-safe static branch pattern (server markup == first client render == crawlable)** — docs_codebase_overview_hydration_safety, src_components_portfolio_hobby_belts_staticgallery, src_components_portfolio_constellation_staticprojectgrid, scripts_prerender [INFERRED 0.85]
- **Photo manifest flow: generated half + hand-written half merged for the wall** — scripts_photos_hobbies_mode, src_data_hobbies_generated, src_data_hobbies_photo_text, src_data_hobbies, src_components_portfolio_hobby_belts [EXTRACTED 1.00]
- **dSC Freeze/Escape Competitive Gating Circuit** — public_assets_cornet_mouse_dsc_module, public_assets_cornet_mouse_freeze_branch, public_assets_cornet_mouse_escape_branch, public_assets_cornet_mouse_vlpag, public_assets_cornet_mouse_dpag, public_assets_cornet_mouse_behavioral_selection_softmax, public_assets_cornet_mouse_reciprocal_inhibition_gating [EXTRACTED 1.00]
- **Slow Cortical Chain: dLGN to VISp to HVAs to VISpor to M2 to M1 to MLR** — public_assets_cornet_mouse_dlgn_module, public_assets_cornet_mouse_v1_visp_block, public_assets_cornet_mouse_hva_blocks, public_assets_cornet_mouse_vispor_block, public_assets_cornet_mouse_m2_gru, public_assets_cornet_mouse_m1_readout, public_assets_cornet_mouse_mlr_gating_layer [EXTRACTED 1.00]
- **Neuroecological Loss Terms Producing Emergent Freeze/Flight** — public_assets_cornet_mouse_drl_loss_function, public_assets_cornet_mouse_foraging_term, public_assets_cornet_mouse_death_penalty, public_assets_cornet_mouse_energy_penalty, public_assets_cornet_mouse_false_alarm_penalty, public_assets_cornet_mouse_reaction_frames, public_assets_cornet_mouse_emergent_behaviour_claim [EXTRACTED 1.00]
- **GEDI Active-Learning Benchmark Study** — public_assets_resume_active_learning_pipeline, public_assets_resume_landscape_generator, public_assets_resume_ml_evaluation_suite, public_assets_resume_attentive_neural_processes, public_assets_resume_random_forests, public_assets_resume_gedi_biomass_estimation [EXTRACTED 1.00]
- **Marsh McLennan DevSecOps Automation Stack** — public_assets_resume_secrets_remediation_pipeline, public_assets_resume_owasp_audit_bot, public_assets_resume_database_deployment_automation, public_assets_resume_github_actions, public_assets_resume_multicloud_architecture [INFERRED 0.85]
- **Clinical Simulation NLP Stack** — public_assets_resume_ai_simulated_patients, public_assets_resume_medspacy, public_assets_resume_nltk, public_assets_resume_sentence_transformers, public_assets_resume_nlp_evaluation_modules, public_assets_resume_hallucination_reduction [EXTRACTED 1.00]
- **Project Showcase Thumbnails (Healthut, PatronPal, Verbalyst, devDucky)** — public_assets_healthut_screenshot, public_assets_patronpal_screenshot, public_assets_verbalyst_screenshot, public_assets_devducky_photo [INFERRED 0.85]
- **Student-Facing Wellbeing And Confidence Products** — public_assets_healthut_mentalhealthhub, public_assets_verbalyst_speechcoaching, public_assets_portrait_universitycontext [INFERRED 0.75]
- **Non-Project Site Chrome Imagery (Logo, Portrait, World Map)** — public_assets_logo_mark, public_assets_portrait_photo, public_assets_world_map [INFERRED 0.75]
- **Outputs of the responsive image pipeline (public/assets/derived)** — public_assets_derived_devducky_400w_photo, public_assets_derived_favicon_32_mark, public_assets_derived_healthut_400w_shot, public_assets_derived_healthut_800w_shot, public_assets_derived_logo_76w_mark, public_assets_derived_patronpal_400w_shot, public_assets_derived_patronpal_800w_shot, public_assets_derived_portrait_424w_photo, public_assets_derived_portrait_768w_photo, public_assets_derived_verbalyst_400w_shot, public_assets_derived_verbalyst_800w_shot [INFERRED 0.95]
- **Project showcase screenshots (Healthut, PatronPal, Verbalyst)** — public_assets_derived_healthut_400w_shot, public_assets_derived_healthut_800w_shot, public_assets_derived_patronpal_400w_shot, public_assets_derived_patronpal_800w_shot, public_assets_derived_verbalyst_400w_shot, public_assets_derived_verbalyst_800w_shot [INFERRED 0.85]
- **Personal photographic assets (portrait and rubber-duck photo)** — public_assets_derived_portrait_424w_photo, public_assets_derived_portrait_768w_photo, public_assets_derived_devducky_400w_photo [INFERRED 0.75]
- **Sky and Horizon: every photo in this chunk gives the sky roughly half the frame** — public_assets_hobbies_img_0021_full_photo, public_assets_hobbies_img_0034_full_photo, public_assets_hobbies_img_0048_full_photo, public_assets_hobbies_img_0060_full_photo [INFERRED 0.85]
- **Twilight Trees: dusk-lit foliage against a graded sky, shot from below** — public_assets_hobbies_img_0048_full_photo, public_assets_hobbies_img_0060_full_photo, public_assets_hobbies_img_0048_blue_hour_twilight, public_assets_hobbies_img_0060_pink_gold_dusk_palette, public_assets_hobbies_img_0048_tree_canopy_upward_gaze [INFERRED 0.85]
- **Looking Down From Height: aerial and hilltop views of inhabited landscape** — public_assets_hobbies_img_0021_full_photo, public_assets_hobbies_img_0034_full_photo, public_assets_hobbies_img_0021_aviation_window_seat, public_assets_hobbies_img_0034_elevated_vantage_point [INFERRED 0.85]
- **Lake-country scene: water, evergreen shoreline and granite bedrock recur across the set** — public_assets_hobbies_img_0095_full_photo, public_assets_hobbies_img_0105_full_photo, public_assets_hobbies_img_0108_full_photo, public_assets_hobbies_img_0095_concept_northern_lake, public_assets_hobbies_img_0105_concept_granite_outcrop, public_assets_hobbies_img_0095_concept_mixed_conifer_forest [INFERRED 0.85]
- **Every hobbies photo ships as a thumbnail plus a -full companion** — public_assets_hobbies_img_0095_photo, public_assets_hobbies_img_0105_photo, public_assets_hobbies_img_0108_photo, public_assets_hobbies_img_0095_concept_responsive_image_pair [INFERRED 0.95]
- **Cottage-weekend narrative: cabin in the woods, canoes on the dock, friends watching the lake** — public_assets_hobbies_img_0105_concept_cabin_retreat, public_assets_hobbies_img_0108_concept_canoeing, public_assets_hobbies_img_0108_concept_friends_at_golden_hour, public_assets_hobbies_img_0108_concept_same_lake_trip [INFERRED 0.75]

## Communities (135 total, 63 thin omitted)

### Community 0 - "Photo Asset Pipeline"
Cohesion: 0.05
Nodes (64): EXIF rotation is applied, not stripped, Incremental mtime-based encoding (--force, --prune, --dry), Manifest rebuilt from shipped tiles, not from originals, Originals are gitignored; derived WebP is what ships, accentFrom(), adoptMisplaced(), args, argv (+56 more)

### Community 1 - "CI/CD Pipeline Rationale"
Cohesion: 0.05
Nodes (60): Artifact guard step (fail loudly instead of NO_FCP), ci.yml — pull request feedback, codeql.yml — static security scanning, Deliberately excluded from CI (tests, PR previews, stats fetch), dependabot.yml — grouped weekly dependency updates, Lighthouse lives in deploy.yml so it can gate the deploy, deploy.yml — build, audit and publish, LF line endings pinned by .gitattributes (+52 more)

### Community 2 - "Command Palette"
Cohesion: 0.06
Nodes (52): CommandPalette(), NAV_ICONS, openInNewTab(), SOCIAL_ICONS, Command, CommandEmpty, CommandGroup, CommandInput (+44 more)

### Community 3 - "Card & Accordion Primitives"
Cohesion: 0.06
Nodes (48): AccordionContent, AccordionItem, AccordionTrigger, Avatar, AvatarFallback, AvatarImage, Card, CardContent (+40 more)

### Community 4 - "Sidebar & Sheet Primitives"
Cohesion: 0.06
Nodes (40): Input, Separator, SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay (+32 more)

### Community 5 - "Contact Form"
Cohesion: 0.11
Nodes (31): Contact(), ContactFormComponent, CONTACT_FIELDS, ContactFieldName, ContactFieldSpec, FieldRenderProps, inputClass, inputStyle (+23 more)

### Community 6 - "Achievement Badges & Grid"
Cohesion: 0.09
Nodes (31): AchievementBadge(), BadgeState, TIER_GRADIENT, TIER_ORBS, CATEGORY_ORDER, Filter, FILTERS, PILL_STYLE (+23 more)

### Community 7 - "Achievement State Engine"
Cohesion: 0.12
Nodes (25): ResetControl(), AchievementToaster(), Card, ACHIEVEMENTS_BY_ID, TIER_POINTS, ACHIEVEMENT_UNLOCK_EVENT, ACHIEVEMENTS_SCHEMA_VERSION, ACHIEVEMENTS_STORAGE_KEY (+17 more)

### Community 8 - "Badge & Popover Primitives"
Cohesion: 0.07
Nodes (16): Badge(), BadgeProps, badgeVariants, Checkbox, HoverCardContent, PopoverContent, Progress, RadioGroup (+8 more)

### Community 9 - "TypeScript & Vite Config"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, eslint.config.js, src/**/*.tsx, vite/client, vite.config.ts, compilerOptions, allowImportingTsExtensions (+18 more)

### Community 10 - "Hobby Photo Belts"
Cohesion: 0.11
Nodes (24): Original-vs-clone tile accessibility split, Drag-to-scrub with fling momentum, Generated SVG placeholder tiles (MIN_TILES top-up), RAF chosen over CSS keyframe marquee, Free handoff — the settle target IS the belt formula, Velocity continuity via eased per-row speedScale, Wrap-continuity guard (shift the source on a mid-blend wrap), Wrap invariant: period >= W + tileW (+16 more)

### Community 11 - "Travel & Sky Photography"
Cohesion: 0.13
Nodes (25): Concept: Aviation Window-Seat Photography, Photo: Airplane Wing Over Reservoirs (full size), Concept: Overcast Grey Cloud Deck, Photo: Airplane Wing Over Reservoirs (thumbnail), Concept: Thumbnail / Full-Size Responsive Image Pairing, Concept: Temperate Reservoir and Suburban Patchwork Landscape, Concept: Travel and Landscape Photography as a Hobby, Concept: Elevated Vantage Point Over a Wide Landscape (+17 more)

### Community 12 - "Dialog & Button Primitives"
Cohesion: 0.12
Nodes (21): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle (+13 more)

### Community 13 - "Achievement Tracker & Theme Toggle"
Cohesion: 0.19
Nodes (22): AchievementTracker(), KONAMI, SECTION_IDS, ThemeToggle(), KEYS, ACHIEVEMENT_CHANGE_EVENT, commit(), evaluate() (+14 more)

### Community 14 - "Projects Constellation Canvas"
Cohesion: 0.11
Nodes (20): will-change applied only while genuinely animating, Concentric stroke corona instead of an SVG blur filter, CARD_SHELL, CARD_VIGNETTE, cardBorderPoint(), CORE_PASSES, Edge, HALO_PASSES (+12 more)

### Community 15 - "Defensive Behaviour Training Loss"
Cohesion: 0.10
Nodes (23): Evans et al. 2018 - Synaptic threshold mechanism for escape decisions [13], Michaels et al. 2020 - Goal-driven modular neural network [26], Mobbs et al. 2020 - Space, Time and Fear: survival computations [27], Yilmaz & Meister 2013 - Rapid Innate Defensive Responses to Looming Stimuli [46], Death Penalty Term, Deep RL Objective and Loss Function, Dual-Pathway Architecture, Emergence Claim: Freeze/Flight Never Explicitly Prescribed (+15 more)

### Community 16 - "Portfolio Page Sections"
Cohesion: 0.15
Nodes (17): Strands derived from shared tech arrays, never authored, TAGS, DEFAULT_VIEW, EarthNode(), earthView(), Experience(), Projects(), Reveal() (+9 more)

### Community 17 - "Project Brand Imagery"
Cohesion: 0.13
Nodes (22): Rubber Duck Desk Photo, devDucky: Rubber Duck Debugging Project, Healthut Feature Navigation (Level 0, Conversation Sparkers, Collaborative Notes), Centered Hero With Single Get Started CTA, Healthut: Student Mental Health Hub, Healthut Landing Page Screenshot, Site Brand Identity: Dark Ground, Cyan Glow, Circular Blue Waveform Logo Mark (+14 more)

### Community 18 - "Router & Route Tree"
Cohesion: 0.13
Nodes (20): getRouter(), Route, Route, Route, AcheivementsRoute, AchievementsRoute, FileRoutesByFullPath, FileRoutesById (+12 more)

### Community 19 - "GitHub Stats & Slugs"
Cohesion: 0.14
Nodes (14): PROJECT_SLUGS, data, DIVISIONS, formatLastCommit(), getRepoStats(), GitHubStatsFile, relativeTimeFormat, repoSlugFromUrl() (+6 more)

### Community 20 - "Resume Tools & Languages"
Cohesion: 0.13
Nodes (20): anndata, Bash, Bootstrap, Figma, HTML/CSS, Java, MATLAB, Matplotlib (+12 more)

### Community 21 - "shadcn Component Config"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+10 more)

### Community 22 - "Site URL & Canonical Links"
Cohesion: 0.14
Nodes (14): The /hobbies vs "Photography" naming split, Footer(), TOTAL_ACHIEVEMENTS, absoluteUrl(), BASE_URL, ogImageUrl(), SITE_ORIGIN, SITE_URL (+6 more)

### Community 23 - "GEDI Active Learning Research"
Cohesion: 0.13
Nodes (19): Active Learning Pipelines, Attentive Neural Processes (ANPs), BCS, Artificial Intelligence Specialization (Expected Dec. 2027), Cold-Start Problem, Data Starvation Regime (<1% sample size), Gaussian Random Fields, GEDI Biomass Estimation, 2D Landscape Generator (3,000+ simulated data points) (+11 more)

### Community 24 - "GitHub Actions Workflows"
Cohesion: 0.18
Nodes (18): Dependabot bun ecosystem updates (weekly, grouped), Dependabot github-actions ecosystem updates (weekly), CI workflow (pull requests only), PR-only trigger to avoid duplicate verify/Lighthouse builds, CodeQL analyze job (javascript-typescript, build-mode none), Lighthouse audit hosted in deploy.yml so it can gate publishing, Build and deploy to GitHub Pages workflow, deploy job (downloads site-build, publishes to Pages) (+10 more)

### Community 25 - "Lake & Cottage Photography"
Cohesion: 0.25
Nodes (18): Concept: Foliage-Framed Landscape Composition, Concept: Mixed Pine and Maple Forest Shoreline, Concept: Northern Freshwater Lake, Concept: Outdoors and Nature as a Personal Interest, Concept: Thumbnail / Full-Size Responsive Image Pair, Photo: Lake Framed by Maple and Pine Branches (full size), Photo: Lake Framed by Maple and Pine Branches (thumbnail), Concept: Rustic Cabin / Cottage Retreat (+10 more)

### Community 26 - "Menubar Primitive"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 27 - "Landing Page Hero"
Cohesion: 0.13
Nodes (10): BALLS, container, item, RotatingRole(), SaiName(), ScrollTop(), SOCIAL_ICONS, sphereStyle() (+2 more)

### Community 28 - "Retinal Looming Detection"
Cohesion: 0.15
Nodes (16): Amacrine Cells (SACs, VG3 looming detectors), Campagner et al. 2023 - Cortico-collicular circuit for orienting to shelter [5], Kim et al. 2020 - Dendritic and parallel processing of visual threats in the retina [20], Mauss et al. 2017 - Visual circuits for direction selectivity [25], Wang et al. 2021 - OFF-transient alpha RGCs mediate looming-triggered defense [44], Zhang et al. 2012 - Most numerous ganglion cell type is a selective feature detector [47], ON-OFF Direction-Selective RGCs (DSGCs), Figure 2: Egocentric Time-Series of the Looming Stimulus (+8 more)

### Community 29 - "Theme & Local State"
Cohesion: 0.18
Nodes (14): No global state library — module + localStorage + CustomEvent, The URL (?p=<slug>) is the single source of truth for the open modal, DEFAULT_THEME, getServerThemeSnapshot(), getStoredTheme(), isTheme(), readCurrentTheme(), subscribeToTheme() (+6 more)

### Community 30 - "CORnet-Mouse Architecture"
Cohesion: 0.17
Nodes (15): Brain-Score Benchmark, Kubilius et al. 2019 - Brain-like object recognition with shallow recurrent ANNs [21], Marshel et al. 2011 - Functional specialization of mouse higher visual areas, Piscopo et al. 2013 - dLGN receptive field classes (basis of MouseNet 9x9 kernel), Shi et al. 2022 - MouseNet [38], Tschetter et al. 2018 - Adult mouse dLGN receptive field radii, CORnet-Mouse (CORM) Architecture, CORnet-S (primate ventral stream model) (+7 more)

### Community 31 - "Motor Control & Arena Simulation"
Cohesion: 0.20
Nodes (15): Caggiano et al. 2018 - Midbrain circuits that set locomotor speed and gait [4], Pritzel et al. 2017 - Neural Episodic Control [30], Sauerbrei et al. 2020 - Cortical pattern generation is input-driven [34], Shamash et al. 2021 - Mice learn multi-step routes by memorizing subgoal locations [36], Cortical Dimensionality Reduction (780:1 to 7800:1), Egocentric Shelter Spatial Vector Input, Embodied Physical Control Constraint (inertia, turning radius), Figure 7: Overhead and Prey's-Eye Views of the Simulated Arena (+7 more)

### Community 32 - "Starfield Background"
Cohesion: 0.16
Nodes (12): Starfield(), DARK_ACCENT_RGB, DARK_PLAIN_RGB, LIGHT_ACCENT_RGB, LIGHT_PLAIN_RGB, Star, StarfieldHandle, StarfieldOptions (+4 more)

### Community 33 - "Form Primitives"
Cohesion: 0.19
Nodes (12): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+4 more)

### Community 34 - "Animation & Hydration Rationale"
Cohesion: 0.16
Nodes (14): Hydration safety — render the fallback first, switch in a layout effect, Animation loops never touch React state (one RAF loop → motionValues), The belt is a formula, not a container (no track elements), Why the width bail (MOTION_MIN_WIDTH on container clientWidth), AABB collision along the axis of minimum penetration, Strand redraws coalesced through a microtask, not a rAF, Single RAF physics loop (drift, damping, wall bounce), Fling badge (THROW_ACHIEVEMENT_SPEED) (+6 more)

### Community 35 - "Achievement Stats Worker"
Cohesion: 0.19
Nodes (13): Optional VITE_* environment variables (all public, inert when unset), VITE_ACHIEVEMENTS_ENDPOINT, VITE_CONTACT_ENDPOINT, ACHIEVEMENT_IDS, rarityHint — authored fallback estimate, Abuse mitigations (allowlist, caps, composite primary key), GET /rarity (edge-cached 5 minutes), POST /unlocks (+5 more)

### Community 36 - "Worker TypeScript Config"
Cohesion: 0.14
Nodes (13): @cloudflare/workers-types, compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+5 more)

### Community 37 - "Carousel Primitive"
Cohesion: 0.19
Nodes (13): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+5 more)

### Community 38 - "Radix Runtime Dependencies"
Cohesion: 0.15
Nodes (13): clsx, input-otp, dependencies, clsx, input-otp, @radix-ui/react-checkbox, @radix-ui/react-radio-group, @radix-ui/react-toggle (+5 more)

### Community 39 - "Base Path & Asset URLs"
Cohesion: 0.19
Nodes (11): Lighthouse base-path trick (audit the real base-prefixed build), Base path derived from GITHUB_REPOSITORY (SITE_BASE override), Manifests store bare, document-relative paths, About(), assetUrl(), VCARD_FILENAME, VCARD_PATH, VCardDownloadProps (+3 more)

### Community 40 - "Lint & Build Dev Dependencies"
Cohesion: 0.15
Nodes (13): eslint-config-prettier, @eslint/js, eslint-plugin-prettier, eslint-plugin-react-refresh, devDependencies, eslint-config-prettier, @eslint/js, eslint-plugin-prettier (+5 more)

### Community 41 - "Package Scripts"
Cohesion: 0.17
Nodes (12): scripts, assets, build, build:dev, build:static, dev, format, format:check (+4 more)

### Community 42 - "Freeze/Escape Midbrain Circuit"
Cohesion: 0.17
Nodes (12): Behavioral Selection Softmax (freeze vs escape), Behavioural Bifurcation Plot (action vs shelter distance), Basolateral Amygdala (BLA), Central Amygdala (CeA), Tovote et al. 2016 - Midbrain circuits for defensive behaviour [41], Vale, Evans & Branco 2017 - Rapid spatial learning controls instinctive defense [43], Cuneiform Nucleus (locomotor urgency scalar), Dorsal Periaqueductal Gray (dPAG) (+4 more)

### Community 43 - "Clinical Simulation NLP Project"
Cohesion: 0.23
Nodes (12): AI-Driven Simulated Patients for Clinical Training, Email Classifier for Case-Handling Automation, Express, GR Hospital (deployment site), LLM Hallucination Reduction, medspaCy, NLP Evaluation Modules (clarity, tone, accuracy), NLTK (+4 more)

### Community 44 - "Cloud Infrastructure Skills"
Cohesion: 0.17
Nodes (12): AWS, Azure, Docker, Dynamic Availability Mapping, GCP, Go, End-to-End Interview Scheduling System, Multi-Cloud Architecture Design (30+ apps) (+4 more)

### Community 45 - "Achievement Rarity Fetching"
Cohesion: 0.30
Nodes (10): BASELINE, useAchievementRarity(), ENDPOINT, fetchRarity(), getAchievementsEndpoint(), isRarityEnabled(), isRecord(), RarityData (+2 more)

### Community 46 - "SSR Error Handling"
Cohesion: 0.30
Nodes (7): consumeLastCapturedError(), renderErrorPage(), fetch(), getServerEntry(), normalizeCatastrophicSsrResponse(), ServerEntry, errorMiddleware

### Community 47 - "Hobby Lightbox & Focus Trap"
Cohesion: 0.27
Nodes (8): Pause mechanisms (WCAG 2.2.2 button, focus, hover, lightbox), ExperienceModal(), HobbyLightbox(), tint(), usePreloadNeighbours(), HobbyPhoto, FOCUSABLE, useFocusTrap()

### Community 48 - "Thalamocortical Visual Pathway"
Cohesion: 0.20
Nodes (11): Mouse Brain Scale Constraints (volumes, neuron counts), Billeh et al. 2020 - Multi-scale models of mouse primary visual cortex [3], Carandini & Heeger 2012 - Normalization as a canonical neural computation [7], Guillery & Sherman 2002 - Thalamic relay functions [16], Liang et al. 2015 - Sensory cortical control of arrest via corticotectal projections [24], Zhao, Liu & Cang 2014 - Visual cortex modulates magnitude of looming-evoked SC responses [48], Corticotectal V1-to-SC Gain Modulation, dLGN Module (2D conv, 116 channels, 7x7 kernel, L1) (+3 more)

### Community 49 - "Superior Colliculus Modules"
Cohesion: 0.20
Nodes (11): De Franceschi et al. 2016 - Vision guides freeze or flight selection [10], Lee et al. 2020 - The sifting of visual information in the superior colliculus [22], Shang et al. 2018 - Divergent midbrain circuits for escape and freezing [37], Tsang et al. 2023 - Induction of flight via midbrain projections to cuneiform [42], Wei et al. 2015 - Visually evoked innate fear via non-canonical thalamic pathway [45], Deep Superior Colliculus (dSC) Module, Escape Branch (dSC to PBG to BLA to dPAG to cuneiform), Figure 1: Freeze vs Flight Defensive Behaviour Abstraction (+3 more)

### Community 50 - "Derived Responsive Images"
Cohesion: 0.25
Nodes (11): DevDucky Project Photo (400w WebP), Site Favicon 32px (Waveform Mark), Healthut Landing Page Screenshot (400w WebP), Healthut Landing Page Screenshot (800w WebP), Site Logo Mark (76w WebP), PatronPal Dashboard Screenshot (400w WebP), PatronPal Dashboard Screenshot (800w WebP), Author Portrait with Campus Mascot (424w WebP) (+3 more)

### Community 51 - "Nav & Scroll Spy"
Cohesion: 0.24
Nodes (9): ACTIVE_LINK_STYLE, LINK_STYLE, Nav(), PILL_STYLE, RESUME_STYLE, SECTION_IDS, NAV_LINKS, useScrollSpy() (+1 more)

### Community 52 - "Chart Primitive"
Cohesion: 0.25
Nodes (9): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, getPayloadConfigFromPayload(), THEMES (+1 more)

### Community 53 - "Retinal Photoreceptor Circuit"
Cohesion: 0.20
Nodes (10): Fu & Yau 2007 - Phototransduction in mouse rods and cones [14], Huberman & Niell 2011 - What can mice tell us about how vision works? [18], Rompani et al. 2017 - Modes of visual integration in the LGN [32], Soto et al. 2025 - Molecular mechanism establishing the OFF pathway in vision [40], Difference-of-Gaussians Receptive Field as Conv Kernel, Figure 4: Retinal Circuit Organization (photoreceptors to RGCs), L1 Kernel Sparsity for Sparse Retinal Convergence, Naka-Rushton Contrast Sensitivity / Weber Adaptation (+2 more)

### Community 54 - "MathSoc Full-Stack Role"
Cohesion: 0.20
Nodes (10): Bulk Exam Management (multi-select UI + REST endpoints), Frontend Lazy Loading, JavaScript, Mathematics Society of the University of Waterloo, Memoized Term-Lookup Utilities, Next.js, React, RESTful API Design (+2 more)

### Community 55 - "Marsh McLennan DevSecOps"
Cohesion: 0.27
Nodes (10): Automated 300+-Instance Database Deployments, GitGuardian, GitHub Actions, JWT, Marsh McLennan (Toronto, ON), Mastra AI, Natural-Language-to-Workflow App, GitHub Bot for OWASP Vulnerability Auditing (+2 more)

### Community 56 - "Resume Identity & Roles"
Cohesion: 0.22
Nodes (9): Alternative Protein Project (Waterloo, ON), Capital One (Toronto, ON), Cultivated Meat, Resume (Saivenkat Jilla), GitHub: sai3000pro / LinkedIn: in/saivenkat-jilla, End-to-End RNA-seq Workflow, Machine Learning Researcher (Jul. 2024 - Aug. 2025), Software Engineering Intern, Capital One (May 2026 - Aug. 2026) (+1 more)

### Community 57 - "BiQuadris C++ Project"
Cohesion: 0.22
Nodes (9): BiQuadris - Tetris Clone, C/C++, Git, Linux, MVC Architecture, Object-Oriented Programming Principles, SDLC, UML (+1 more)

### Community 58 - "Global X Web Automation"
Cohesion: 0.29
Nodes (8): BeautifulSoup, EN/FR Content Synchronization and Internal Linking Automation, 80+ Pages / Email Blasts (32.4% open rate), Global X Investments Canada (Toronto, ON), PHP, Python, Software Engineering Intern, Global X (Jan. 2025 - Apr. 2025), WordPress

### Community 59 - "Breadcrumb Primitive"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 60 - "Navigation Menu Primitive"
Cohesion: 0.29
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 61 - "Select Primitive"
Cohesion: 0.25
Nodes (7): SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 62 - "Toggle Primitives"
Cohesion: 0.43
Nodes (5): ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 63 - "Dialog Primitive"
Cohesion: 0.33
Nodes (5): DialogDescription, DialogFooter(), DialogHeader(), DialogOverlay, DialogTitle

### Community 64 - "Package Manifest Fields"
Cohesion: 0.40
Nodes (4): name, private, sideEffects, type

### Community 65 - "Mouse Eye Geometry"
Cohesion: 0.50
Nodes (5): 22-degree Upward-Pitched Wide-FOV Camera, Ambrad Giovannetti & Rancz 2024 - Behind mouse eyes: eye movements in mice [1], Oommen & Stahl 2008 - Eye orientation and spontaneous head pitch in the mouse [28], Dynamic Postural Geometry (-29 degree head pitch), Figure 8: Spatial and Visual Field Constraints of the Agent

### Community 66 - "Alert Primitive"
Cohesion: 0.50
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 67 - "Input OTP Primitive"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 69 - "Retinotopy Mapping"
Cohesion: 0.67
Nodes (3): Seabrook et al. 2017 - Architecture, function and assembly of the mouse visual system [35], Figure 3: Retinotopy and Eye Specificity in Mouse Visual System, Retinotopy and Eye Specificity Mapping

## Ambiguous Edges - Review These
- `CodeQL analyze job (javascript-typescript, build-mode none)` → `Build and deploy to GitHub Pages workflow`  [AMBIGUOUS]
  .github/workflows/codeql.yml · relation: conceptually_related_to
- `Multi-Cloud Architecture Design (30+ apps)` → `Docker`  [AMBIGUOUS]
  public/assets/Resume.pdf · relation: references
- `Memoized Term-Lookup Utilities` → `JavaScript`  [AMBIGUOUS]
  public/assets/Resume.pdf · relation: references
- `80+ Pages / Email Blasts (32.4% open rate)` → `WordPress`  [AMBIGUOUS]
  public/assets/Resume.pdf · relation: references
- `EN/FR Content Synchronization and Internal Linking Automation` → `BeautifulSoup`  [AMBIGUOUS]
  public/assets/Resume.pdf · relation: references
- `Healthut Landing Page Screenshot` → `Rubber Duck Desk Photo`  [AMBIGUOUS]
  public/assets/devDucky.jpg · relation: conceptually_related_to
- `Healthut Feature Navigation (Level 0, Conversation Sparkers, Collaborative Notes)` → `PatronPal: Watch-Time Weighted Creator Payout Split`  [AMBIGUOUS]
  public/assets/patronPal.png · relation: conceptually_related_to
- `devDucky: Rubber Duck Debugging Project` → `Portfolio Owner / About Page Subject`  [AMBIGUOUS]
  public/assets/portrait.jpeg · relation: conceptually_related_to
- `Site Brand Identity: Dark Ground, Cyan Glow` → `Geographic Location / Global Reach Motif`  [AMBIGUOUS]
  public/assets/world.svg · relation: conceptually_related_to
- `DevDucky Project Photo (400w WebP)` → `Verbalyst Hero Screenshot (400w WebP)`  [AMBIGUOUS]
  public/assets/derived/devducky-400w.webp · relation: semantically_similar_to
- `Site Logo Mark (76w WebP)` → `Author Portrait with Campus Mascot (768w WebP)`  [AMBIGUOUS]
  public/assets/derived/portrait-768w.webp · relation: conceptually_related_to
- `Photo: Airplane Wing Over Reservoirs (full size)` → `Concept: Temperate Reservoir and Suburban Patchwork Landscape`  [AMBIGUOUS]
  public/assets/hobbies/img-0021-full.webp · relation: conceptually_related_to
- `Concept: Temperate Reservoir and Suburban Patchwork Landscape` → `Concept: Quarried Hillside and Concrete Construction`  [AMBIGUOUS]
  public/assets/hobbies/img-0034-full.webp · relation: conceptually_related_to
- `Concept: Hilltop Viewpoint with Railing and Planters` → `Concept: South Indian Monsoon Farmland Plain`  [AMBIGUOUS]
  public/assets/hobbies/img-0034-full.webp · relation: conceptually_related_to
- `Concept: Stargazing / Night-Sky Watching Impulse` → `Concept: Travel and Landscape Photography as a Hobby`  [AMBIGUOUS]
  public/assets/hobbies/img-0048.webp · relation: conceptually_related_to
- `Concept: Northern Freshwater Lake` → `Concept: Rustic Cabin / Cottage Retreat`  [AMBIGUOUS]
  public/assets/hobbies/img-0105-full.webp · relation: conceptually_related_to
- `Concept: Foliage-Framed Landscape Composition` → `Concept: Friends Gathered at Golden Hour`  [AMBIGUOUS]
  public/assets/hobbies/img-0108-full.webp · relation: conceptually_related_to

## Knowledge Gaps
- **383 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `css` (+378 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **63 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CodeQL analyze job (javascript-typescript, build-mode none)` and `Build and deploy to GitHub Pages workflow`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Multi-Cloud Architecture Design (30+ apps)` and `Docker`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Memoized Term-Lookup Utilities` and `JavaScript`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `80+ Pages / Email Blasts (32.4% open rate)` and `WordPress`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `EN/FR Content Synchronization and Internal Linking Automation` and `BeautifulSoup`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Healthut Landing Page Screenshot` and `Rubber Duck Desk Photo`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Healthut Feature Navigation (Level 0, Conversation Sparkers, Collaborative Notes)` and `PatronPal: Watch-Time Weighted Creator Payout Split`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
// GLOBAL VARIABLES
let currentState = 0;
let modelsLoaded = false;
let teachableMachineModel = null;
let handPoseModel = null;
let notificationTimeout = null;

let gsapTimelines = {
    landing: null,
    silhouettes: null,
    morph: null,
    journey: null
};

let scrollTriggers = [];

// Game state variables for STATE 5
let webcamVideo = null;
let hands = [];
let mushrooms = [];
let gameScore = 0;
let gameStartTime = 0;
let ediblePicked = 0;
let poisonousPicked = 0;
let rarePicked = 0;
let isGamePlaying = false;
let isPinching = false;
let wasPinching = false;

// Test state variables for STATE 3
let testCurrentMushroomIndex = 0;
let testScore = 0;
let testIsProcessing = false;
let testShuffledMushrooms = [];

// initialization
const init = () => {
    console.log('Initializing mushroom application...');

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger, TextPlugin, MorphSVGPlugin);
        console.log('GSAP plugins registered successfully');
    } else {
        console.error('GSAP or plugins not loaded!');
        return;
    }

    setupEventListeners();
    preloadModelsInBackground(); // This loads AI models silently in background
    setupBackgroundMusic();

    // Start at landing page
    transitionToState(0);
}

const setupBackgroundMusic = () => {
    // Create audio element
    const bgMusic = new Audio('assets/background-music.mp3');
    bgMusic.loop = true;
    bgMusic.volume = 0.3;

    // Try to play immediately
    bgMusic.play().catch(function (_error) {
        console.log('Autoplay prevented, will play after first user interaction');

        // If autoplay is blocked, play after first click
        document.addEventListener('click', function playOnce() {
            bgMusic.play();
            document.removeEventListener('click', playOnce);
        }, { once: true });
    });

}

// Model preloading

const preloadModelsInBackground = async () => {
    console.log('Loading AI models in background...');

    try {
        // Wait for TensorFlow backend to be ready
        await tf.ready();
        console.log('TensorFlow.js ready');

        // Load Teachable Machine model
        const modelURL = 'https://teachablemachine.withgoogle.com/models/yFQd_XGkx/model.json';
        const metadataURL = 'https://teachablemachine.withgoogle.com/models/yFQd_XGkx/metadata.json';
        teachableMachineModel = await tmImage.load(modelURL, metadataURL);
        console.log('Teachable Machine model loaded');

        // Load ML5 HandPose
        handPoseModel = await ml5.handPose();
        console.log('HandPose model loaded');

        modelsLoaded = true;
        console.log('All AI models loaded successfully in background');

    } catch (error) {
        console.error('Error loading models:', error);
        modelsLoaded = false;
    }
}

// Event listeners setup

const setupEventListeners = () => {
    console.log('Setting up event listeners...');

    const backButtons = document.querySelectorAll('.back-button');
    for (let i = 0; i < backButtons.length; i++) {
        backButtons[i].addEventListener('click', function () {
            const backState = parseInt(this.getAttribute('data-back'));
            transitionToState(backState);
        });
    }

    const nextButtons = document.querySelectorAll('[data-next-state]');
    for (let i = 0; i < nextButtons.length; i++) {
        nextButtons[i].addEventListener('click', function () {
            const nextState = parseInt(this.getAttribute('data-next-state'));
            transitionToState(nextState);
        });
    }

    // Landing page button
    const enterForestBtn = document.querySelector('#enter-forest-btn');
    if (enterForestBtn) {
        enterForestBtn.addEventListener('click', function () {
            transitionToState(1);
        });
    }

    // Story page button
    const learnMushroomsBtn = document.querySelector('#learn-mushrooms-btn');
    if (learnMushroomsBtn) {
        learnMushroomsBtn.addEventListener('click', function () {
            transitionToState(2);
        });
    }

    // Education page button
    const takeTestBtn = document.querySelector('#take-test-btn');
    if (takeTestBtn) {
        takeTestBtn.addEventListener('click', function () {
            transitionToState(3);
        });
    }

    // Journey page button - "Start Foraging!"
    const continueBtn = document.querySelector('#state-4 .continue-btn');
    if (continueBtn) {
        continueBtn.removeAttribute('onclick'); // remove the old onclick
        continueBtn.addEventListener('click', function () {
            transitionToState(5);
        });
    }

    console.log('Event listeners setup complete');
}

// State management

const hideAllStates = () => {
    const allStates = document.querySelectorAll('.app-state');
    for (let i = 0; i < allStates.length; i++) {
        allStates[i].classList.remove('active');
        allStates[i].style.display = 'none';
        allStates[i].style.opacity = '0';
        allStates[i].style.visibility = 'hidden';
    }
}

const showState = (stateNum) => {
    const stateElement = document.querySelector('#state-' + stateNum);
    if (stateElement) {
        stateElement.classList.add('active');
        stateElement.style.display = 'block';
        stateElement.style.opacity = '1';
        stateElement.style.visibility = 'visible';
        console.log('State ' + stateNum + ' shown');
    } else {
        console.error('State element not found: state-' + stateNum);
    }
}

const transitionToState = (newState) => {
    console.log('Transitioning from state ' + currentState + ' to state ' + newState);

    // Check if models are needed and loaded
    if ((newState === 3 || newState === 5) && modelsLoaded === false) {
        alert('AI models are still loading. Please wait a moment and try again.');
        return;
    }

    cleanupCurrentState();

    // Force scroll to top IMMEDIATELY 
    window.scrollTo(0, 0);

    // Kill ALL ScrollTriggers globally AGAIN (just to be sure)
    if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.getAll().forEach(function (trigger) {
            trigger.kill(true);
        });
    }

    hideAllStates();

    currentState = newState;
    showState(newState);

    const navButtons = document.querySelectorAll('.nav-btn');
    for (let i = 0; i < navButtons.length; i++) {
        navButtons[i].classList.remove('active');
        if (parseInt(navButtons[i].getAttribute('data-state')) === newState) {
            navButtons[i].classList.add('active');
        }
    }

    // Force scroll AGAIN
    window.scrollTo(0, 0);

    // Wait for rendering to complete, then scroll AGAIN and initialize
    requestAnimationFrame(function () {
        window.scrollTo(0, 0);

        setTimeout(function () {
            // Scroll one final time before initialization
            window.scrollTo(0, 0);

            // Initialize the new state
            if (newState === 0) {
                initLandingState();
            }
            if (newState === 1) {
                initStoryState();
            }
            if (newState === 2) {
                initEducationState();
            }
            if (newState === 3) {
                initTestState();
            }
            if (newState === 4) {
                initJourneyState();
            }
            if (newState === 5) {
                initHuntState();
            }
        }, 150);
    });
}

const cleanupCurrentState = () => {
    console.log('Cleaning up state:', currentState);

    // Kill all GSAP timelines
    if (gsapTimelines.landing) {
        gsapTimelines.landing.kill();
        gsapTimelines.landing = null;
    }
    if (gsapTimelines.silhouettes) {
        gsapTimelines.silhouettes.kill();
        gsapTimelines.silhouettes = null;
    }
    if (gsapTimelines.morph) {
        gsapTimelines.morph.kill();
        gsapTimelines.morph = null;
    }
    if (gsapTimelines.journey) {
        gsapTimelines.journey.kill();
        gsapTimelines.journey = null;
    }

    // Kill all ScrollTriggers from array
    for (let i = 0; i < scrollTriggers.length; i++) {
        scrollTriggers[i].kill(true);
    }
    scrollTriggers = [];

    // Kill ALL ScrollTriggers globally
    if (typeof ScrollTrigger !== 'undefined') {
        const allTriggers = ScrollTrigger.getAll();
        for (let i = 0; i < allTriggers.length; i++) {
            allTriggers[i].kill(true);
        }

        // Clear ScrollTriggers cache
        ScrollTrigger.clearScrollMemory();

        // Reset ScrollTrigger completely
        ScrollTrigger.refresh();
    }

    // Kill all running GSAP animations
    gsap.killTweensOf('*');

    // Clean up any pinned elements from State 2
    if (currentState === 2) {
        resetSvgStickyPosition();

        const scrollContainerJourney = document.querySelector('#state-4 .scroll-container-journey');
        if (scrollContainerJourney) {
            scrollContainerJourney.removeAttribute('style');
            gsap.set(scrollContainerJourney, { clearProps: 'all' });
        }
    }

    // Clean up State 4 pinned elements
    if (currentState === 4) {
        const scrollContainerJourney = document.querySelector('#state-4 .scroll-container-journey');
        const forestJourney = document.querySelector('#state-4 .forest-journey');

        if (scrollContainerJourney) {
            scrollContainerJourney.removeAttribute('style');
            gsap.set(scrollContainerJourney, { clearProps: 'all' });
        }
        if (forestJourney) {
            forestJourney.removeAttribute('style');
            gsap.set(forestJourney, { clearProps: 'all' });
        }
    }

    // Cleanup State 5 (Hunt)
    if (currentState === 5) {
        isGamePlaying = false;

        // Stop hand detection
        if (handPoseModel && webcamVideo) {
            try {
                handPoseModel.detectStop();
            } catch (e) {
                console.log('HandPose already stopped');
            }
        }

        // Stop camera stream
        if (webcamVideo && webcamVideo.srcObject) {
            const tracks = webcamVideo.srcObject.getTracks();
            for (let i = 0; i < tracks.length; i++) {
                tracks[i].stop();
            }
            webcamVideo.srcObject = null;
        }

        // Remove all mushroom elements
        for (let i = 0; i < mushrooms.length; i++) {
            if (mushrooms[i].element && mushrooms[i].element.parentNode) {
                mushrooms[i].element.remove();
            }
        }
        mushrooms = [];

        // *** ADD THIS: Clean up any lingering STATE 5 styles ***
        const huntCanvas = document.querySelector('#state-5 #canvas');
        if (huntCanvas) {
            gsap.set(huntCanvas, { clearProps: 'all' });
        }

        // Remove any notifications
        const notification = document.querySelector('#hunt-notification');
        if (notification) {
            notification.remove();
        }
    }
}

// STATE 0: LANDING

const initLandingState = () => {
    console.log('Initializing Landing State...');

    createLandingParticles();
    animateSunRays();
    animateGrandmother();
    animateLandingContent();
    addLandingButtonHover();
}

const createLandingParticles = () => {
    const container = document.querySelector('#state-0 #particles-container');
    if (container === null) {
        return;
    }

    container.innerHTML = '';

    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        container.appendChild(particle);
    }

    animateParticles();
}

const animateParticles = () => {
    const particles = document.querySelectorAll('#state-0 .particle');

    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        const duration = 10 + Math.random() * 10;
        const delay = Math.random() * 2;
        const x = (Math.random() - 0.5) * 200;
        const y = -100 - Math.random() * 50;

        gsap.to(particle, {
            x: x,
            y: y,
            opacity: Math.random() * 0.5 + 0.2,
            duration: duration,
            delay: delay,
            repeat: -1,
            ease: 'none'
        });

        gsap.to(particle, {
            x: '+=' + (Math.random() - 0.5) * 50,
            duration: 3 + Math.random() * 2,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        });
    }
}

const animateSunRays = () => {
    const sunRays = document.querySelectorAll('#state-0 .sun-ray');

    for (let i = 0; i < sunRays.length; i++) {
        const ray = sunRays[i];
        gsap.to(ray, {
            opacity: 1,
            duration: 2,
            delay: i * 0.3,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        });
    }
}

const animateGrandmother = () => {
    const grandma = document.querySelector('#state-0 .grandmother-hero');
    if (grandma === null) {
        return;
    }

    gsap.to(grandma, {
        opacity: 1,
        duration: 2,
        delay: 1.5,
        ease: 'power2.inOut'
    });

    gsap.to(grandma, {
        y: -8,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 2
    });

    gsap.to(grandma, {
        rotation: 1,
        transformOrigin: 'bottom center',
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 2
    });
}

const animateLandingContent = () => {
    gsapTimelines.landing = gsap.timeline({ defaults: { ease: 'power2.out' } });

    gsapTimelines.landing.to('#state-0 .landing-title', {
        opacity: 1,
        y: 0,
        duration: 1.2
    }, 0.5);

    gsapTimelines.landing.to('#state-0 .landing-subtitle', {
        opacity: 1,
        y: 0,
        duration: 1
    }, 1.5);

    gsapTimelines.landing.to('#state-0 .landing-intro', {
        opacity: 1,
        y: 0,
        duration: 1
    }, 1.8);

    gsapTimelines.landing.to('#state-0 .nav-button', {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        ease: 'back.out(1.7)'
    }, 2.2);
}

const addLandingButtonHover = () => {
    const button = document.querySelector('#state-0 .nav-button');
    if (button === null) {
        return;
    }

    button.addEventListener('mouseenter', function () {
        gsap.to(button, {
            scale: 1.05,
            duration: 0.3,
            ease: 'power2.out'
        });
    });

    button.addEventListener('mouseleave', function () {
        gsap.to(button, {
            scale: 1,
            duration: 0.3,
            ease: 'power2.out'
        });
    });
}

// STATE 1: STORY
const initStoryState = () => {
    console.log('Initializing Story State...');

    // Force scroll to top
    window.scrollTo(0, 0);

    // Wait for DOM to be ready
    setTimeout(function () {
        const silhouettes = document.querySelector('#state-1 .family-silhouettes');
        if (silhouettes) {
            silhouettes.style.opacity = '0';
            silhouettes.style.visibility = 'hidden';
        }

        // Always setup animations
        setupSilhouettesVisibility();
        animateSilhouettes();
        animateLeaves();
        animateStorySection1();
        animateStorySection2();
        animateStorySection3();
        animateStorySection4();
        animateGrandmaSpeech();

        // Refresh ScrollTrigger after everything is set up
        setTimeout(function () {
            if (typeof ScrollTrigger !== 'undefined') {
                ScrollTrigger.refresh(true);
            }
        }, 100);
    }, 300);
}

// Walikng from on side to another
const setupSilhouettesVisibility = () => {
    const trigger = ScrollTrigger.create({
        trigger: '#state-1 #story-1',
        start: 'top 100%',
        end: 'bottom 0%',
        onEnter: function () {
            gsap.to('#state-1 .family-silhouettes', {
                opacity: 1,
                visibility: 'visible',
                duration: 1
            });
        },
        onLeave: function () {
            gsap.to('#state-1 .family-silhouettes', {
                opacity: 0,
                visibility: 'hidden',
                duration: 1
            });
        },
        onEnterBack: function () {
            gsap.to('#state-1 .family-silhouettes', {
                opacity: 1,
                visibility: 'visible',
                duration: 1
            });
        },
        onLeaveBack: function () {
            gsap.to('#state-1 .family-silhouettes', {
                opacity: 0,
                visibility: 'hidden',
                duration: 1
            });
        }
    });

    scrollTriggers.push(trigger);
}

// Giving life to them so they move not only horizontaly but also verticaly 
const animateSilhouettes = () => {
    gsapTimelines.silhouettes = gsap.timeline({ repeat: -1 });

    gsapTimelines.silhouettes.to('#state-1 .silhouette-group-1', {
        x: '120vw',
        duration: 45,
        ease: 'none'
    }, 0);

    gsapTimelines.silhouettes.to('#state-1 .silhouette-group-2', {
        x: '120vw',
        duration: 50,
        ease: 'none'
    }, 0);

    gsapTimelines.silhouettes.to('#state-1 .silhouette-group-3', {
        x: '120vw',
        duration: 55,
        ease: 'none'
    }, 0);

    gsap.to('#state-1 .silhouette-group-1', {
        y: '-=10',
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });

    gsap.to('#state-1 .silhouette-group-2', {
        y: '-=8',
        duration: 2.3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });

    gsap.to('#state-1 .silhouette-group-3', {
        y: '-=12',
        duration: 1.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
    });
}

//Randomly falling leaves
const animateLeaves = () => {
    const story1Leaves = document.querySelectorAll('#state-1 #story-1 .leaf');
    const story2Leaves = document.querySelectorAll('#state-1 #story-2 .leaf');

    for (let i = 0; i < story1Leaves.length; i++) {
        const leaf = story1Leaves[i];
        gsap.to(leaf, {
            y: '100vh',
            x: 'random(-100, 100)',
            rotation: 'random(-360, 360)',
            duration: 'random(15, 25)',
            repeat: -1,
            delay: i * 2,
            ease: 'none'
        });
    }

    for (let i = 0; i < story2Leaves.length; i++) {
        const leaf = story2Leaves[i];
        gsap.to(leaf, {
            y: '100vh',
            x: 'random(-100, 100)',
            rotation: 'random(-360, 360)',
            duration: 'random(15, 25)',
            repeat: -1,
            delay: i * 2,
            ease: 'none'
        });
    }
}

const animateStorySection1 = () => {
    gsap.to('#state-1 #story-1 .decorative-line', {
        opacity: 1,
        width: 300,
        duration: 1,
        delay: 0.5
    });
}

// Scroll through text fades in and moves up
const animateStorySection2 = () => {
    const section2 = document.querySelector('#state-1 #story-2');
    if (section2 === null) {
        return;
    }

    gsap.fromTo(section2,
        { opacity: 0, y: 50 },
        {
            opacity: 1,
            y: 0,
            scrollTrigger: {
                trigger: section2,
                start: 'top 80%',
                end: 'top 30%',
                scrub: 1,
                toggleActions: 'play reverse play reverse'
            }
        }
    );

    gsap.to('#state-1 #story-2 .decorative-line', {
        opacity: 1,
        width: 300,
        scrollTrigger: {
            trigger: section2,
            start: 'top 75%',
            end: 'top 40%',
            scrub: 1
        }
    });
}

const animateStorySection3 = () => {
    const section3 = document.querySelector('#state-1 #story-3');
    if (section3 === null) {
        return;
    }

    gsap.fromTo(section3,
        { opacity: 0, y: 50 },
        {
            opacity: 1,
            y: 0,
            scrollTrigger: {
                trigger: section3,
                start: 'top 80%',
                end: 'top 30%',
                scrub: 1,
                toggleActions: 'play reverse play reverse'
            }
        }
    );

    gsap.to('#state-1 #story-3 .decorative-line', {
        opacity: 1,
        width: 300,
        scrollTrigger: {
            trigger: section3,
            start: 'top 75%',
            end: 'top 40%',
            scrub: 1
        }
    });
}

const animateStorySection4 = () => {
    const section4 = document.querySelector('#state-1 #story-4');
    if (section4 === null) {
        return;
    }

    gsap.fromTo(section4,
        { opacity: 0, y: 50 },
        {
            opacity: 1,
            y: 0,
            scrollTrigger: {
                trigger: section4,
                start: 'top 80%',
                end: 'top 30%',
                scrub: 1,
                toggleActions: 'play reverse play reverse'
            }
        }
    );

    gsap.to('#state-1 #story-4 .decorative-line', {
        opacity: 1,
        width: 300,
        scrollTrigger: {
            trigger: section4,
            start: 'top 75%',
            end: 'top 40%',
            scrub: 1
        }
    });
}

const animateGrandmaSpeech = () => {
    const speechBubble = document.querySelector('#state-1 #grandmaSpeech');
    if (speechBubble === null) {
        return;
    }

    // Store original text if not already stored
    if (!speechBubble.hasAttribute('data-original-text')) {
        speechBubble.setAttribute('data-original-text', speechBubble.textContent);
    }

    const speechText = speechBubble.getAttribute('data-original-text');
    speechBubble.textContent = ''; // Clear it

    // Fade in the speech bubble
    gsap.to(speechBubble, {
        opacity: 1,
        scrollTrigger: {
            trigger: '#state-1 #story-4',
            start: 'top 50%',
            toggleActions: 'play none none reverse'
        }
    });

    // Animate grandma talk text 
    gsap.to(speechBubble, {
        duration: 3,
        text: {
            value: speechText
        },
        ease: 'none',
        scrollTrigger: {
            trigger: '#state-1 #story-4',
            start: 'top 40%',
            toggleActions: 'play none none reverse'
        }
    });
}

// STATE 2: EDUCATION
const initEducationState = () => {
    console.log('Initializing Education State...');

    // Reset the SVG sticky element 
    resetSvgStickyPosition();

    // Makes sure that the scroll position is reset to the top
    window.scrollTo(0, 0);

    const stateElement = document.querySelector('#state-2');
    if (stateElement) {
        stateElement.scrollTop = 0; // reset the internal scrollTop of #state-2
    }

    //Wait for layout, then reset again
    setTimeout(function () {
        window.scrollTo(0, 0);

        if (stateElement) {
            stateElement.scrollTop = 0;
        }

        // Reset SVG sticky AGAIN
        resetSvgStickyPosition();

        requestAnimationFrame(function () {
            window.scrollTo(0, 0);

            setTimeout(function () {
                setupMushroomGrowAnimation();
                setupMorphAnimation();
                setupEducationSectionAnimations();

                setTimeout(function () {
                    if (typeof ScrollTrigger !== 'undefined') {
                        ScrollTrigger.refresh(true);
                    }
                }, 300);
            }, 100);
        });
    }, 200);
}


const setupMushroomGrowAnimation = () => {
    const cards = document.querySelectorAll('#state-2 .mushroom-card');

    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const delay = parseFloat(card.getAttribute('data-delay')); // get number not string

        const trigger = ScrollTrigger.create({
            trigger: '#state-2 #edu-safe',
            start: 'top 70%',
            end: 'top 40%',
            onEnter: function () {
                setTimeout(function () {
                    card.classList.add('grown');
                }, delay * 1000);
            },
            onLeaveBack: function () {
                card.classList.remove('grown');
            }
        });

        scrollTriggers.push(trigger); //pushing each trigger into that array,later loop over them to kill/reset
    }
}

const resetSvgStickyPosition = () => {
    const svgSticky = document.querySelector('#state-2 .svg-sticky');
    if (svgSticky === null) {
        return;
    }

    // Remove ALL inline styles
    svgSticky.removeAttribute('style');

    // Clear GSAP properties
    gsap.set(svgSticky, {
        clearProps: 'all'
    });

    // Force centering with inline styles that will be overridden by CSS !important
    svgSticky.style.display = 'flex';
    svgSticky.style.justifyContent = 'center';
    svgSticky.style.alignItems = 'center';
    svgSticky.style.width = '100%';
    svgSticky.style.minHeight = '100vh';
    svgSticky.style.left = '0';
    svgSticky.style.right = '0';
    svgSticky.style.marginLeft = 'auto';
    svgSticky.style.marginRight = 'auto';

    // Force reflow, correct now position
    void svgSticky.offsetHeight;
}

const setupMorphAnimation = () => {
    const morphSection = document.querySelector('#state-2 .morph-section');
    const svgSticky = document.querySelector('#state-2 .svg-sticky');

    if (morphSection === null) {
        console.error('Morph section not found');
        return;
    }

    if (svgSticky === null) {
        console.error('SVG sticky not found');
        return;
    }

    // Kill any existing morph timeline FIRST
    if (gsapTimelines.morph) {
        gsapTimelines.morph.kill();
        gsapTimelines.morph = null;
    }

    // Call the reset function
    resetSvgStickyPosition();

    // Reset ALL SVG elements to their INITIAL state
    gsap.set('#state-2 #cap', {
        clearProps: 'all',
        fill: '#8B4513'
    });

    gsap.set('#state-2 #cap-underside', {
        clearProps: 'all',
        opacity: 1
    });

    gsap.set('#state-2 #ring', {
        clearProps: 'all',
        opacity: 1,
        fill: '#d4b896'
    });

    gsap.set('#state-2 #stem', {
        clearProps: 'all'
    });

    gsap.set('#state-2 #volva', {
        clearProps: 'all',
        opacity: 0
    });

    const spots = ['#state-2 #spot1', '#state-2 #spot2', '#state-2 #spot3', '#state-2 #spot4', '#state-2 #spot5'];
    gsap.set(spots, { opacity: 0 });

    gsap.set('#state-2 #callout-cap', { opacity: 0 });
    gsap.set('#state-2 #callout-spots', { opacity: 0 });
    gsap.set('#state-2 #callout-gills', { opacity: 0 });
    gsap.set('#state-2 #callout-ring', { opacity: 0 });
    gsap.set('#state-2 #callout-volva', { opacity: 0 });

    window.scrollTo(0, 0);

    // Longer delay to ensure complete reset
    setTimeout(function () {
        // Reset position ONE MORE TIME right before creating ScrollTrigger
        resetSvgStickyPosition();

        gsapTimelines.morph = gsap.timeline({
            scrollTrigger: {
                trigger: morphSection,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 1,
                pin: svgSticky,
                pinSpacing: true,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                markers: false
            }
        });

        animateMorphCap();
        animateMorphCapUnderside();
        animateMorphRing();
        animateMorphStem();
        animateMorphVolva();
        animateMorphSpots();
        animateMorphCallouts();

        console.log('Morph animation setup complete');
    }, 100);
}

const animateMorphCap = () => {
    gsapTimelines.morph.to('#state-2 #cap', {
        morphSVG: '#cap-target',
        fill: '#cc4537',
        duration: 2,
        ease: 'power2.inOut'
    }, 0);
}

const animateMorphCapUnderside = () => {
    gsapTimelines.morph.to('#state-2 #cap-underside', {
        opacity: 0,
        duration: 1,
        ease: 'power2.inOut'
    }, 0);
}

const animateMorphRing = () => {
    gsapTimelines.morph.to('#state-2 #ring', {
        morphSVG: '#gills-target',
        fill: '#e5d3b9',
        opacity: 1,
        duration: 2,
        ease: 'power2.inOut'
    }, 0.3);
}

const animateMorphStem = () => {
    gsapTimelines.morph.to('#state-2 #stem', {
        morphSVG: '#stem-target',
        duration: 2,
        ease: 'power2.inOut'
    }, 0);
}

const animateMorphVolva = () => {
    gsapTimelines.morph.to('#state-2 #volva', {
        morphSVG: '#volva-target',
        opacity: 1,
        duration: 2,
        ease: 'power2.out'
    }, 0.5);
}

const animateMorphSpots = () => {
    const spots = ['#state-2 #spot1', '#state-2 #spot2', '#state-2 #spot3', '#state-2 #spot4', '#state-2 #spot5'];
    gsapTimelines.morph.to(spots, {
        opacity: 1,
        duration: 0.5,
        stagger: 0.2
    }, 1.2);
}

const animateMorphCallouts = () => {
    gsapTimelines.morph.to('#state-2 #callout-cap', {
        opacity: 1,
        duration: 0.3
    }, 0.5);

    gsapTimelines.morph.to('#state-2 #callout-spots', {
        opacity: 1,
        duration: 0.3
    }, 1.2);

    gsapTimelines.morph.to('#state-2 #callout-gills', {
        opacity: 1,
        duration: 0.3
    }, 1.5);

    gsapTimelines.morph.to('#state-2 #callout-ring', {
        opacity: 1,
        duration: 0.3
    }, 1.8);

    gsapTimelines.morph.to('#state-2 #callout-volva', {
        opacity: 1,
        duration: 0.3
    }, 2.1);
}

const setupEducationSectionAnimations = () => {
    const sections = document.querySelectorAll('#state-2 .edu-section');

    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const trigger = ScrollTrigger.create({
            trigger: section,
            start: 'top 75%',
            end: 'top 60%',
            onEnter: function () {
                gsap.to(section, {
                    opacity: 1,
                    duration: 0.5
                });
            },
            onLeaveBack: function () {
                gsap.to(section, {
                    opacity: 0,
                    duration: 0.5
                });
            }
        });

        scrollTriggers.push(trigger); //pushing each trigger into that array,later loop over them to kill/reset
    }
}

// STATE 3: TEST

const getUniqueRandomMushrooms = () => {
    const originalMushroomData = [
        { image: 'assets/baravika2v.png', correctAnswer: 'Rare Edible', className: 'Baravika' },
        { image: 'assets/berzlape2v.png', correctAnswer: 'Edible', className: 'Berzlape' },
        { image: 'assets/gailene.webp', correctAnswer: 'Edible', className: 'Gailene' },
        { image: 'assets/sarkana_musmire.png', correctAnswer: 'Poisonous', className: 'Sarkana Musmire' },
        { image: 'assets/velna_beka.png', correctAnswer: 'Poisonous', className: 'Velna beka' }
    ];

    // Copies this array into shuffled
    const shuffled = [];
    for (let i = 0; i < originalMushroomData.length; i++) {
        shuffled.push(originalMushroomData[i]);
    }

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
    }

    //pickd the 5 
    const selected = [];
    for (let i = 0; i < 5; i++) {
        selected.push(shuffled[i]);
    }

    return selected; // returns them each quiz is in a random order, with no duplicates
}

const initTestState = () => {
    console.log('Initializing Test State...');

    if (modelsLoaded === false) {
        console.error('Models not loaded yet!');
        alert('AI models are still loading. Please wait a moment and try again.');
        return;
    }

    // Reset all test state FIRST
    testScore = 0;
    testCurrentMushroomIndex = 0;
    testIsProcessing = false;
    ediblePicked = 0;
    poisonousPicked = 0;
    rarePicked = 0;

    // Generate new shuffled mushrooms
    testShuffledMushrooms = getUniqueRandomMushrooms();

    console.log('Test state reset - Index:', testCurrentMushroomIndex, 'Mushrooms:', testShuffledMushrooms.length);

    // Reset UI elements
    const loadingScreen = document.querySelector('#state-3 #loadingScreen');
    const mainContent = document.querySelector('#state-3 #mainContent');
    const resultsScreen = document.querySelector('#state-3 #resultsScreen');
    const grandmaContainer = document.querySelector('#state-3 #grandmaContainer');
    const quizContainer = document.querySelector('#state-3 #quizContainer');
    const scoreDisplay = document.querySelector('#state-3 .score-display');
    const titleSection = document.querySelector('#state-3 .title-section');
    const progressBar = document.querySelector('#state-3 .progress-bar');
    const speechBubble = document.querySelector('#state-3 #speechBubble');

    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    if (resultsScreen) {
        resultsScreen.style.display = 'none';
    }
    if (grandmaContainer) {
        grandmaContainer.style.display = 'block';
        grandmaContainer.style.opacity = '1';
    }
    if (quizContainer) {
        quizContainer.classList.remove('hidden');
    }
    if (scoreDisplay) {
        scoreDisplay.classList.remove('hidden');
    }
    if (titleSection) {
        titleSection.classList.remove('hidden');
    }
    if (progressBar) {
        progressBar.classList.remove('hidden');
    }
    if (speechBubble) {
        speechBubble.classList.remove('show');
    }

    setupTestEventListeners();
    showGrandmaIntro();
    loadTestMushroom();
    // Fade in everything smoothly after a tiny delay, so it dosnt load wierdly
    setTimeout(function () {
        const grandmaContainer = document.querySelector('#state-3 #grandmaContainer');
        const mushroomDisplay = document.querySelector('#state-3 .mushroom-display');
        const optionsContainer = document.querySelector('#state-3 #optionsContainer');

        if (grandmaContainer) grandmaContainer.style.opacity = '1';
        if (mushroomDisplay) mushroomDisplay.style.opacity = '1';
        if (optionsContainer) optionsContainer.style.opacity = '1';
    }, 100);
}

const setupTestEventListeners = () => {
    const speechClose = document.querySelector('#state-3 #speechClose');
    if (speechClose) {
        // Clone the button (true = also clone its children, but NOT event listeners)
        const newSpeechClose = speechClose.cloneNode(true);

        // Replace the old button with the fresh clone
        if (speechClose.parentNode) {
            speechClose.parentNode.replaceChild(newSpeechClose, speechClose);
        }

        // Add a single clean click listener to close the bubble
        newSpeechClose.addEventListener('click', function () {
            const speechBubble = document.querySelector('#state-3 #speechBubble');
            if (speechBubble) {
                speechBubble.classList.remove('show');
            }
        });
    }

    const grandmaContainer = document.querySelector('#state-3 #grandmaContainer');
    if (grandmaContainer) {
        // Clone grandma container to remove any old event listeners
        const newGrandmaContainer = grandmaContainer.cloneNode(true);
        // Replace old element with new one
        if (grandmaContainer.parentNode) {
            grandmaContainer.parentNode.replaceChild(newGrandmaContainer, grandmaContainer);
        }
        // Add one click listener: show reminder speech if not already visible
        newGrandmaContainer.addEventListener('click', function () {
            const speechBubble = document.querySelector('#state-3 #speechBubble');
            const speechText = document.querySelector('#state-3 #speechText');
            if (speechBubble && speechText) {
                if (speechBubble.classList.contains('show') === false) {
                    speechText.textContent = "Remember dear: Edible mushrooms are safe to eat, Rare Edible ones are special treats, and Poisonous ones will make you very sick! Look carefully at each one!";
                    speechBubble.classList.add('show');
                }
            }
        });
    }
}

const showGrandmaIntro = () => {
    const grandmaContainer = document.querySelector('#state-3 #grandmaContainer');
    const speechBubble = document.querySelector('#state-3 #speechBubble');
    const speechText = document.querySelector('#state-3 #speechText');

    if (grandmaContainer) {
        gsap.to(grandmaContainer, {
            opacity: 1,
            duration: 0.5
        });
    }

    setTimeout(function () {
        if (speechBubble && speechText) {
            speechText.textContent = "Welcome, dear! I've collected 5 mushrooms from the forest. Let's see if YOU can identify them correctly! Remember, if in doubt, leave it out! You need at least 3 correct to pass. Click on me anytime if you need a reminder!";
            speechBubble.classList.add('show');
        }
    }, 1000);
}

const loadTestMushroom = () => {
    console.log('Loading test mushroom', testCurrentMushroomIndex + 1, 'of', testShuffledMushrooms.length);

    // Check if index is valid
    if (testCurrentMushroomIndex >= testShuffledMushrooms.length) {
        console.error('Invalid mushroom index:', testCurrentMushroomIndex);
        return;
    }

    // Gets the current mushroom from shuffled list
    const currentMushroom = testShuffledMushrooms[testCurrentMushroomIndex];

    // Check if mushroom data exists
    if (currentMushroom === null || currentMushroom === undefined) {
        console.error('Mushroom data is null or undefined at index:', testCurrentMushroomIndex);
        return;
    }

    // Updates UI
    const mushroomImage = document.querySelector('#state-3 #mushroomImage');
    const currentMushroomText = document.querySelector('#state-3 #currentMushroom');
    const scoreText = document.querySelector('#state-3 #test-score');
    const progressFill = document.querySelector('#state-3 #progressFill');

    if (mushroomImage) {
        mushroomImage.src = currentMushroom.image;
        console.log('Set mushroom image to:', currentMushroom.image);
    }
    if (currentMushroomText) {
        currentMushroomText.textContent = testCurrentMushroomIndex + 1;
    }
    if (scoreText) {
        scoreText.textContent = testScore;
    }

    const progress = (testCurrentMushroomIndex / testShuffledMushrooms.length) * 100;
    if (progressFill) {
        progressFill.style.width = progress + '%';
    }

    // Musroom pop in
    if (mushroomImage) {
        gsap.from(mushroomImage, {
            scale: 0.8,
            opacity: 0,
            duration: 0.6,
            ease: 'back.out(1.7)'
        });
    }

    //Build fresh answer buttons each time
    const optionsContainer = document.querySelector('#state-3 #optionsContainer');
    if (optionsContainer) {
        optionsContainer.innerHTML = '';
        const options = ['Edible', 'Rare Edible', 'Poisonous'];

        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            const button = document.createElement('button');
            button.className = 'option-button';
            button.textContent = option;
            button.addEventListener('click', function () {
                selectTestAnswer(option, button);
            });
            optionsContainer.appendChild(button);

            gsap.from(button, {
                y: 30,
                opacity: 0,
                duration: 0.5,
                delay: i * 0.1,
                ease: 'power2.out'
            });
        }
    }

    testIsProcessing = false; // reset the busy so can accept a click
}

const selectTestAnswer = async (selectedOption, button) => {
    if (testIsProcessing === true) {
        console.log('Already processing');
        return;
    }
    testIsProcessing = true;
    console.log('User selected:', selectedOption);

    // Show examining overlay
    const examiningOverlay = document.querySelector('#state-3 #examiningOverlay');
    if (examiningOverlay) {
        examiningOverlay.classList.add('show');
    }

    // Disable all buttons
    const allButtons = document.querySelectorAll('#state-3 .option-button');
    for (let i = 0; i < allButtons.length; i++) {
        allButtons[i].disabled = true;
    }

    // Wait 2 seconds for examining effect
    await new Promise(function (resolve) {
        setTimeout(resolve, 2000);
    });

    try {
        // Get the mushroom image
        const mushroomImage = document.querySelector('#state-3 #mushroomImage');

        // Teachable machime to classify 
        const predictions = await teachableMachineModel.predict(mushroomImage);
        console.log('AI predictions:', predictions);

        // Sort predictions by confidence (highest first)
        predictions.sort(function (a, b) {
            return b.probability - a.probability;
        });

        const topPrediction = predictions[0];
        console.log('AI top prediction:', topPrediction.className, 'confidence:', topPrediction.probability);

        // Map ai prediction to my answer 
        let aiAnswer = null;
        const className = topPrediction.className.toLowerCase();

        if (className === 'rare_edible') {
            aiAnswer = 'Rare Edible';
        } else if (className === 'common_edible') {
            aiAnswer = 'Edible';
        } else if (className === 'poisonous') {
            aiAnswer = 'Poisonous';
        }

        console.log('AI mapped answer:', aiAnswer);
        console.log('User selected:', selectedOption);

        // Hide examining overlay
        if (examiningOverlay) {
            examiningOverlay.classList.remove('show');
        }

        // Check if user's answer matches ai's prediction
        const isCorrect = selectedOption === aiAnswer;

        if (isCorrect === true) {
            button.classList.add('correct');
            testScore = testScore + 1;
            const scoreText = document.querySelector('#state-3 #test-score');
            if (scoreText) {
                scoreText.textContent = testScore;
            }
            createTestParticleBurst();
        } else {
            button.classList.add('wrong');

            // Show the correct answer (what AI predicted)
            for (let i = 0; i < allButtons.length; i++) {
                if (allButtons[i].textContent === aiAnswer) {
                    allButtons[i].classList.add('correct');
                }
            }
            createTestParticleBurst();
        }

        // Wait before moving to next question
        await new Promise(function (resolve) {
            setTimeout(resolve, 2500);
        });

        testCurrentMushroomIndex = testCurrentMushroomIndex + 1;
        console.log('Moving to mushroom index:', testCurrentMushroomIndex);

        if (testCurrentMushroomIndex < testShuffledMushrooms.length) {
            // Reset buttons for next question
            for (let i = 0; i < allButtons.length; i++) {
                allButtons[i].classList.remove('correct', 'wrong');
                allButtons[i].disabled = false;
            }
            loadTestMushroom();
        } else {
            showTestResults();
        }

    } catch (error) {
        console.error('Classification error:', error);
        if (examiningOverlay) {
            examiningOverlay.classList.remove('show');
        }
        testIsProcessing = false;

        const allButtons = document.querySelectorAll('#state-3 .option-button');
        for (let i = 0; i < allButtons.length; i++) {
            allButtons[i].disabled = false;
        }
    }
}

const createTestParticleBurst = () => {
    const buttonRect = document.querySelector('#state-3 .mushroom-display').getBoundingClientRect();
    const particleContainer = document.querySelector('#state-3 #particleContainer');
    if (particleContainer === null) {
        return;
    }

    const leafImages = [
        'assets/leaf1.png',
        'assets/leaf2.png',
        'assets/leaf3.png',
        'assets/leaf5.png',
        'assets/leaf6.png'
    ];

    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        const img = document.createElement('img');
        const randomLeaf = leafImages[Math.floor(Math.random() * leafImages.length)];
        img.src = randomLeaf;
        img.style.width = '48px';
        img.style.height = '48px';
        particle.appendChild(img);

        particle.style.left = (buttonRect.left + buttonRect.width / 2) + 'px';
        particle.style.top = (buttonRect.top + buttonRect.height / 2) + 'px';
        particle.style.position = 'fixed';

        particleContainer.appendChild(particle);

        const angle = (Math.PI * 2 * i) / particleCount;
        const distance = 100 + Math.random() * 50;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        gsap.to(particle, {
            x: x,
            y: y,
            opacity: 1,
            rotation: Math.random() * 360,
            duration: 0.8,
            ease: 'power2.out'
        });

        gsap.to(particle, {
            opacity: 0,
            duration: 0.4,
            delay: 0.5,
            onComplete: function () {
                particle.remove();
            }
        });
    }
}

const showTestResults = () => {
    const quizContainer = document.querySelector('#state-3 #quizContainer');
    const scoreDisplay = document.querySelector('#state-3 .score-display');
    const titleSection = document.querySelector('#state-3 .title-section');
    const progressBar = document.querySelector('#state-3 .progress-bar');
    const grandmaContainer = document.querySelector('#state-3 #grandmaContainer');
    const resultsScreen = document.querySelector('#state-3 #resultsScreen');
    const finalScore = document.querySelector('#state-3 #finalScore');
    const grandmaVerdict = document.querySelector('#state-3 #grandmaVerdict');
    const verdictIcon = document.querySelector('#state-3 #verdictIcon');
    const retryButton = document.querySelector('#state-3 #retryButton');

    if (quizContainer) {
        quizContainer.classList.add('hidden');
    }
    if (scoreDisplay) {
        scoreDisplay.classList.add('hidden');
    }
    if (titleSection) {
        titleSection.classList.add('hidden');
    }
    if (progressBar) {
        progressBar.classList.add('hidden');
    }
    if (grandmaContainer) {
        grandmaContainer.style.display = 'none';
    }

    if (resultsScreen) {
        resultsScreen.style.display = 'block';
    }
    if (finalScore) {
        finalScore.textContent = testScore + '/5';
    }

    let verdict = '';
    let icon = '';

    if (testScore === 5) {
        verdict = 'Perfect! You\'re a natural forager! Even I make mistakes sometimes. You\'re ready for the forest!';
        icon = '<img src="assets/grandma_smiling_face.png" alt="Happy Grandma" width="200">';
    } else if (testScore >= 3) {
        verdict = 'Good work, dear! ' + testScore + ' out of 5. You understand the basics, but stay careful in the forest!';
        icon = '<img src="assets/grandma_good.png" alt="Smiling Grandma" width="200">';
    } else {
        verdict = 'Oh dear... ' + testScore + ' out of 5. You need more practice! Let\'s review the mushrooms again before you go out there!';
        icon = '<img src="assets/grandma_sad.png" alt="Worried Grandma" width="200">';
    }

    if (grandmaVerdict) {
        grandmaVerdict.textContent = verdict;
    }
    if (verdictIcon) {
        verdictIcon.innerHTML = icon;
    }

    if (retryButton) {
        // Remove ALL old event listeners by cloning
        const newRetryButton = retryButton.cloneNode(true);
        if (retryButton.parentNode) {
            retryButton.parentNode.replaceChild(newRetryButton, retryButton);
        }

        if (testScore >= 3) {
            newRetryButton.textContent = 'Continue Journey';
            newRetryButton.addEventListener('click', function () {
                transitionToState(4);
            });
        } else {
            newRetryButton.textContent = 'Try Test Again';
            newRetryButton.addEventListener('click', function () {
                console.log('RETRY CLICKED - Resetting test');

                // Reset ALL variables
                testScore = 0;
                testCurrentMushroomIndex = 0;
                ediblePicked = 0;
                poisonousPicked = 0;
                rarePicked = 0;
                testIsProcessing = false;
                testShuffledMushrooms = getUniqueRandomMushrooms();

                // Hide results, show quiz
                const resultsScreen = document.querySelector('#state-3 #resultsScreen');
                const quizContainer = document.querySelector('#state-3 #quizContainer');
                const scoreDisplay = document.querySelector('#state-3 .score-display');
                const titleSection = document.querySelector('#state-3 .title-section');
                const progressBar = document.querySelector('#state-3 .progress-bar');
                const grandmaContainer = document.querySelector('#state-3 #grandmaContainer');

                if (resultsScreen) {
                    resultsScreen.style.display = 'none';
                }
                if (quizContainer) {
                    quizContainer.classList.remove('hidden');
                }
                if (scoreDisplay) {
                    scoreDisplay.classList.remove('hidden');
                }
                if (titleSection) {
                    titleSection.classList.remove('hidden');
                }
                if (progressBar) {
                    progressBar.classList.remove('hidden');
                }
                if (grandmaContainer) {
                    grandmaContainer.style.display = 'block';
                }

                // Re-setup event listeners
                setupTestEventListeners();

                // Load first mushroom
                loadTestMushroom();
            });
        }
    }

    if (resultsScreen) {
        gsap.from(resultsScreen, {
            opacity: 0,
            y: 50,
            duration: 0.8,
            ease: 'power2.out'
        });
    }
}

// STATE 4: JOURNEY
const initJourneyState = () => {
    console.log('Initializing Journey State...');

    // Reset page scrolling 
    resetPageOverflow();
    // Kill any old GSAP journey timeline 
    killExistingJourneyTimeline();
    // Make sure start at the top of the page
    forceScrollToTop();
    // Clear all inline styles / GSAP props for this state
    resetAllJourneyElements();

    setTimeout(function () {
        createJourneyTimeline();//when stable build scrool
    }, 300);
}

const resetPageOverflow = () => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.body.style.height = 'auto';
    document.documentElement.style.height = 'auto';
}

const killExistingJourneyTimeline = () => {
    if (gsapTimelines.journey) {
        gsapTimelines.journey.kill();
        gsapTimelines.journey = null;
    }
}

const forceScrollToTop = () => {
    window.scrollTo(0, 0);
}

const resetAllJourneyElements = () => {
    resetScrollContainer();
    resetTrees();
    resetCharacters();
    resetSpeechBubbles();
    resetUIElements();
}

const resetScrollContainer = () => {
    const scrollContainerJourney = document.querySelector('#state-4 .scroll-container-journey');
    if (scrollContainerJourney) {
        scrollContainerJourney.removeAttribute('style');
        gsap.set(scrollContainerJourney, { clearProps: 'all' });
    }
}

const resetTrees = () => {
    const treeLeft = document.querySelector('#state-4 .tree-left');
    const treeRight = document.querySelector('#state-4 .tree-right');

    if (treeLeft) {
        gsap.set(treeLeft, { clearProps: 'all' });
        treeLeft.removeAttribute('style');
    }
    if (treeRight) {
        gsap.set(treeRight, { clearProps: 'all' });
        treeRight.removeAttribute('style');
    }
}

const resetCharacters = () => {
    const grandma = document.querySelector('#state-4 #grandma');
    const grandmaRunning = document.querySelector('#state-4 #grandmaRunning');
    const pinchDemo = document.querySelector('#state-4 #pinchDemo');

    if (grandma) {
        gsap.set(grandma, { clearProps: 'all' });
        grandma.removeAttribute('style');
    }
    if (grandmaRunning) {
        gsap.set(grandmaRunning, { clearProps: 'all', left: '-20%', opacity: 0 });
    }
    if (pinchDemo) {
        gsap.set(pinchDemo, { clearProps: 'all', opacity: 0, scale: 0.8 });
    }
}

const resetSpeechBubbles = () => {
    const speech1 = document.querySelector('#state-4 #speech1');
    const speech2 = document.querySelector('#state-4 #speech2');
    const speech3 = document.querySelector('#state-4 #speech3');

    if (speech1) gsap.set(speech1, { clearProps: 'all', opacity: 0 });
    if (speech2) gsap.set(speech2, { clearProps: 'all', opacity: 0 });
    if (speech3) gsap.set(speech3, { clearProps: 'all', opacity: 0 });
}

const resetUIElements = () => {
    const runText = document.querySelector('#state-4 #runText');
    const continueSection = document.querySelector('#state-4 #continueSection');
    const lightRays = document.querySelector('#state-4 .light-rays');

    if (runText) {
        gsap.set(runText, { clearProps: 'all', left: '-20%', opacity: 0 });
    }
    if (continueSection) {
        gsap.set(continueSection, { clearProps: 'all', opacity: 0, y: 50 });
    }
    if (lightRays) {
        gsap.set(lightRays, { clearProps: 'all', opacity: 0 });
    }
}

const createJourneyTimeline = () => {
    const forestJourney = document.querySelector('#state-4 .forest-journey');
    const scrollContainerJourney = document.querySelector('#state-4 .scroll-container-journey');

    if (forestJourney === null || scrollContainerJourney === null) {
        console.error('Journey elements not found');
        return;
    }

    forceScrollToTop();

    gsapTimelines.journey = gsap.timeline({
        scrollTrigger: {
            trigger: forestJourney,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1,
            pin: scrollContainerJourney,
            pinSpacing: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            markers: false
        }
    });

    animateJourneyScene();

    setTimeout(function () {
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh(true);
        }
    }, 100);
}

const animateJourneyScene = () => {
    animateLightRays();
    animateGrandmaEntrance();
    animateFirstSpeech();
    animateTreesStage1();
    animateSecondSpeech();
    animateTreesStage2();
    animatePinchDemo();
    animateTreesStage3();
    animateThirdSpeech();
    animateGrandmaExit();
    animateTreesFinal();
    animateContinueButton();
}

const animateLightRays = () => {
    const lightRays = document.querySelector('#state-4 .light-rays');
    if (lightRays) {
        gsapTimelines.journey.to(lightRays, {
            opacity: 0.5,
            duration: 1
        }, 0);
    }
}

const animateGrandmaEntrance = () => {
    const grandma = document.querySelector('#state-4 #grandma');
    if (grandma) {
        gsapTimelines.journey.to(grandma, {
            left: '5%',
            opacity: 1,
            duration: 1
        }, 0.5);
    }
}

const animateFirstSpeech = () => {
    const speech1 = document.querySelector('#state-4 #speech1');
    if (speech1) {
        gsapTimelines.journey.to(speech1, {
            opacity: 1,
            duration: 0.5
        }, 1);
    }
}

const animateTreesStage1 = () => {
    const treeLeft = document.querySelector('#state-4 .tree-left');
    const treeRight = document.querySelector('#state-4 .tree-right');

    if (treeLeft) {
        gsapTimelines.journey.to(treeLeft, {
            x: -80,
            duration: 2
        }, 0);
    }
    if (treeRight) {
        gsapTimelines.journey.to(treeRight, {
            x: 80,
            duration: 2
        }, 0);
    }
}

const animateSecondSpeech = () => {
    const speech1 = document.querySelector('#state-4 #speech1');
    const speech2 = document.querySelector('#state-4 #speech2');

    if (speech1) {
        gsapTimelines.journey.to(speech1, {
            opacity: 0,
            duration: 0.5
        }, 2);
    }
    if (speech2) {
        gsapTimelines.journey.to(speech2, {
            opacity: 1,
            duration: 0.5
        }, 2.5);
    }
}

const animateTreesStage2 = () => {
    const treeLeft = document.querySelector('#state-4 .tree-left');
    const treeRight = document.querySelector('#state-4 .tree-right');

    if (treeLeft) {
        gsapTimelines.journey.to(treeLeft, {
            x: -160,
            duration: 2
        }, 2);
    }
    if (treeRight) {
        gsapTimelines.journey.to(treeRight, {
            x: 160,
            duration: 2
        }, 2);
    }
}

const animatePinchDemo = () => {
    const speech2 = document.querySelector('#state-4 #speech2');
    const grandma = document.querySelector('#state-4 #grandma');
    const pinchDemo = document.querySelector('#state-4 #pinchDemo');

    if (speech2) {
        gsapTimelines.journey.to(speech2, {
            opacity: 0,
            duration: 0.5
        }, 4);
    }
    if (grandma) {
        gsapTimelines.journey.to(grandma, {
            opacity: 0,
            duration: 0.5
        }, 4);
    }
    if (pinchDemo) {
        gsapTimelines.journey.to(pinchDemo, {
            opacity: 1,
            scale: 1,
            duration: 0.8
        }, 4.5);
    }
}

const animateTreesStage3 = () => {
    const treeLeft = document.querySelector('#state-4 .tree-left');
    const treeRight = document.querySelector('#state-4 .tree-right');

    if (treeLeft) {
        gsapTimelines.journey.to(treeLeft, {
            x: -240,
            duration: 2
        }, 4);
    }
    if (treeRight) {
        gsapTimelines.journey.to(treeRight, {
            x: 240,
            duration: 2
        }, 4);
    }
}

const animateThirdSpeech = () => {
    const pinchDemo = document.querySelector('#state-4 #pinchDemo');
    const grandma = document.querySelector('#state-4 #grandma');
    const speech3 = document.querySelector('#state-4 #speech3');

    if (pinchDemo) {
        gsapTimelines.journey.to(pinchDemo, {
            opacity: 0,
            duration: 0.5
        }, 6);
    }
    if (grandma) {
        gsapTimelines.journey.to(grandma, {
            opacity: 1,
            duration: 0.5
        }, 6);
    }
    if (speech3) {
        gsapTimelines.journey.to(speech3, {
            opacity: 1,
            duration: 0.5
        }, 7);
    }
}

const animateGrandmaExit = () => {
    const speech3 = document.querySelector('#state-4 #speech3');
    const grandma = document.querySelector('#state-4 #grandma');
    const grandmaRunning = document.querySelector('#state-4 #grandmaRunning');
    const runText = document.querySelector('#state-4 #runText');

    if (speech3) {
        gsapTimelines.journey.to(speech3, {
            opacity: 0,
            duration: 0.5
        }, 8);
    }
    if (grandma) {
        gsapTimelines.journey.to(grandma, {
            opacity: 0,
            duration: 0.3
        }, 8.5);
    }
    if (grandmaRunning) {
        gsapTimelines.journey.to(grandmaRunning, {
            left: '110%',
            opacity: 1,
            duration: 4,
            ease: 'none'
        }, 9);
    }
    if (runText) {
        gsapTimelines.journey.to(runText, {
            opacity: 1,
            left: '15%',
            duration: 0.5
        }, 9);
        gsapTimelines.journey.to(runText, {
            left: '110%',
            duration: 4,
            ease: 'none'
        }, 9.5);
    }
}

const animateTreesFinal = () => {
    const treeLeft = document.querySelector('#state-4 .tree-left');
    const treeRight = document.querySelector('#state-4 .tree-right');

    if (treeLeft) {
        gsapTimelines.journey.to(treeLeft, {
            x: -320,
            opacity: 0.2,
            duration: 4
        }, 9);
    }
    if (treeRight) {
        gsapTimelines.journey.to(treeRight, {
            x: 320,
            opacity: 0.2,
            duration: 4
        }, 9);
    }
}

const animateContinueButton = () => {
    const continueSection = document.querySelector('#state-4 #continueSection');
    if (continueSection) {
        gsapTimelines.journey.to(continueSection, {
            opacity: 1,
            y: 0,
            duration: 1
        }, 13);
    }
}

// STATE 5: HUNT

const initHuntState = () => {
    console.log('Initializing Hunt State...');
    if (modelsLoaded === false) {
        console.error('Models not loaded yet!');
        return;
    }

    // Reset all game state
    gameScore = 0;
    ediblePicked = 0;
    poisonousPicked = 0;
    rarePicked = 0;
    isGamePlaying = false;
    mushrooms = [];
    isPinching = false;
    wasPinching = false;

    // Reset UI
    const gameSection = document.querySelector('#state-5 #game-section');
    const endSection = document.querySelector('#state-5 #end-section');
    const loadingScreen = document.querySelector('#state-5 #loading-screen-hunt');
    const readyScreen = document.querySelector('#state-5 #ready-screen');
    const overlay = document.querySelector('#state-5 #overlay');
    const timer = document.querySelector('#state-5 #timer');
    const basket = document.querySelector('#state-5 #basket');

    if (gameSection) gameSection.style.display = 'block';
    if (endSection) endSection.style.display = 'none';
    if (loadingScreen) loadingScreen.style.display = 'block';
    if (readyScreen) readyScreen.style.display = 'none';
    if (overlay) overlay.style.display = 'flex';
    if (timer) {
        timer.style.display = 'block';
        timer.textContent = '60';
    }
    if (basket) {
        basket.style.display = 'block';
        basket.classList.remove('spilling', 'happy');
    }

    setupHuntCamera();
    setupHuntEventListeners();
    startHuntDrawLoop();
}

const setupHuntCamera = async () => {
    console.log('Setting up camera for hunt...');
    const webcamFeed = document.querySelector('#state-5 #webcam-feed');
    const canvas = document.querySelector('#state-5 #canvas');
    const statusText = document.querySelector('#state-5 #status');
    if (statusText) {
        statusText.textContent = 'Initializing camera...';
    }

    // trys to get the camera acces
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 840, height: 680 }
        });

        //Create new video element or reuse existing one
        if (webcamVideo === null) {
            webcamVideo = document.createElement('video');
        }

        webcamVideo.srcObject = stream;
        webcamVideo.width = 840;
        webcamVideo.height = 680;
        webcamVideo.autoplay = true;

        // Wait for video to be ready before playing
        webcamVideo.onloadedmetadata = async function () { // fires when video metadata dimensions others is ready
            try {
                await webcamVideo.play();
                console.log('Webcam video playing');
            } catch (playError) {
                console.error('Error playing video:', playError);
            }
        };

        // Set up the visible webcam feed
        if (webcamFeed) {
            webcamFeed.srcObject = stream; // connects the camera to this video
            webcamFeed.width = 840;
            webcamFeed.height = 680;
            webcamFeed.autoplay = true;
        }

        if (canvas) {
            canvas.width = 840;
            canvas.height = 680; // set canvas size to the same resolution as the video
        }

        setTimeout(function () {
            console.log('Starting hand detection...');

            // Only start detection if not already running
            try {
                handPoseModel.detectStop();
            } catch (e) {
                // Ignore if not running
            }

            handPoseModel.detectStart(webcamVideo, function (results) {
                hands = results; //stops any previous detection loop if it was running
            });

            if (statusText) {
                statusText.textContent = 'Ready!';
            }

            const readyScreen = document.querySelector('#state-5 #ready-screen');
            const loadingScreen = document.querySelector('#state-5 #loading-screen-hunt');

            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
            if (readyScreen) {
                readyScreen.style.display = 'block';
            }
        }, 2000);

    } catch (error) {
        console.error('Camera error:', error);
        if (statusText) {
            statusText.textContent = 'Camera Error!';
        }
        alert('Camera access denied. Please allow camera access and refresh the page.');
    }
}

const setupHuntEventListeners = () => {
    const startBtn = document.querySelector('#state-5 #start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', startHuntGame);
    }
}

const startHuntGame = () => {
    console.log('Starting hunt game!');
    const overlay = document.querySelector('#state-5 #overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    isGamePlaying = true;
    gameStartTime = Date.now();
    gameScore = 0;
    ediblePicked = 0;
    poisonousPicked = 0;
    rarePicked = 0;

    const scoreText = document.querySelector('#state-5 #score');
    if (scoreText) {
        scoreText.textContent = gameScore;
    }

    const statusText = document.querySelector('#state-5 #status');
    if (statusText) {
        statusText.textContent = 'Hunting!';
    }

    spawnHuntMushrooms();
}

const spawnHuntMushrooms = () => {
    const MUSHROOM_TYPES = [
        { image: 'assets/gailene.webp', type: 'edible', points: 10, name: 'Chanterelle' },
        { image: 'assets/berzlape2v.png', type: 'edible', points: 10, name: 'Porcini' },
        { image: 'assets/vilnitis.png', type: 'edible', points: 10, name: 'Oyster Mushroom' },
        { image: 'assets/sarkana_musmire2v.png', type: 'poisonous', points: -10, name: 'Fly Agaric' },
        { image: 'assets/zala_musmire2v.png', type: 'poisonous', points: -10, name: 'Death Cap' },
        { image: 'assets/velna_beka.png', type: 'poisonous', points: -10, name: 'Destroying Angel' },
        { image: 'assets/baravika2v.png', type: 'rare', points: 20, name: 'Golden Morel' }
    ];

    // Counters to control balance of types
    const MAX_MUSHROOMS = 8;
    let edibleCount = 0;
    let poisonousCount = 0;
    let rareCount = 0;

    // Keep spawning until have 8 mushrooms in the global array
    while (mushrooms.length < MAX_MUSHROOMS) {
        let selectedType = null;

        //Try to spawn at most one rare
        if (rareCount < 1 && Math.random() < 0.1) {
            // Collect only rare types
            const rareTypes = [];
            for (let i = 0; i < MUSHROOM_TYPES.length; i++) {
                if (MUSHROOM_TYPES[i].type === 'rare') {
                    rareTypes.push(MUSHROOM_TYPES[i]);
                }
            }
            selectedType = rareTypes[Math.floor(Math.random() * rareTypes.length)];
            rareCount = rareCount + 1;

            // Try to ensure at least 3 edible mushrooms
        } else if (edibleCount < 3 && Math.random() < 0.5) {
            const edibleTypes = [];
            for (let i = 0; i < MUSHROOM_TYPES.length; i++) {
                if (MUSHROOM_TYPES[i].type === 'edible') {
                    edibleTypes.push(MUSHROOM_TYPES[i]);
                }
            }

            // Pick a random edible type
            selectedType = edibleTypes[Math.floor(Math.random() * edibleTypes.length)];
            edibleCount = edibleCount + 1;

            // Try to ensure at least 3 poisonous mushrooms
        } else if (poisonousCount < 3) {
            const poisonousTypes = [];
            for (let i = 0; i < MUSHROOM_TYPES.length; i++) {
                if (MUSHROOM_TYPES[i].type === 'poisonous') {
                    poisonousTypes.push(MUSHROOM_TYPES[i]);
                }
            }
            selectedType = poisonousTypes[Math.floor(Math.random() * poisonousTypes.length)];
            poisonousCount = poisonousCount + 1;

            // After minimums are satisfied, fill the rest with random edible mushrooms
        } else {
            const edibleTypes = [];
            for (let i = 0; i < MUSHROOM_TYPES.length; i++) {
                if (MUSHROOM_TYPES[i].type === 'edible') {
                    edibleTypes.push(MUSHROOM_TYPES[i]);
                }
            }
            selectedType = edibleTypes[Math.floor(Math.random() * edibleTypes.length)];
        }
        // Creates the DOM element, finds a position, and pushes it into mushrooms
        if (selectedType !== null) {
            spawnHuntMushroom(selectedType);
        }
    }
}

const spawnHuntMushroom = (data) => {
    const element = document.createElement('div');
    element.className = 'mushroom';
    const img = document.createElement('img');
    img.src = data.image;
    img.alt = data.name;
    element.appendChild(img);

    // Prepare to find a position
    let validPosition = false;
    let x = 0;
    let y = 0;
    let attempts = 0;

    // Random x,y inside 840×680, but keep a margin from edges
    while (validPosition === false && attempts < 50) {
        const marginX = 150;
        const marginY = 120;
        x = marginX + Math.random() * (840 - 2 * marginX);
        y = marginY + Math.random() * (680 - 2 * marginY);

        // Assume it’s valid, then check against every existing mushroom
        validPosition = true;
        const minDistance = 120;

        for (let i = 0; i < mushrooms.length; i++) {
            const existing = mushrooms[i];
            const dx = existing.x - (x + 40);
            const dy = existing.y - (y + 40);
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistance) {
                validPosition = false;
                break;
            }
        }

        attempts = attempts + 1; // stop after max 50 tries.
    }

    if (validPosition === false) {
        return false;
    }

    // Place it in the camera wrapper
    element.style.left = x + 'px';
    element.style.top = y + 'px';

    const cameraWrapper = document.querySelector('#state-5 .camera-wrapper');
    if (cameraWrapper) {
        cameraWrapper.appendChild(element); // so becomes visible
    }

    // Add object to global array
    mushrooms.push({
        element: element,
        x: x + 40,
        y: y + 40,
        data: data,
        hoverStart: 0,
        isActive: false
    });

    return true;
}

const startHuntDrawLoop = () => {
    drawHuntFrame();
}

const drawHuntFrame = () => {
    requestAnimationFrame(drawHuntFrame);
    const canvas = document.querySelector('#state-5 #canvas');
    if (canvas === null) {
        return;
    }

    const ctx = canvas.getContext('2d');
    const CANVAS_WIDTH = 840;
    const CANVAS_HEIGHT = 680;

    // If the game has not started yet, just show the live mirrored webcam
    if (isGamePlaying === false) {
        if (webcamVideo && webcamVideo.readyState === webcamVideo.HAVE_ENOUGH_DATA) {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(webcamVideo, -CANVAS_WIDTH, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.restore();
        }
        return; // skip the rest of the game logic
    }

    const now = Date.now();
    const elapsed = Math.floor((now - gameStartTime) / 1000); // seconds since game started
    const GAME_TIME = 60;
    const timeLeft = Math.max(0, GAME_TIME - elapsed); // never go below 0

    // Update timer text and warning style
    const timerText = document.querySelector('#state-5 #timer');
    if (timerText) {
        timerText.textContent = timeLeft;
        if (timeLeft <= 10) {
            timerText.classList.add('warning');
        } else {
            timerText.classList.remove('warning');
        }
    }

    if (timeLeft === 0) {
        endHuntGame();
        return;
    }

    // Draw mirrored webcam background
    if (webcamVideo && webcamVideo.readyState === webcamVideo.HAVE_ENOUGH_DATA) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(webcamVideo, -CANVAS_WIDTH, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.restore();
    }

    // Check for errors and show notifications
    if (hands.length === 0) {
        showNotification('⚠️ No hand detected! Show your hand to the camera');
    } else if (hands.length > 0) {
        const hand = hands[0]; // use the first detected hand

        // Mirror keypoints horizontally to match mirrored video
        const mirroredKeypoints = [];
        for (let i = 0; i < hand.keypoints.length; i++) {
            mirroredKeypoints.push({
                x: CANVAS_WIDTH - hand.keypoints[i].x,
                y: hand.keypoints[i].y,
                z: hand.keypoints[i].z,
                name: hand.keypoints[i].name
            });
        }

        // Get thumb tip and index finger tip points
        const thumbTip = mirroredKeypoints[4];
        const indexTip = mirroredKeypoints[8];

        // Check if hand is too close (z-coordinate)
        if (thumbTip.z !== undefined && thumbTip.z < -50) {
            showNotification('Hand too close! Move back a bit');
        }

        // Check if hand is outside frame
        if (indexTip.x < 0 || indexTip.x > CANVAS_WIDTH || indexTip.y < 0 || indexTip.y > CANVAS_HEIGHT) {
            showNotification('Hand outside frame! Keep it in view');
        } else {
            hideNotification();
        }

        // Calculate distance between 4 and 8 
        const distance = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) +
            Math.pow(thumbTip.y - indexTip.y, 2)
        );

        // Remember previous frame's pinch state
        wasPinching = isPinching;
        const PINCH_THRESHOLD = 30;

        if (distance <= PINCH_THRESHOLD) {
            isPinching = true;
        } else {
            isPinching = false;
        }

        let targetMushroom = null; // the mushroom we might pick
        let closestDistance = Infinity; // distance to the closest active
        const HOVER_TIME = 2000;

        for (let i = 0; i < mushrooms.length; i++) {
            const mushroom = mushrooms[i];

            // Distance from index finger to mushroom center
            const dx = indexTip.x - mushroom.x;
            const dy = indexTip.y - mushroom.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const isOver = dist < 60; // is the finger over mushroom

            if (isOver === true) {
                if (mushroom.hoverStart === 0) {
                    // Start hoover timer
                    mushroom.hoverStart = now;
                    mushroom.element.classList.add('hovering');
                } else {

                    // Check how long have been hovering
                    const hoverDuration = now - mushroom.hoverStart;
                    if (hoverDuration >= HOVER_TIME && mushroom.isActive === false) {
                        mushroom.isActive = true; // After 2 seconds of hover, the mushroom becomes active
                        mushroom.element.classList.remove('hovering');
                        mushroom.element.classList.add('active');
                    }
                }

                // Among active mushrooms, choose the closest one as the target
                if (mushroom.isActive === true && dist < closestDistance) {
                    closestDistance = dist;
                    targetMushroom = mushroom;
                }
            } else {
                // If we are not over it and it was never activated reset everything
                if (mushroom.isActive === false) {
                    mushroom.hoverStart = 0;
                    mushroom.element.classList.remove('hovering');
                }
            }
        }

        if (isPinching === true && wasPinching === false && targetMushroom !== null) {
            pickHuntMushroom(targetMushroom);
        }
    }
}


const showNotification = (message) => {
    let notification = document.querySelector('#hunt-notification');

    if (notification === null) {
        notification = document.createElement('div');
        notification.id = 'hunt-notification';
        notification.style.cssText = `
            position: fixed;
            top: 320px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 68, 68, 0.95);
            color: white;
            padding: 15px 30px;
            border-radius: 15px;
            font-size: 1.2em;
            font-weight: bold;
            z-index: 200;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            border: 3px solid #ff0000;
        `;
        document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.style.display = 'block';

    // If there is an existing hide timer, cancel it
    if (notificationTimeout !== null) {
        clearTimeout(notificationTimeout);
    }

    // Start a new timer to hide the notification after 3 seconds
    notificationTimeout = setTimeout(function () {
        hideNotification();
    }, 3000);
}

const hideNotification = () => {
    const notification = document.querySelector('#hunt-notification');
    if (notification) {
        notification.style.display = 'none';
    }
}

const pickHuntMushroom = (mushroom) => {
    console.log('Picked mushroom:', mushroom.data);
    const mushroomRect = mushroom.element.getBoundingClientRect();
    const basket = document.querySelector('#state-5 #basket');
    const basketRect = basket.getBoundingClientRect();

    // Compute center point of mushroom and basket (screen coords)
    const startX = mushroomRect.left + mushroomRect.width / 2;
    const startY = mushroomRect.top + mushroomRect.height / 2;
    const endX = basketRect.left + basketRect.width / 2;
    const endY = basketRect.top + basketRect.height / 2;

    // Create a small flying mushroom icon that will travel to the basket
    const flyingMushroom = document.createElement('div');
    const flyingImg = document.createElement('img');
    flyingImg.src = mushroom.data.image;
    flyingImg.style.width = '50px';
    flyingImg.style.height = '50px';
    flyingImg.style.borderRadius = '50%';
    flyingMushroom.appendChild(flyingImg);

    // Position it at the mushroom center, on top of everything
    flyingMushroom.style.position = 'fixed';
    flyingMushroom.style.left = startX + 'px';
    flyingMushroom.style.top = startY + 'px';
    flyingMushroom.style.zIndex = '500';
    flyingMushroom.style.pointerEvents = 'none';
    document.body.appendChild(flyingMushroom);

    // Flying mushroom into the basket
    gsap.to(flyingMushroom, {
        x: endX - startX,
        y: endY - startY,
        duration: 0.8,
        ease: 'power2.in',
        onComplete: function () {
            flyingMushroom.remove();
            if (basket) {
                basket.classList.add('happy');
                setTimeout(function () {
                    basket.classList.remove('happy');
                }, 1000);
            }
        }
    });

    if (mushroom.data.type === 'edible') {
        gameScore = gameScore + mushroom.data.points;
        ediblePicked = ediblePicked + 1;
        createHuntParticles(mushroom.x, mushroom.y, [
            'assets/leaf1.png',
            'assets/leaf2.png',
            'assets/leaf3.png',
            'assets/leaf5.png',
            'assets/leaf6.png'
        ]);
    } else if (mushroom.data.type === 'rare') {
        gameScore = gameScore + mushroom.data.points;
        rarePicked = rarePicked + 1;
        createHuntParticles(mushroom.x, mushroom.y, [
            'assets/amber_left.png',
            'assets/leaf1.png',
            'assets/amber_right.png',
            'assets/leaf3.png',
            'assets/leaf5.png'
        ]);
    } else {
        gameScore = gameScore + mushroom.data.points;
        poisonousPicked = poisonousPicked + 1;
        createHuntParticles(mushroom.x, mushroom.y, [
            'assets/sign4.png',
            'assets/sing1.png',
            'assets/sing2.png',
            'assets/sing3.png',
            'assets/sing5.png'
        ]);
    }

    const scoreText = document.querySelector('#state-5 #score');
    if (scoreText) {
        scoreText.textContent = gameScore;
    }

    mushroom.element.remove();

    // Rebuild mushrooms array without the picked one
    const newMushrooms = [];
    for (let i = 0; i < mushrooms.length; i++) {
        if (mushrooms[i] !== mushroom) {
            newMushrooms.push(mushrooms[i]);
        }
    }
    mushrooms = newMushrooms;

    // After a short delay, spawn a new mushroom to keep the field full
    setTimeout(function () {
        if (isGamePlaying === true) {
            const MUSHROOM_TYPES = [
                { image: 'assets/gailene.webp', type: 'edible', points: 10, name: 'Chanterelle' },
                { image: 'assets/berzlape2v.png', type: 'edible', points: 10, name: 'Porcini' },
                { image: 'assets/vilnitis.png', type: 'edible', points: 10, name: 'Oyster Mushroom' },
                { image: 'assets/sarkana_musmire2v.png', type: 'poisonous', points: -10, name: 'Fly Agaric' },
                { image: 'assets/zala_musmire2v.png', type: 'poisonous', points: -10, name: 'Death Cap' },
                { image: 'assets/velna_beka.png', type: 'poisonous', points: -10, name: 'Destroying Angel' },
                { image: 'assets/baravika2v.png', type: 'rare', points: 20, name: 'Golden Morel' }
            ];

            // Decide randomly which type to spawn next
            const randomValue = Math.random();
            let selectedType = null;

            if (randomValue < 0.15) {
                const rareTypes = [];
                for (let i = 0; i < MUSHROOM_TYPES.length; i++) {
                    if (MUSHROOM_TYPES[i].type === 'rare') {
                        rareTypes.push(MUSHROOM_TYPES[i]);
                    }
                }
                selectedType = rareTypes[Math.floor(Math.random() * rareTypes.length)];
            } else if (randomValue < 0.6) {
                const edibleTypes = [];
                for (let i = 0; i < MUSHROOM_TYPES.length; i++) {
                    if (MUSHROOM_TYPES[i].type === 'edible') {
                        edibleTypes.push(MUSHROOM_TYPES[i]);
                    }
                }
                selectedType = edibleTypes[Math.floor(Math.random() * edibleTypes.length)];
            } else {
                const poisonousTypes = [];
                for (let i = 0; i < MUSHROOM_TYPES.length; i++) {
                    if (MUSHROOM_TYPES[i].type === 'poisonous') {
                        poisonousTypes.push(MUSHROOM_TYPES[i]);
                    }
                }
                selectedType = poisonousTypes[Math.floor(Math.random() * poisonousTypes.length)];
            }

            if (selectedType !== null) {
                spawnHuntMushroom(selectedType);
            }
        }
    }, 500);
}

const createHuntParticles = (x, y, images) => {
    console.log('Creating hunt particles at:', x, y);

    const cameraWrapper = document.querySelector('#state-5 .camera-wrapper');
    if (!cameraWrapper) {
        console.error('Camera wrapper not found!');
        return;
    }

    for (let i = 0; i < 25; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.position = 'absolute';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.zIndex = '9999';
        particle.style.pointerEvents = 'none';
        particle.style.opacity = '1';

        const img = document.createElement('img');
        const imageIndex = Math.floor(Math.random() * images.length);
        img.src = images[imageIndex];
        img.style.width = '40px';
        img.style.height = '40px';
        img.style.pointerEvents = 'none';
        img.style.display = 'block';
        particle.appendChild(img);

        cameraWrapper.appendChild(particle);

        console.log('Particle created at:', x, y, 'with image:', images[imageIndex]);

        const angle = (Math.PI * 2 * i) / 25;
        const distance = 80 + Math.random() * 100;
        const targetX = Math.cos(angle) * distance;
        const targetY = Math.sin(angle) * distance;

        // Animate FROM current position TO target with fade out
        gsap.fromTo(particle,
            {
                opacity: 1,
                x: 0,
                y: 0,
                rotation: 0
            },
            {
                x: targetX,
                y: targetY,
                opacity: 0,
                rotation: Math.random() * 720 - 360,
                duration: 1.2,
                ease: 'power2.out',
                onComplete: function () {
                    particle.remove();
                }
            }
        );
    }
}

const endHuntGame = () => {
    isGamePlaying = false;
    console.log('Hunt game over! Score:', gameScore);
    for (let i = 0; i < mushrooms.length; i++) {
        mushrooms[i].element.remove();
    }
    mushrooms = [];

    animateBasketSpill();
}

const animateBasketSpill = () => {
    const basket = document.querySelector('#state-5 #basket');
    if (basket) {
        basket.classList.add('spilling');
    }
    setTimeout(function () {
        spillMushrooms();
    }, 1000);

    setTimeout(function () {
        if (basket) {
            basket.style.display = 'none';
        }
        showGrandmaScene();
    }, 3000);
}

const spillMushrooms = () => {
    const totalMushrooms = ediblePicked + poisonousPicked + rarePicked;
    const basket = document.querySelector('#state-5 #basket');
    if (basket === null) {
        return;
    }

    const basketRect = basket.getBoundingClientRect();
    const centerX = basketRect.left + basketRect.width / 2;
    const centerY = basketRect.top + basketRect.height / 2;

    for (let i = 0; i < totalMushrooms; i++) {
        const mushroom = document.createElement('div');
        mushroom.style.position = 'fixed';
        mushroom.style.zIndex = '9999';
        mushroom.style.pointerEvents = 'none';
        mushroom.style.width = '60px';
        mushroom.style.height = '60px';

        const img = document.createElement('img');
        const randomChoice = Math.random();
        if (randomChoice > 0.5) {
            img.src = 'assets/gailene.webp';
        } else {
            img.src = 'assets/sarkana_musmire2v.png';
        }
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.display = 'block';

        mushroom.appendChild(img);
        mushroom.style.left = centerX + 'px';
        mushroom.style.top = centerY + 'px';
        document.body.appendChild(mushroom);

        // Make mushrooms spill out and fall
        const angle = (Math.PI * 2 * i) / totalMushrooms;
        const distance = 150 + Math.random() * 200;
        const targetX = Math.cos(angle) * distance;
        const fallDistance = window.innerHeight - centerY + 200;

        gsap.to(mushroom, {
            x: targetX,
            y: fallDistance,
            rotation: Math.random() * 1080 - 540,
            duration: 1.5,
            ease: 'power2.in',
            delay: Math.random() * 0.3,
            onComplete: function () {
                mushroom.remove();
            }
        });
    }
}

const showGrandmaScene = () => {
    const timer = document.querySelector('#state-5 #timer');
    const basket = document.querySelector('#state-5 #basket');
    const gameSection = document.querySelector('#state-5 #game-section');
    const endSection = document.querySelector('#state-5 #end-section');
    const grandmaContent = document.querySelector('#state-5 #grandma-content');

    if (timer) timer.style.display = 'none';
    if (basket) basket.style.display = 'none';
    if (gameSection) gameSection.style.display = 'none';
    if (endSection) endSection.style.display = 'block';

    let grandmaImage = '';
    let message = '';

    if (gameScore >= 80) {
        grandmaImage = '<img src="assets/grandma_extra_happy.png" alt="Happy Grandma" width="180">';
        message = '"WOW! ' + gameScore + ' points! You\'re a natural forager! Even I made mistakes when I was learning. These will make a wonderful meal for the family!"';
    } else if (gameScore >= 50) {
        grandmaImage = '<img src="assets/grandma.png" alt="Happy Grandma" width="180">';
        message = '"Good work, dear! ' + gameScore + ' points! You picked some poison ones, but that\'s how we learn. The good mushrooms you found will make a nice soup!"';
    } else if (gameScore >= 20) {
        grandmaImage = '<img src="assets/grandma_sad_full.png" alt="Thinking Grandma" width="180">';
        message = '"Hmm, ' + gameScore + ' points... You\'ve got potential, but you need more practice! Remember: if in doubt, leave it out! The forest will be here tomorrow."';
    } else {
        grandmaImage = '<img src="assets/grandma_saddie_fullsize.png" alt="Worried Grandma" width="180">';
        message = '"OH NO! ' + gameScore + ' points?! If this were real, you\'d be in the hospital! *faints dramatically* ...Let\'s try that again, shall we? Practice makes perfect! And in mushroom picking, perfect keeps you ALIVE!"';
    }

    if (grandmaContent) {
        grandmaContent.innerHTML = `
<h1>Hunt Complete!</h1>
<div class="grandma-container">
    <div class="grandma-left">
        <div class="grandma">${grandmaImage}</div>
    </div>
    <div class="grandma-right">
        <div class="score-section">
            <div class="score-big">${gameScore}</div>
            <div>POINTS</div>
            <div class="stats-grid">
                <div class="stat-item good">
                    <div><img src="assets/gailene.webp" alt="Edible"></div>
                    <div>${ediblePicked} Safe</div>
                </div>
                <div class="stat-item bad">
                    <div><img src="assets/sarkana_musmire2v.png" alt="Poison"></div>
                    <div>${poisonousPicked} Poison</div>
                </div>
                <div class="stat-item rare">
                    <div><img src="assets/baravika2v.png" alt="Rare"></div>
                    <div>${rarePicked} Rare</div>
                </div>
            </div>
        </div>
        <div class="grandma-speech">${message}</div>
        <div class="latvian-quote">
            <strong>"Sēņotājs sēņotāju redz no tālienes"</strong><br>
            <span style="font-size: 0.95em; font-style: italic;">(A mushroom picker recognizes another from afar)</span>
            <br><br>
            You know, in Latvia we have this saying for a reason. Today you took your first steps on this path.
            <br><br>
            The RUSH you felt—that anticipation, that moment of discovery—that's what we Latvians live for every autumn.
            <br><br>
            Maybe one day, you'll wake up at dawn, grab a basket, and feel that rush in a real forest. Until then... stay safe, stay curious, and remember: <strong style="color: #ff4444;">when in doubt, leave it out!</strong>
        </div>
        <div class="button-container">
            <button class="end-button primary" id="hunt-again-btn">Hunt Again!</button>
        </div>
    </div>
</div>
`;

        // Setup the hunt again button
        const huntAgainBtn = document.querySelector('#hunt-again-btn');
        if (huntAgainBtn) {
            huntAgainBtn.addEventListener('click', function () {
                console.log('Hunt Again clicked - cleaning up first!');

                //  Stop hand detection first
                if (handPoseModel && webcamVideo) {
                    try {
                        handPoseModel.detectStop();
                        console.log('Hand detection stopped');
                    } catch (e) {
                        console.log('HandPose already stopped');
                    }
                }

                // Stop camera stream 
                if (webcamVideo && webcamVideo.srcObject) {
                    const tracks = webcamVideo.srcObject.getTracks();
                    for (let i = 0; i < tracks.length; i++) {
                        tracks[i].stop();
                    }
                    webcamVideo.srcObject = null;
                    console.log('Camera stopped');
                }

                // Reset webcamVideo
                webcamVideo = null;

                // Clear any leftover mushrooms 
                for (let i = 0; i < mushrooms.length; i++) {
                    if (mushrooms[i].element && mushrooms[i].element.parentNode) {
                        mushrooms[i].element.remove();
                    }
                }
                mushrooms = [];

                // Restart the game
                setTimeout(function () {
                    initHuntState();
                }, 500);
            });
        }
    }

    if (endSection) {
        endSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

init();

console.log('Mushroom rush - complete ready!');
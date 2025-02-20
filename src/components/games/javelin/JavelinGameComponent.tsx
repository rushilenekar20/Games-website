// // src/components/games/javelin/JavelinGame.tsx
'use client'

import { useEffect, useRef } from 'react'
import p5 from 'p5'

declare global {
    interface Window {
        resetGame?: () => void;
    }
}

interface Athlete {
    x: number
    y: number
    speed: number
    isRunning: boolean
    hasThrown: boolean
    hasFouled: boolean
}

interface Javelin {
    x: number
    y: number
    angle: number
    power: number
    velocity: { x: number; y: number }
    isThrown: boolean
    distance: number
    landed: boolean
    trajectory: Array<{ x: number; y: number }>
    landingPoint: { x: number; y: number; angle: number } | null
    touchStart: { x: number; y: number } | null
    currentTouch: { x: number; y: number } | null
}

export default function JavelinGame() {
    const gameContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!gameContainerRef.current) return
        const handleFirstInteraction = () => {
            const docElm = document.documentElement;
            
            // Check if not already in full-screen
            if (!document.fullscreenElement) {
                if (docElm.requestFullscreen) {
                    docElm.requestFullscreen().catch(err => {
                        console.log(err);
                    });
                }
            }
    
            // Remove event listener after first interaction
            document.removeEventListener('touchstart', handleFirstInteraction);
            document.removeEventListener('mousedown', handleFirstInteraction);
        };
    
        // Add event listeners for first interaction
        document.addEventListener('touchstart', handleFirstInteraction);
        document.addEventListener('mousedown', handleFirstInteraction);

        const sketch = (p: p5) => {
            let athlete: Athlete = {
                x: 20,
                y: 600,
                speed: 3,
                isRunning: false,
                hasThrown: false,
                hasFouled: false
            }

            let javelin: Javelin = {
                x: 0,
                y: 0,
                angle: 45,
                power: 0,
                velocity: { x: 0, y: 0 },
                isThrown: false,
                distance: 0,
                landed: false,
                trajectory: [],
                landingPoint: null,
                touchStart: null,
                currentTouch: null
            }

            let throwLine: number
            // const gravity = 0.22
            // const airResistance = 0.995
            // const javelinThrowPower = 0.19
            let bestThrow = 0
            let gameState = 'ready'
            let isNewBest = false;
            let celebrationStartTime = 0;
            let canvasElement: HTMLElement

            let leaderboard: number[] = [];
            let physics = {
                gravity: 0,
                airResistance: 0,  // Air resistance can remain constant
                javelinThrowPower: 0
            }

            p.setup = () => {
                const canvasWidth = window.innerWidth > 1200 ? 1200 : window.innerWidth;
                const canvasHeight = window.innerHeight > 700 ? 700 : window.innerHeight;
                const canvas = p.createCanvas(canvasWidth, canvasHeight);
                canvasElement = canvas.elt // Store canvas element
                throwLine = canvasWidth * 0.25;
                physics = calculatePhysicsConstants(canvasWidth);

                window.addEventListener('resize', () => {
                    const newWidth = window.innerWidth > 1200 ? 1200 : window.innerWidth;
                    const newHeight = window.innerHeight > 700 ? 700 : window.innerHeight;
                    p.resizeCanvas(newWidth, newHeight);
                    throwLine = newWidth * 0.25;
                    physics = calculatePhysicsConstants(newWidth);
                });
            }

            function calculatePhysicsConstants(canvasWidth: number) {
                const baseWidth = 1200; // Reference width for largest screen
                const minWidth = 320;   // Reference for smallest typical mobile screen

                // Normalize the current width between 0 and 1
                // where 0 = smallest screen and 1 = largest screen
                const normalizedWidth = (canvasWidth - minWidth) / (baseWidth - minWidth);

                // Base values calibrated for 95M throw at 45° with 100% power
                const baseGravity = 0.22;
                const baseThrowPower = 0.141;

                // Calculate gravity (increases for smaller screens)
                // Smaller screens need higher gravity to prevent over-throwing
                const gravityScale = 1 + (1 - normalizedWidth) * 0.4; // 40% max increase for small screens
                const gravity = baseGravity * gravityScale;

                // Calculate throw power (decreases for smaller screens)
                // Smaller screens need lower throw power to maintain consistent distance
                const throwPowerScale = 0.7 + (normalizedWidth * 0.3); // 30% variation range
                const javelinThrowPower = baseThrowPower * throwPowerScale;

                // Air resistance remains constant as it's a multiplier
                const airResistance = 0.995;

                // Theoretical maximum distance calculation for verification
                // Using simplified projectile motion with air resistance
                const power = 100;
                const angle = 45;
                const initialVelocity = power * javelinThrowPower;
                const time = 2 * initialVelocity * Math.sin(angle * Math.PI / 180) / gravity;
                const distance = initialVelocity * Math.cos(angle * Math.PI / 180) * time *
                    (1 - Math.pow(airResistance, time)) / (1 - airResistance);

                console.log('Calculated Physics Values:', {
                    screenWidth: canvasWidth,
                    gravity,
                    javelinThrowPower,
                    theoreticalMaxDistance: distance
                });

                return {
                    gravity,
                    airResistance,
                    javelinThrowPower
                };
            }


            p.draw = () => {
                p.background('#87CEEB')

                const groundY = p.height * 0.85
                athlete.y = groundY

                // Draw ground
                p.fill('#90EE90')
                p.rect(0, groundY, p.width, p.height - groundY)

                // Draw measurement markers
                for (let i = 0; i <= 100; i += 10) {
                    const x = throwLine + (i * (p.width - throwLine) / 100)
                    p.stroke('white')
                    p.line(x, groundY - 5, x, groundY + 5)
                    p.noStroke()
                    p.fill('black')
                    p.text(i + 'm', x, groundY + 20)
                }

                // Draw throw line and start indicator
                p.stroke('red')
                p.strokeWeight(2)
                p.line(throwLine, 0, throwLine, p.height)
                drawStartIndicator()

                if (!isTouchDevice() && gameState === 'running' && !athlete.hasThrown) {
                    if (p.keyIsDown(32)) { // SPACE key held
                        if (javelin.touchStart && javelin.currentTouch) {
                            javelin.currentTouch.x -= 2; // Gradually increase pull-back
                            const pullDistance = javelin.touchStart.x - javelin.currentTouch.x;
                            javelin.power = p.constrain(p.map(pullDistance, 0, 100, 0, 100), 0, 100);
                            updateUI('power', Math.floor(javelin.power));
                        }
                    }
                    
                    // Direct angle control for keyboard
                    if (p.keyIsDown(p.UP_ARROW)) {
                        javelin.angle = p.constrain(javelin.angle + 1, 0, 80);
                        updateUI('angle', Math.floor(javelin.angle));
                    }
                    
                    if (p.keyIsDown(p.DOWN_ARROW)) {
                        javelin.angle = p.constrain(javelin.angle - 1, 0, 80);
                        updateUI('angle', Math.floor(javelin.angle));
                    }
                }

                if (gameState === 'running' || gameState === 'throwing') {
                    if (!athlete.hasThrown) {
                        athlete.x += athlete.speed
                    }

                    drawAthlete(athlete.x, athlete.y)

                    // Draw touch target and controls
                    if (!athlete.hasThrown && !javelin.isThrown) {
                        const touchX = athlete.x + 45
                        const touchY = athlete.y - 35
                        const pulseSize = 10 + p.sin(p.frameCount * 0.1) * 5

                        p.stroke('rgba(255, 255, 255, 0.8)')
                        p.strokeWeight(3)

                        // Draw directional indicators
                        p.line(touchX - 30, touchY, touchX - 50, touchY)
                        p.line(touchX - 50, touchY, touchX - 40, touchY - 10)
                        p.line(touchX - 50, touchY, touchX - 40, touchY + 10)

                        p.line(touchX, touchY - 30, touchX, touchY - 50)
                        p.line(touchX, touchY - 50, touchX - 10, touchY - 40)
                        p.line(touchX, touchY - 50, touchX + 10, touchY - 40)

                        p.line(touchX, touchY + 30, touchX, touchY + 50)
                        p.line(touchX, touchY + 50, touchX - 10, touchY + 40)
                        p.line(touchX, touchY + 50, touchX + 10, touchY + 40)

                        p.noStroke()
                        p.fill('rgba(255, 255, 255, 0.8)')
                        p.circle(touchX, touchY, pulseSize)
                    }
                }

                // Draw landing point
                if (javelin.landingPoint) {
                    p.push()
                    p.translate(javelin.landingPoint.x, javelin.landingPoint.y)
                    p.rotate(javelin.landingPoint.angle)
                    p.fill('yellow')
                    p.rect(-5, -2, 45, 4)
                    p.fill('red')
                    p.triangle(40, -6, 40, 6, 50, 0)
                    p.pop()
                }

                // Handle javelin in flight
                if (javelin.isThrown && !javelin.landed) {
                    javelin.x += javelin.velocity.x;
                    javelin.y += javelin.velocity.y;
                    javelin.velocity.y += physics.gravity;
                    javelin.velocity.x *= physics.airResistance;

                    javelin.trajectory.push({ x: javelin.x, y: javelin.y })
                    if (javelin.trajectory.length > 30) {
                        javelin.trajectory.shift()
                    }

                    // Draw trajectory
                    p.stroke('rgba(255,255,255,0.3)')
                    p.noFill()
                    p.beginShape()
                    javelin.trajectory.forEach(point => p.vertex(point.x, point.y))
                    p.endShape()

                    javelin.y = p.constrain(javelin.y, 0, groundY)
                    javelin.x = p.constrain(javelin.x, 0, p.width)

                    // Draw javelin in flight
                    p.push()
                    p.translate(javelin.x, javelin.y)
                    const flightAngle = p.atan2(javelin.velocity.y, javelin.velocity.x)
                    p.rotate(flightAngle)
                    p.fill('yellow')
                    p.rect(-5, -2, 45, 4)
                    p.fill('red')
                    p.triangle(40, -6, 40, 6, 50, 0)
                    p.pop()

                    // Check landing
                    if (javelin.y >= groundY || javelin.x >= p.width) {
                        javelin.landed = true
                        gameState = 'completed'

                        javelin.landingPoint = {
                            x: javelin.x,
                            y: p.min(javelin.y, groundY),
                            angle: flightAngle
                        }

                        const landingX = p.min(javelin.x, p.width)
                        javelin.distance = ((landingX - throwLine) / (p.width - throwLine)) * 100
                        javelin.distance = p.max(0, p.min(100, javelin.distance))
                        updateLeaderboard(javelin.distance)

                        if (javelin.distance > bestThrow && !athlete.hasFouled) {
                            bestThrow = javelin.distance
                            updateUI('bestThrow', bestThrow.toFixed(1))
                            isNewBest = true;
                            celebrationStartTime = p.frameCount;
                        } else {
                            isNewBest = false;
                        }
                        showGameOver(javelin.distance.toFixed(1))
                    }
                } else if (!athlete.hasThrown) {
                    // Draw javelin in hand
                    p.push()
                    p.translate(athlete.x + 20, athlete.y - 35)
                    p.rotate(p.radians(-javelin.angle))
                    p.fill('yellow')
                    p.rect(-5, -2, 45, 4)
                    p.fill('red')
                    p.triangle(40, -6, 40, 6, 50, 0)
                    p.pop()
                }

                // Check for foul
                if (athlete.x > throwLine && !athlete.hasThrown) {
                    athlete.hasFouled = true
                    gameState = 'completed'
                    showGameOver('FOUL')
                }
                // Draw UI text on canvas
                p.fill('white')
                p.noStroke()
                p.textSize(16)
                p.textAlign(p.LEFT)
                p.text(`Power: ${javelin.power.toFixed(0)}%`, 20, 30)
                p.text(`Angle: ${javelin.angle.toFixed(0)}°`, 20, 50)
                // p.text(`Best: ${bestThrow.toFixed(1)}m`, 20, 70)

                // In draw function, after drawing power/angle/best stats

                if (isTouchDevice()) {
                    p.fill('rgba(0,0,0,0.7)');
                    p.rect(10, 55, 200, 60);  // Positioned below the stats
                    p.fill('white');
                    p.textAlign(p.LEFT);
                    p.textSize(14);
                    p.text('How to Play:', 20, 70);
                    p.text('• Touch & pull left for power', 20, 90);
                    p.text('• Move up/down for angle', 20, 110);
                } else {
                    p.fill('rgba(0,0,0,0.7)');
                    p.rect(10, 55, 200, 80);  // Positioned below the stats
                    p.fill('white');
                    p.textAlign(p.LEFT);
                    p.textSize(14);
                    p.text('How to Play:', 20, 70);
                    p.text('• Hold SPACE for power', 20, 90);
                    p.text('• UP/DOWN for angle', 20, 110);
                    p.text('• ENTER for shoot', 20, 130);
                }

                if (gameState === 'completed') {
                    // Dark overlay
                    p.fill('rgba(0,0,0,0.8)');
                    p.rect(0, 0, p.width, p.height);

                    // Calculate center positions
                    const centerX = p.width / 2;
                    const centerY = p.height / 2;
                    const baseY = centerY - 60;  // Adjust base position for all text

                    // New Best celebration (if achieved)
                    if (isNewBest) {
                        const pulse = p.sin((p.frameCount - celebrationStartTime) * 0.05) * 0.2 + 0.8;
                        p.fill('#FFD700');
                        p.textAlign(p.CENTER);
                        p.textSize(32 * pulse);
                        p.text('NEW BEST!', centerX, baseY);

                        // Rotating stars
                        for (let i = 0; i < 8; i++) {
                            const angle = ((p.frameCount - celebrationStartTime) * 0.02) + (i * p.PI / 4);
                            const x = centerX + p.cos(angle) * 50;
                            const y = baseY + p.sin(angle) * 20;
                            p.fill('#FFD700');
                            p.noStroke();
                            const starSize = 5 + p.sin((p.frameCount - celebrationStartTime) * 0.1 + i) * 2;
                            p.circle(x, y, starSize);
                        }
                    }

                    // Throw Complete message
                    p.fill('white');
                    p.textAlign(p.CENTER);
                    p.textSize(24);
                    p.text('Throw Complete!', centerX, baseY + 40);
                    p.text(`Distance: ${javelin.distance.toFixed(1)}m`, centerX, baseY + 80);
                    p.textSize(16);
                    
                    const tryAgainButton = document.getElementById('tryAgainButton');
                    if (!tryAgainButton) {
                        const button = document.createElement('button');
                        button.id = 'tryAgainButton';
                        button.innerHTML = 'Tap anywhere to retry';
                        button.style.cssText = 'position: fixed; left: 50%; top: ' + (baseY + 140) + 'px; transform: translateX(-50%); background: #6633ff; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 18px; z-index: 1000; white-space: nowrap; text-align: center; -webkit-tap-highlight-color: transparent; touch-action: manipulation;';
                        const handleRestart = () => {
                            isNewBest = false;  // Reset the new best flag only when restarting
                            resetGame();
                            button.blur();
                        };

                        button.addEventListener('click', handleRestart);
                        button.addEventListener('touchstart', handleRestart);

                        document.body.appendChild(button);
                    }
                } else {
                    const tryAgainButton = document.getElementById('tryAgainButton');
                    if (tryAgainButton) {
                        tryAgainButton.remove();
                    }
                }
                drawLeaderboard()
            }

            function isTouchDevice() {
                return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            }

            // Add keyboard controls
            // Add this function at the start of your sketch
            function getRandomInitialAngle() {
                const angles = [30, 45, 60, 80];
                return angles[Math.floor(Math.random() * angles.length)];
            }

            // Update the keyPressed function
            p.keyPressed = () => {
                if (!isTouchDevice()) {
                    if (p.keyCode === 32) { // Spacebar
                        if (gameState === 'ready') {
                            gameState = 'running';
                            athlete.isRunning = true;
                            // Initialize touch positions and set random angle
                            javelin.angle = getRandomInitialAngle();
                            updateUI('angle', Math.floor(javelin.angle));
                            
                            javelin.touchStart = { 
                                x: athlete.x + 45, 
                                y: athlete.y - 35 
                            };
                            javelin.currentTouch = { 
                                x: athlete.x + 45, 
                                y: athlete.y - 35 
                            };
                        }
                    }
                    if (p.keyCode === 13 && !athlete.hasThrown && gameState === 'running') { // Enter
                        throwJavelin();
                    }
                }
            }

            function drawAthlete(x: number, y: number) {
                p.push()
                p.stroke(0)
                p.fill('#FFB6C1')

                // Body
                p.rect(x, y - 40, 20, 30)
                p.circle(x + 10, y - 50, 20)

                // Arms and legs animation
                const time = p.millis() / 100
                const legOffset = p.sin(time) * 10

                if (!athlete.hasThrown) {
                    p.line(x + 10, y - 35, x + 30, y - 45)
                    p.line(x + 30, y - 45, x + 45, y - 35)
                } else {
                    p.line(x + 10, y - 35, x + 25, y - 25)
                }

                p.line(x + 10, y - 10, x + 10 + legOffset, y + 10)
                p.line(x + 10, y - 10, x + 10 - legOffset, y + 10)
                p.pop()
            }

            function drawStartIndicator() {
                if (gameState === 'ready') {
                    const touchX = athlete.x + 45
                    const touchY = athlete.y - 35
                    const pulseSize = 20 + p.sin(p.frameCount * 0.1) * 10

                    p.noStroke()
                    p.fill('rgba(255, 255, 255, 0.8)')
                    p.circle(touchX, touchY, pulseSize)

                    p.textAlign(p.CENTER)
                    p.textSize(18)
                    p.fill('white')
                    p.text("Touch here to start", touchX, touchY - 40)

                    p.stroke('rgba(255, 255, 255, 0.6)')
                    p.strokeWeight(3)
                    p.noFill()
                }
            }


            function throwJavelin() {
                athlete.hasThrown = true
                javelin.isThrown = true
                gameState = 'throwing'
                javelin.trajectory = []

                javelin.x = athlete.x + 45
                javelin.y = athlete.y - 35

                const throwSpeed = javelin.power * physics.javelinThrowPower;
                const angleRad = p.radians(-javelin.angle);
                javelin.velocity.x = throwSpeed * p.cos(angleRad);
                javelin.velocity.y = throwSpeed * p.sin(angleRad);
            }

            function updateLeaderboard(distance: number) {
                leaderboard.push(distance);
                leaderboard.sort((a, b) => b - a);
                leaderboard = leaderboard.slice(0, 5);
            }

            function drawLeaderboard() {
                p.fill('rgba(0,0,0,0.7)');
                p.rect(p.width - 150, 10, 140, 140);
                p.fill('white');
                p.textAlign(p.LEFT);
                p.textSize(16);
                p.text('Top Throws:', p.width - 140, 35);
                leaderboard.forEach((score, index) => {
                    p.text(`${index + 1}. ${score.toFixed(1)}m`, p.width - 140, 60 + index * 20);
                });
            }

            function resetGame() {
                athlete = {
                    x: 20,
                    y: p.height * 0.85,
                    speed: 3,
                    isRunning: false,
                    hasThrown: false,
                    hasFouled: false
                }

                javelin = {
                    x: 0,
                    y: 0,
                    angle: isTouchDevice() ? 45 : getRandomInitialAngle(), // Set random angle only for keyboard users,
                    power: 0,
                    velocity: { x: 0, y: 0 },
                    isThrown: false,
                    distance: 0,
                    landed: false,
                    trajectory: [],
                    landingPoint: null,
                    touchStart: null,
                    currentTouch: null
                }

                gameState = 'ready'
                const gameOver = document.querySelector('.game-over') as HTMLElement
                if (gameOver) gameOver.style.display = 'none'
                updateUI('power', '0')
                updateUI('angle', '45')
            }

            function handleTouchStart(event: TouchEvent) {
                if (gameState === 'ready' && event.touches?.length > 0) {
                    const rect = canvasElement.getBoundingClientRect()
                    const touch = event.touches[0]
                    const touchX = touch.clientX - rect.left
                    const touchY = touch.clientY - rect.top
                    const targetX = athlete.x + 45
                    const targetY = athlete.y - 35

                    if (p.dist(touchX, touchY, targetX, targetY) < 50) {
                        gameState = 'running'
                        athlete.isRunning = true
                        javelin.touchStart = { x: touchX, y: touchY }
                    }
                }
                return false
            }

            function handleTouchMove(event: TouchEvent) {
                event.preventDefault();
            
                if (gameState === 'running' && !athlete.hasThrown && javelin.touchStart && event.touches && event.touches.length > 0) {
                    const touch = event.touches[0];
                    const touchX = touch.clientX - canvasElement.getBoundingClientRect().left;
                    const touchY = touch.clientY - canvasElement.getBoundingClientRect().top;

                    javelin.currentTouch = { x: touchX, y: touchY };

                    const pullDistance = javelin.touchStart.x - touchX;
                    javelin.power = p.constrain(p.map(pullDistance, 0, 100, 0, 100), 0, 100);

                    const verticalDistance = javelin.touchStart.y - touchY;
                    javelin.angle = p.constrain(p.map(verticalDistance, 50, -50, 0, 80), 0, 80);

                    updateUI('power', Math.floor(javelin.power));
                    updateUI('angle', Math.floor(javelin.angle));
                }
                return false;
            }

            function handleTouchEnd() {
                if (gameState === 'running' && !athlete.hasThrown && javelin.power > 0) {
                    throwJavelin()
                }
                return false
            }


            function updateUI(elementId: string, value: string | number) {
                const element = document.getElementById(elementId)
                if (element) element.textContent = value.toString()
            }

            function showGameOver(distance: string) {
                const gameOver = document.querySelector('.game-over') as HTMLElement
                const finalDistance = document.getElementById('finalDistance')
                if (gameOver && finalDistance) {
                    finalDistance.textContent = distance
                    gameOver.style.display = 'block'
                }
            }

            function handleRestartInput() {
                if (gameState === 'completed') {
                    resetGame();
                    return true;
                }
                return false;
            }


            // Setup p5.js event listeners
            p.touchStarted = () => {
                const event = window.event as TouchEvent;
                if (handleRestartInput()) {
                    return false;
                }
                return handleTouchStart(event);
            }
            // Add mousePressed for non-touch devices
            p.mousePressed = () => {
                return handleRestartInput();
            }
            p.touchMoved = () => handleTouchMove(window.event as TouchEvent)
            p.touchEnded = () => handleTouchEnd()
        }

        // Create p5 instance
        const p5Instance = new p5(sketch, gameContainerRef.current)

        // Cleanup
        return () => p5Instance.remove()
    }, [])

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
            <div className="relative w-full h-full md:max-w-[1200px] md:max-h-[700px] max-w-[100vw] max-h-[100vh]">
                <div ref={gameContainerRef} className="w-full h-full"></div>
            </div>
        </div>
    )
}


// JavelinTest.tsx
// import { useEffect, useRef } from 'react';
// import p5 from 'p5';

// export default function JavelinTest() {
//     const gameContainerRef = useRef<HTMLDivElement>(null);

//     useEffect(() => {
//         if (!gameContainerRef.current) return;

//         const sketch = (p: p5) => {
//             const canvasWidth = window.innerWidth > 1200 ? 1200 : window.innerWidth;
//             const canvasHeight = window.innerHeight > 700 ? 700 : window.innerHeight;
//             let throwLine: number;
//             let hasThrown = false;
//             let testComplete = false;
//             let testResults: { distance: number; maxHeight: number; flightTime: number } | null = null;

//             // Calculate physics based on screen size
//             const baseGravity = 0.22;
//             const baseThrowPower = 0.151;
//             const normalizedWidth = (canvasWidth - 320) / (1200 - 320);
//             const gravityScale = 1 + (1 - normalizedWidth) * 0.4;
//             const throwPowerScale = 0.7 + (normalizedWidth * 0.3);
            
//             const physics = {
//                 gravity: baseGravity * gravityScale,
//                 airResistance: 0.995,
//                 javelinThrowPower: baseThrowPower * throwPowerScale
//             };

//             let javelin = {
//                 x: 0,
//                 y: 0,
//                 velocity: { x: 0, y: 0 },
//                 trajectory: [] as { x: number; y: number }[],
//                 startTime: 0
//             };

//             p.setup = () => {
//                 p.createCanvas(canvasWidth, canvasHeight);
//                 throwLine = canvasWidth * 0.25;
                
//                 // Display device info
//                 console.log('Test Environment:', {
//                     screenWidth: canvasWidth,
//                     screenHeight: canvasHeight,
//                     gravity: physics.gravity,
//                     throwPower: physics.javelinThrowPower,
//                     airResistance: physics.airResistance
//                 });

//                 // Start test throw automatically
//                 startTestThrow();
//             };

//             function startTestThrow() {
//                 hasThrown = true;
//                 testComplete = false;
//                 const power = 100; // 100% power
//                 const angle = 45; // 45 degrees
//                 const angleRad = p.radians(-angle);

//                 javelin = {
//                     x: throwLine,
//                     y: p.height * 0.85 - 35,
//                     velocity: {
//                         x: power * physics.javelinThrowPower * p.cos(angleRad),
//                         y: power * physics.javelinThrowPower * p.sin(angleRad)
//                     },
//                     trajectory: [],
//                     startTime: p.millis()
//                 };
//             }

//             p.draw = () => {
//                 p.background('#87CEEB');
                
//                 // Draw ground
//                 const groundY = p.height * 0.85;
//                 p.fill('#90EE90');
//                 p.rect(0, groundY, p.width, p.height - groundY);

//                 // Draw throw line
//                 p.stroke('red');
//                 p.line(throwLine, 0, throwLine, p.height);

//                 // Draw measurement markers
//                 for (let i = 0; i <= 100; i += 10) {
//                     const x = throwLine + (i * (p.width - throwLine) / 100);
//                     p.stroke('white');
//                     p.line(x, groundY - 5, x, groundY + 5);
//                     p.noStroke();
//                     p.fill('black');
//                     p.text(i + 'm', x, groundY + 20);
//                 }

//                 if (hasThrown && !testComplete) {
//                     // Update javelin position
//                     javelin.x += javelin.velocity.x;
//                     javelin.y += javelin.velocity.y;
//                     javelin.velocity.y += physics.gravity;
//                     javelin.velocity.x *= physics.airResistance;

//                     // Record trajectory
//                     javelin.trajectory.push({ x: javelin.x, y: javelin.y });

//                     // Draw trajectory
//                     p.stroke('rgba(255,255,255,0.3)');
//                     p.noFill();
//                     p.beginShape();
//                     javelin.trajectory.forEach(point => p.vertex(point.x, point.y));
//                     p.endShape();

//                     // Draw javelin
//                     p.push();
//                     p.translate(javelin.x, javelin.y);
//                     const angle = p.atan2(javelin.velocity.y, javelin.velocity.x);
//                     p.rotate(angle);
//                     p.fill('yellow');
//                     p.rect(-5, -2, 45, 4);
//                     p.fill('red');
//                     p.triangle(40, -6, 40, 6, 50, 0);
//                     p.pop();

//                     // Check if landed
//                     if (javelin.y >= groundY) {
//                         testComplete = true;
//                         const distance = ((javelin.x - throwLine) / (p.width - throwLine)) * 100;
//                         const maxHeight = Math.min(...javelin.trajectory.map(p => p.y));
//                         const flightTime = (p.millis() - javelin.startTime) / 1000;

//                         testResults = {
//                             distance: distance,
//                             maxHeight: p.height - maxHeight,
//                             flightTime: flightTime
//                         };

//                         console.log('Test Results:', {
//                             distance: distance.toFixed(2) + 'm',
//                             maxHeight: (maxHeight / p.height * 100).toFixed(2) + 'm',
//                             flightTime: flightTime.toFixed(2) + 's',
//                             trajectoryPoints: javelin.trajectory.length
//                         });
//                     }
//                 }

//                 // Draw test information
//                 p.fill('black');
//                 p.noStroke();
//                 p.textSize(16);
//                 p.textAlign(p.LEFT);
//                 p.text(`Screen Width: ${canvasWidth}px`, 10, 30);
//                 p.text(`Physics Settings:`, 10, 60);
//                 p.text(`Gravity: ${physics.gravity.toFixed(3)}`, 20, 80);
//                 p.text(`Throw Power: ${physics.javelinThrowPower.toFixed(3)}`, 20, 100);

//                 if (testResults) {
//                     p.text(`Results:`, 10, 130);
//                     p.text(`Distance: ${testResults.distance.toFixed(2)}m`, 20, 150);
//                     p.text(`Max Height: ${(testResults.maxHeight / p.height * 100).toFixed(2)}m`, 20, 170);
//                     p.text(`Flight Time: ${testResults.flightTime.toFixed(2)}s`, 20, 190);
//                 }
//             };
//         };

//         const p5Instance = new p5(sketch, gameContainerRef.current);
//         return () => p5Instance.remove();
//     }, []);

//     return (
//         <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
//             <div className="relative w-full h-full md:max-w-[1200px] md:max-h-[700px]">
//                 <div ref={gameContainerRef} className="w-full h-full"></div>
//             </div>
//         </div>
//     );
// }
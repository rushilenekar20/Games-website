// // src/components/games/javelin/JavelinGame.tsx
'use client'

import { io } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react'
import p5 from 'p5'

declare global {
    interface Window {
        resetGame?: () => void;
    }
    
}

let joined = false
let currentUserTurn ="";
let winner = "";
let rounds = 0;
let numRounds = 5;
let shown = false;
let thrown = false;
let hasClickedRoomId = false;
let previousRounds: { yourThrow: number, oppThrow: number }[] = [];

let playerData = {
    you : "",
    yourId : -1,
    opponent : "",
    oppoId : -1,
    yourRound : 0,
    oppRound : 0
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

const SOCKET_URL = 'https://javelinethrowbackend.onrender.com';

// const socket = io('http://localhost:3001', {
const socket = io(SOCKET_URL, {
    transports: ['websocket'], // Force websocket
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

export default function JavelinGameMultiplayer() {
    const gameContainerRef = useRef<HTMLDivElement>(null)
    let count = 0;
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const [usernameReady, setUsernameReady] = useState(false);
    const [isSessionJoined, setIsSessionJoined] = useState(false);
    let [isCurrentUserTurn, setIsCurrentUserTurn] = useState(false);

    if (roomId && usernameReady && !joined) {
        socket.emit('session:join', roomId, username);
        joined = true;
    }

    
    const createSession = async () => {
        setUsernameReady(true)
        try {
            const response = await fetch(`${SOCKET_URL}/api/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const sessionData = await response.json();
            setRoomId(sessionData.roomId);
            setIsSessionJoined(true);
            setIsCurrentUserTurn(true);
            console.log("Session has created.")
        } catch (error) {
            console.error('Session creation failed:', error);
        }
    };

    const joinSession = async () => {
        setUsernameReady(true)
        try {
            const response = await fetch(`${SOCKET_URL}/api/sessions/${roomId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const sessionData = await response.json();
            setRoomId(sessionData.roomId);
            setIsSessionJoined(true);
            console.log("Session has joined")
        } catch (error) {
            console.error('Join session failed:', error);
        }
    };

    if(socket){
        socket.on('session:playerJoined', (sessionData) => {
            if( usernameReady && Object.keys(sessionData).length === 3 && playerData.yourId == -1){
                currentUserTurn = sessionData.currentTurn
                let user1 = sessionData.user1
                let user2 = sessionData.user2

                playerData.yourId = user1 === username ? 1 : 2
                playerData.you = user1 === username ? user1 : user2
                playerData.oppoId = user1 === username ? 2 : 1
                playerData.opponent = user1 === username ? user2 : user1
            }
        });

        socket.on('session:update', (sessionData) => {
            if(usernameReady == false)
                return

            // Handle session update
            currentUserTurn = sessionData.currentTurn

            // Length of user1 messages
            const user1MessagesLength = sessionData.user1.length;
            const user2MessagesLength = sessionData.user2.length;

            // Check if both user already played
            if(user1MessagesLength == 0 || user2MessagesLength == 0 )
                return
            
            if(user1MessagesLength == user2MessagesLength){
                if(!shown){
                    rounds++;
                    shown = true
                    let yourThrow = 0
                    let oppThrow = 0

                    const lastMessage1 = sessionData.user1[sessionData.user1.length - 1].message;
                    const throwDistance1 = Number(lastMessage1.split(':')[1].trim().replace('m', ''));
                    
                    const lastMessage2 = sessionData.user2[sessionData.user2.length - 1].message;
                    const throwDistance2 = Number(lastMessage2.split(':')[1].trim().replace('m', ''));

                    if(playerData.yourId == 1){
                        yourThrow = throwDistance1;
                        oppThrow = throwDistance2;
                    } else {
                        yourThrow = throwDistance2;
                        oppThrow = throwDistance1;
                    }

                    if(yourThrow > oppThrow){
                        winner = sessionData[`user${playerData.yourId}`][0].username
                        playerData.yourRound++;
                    } else if (yourThrow < oppThrow){
                        winner = sessionData[`user${playerData.oppoId}`][0].username
                        playerData.oppRound++
                    }
                    else 
                        winner = "TIE"

                    previousRounds.push({ yourThrow, oppThrow });
                    // Limit to last 5 rounds
                    if (previousRounds.length > 5) {
                        previousRounds.shift();
                    }

                    alert(`🏆 ROUND WINNER: ${winner.toUpperCase()} 🏆
      You (${playerData.you}): ${yourThrow}
      Opponent (${playerData.opponent}): ${oppThrow}`)
                            
                } 
            } else {
                winner = ""
                shown = false
            }
        });
    }

    function pushThrowDistance(distance: number) {
        if (!roomId) return;
        if(thrown) return

        if(Number.isNaN(distance))
            distance = 0

        fetch(`${SOCKET_URL}/api/sessions/${roomId}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: `${username}`, 
                message: `Throw Distance: ${distance}m` 
            })
        });
        thrown = true
    }

    useEffect(() => {
        if (!gameContainerRef.current) return

        if (roomId && isSessionJoined && gameContainerRef.current) {
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

                // console.log('Calculated Physics Values:', {
                //     screenWidth: canvasWidth,
                //     gravity,
                //     javelinThrowPower,
                //     theoreticalMaxDistance: distance
                // });

                return {
                    gravity,
                    airResistance,
                    javelinThrowPower
                };
            }

            function drawRoomIdCopyButton(p: p5, roomId: string) {
                p.push();
                p.fill('rgba(255,255,255,0.7)');
                p.rect(10, p.height - 40, 150, 30, 5);
                p.fill('black');
                p.textSize(14);
                p.textAlign(p.LEFT, p.CENTER);
                p.text('Click to Copy Room ID', 20, p.height - 25);
                p.pop();

                // Check for button click with flag
                if (p.mouseIsPressed && 
                    p.mouseX > 10 && p.mouseX < 160 && 
                    p.mouseY > p.height - 40 && p.mouseY < p.height - 10 &&
                    !hasClickedRoomId) {
                    navigator.clipboard.writeText(roomId).then(() => {
                        alert('Room ID Copied!');
                        hasClickedRoomId = true;
                    });
                }

                // Reset flag when mouse is released
                if (!p.mouseIsPressed) {
                    hasClickedRoomId = false;
                }

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

                // Draw roomID copy button when there is valid roomID
                if(roomId != ""){
                    drawRoomIdCopyButton(p, roomId);
                }

                if(gameState === 'ready')
                    thrown = false

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
                        // updateLeaderboard(javelin.distance)

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

                    if (rounds < numRounds -1 ){
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
                        if (!tryAgainButton ) {
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
                    }
                } else {
                    const tryAgainButton = document.getElementById('tryAgainButton');
                    if (tryAgainButton) {
                        tryAgainButton.remove();
                    }
                }
                drawLeaderboard()

                if(rounds >= numRounds){
                    // Calculate center positions
                    const centerX = p.width / 2;
                    const centerY = p.height / 2;
                    const baseY = centerY - 60;  // Adjust base position for all text
                    const won = playerData.yourRound == playerData.oppRound ? "TIE" : (playerData.yourRound > playerData.oppRound ? playerData.you: playerData.opponent )
                    p.fill('white');
                    p.textAlign(p.CENTER);
                    p.textSize(64);
                    p.text(`🏆 WINNER: ${won.toUpperCase()} 🏆`, centerX, baseY + 40);
                    p.textSize(16);
                }
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
                        if (gameState === 'ready' && isCurrentUserTurn) {
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

            function updateLeaderboard(yourThrow: number, oppThrow: number ) {
                // leaderboard.push(distance);
                // leaderboard.sort((a, b) => b - a);
                // leaderboard = leaderboard.slice(0, 5);
                // previousRounds.push({ yourThrow, oppThrow });
                // // Limit to last 5 rounds
                // if (previousRounds.length > 5) {
                //     previousRounds.shift();
                // }
            }

            // function drawLeaderboard() {
            //     p.fill('rgba(0,0,0,0.7)');
            //     p.rect(p.width - 150, 10, 140, 140);
            //     p.fill('white');
            //     p.textAlign(p.LEFT);
            //     p.textSize(16);
            //     p.text('Top Throws:', p.width - 140, 35);
            //     leaderboard.forEach((score, index) => {
            //         p.text(`${index + 1}. ${score.toFixed(1)}m`, p.width - 140, 60 + index * 20);
            //     });


            //     // Dynamically adjust text size based on canvas width
            //     const textSizeBase = p.width < 600 ? 16 : 26;
            //     p.textSize(textSizeBase);
            //     // p.textAlign(p.CENTER, p.TOP); // Center-align horizontally, align to top
            
            //     // Calculate vertical position as a percentage of canvas height
            //     const verticalPosition = p.height * 0.05; // 2% from top
            
            //     // First line: Current Turn
            //     p.text(`Current Turn: ${currentUserTurn}`, p.width / 3.8, verticalPosition);
            
            //     // Second line: Rounds Won
            //     // p.textSize(textSizeBase * 0.8); // Slightly smaller text
            //     p.text(
            //         `Rounds Won => You(${playerData.you}): ${playerData.yourRound}, ` +
            //         `Opponent(${playerData.opponent}): ${playerData.oppRound}`, 
            //         p.width / 3.8, 
            //         verticalPosition + textSizeBase * 1.5
            //     );

            //     p.textSize(16);
            //     // p.textAlign(p.LEFT); 
                
            // }

            function drawLeaderboard() {
                p.push(); // Save drawing state
                
                // Responsive sizing with more dynamic calculations
                const textSizeBase = p.width < 600 ? 12 : 16;
                const panelWidth = p.width * 0.45;
                
                // Dynamic panel height based on screen height
                const leftPanelHeight = Math.max(p.height * 0.2, 120); // Minimum 120 pixels
                const rightPanelHeight = Math.max(p.height * 0.3, 180); // Minimum 180 pixels
                
                // Position panel - left side
                const panelX = p.width * 0.25;
                const panelY = p.height * 0.05;
                
                // Main panel background - Left Panel
                p.fill('rgba(0,0,0,0.7)');
                p.rect(panelX, panelY, panelWidth, leftPanelHeight, 10);
                
                // Current Turn - Centered at top
                p.fill('white');
                p.textAlign(p.CENTER, p.TOP);
                p.textSize(textSizeBase * 1.2);
                p.text(`Current Turn: ${currentUserTurn}`, 
                       panelX + panelWidth / 2, 
                       panelY + 10);
                
                // Player Names
                p.textSize(textSizeBase);
                const midX = panelX + panelWidth / 2;
                
                // You section
                p.text(`You (${playerData.you})`, 
                       midX - panelWidth * 0.2, 
                       panelY + 50);
                p.text(`Rounds Won: ${playerData.yourRound}`, 
                       midX - panelWidth * 0.2, 
                       panelY + 75);
                
                // Opponent section
                p.text(`Opponent (${playerData.opponent})`, 
                       midX + panelWidth * 0.2, 
                       panelY + 50);
                p.text(`Rounds Won: ${playerData.oppRound}`, 
                       midX + panelWidth * 0.2, 
                       panelY + 75);
                
                // Right Side Panel
                const rightPanelWidth = p.width * 0.25;
                const rightPanelX = p.width * 0.75;
                
                // Main panel background - Right Panel
                p.fill('rgba(0,0,0,0.7)');
                p.rect(rightPanelX, panelY, rightPanelWidth, rightPanelHeight, 10);
                
                // Table setup
                const colWidth = rightPanelWidth / 2;
                const tableY = panelY + 20;
                
                // Table Header
                p.fill('white');
                p.textAlign(p.CENTER, p.TOP);
                p.textSize(textSizeBase);
                p.text('You', rightPanelX + colWidth * 0.5, tableY);
                p.text('Opponent', rightPanelX + colWidth * 1.5, tableY);
                
                // Divider
                p.stroke('white');
                p.line(rightPanelX, tableY + 20, rightPanelX + rightPanelWidth, tableY + 20);
                
                // Previous Rounds Data
                previousRounds.forEach((round, index) => {
                    const rowY = tableY + 30 + (index * 25);
                    
                    p.noStroke();
                    p.text(`${round.yourThrow.toFixed(1)}`, rightPanelX + colWidth * 0.5, rowY);
                    p.text(`${round.oppThrow.toFixed(1)}`, rightPanelX + colWidth * 1.5, rowY);
                });
                
                p.pop(); // Restore drawing state
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
                if (gameState === 'ready' && event.touches?.length > 0 && String(currentUserTurn).trim() === String(username).trim()) {
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
                const distanceValue = parseFloat(distance);
                pushThrowDistance(distanceValue);
            }

            function handleRestartInput() {
                if (gameState === 'completed' && rounds < numRounds -1 ) {
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
        }
    }, [roomId, isSessionJoined])

    if (isSessionJoined === false) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-slate-900 text-white">
                <div className="bg-gray-800 p-8 rounded-lg">
                    <h2 className="text-2xl mb-4">Javelin Game Session</h2>
                    
                    <div className="mb-4">
                        <h3 className="text-xl mb-2">Create Session</h3>
                        <input 
                            type="text" 
                            placeholder="Your Username" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-2 mb-2 bg-gray-700 rounded text-gray-400 placeholder-gray-400"
                        />
                        <button 
                            onClick={createSession}
                            className="w-full bg-blue-600 p-2 rounded hover:bg-blue-700"
                        >
                            Create Session
                        </button>
                    </div>

                    <div className="mt-4">
                        <h3 className="text-xl mb-2">Join Session</h3>
                        <input 
                            type="text" 
                            placeholder="Room ID" 
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            className="w-full p-2 mb-2 bg-gray-700 rounded text-gray-400 placeholder-gray-400"
                        />
                        <input 
                            type="text" 
                            placeholder="Your Username" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-2 mb-2 bg-gray-700 rounded text-gray-400 placeholder-gray-400"
                        />
                        <button 
                            onClick={joinSession}
                            className="w-full bg-green-600 p-2 rounded hover:bg-green-700"
                        >
                            Join Session
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
            <div className="relative w-full h-full md:max-w-[1200px] md:max-h-[700px] max-w-[100vw] max-h-[100vh]">
                <div ref={gameContainerRef} className="w-full h-full"></div>
            </div>
        </div>
    );
}
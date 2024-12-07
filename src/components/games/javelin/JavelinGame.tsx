// src/components/games/javelin/JavelinGame.tsx
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
            let gravity = 0.2
            let airResistance = 0.997
            let bestThrow = 0
            let gameState = 'ready'
            let canvasElement: HTMLElement

            let leaderboard: number[] = [];

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

            function isTouchDevice() {
                return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            }

            p.setup = () => {
                const canvasWidth = window.innerWidth > 1200 ? 1200 : window.innerWidth;
                const canvasHeight = window.innerHeight > 700 ? 700 : window.innerHeight;
                const canvas = p.createCanvas(canvasWidth, canvasHeight);
                canvasElement = canvas.elt // Store canvas element
                throwLine = canvasWidth * 0.25;

                window.addEventListener('resize', () => {
                    const newWidth = window.innerWidth > 1200 ? 1200 : window.innerWidth;
                    const newHeight = window.innerHeight > 700 ? 700 : window.innerHeight;
                    p.resizeCanvas(newWidth, newHeight);
                    throwLine = newWidth * 0.25;
                });
            }



            // Add keyboard controls
            p.keyPressed = () => {
                if (!isTouchDevice()) {
                    if (p.keyCode === 32 && gameState === 'ready') { // Spacebar
                        gameState = 'running';
                        athlete.isRunning = true;
                    }
                    if (p.keyCode === 13 && !athlete.hasThrown && gameState === 'running') { // Enter
                        throwJavelin();
                    }
                }
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

                gameState = 'ready'
                const gameOver = document.querySelector('.game-over') as HTMLElement
                if (gameOver) gameOver.style.display = 'none'
                updateUI('power', '0')
                updateUI('angle', '45')
            }


            function drawAthlete(x: number, y: number) {
                p.push()
                p.stroke(0)
                p.fill('#FFB6C1')

                // Body
                p.rect(x, y - 40, 20, 30)
                p.circle(x + 10, y - 50, 20)

                // Arms and legs animation
                let time = p.millis() / 100
                let legOffset = p.sin(time) * 10

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
                    let touchX = athlete.x + 45
                    let touchY = athlete.y - 35
                    let pulseSize = 20 + p.sin(p.frameCount * 0.1) * 10

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

                    // p.line(touchX - 40, touchY, touchX - 60, touchY)
                    // p.line(touchX - 60, touchY, touchX - 50, touchY - 10)
                    // p.text("Power", touchX - 60, touchY - 20)

                    // p.line(touchX, touchY - 30, touchX, touchY - 50)
                    // p.line(touchX, touchY - 50, touchX - 10, touchY - 40)
                    // p.text("Angle", touchX + 40, touchY)
                }
            }

            p.draw = () => {
                p.background('#87CEEB')

                let groundY = p.height * 0.85
                athlete.y = groundY

                // Draw ground
                p.fill('#90EE90')
                p.rect(0, groundY, p.width, p.height - groundY)

                // Draw measurement markers
                for (let i = 0; i <= 100; i += 10) {
                    let x = throwLine + (i * (p.width - throwLine) / 100)
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

                if (gameState === 'running' || gameState === 'throwing') {
                    if (!athlete.hasThrown) {
                        athlete.x += athlete.speed
                    }

                    drawAthlete(athlete.x, athlete.y)

                    // Draw touch target and controls
                    if (!athlete.hasThrown && !javelin.isThrown) {
                        let touchX = athlete.x + 45
                        let touchY = athlete.y - 35
                        let pulseSize = 10 + p.sin(p.frameCount * 0.1) * 5

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
                    javelin.x += javelin.velocity.x
                    javelin.y += javelin.velocity.y
                    javelin.velocity.y += gravity
                    javelin.velocity.x *= airResistance

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
                    let flightAngle = p.atan2(javelin.velocity.y, javelin.velocity.x)
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

                        let landingX = p.min(javelin.x, p.width)
                        javelin.distance = ((landingX - throwLine) / (p.width - throwLine)) * 100
                        javelin.distance = p.max(0, p.min(100, javelin.distance))
                        updateLeaderboard(javelin.distance)

                        if (javelin.distance > bestThrow && !athlete.hasFouled) {
                            bestThrow = javelin.distance
                            updateUI('bestThrow', bestThrow.toFixed(1))
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
                p.text(`Best: ${bestThrow.toFixed(1)}m`, 20, 70)


                if (gameState === 'completed') {
                    p.fill('rgba(0,0,0,0.8)')
                    p.rect(0, 0, p.width, p.height)

                    const centerY = p.height / 2;

                    p.fill('white')
                    p.textAlign(p.CENTER)
                    p.textSize(24)
                    p.text('Throw Complete!', p.width / 2, centerY - 40)
                    p.text(`Distance: ${javelin.distance.toFixed(1)}m`, p.width / 2, centerY)

                    const tryAgainButton = document.getElementById('tryAgainButton');
                    if (!tryAgainButton) {
                        const button = document.createElement('button');
                        button.id = 'tryAgainButton';
                        button.innerHTML = 'Try Again';
                        button.style.cssText = `
                            position: fixed;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, calc(-50% + 80px));
                            background: #6633ff;
                            color: white;
                            padding: 12px 24px;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 18px;
                            z-index: 1000;
                            width: 150px;
                            text-align: center;
                            -webkit-tap-highlight-color: transparent;
                            touch-action: manipulation;
                        `;

                        // Handle both click and touch
                        const handleRestart = () => {
                            resetGame();
                            button.blur(); // Remove focus state after click
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

            p.keyPressed = () => {
                if (!isTouchDevice()) {
                    if (p.keyCode === 32 && gameState === 'ready') {
                        gameState = 'running';
                        athlete.isRunning = true;
                    }
                    if (p.keyCode === 13 && !athlete.hasThrown && gameState === 'running') {
                        throwJavelin();
                    }
                }
            }


            function handleTouchStart(event: TouchEvent) {
                if (gameState === 'ready' && event.touches?.length > 0) {
                    const rect = canvasElement.getBoundingClientRect()
                    let touch = event.touches[0]
                    let touchX = touch.clientX - rect.left
                    let touchY = touch.clientY - rect.top
                    let targetX = athlete.x + 45
                    let targetY = athlete.y - 35

                    if (p.dist(touchX, touchY, targetX, targetY) < 50) {
                        gameState = 'running'
                        athlete.isRunning = true
                        javelin.touchStart = { x: touchX, y: touchY }
                    }
                }
                return false
            }

            function handleTouchMove(event: TouchEvent) {
                event.preventDefault()

                if (gameState === 'running' && !athlete.hasThrown && javelin.touchStart && event.touches && event.touches.length > 0) {
                    let touch = event.touches[0]
                    let touchX = touch.clientX - canvasElement.getBoundingClientRect().left
                    let touchY = touch.clientY - canvasElement.getBoundingClientRect().top

                    javelin.currentTouch = { x: touchX, y: touchY }

                    let pullDistance = javelin.touchStart.x - touchX
                    javelin.power = p.constrain(p.map(pullDistance, 0, 100, 0, 100), 0, 100)

                    let verticalDistance = javelin.touchStart.y - touchY
                    javelin.angle = p.constrain(p.map(verticalDistance, 50, -50, 0, 80), 0, 80)

                    updateUI('power', Math.floor(javelin.power))
                    updateUI('angle', Math.floor(javelin.angle))
                }
                return false
            }

            function handleTouchEnd() {
                if (gameState === 'running' && !athlete.hasThrown && javelin.power > 0) {
                    throwJavelin()
                }
                return false
            }

            function throwJavelin() {
                athlete.hasThrown = true
                javelin.isThrown = true
                gameState = 'throwing'
                javelin.trajectory = []

                javelin.x = athlete.x + 45
                javelin.y = athlete.y - 35

                let throwSpeed = javelin.power * 0.16
                let angleRad = p.radians(-javelin.angle)
                javelin.velocity.x = throwSpeed * p.cos(angleRad)
                javelin.velocity.y = throwSpeed * p.sin(angleRad)
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

            // Setup p5.js event listeners
            p.touchStarted = () => handleTouchStart(window.event as TouchEvent)
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
// JavelinTest.tsx
import { useEffect, useRef } from 'react';
import p5 from 'p5';

export default function JavelinTest() {
    const gameContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!gameContainerRef.current) return;

        const sketch = (p: p5) => {
            const canvasWidth = window.innerWidth > 1200 ? 1200 : window.innerWidth;
            const canvasHeight = window.innerHeight > 700 ? 700 : window.innerHeight;
            let throwLine: number;
            let hasThrown = false;
            let testComplete = false;
            let testResults: { distance: number; maxHeight: number; flightTime: number } | null = null;

            // Calculate physics based on screen size
            const baseGravity = 0.22;
            const baseThrowPower = 0.151;
            const normalizedWidth = (canvasWidth - 320) / (1200 - 320);
            const gravityScale = 1 + (1 - normalizedWidth) * 0.4;
            const throwPowerScale = 0.7 + (normalizedWidth * 0.3);
            
            const physics = {
                gravity: baseGravity * gravityScale,
                airResistance: 0.995,
                javelinThrowPower: baseThrowPower * throwPowerScale
            };

            let javelin = {
                x: 0,
                y: 0,
                velocity: { x: 0, y: 0 },
                trajectory: [] as { x: number; y: number }[],
                startTime: 0
            };

            p.setup = () => {
                p.createCanvas(canvasWidth, canvasHeight);
                throwLine = canvasWidth * 0.25;
                
                // Display device info
                console.log('Test Environment:', {
                    screenWidth: canvasWidth,
                    screenHeight: canvasHeight,
                    gravity: physics.gravity,
                    throwPower: physics.javelinThrowPower,
                    airResistance: physics.airResistance
                });

                // Start test throw automatically
                startTestThrow();
            };

            function startTestThrow() {
                hasThrown = true;
                testComplete = false;
                const power = 100; // 100% power
                const angle = 45; // 45 degrees
                const angleRad = p.radians(-angle);

                javelin = {
                    x: throwLine,
                    y: p.height * 0.85 - 35,
                    velocity: {
                        x: power * physics.javelinThrowPower * p.cos(angleRad),
                        y: power * physics.javelinThrowPower * p.sin(angleRad)
                    },
                    trajectory: [],
                    startTime: p.millis()
                };
            }

            p.draw = () => {
                p.background('#87CEEB');
                
                // Draw ground
                const groundY = p.height * 0.85;
                p.fill('#90EE90');
                p.rect(0, groundY, p.width, p.height - groundY);

                // Draw throw line
                p.stroke('red');
                p.line(throwLine, 0, throwLine, p.height);

                // Draw measurement markers
                for (let i = 0; i <= 100; i += 10) {
                    const x = throwLine + (i * (p.width - throwLine) / 100);
                    p.stroke('white');
                    p.line(x, groundY - 5, x, groundY + 5);
                    p.noStroke();
                    p.fill('black');
                    p.text(i + 'm', x, groundY + 20);
                }

                if (hasThrown && !testComplete) {
                    // Update javelin position
                    javelin.x += javelin.velocity.x;
                    javelin.y += javelin.velocity.y;
                    javelin.velocity.y += physics.gravity;
                    javelin.velocity.x *= physics.airResistance;

                    // Record trajectory
                    javelin.trajectory.push({ x: javelin.x, y: javelin.y });

                    // Draw trajectory
                    p.stroke('rgba(255,255,255,0.3)');
                    p.noFill();
                    p.beginShape();
                    javelin.trajectory.forEach(point => p.vertex(point.x, point.y));
                    p.endShape();

                    // Draw javelin
                    p.push();
                    p.translate(javelin.x, javelin.y);
                    const angle = p.atan2(javelin.velocity.y, javelin.velocity.x);
                    p.rotate(angle);
                    p.fill('yellow');
                    p.rect(-5, -2, 45, 4);
                    p.fill('red');
                    p.triangle(40, -6, 40, 6, 50, 0);
                    p.pop();

                    // Check if landed
                    if (javelin.y >= groundY) {
                        testComplete = true;
                        const distance = ((javelin.x - throwLine) / (p.width - throwLine)) * 100;
                        const maxHeight = Math.min(...javelin.trajectory.map(p => p.y));
                        const flightTime = (p.millis() - javelin.startTime) / 1000;

                        testResults = {
                            distance: distance,
                            maxHeight: p.height - maxHeight,
                            flightTime: flightTime
                        };

                        console.log('Test Results:', {
                            distance: distance.toFixed(2) + 'm',
                            maxHeight: (maxHeight / p.height * 100).toFixed(2) + 'm',
                            flightTime: flightTime.toFixed(2) + 's',
                            trajectoryPoints: javelin.trajectory.length
                        });
                    }
                }

                // Draw test information
                p.fill('black');
                p.noStroke();
                p.textSize(16);
                p.textAlign(p.LEFT);
                p.text(`Screen Width: ${canvasWidth}px`, 10, 30);
                p.text(`Physics Settings:`, 10, 60);
                p.text(`Gravity: ${physics.gravity.toFixed(3)}`, 20, 80);
                p.text(`Throw Power: ${physics.javelinThrowPower.toFixed(3)}`, 20, 100);

                if (testResults) {
                    p.text(`Results:`, 10, 130);
                    p.text(`Distance: ${testResults.distance.toFixed(2)}m`, 20, 150);
                    p.text(`Max Height: ${(testResults.maxHeight / p.height * 100).toFixed(2)}m`, 20, 170);
                    p.text(`Flight Time: ${testResults.flightTime.toFixed(2)}s`, 20, 190);
                }
            };
        };

        const p5Instance = new p5(sketch, gameContainerRef.current);
        return () => p5Instance.remove();
    }, []);

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
            <div className="relative w-full h-full md:max-w-[1200px] md:max-h-[700px]">
                <div ref={gameContainerRef} className="w-full h-full"></div>
            </div>
        </div>
    );
}
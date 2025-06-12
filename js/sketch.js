let whiteParticles = [];
let blackParticles = [];
let lastSpawnTime = 0;
let lastWhiteIdleSpawn = 0;
let lastBlackIdleSpawn = 0;
const spawnInterval = 1000 / 24; // 24 FPS in milliseconds for click/hold
const lifespan = 5000; // 5 seconds in milliseconds
const maxDistance = 200; // Maximum distance for connections in pixels
const idleSpawnMin = 100; // Minimum idle spawn interval (0.1s, was 62.5ms)
const idleSpawnMax = 300; // Maximum idle spawn interval (0.3s, was 187.5ms)

// White sphere physics
let whiteSpherePos;
let whiteSphereVel;
const whiteSpeed = 4; // Constant speed for bouncing

// Black sphere physics
let blackSpherePos;
let blackSphereVel;
const springConstant = 0.05; // Spring stiffness for movement
const damping = 0.9; // Velocity damping

class Particle {
  constructor(x, y, isBlack = false) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(0.5, 2));
    this.size = random(2, 5); // Smaller size
    this.grey = isBlack ? random(0, 50) : random(0, 255); // Dark grey for black, full range for white
    this.opacity = 255; // Start fully opaque
    this.birthTime = millis(); // Time of creation
    this.isBlack = isBlack; // Track particle type for connections
  }

  update() {
    this.pos.add(this.vel);
    // Bounce off walls
    if (this.pos.x < 0 || this.pos.x > width) this.vel.x *= -1;
    if (this.pos.y < 0 || this.pos.y > height) this.vel.y *= -1;
    // Update opacity based on age
    let age = millis() - this.birthTime;
    if (age <= lifespan) {
      this.opacity = map(age, 0, lifespan, 255, 0); // Fade from 255 to 0
    }
  }

  display() {
    noStroke();
    fill(this.grey, this.opacity);
    ellipse(this.pos.x, this.pos.y, this.size);
  }

  isDead() {
    return millis() - this.birthTime > lifespan; // Dead after 5 seconds
  }
}

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('canvas-container'); // Attach to container
  // Initialize white sphere
  whiteSpherePos = createVector(width / 2, height / 2);
  whiteSphereVel = p5.Vector.random2D().setMag(whiteSpeed);
  // Initialize black sphere
  blackSpherePos = createVector(width / 2 + 100, height / 2 + 100);
  blackSphereVel = createVector(0, 0);
}

function draw() {
  background(30); // Dark grey background

  // Update white sphere with bouncing
  whiteSpherePos.add(whiteSphereVel);
  // Bounce off edges, accounting for radius (50)
  if (whiteSpherePos.x < 50 || whiteSpherePos.x > width - 50) {
    whiteSphereVel.x *= -1;
    whiteSpherePos.x = constrain(whiteSpherePos.x, 50, width - 50);
  }
  if (whiteSpherePos.y < 50 || whiteSpherePos.y > height - 50) {
    whiteSphereVel.y *= -1;
    whiteSpherePos.y = constrain(whiteSpherePos.y, 50, height - 50);
  }

  // Update black sphere with spring-damper (random wandering)
  let target = createVector(width / 2, height / 2); // Center as neutral target
  let force = p5.Vector.sub(target, blackSpherePos);
  force.mult(springConstant);
  blackSphereVel.add(force);
  blackSphereVel.mult(damping);
  blackSpherePos.add(blackSphereVel);
  // Constrain black sphere (radius 50)
  blackSpherePos.x = constrain(blackSpherePos.x, 50, width - 50);
  blackSpherePos.y = constrain(blackSpherePos.y, 50, height - 50);

  // Draw white sphere
  noStroke();
  for (let r = 50; r > 0; r -= 5) {
    fill(255, map(r, 0, 50, 10, 100)); // White with fading opacity
    ellipse(whiteSpherePos.x, whiteSpherePos.y, r * 2);
  }

  // Draw black sphere
  for (let r = 50; r > 0; r -= 5) {
    fill(20, map(r, 0, 50, 10, 80)); // Near-black with fading opacity
    ellipse(blackSpherePos.x, blackSpherePos.y, r * 2);
  }

  // Idle particle spawning from white sphere
  if (millis() - lastWhiteIdleSpawn > random(idleSpawnMin, idleSpawnMax)) {
    let angle = random(TWO_PI);
    let spawnX = whiteSpherePos.x + cos(angle) * 50;
    let spawnY = whiteSpherePos.y + sin(angle) * 50;
    whiteParticles.push(new Particle(spawnX, spawnY, false));
    lastWhiteIdleSpawn = millis();
  }

  // Idle particle spawning from black sphere
  if (millis() - lastBlackIdleSpawn > random(idleSpawnMin, idleSpawnMax)) {
    let angle = random(TWO_PI);
    let spawnX = blackSpherePos.x + cos(angle) * 50;
    let spawnY = blackSpherePos.y + sin(angle) * 50;
    blackParticles.push(new Particle(spawnX, spawnY, true));
    lastBlackIdleSpawn = millis();
  }

  // Handle mouse hold spawning (white particles)
  if (mouseIsPressed && millis() - lastSpawnTime > spawnInterval) {
    spawnParticles(mouseX, mouseY);
    lastSpawnTime = millis();
  }

  // Update and display white particles
  for (let i = whiteParticles.length - 1; i >= 0; i--) {
    whiteParticles[i].update();
    whiteParticles[i].display();
    if (whiteParticles[i].isDead()) {
      whiteParticles[i] = null;
      whiteParticles.splice(i, 1);
    }
  }

  // Update and display black particles
  for (let i = blackParticles.length - 1; i >= 0; i--) {
    blackParticles[i].update();
    blackParticles[i].display();
    if (blackParticles[i].isDead()) {
      blackParticles[i] = null;
      blackParticles.splice(i, 1);
    }
  }

  // Draw Bezier curves between white particles
  noFill();
  stroke(255, 50); // Thin white curves
  strokeWeight(0.5);
  for (let i = 0; i < whiteParticles.length; i++) {
    for (let j = i + 1; j < whiteParticles.length; j++) {
      let d = dist(
        whiteParticles[i].pos.x, whiteParticles[i].pos.y,
        whiteParticles[j].pos.x, whiteParticles[j].pos.y
      );
      if (d < maxDistance) {
        let x1 = whiteParticles[i].pos.x;
        let y1 = whiteParticles[i].pos.y;
        let x2 = whiteParticles[j].pos.x;
        let y2 = whiteParticles[j].pos.y;
        // Control points offset for smooth curve
        let cx1 = x1 + (x2 - x1) * 0.3 + random(-20, 20);
        let cy1 = y1 + (y2 - y1) * 0.3 + random(-20, 20);
        let cx2 = x2 - (x2 - x1) * 0.3 + random(-20, 20);
        let cy2 = y2 - (y2 - y1) * 0.3 + random(-20, 20);
        bezier(x1, y1, cx1, cy1, cx2, cy2, x2, y2);
      }
    }
  }

  // Draw Bezier curves between black particles
  stroke(20, 50); // Thin dark curves
  strokeWeight(0.5);
  for (let i = 0; i < blackParticles.length; i++) {
    for (let j = i + 1; j < blackParticles.length; j++) {
      let d = dist(
        blackParticles[i].pos.x, blackParticles[i].pos.y,
        blackParticles[j].pos.x, blackParticles[j].pos.y
      );
      if (d < maxDistance) {
        let x1 = blackParticles[i].pos.x;
        let y1 = blackParticles[i].pos.y;
        let x2 = blackParticles[j].pos.x;
        let y2 = blackParticles[j].pos.y;
        let cx1 = x1 + (x2 - x1) * 0.3 + random(-20, 20);
        let cy1 = y1 + (y2 - y1) * 0.3 + random(-20, 20);
        let cx2 = x2 - (x2 - x1) * 0.3 + random(-20, 20);
        let cy2 = y2 - (y2 - y1) * 0.3 + random(-20, 20);
        bezier(x1, y1, cx1, cy1, cx2, cy2, x2, y2);
      }
    }
  }

  // Draw RGB glowing Bezier curves between white and black particles
  let hue = (millis() / 20) % 360; // Cycle hue over time
  colorMode(HSB, 360, 100, 100, 100);
  stroke(hue, 80, 100, 50); // Vibrant, cycling RGB with transparency
  strokeWeight(0.7); // Slightly thicker for glow effect
  for (let i = 0; i < whiteParticles.length; i++) {
    for (let j = 0; j < blackParticles.length; j++) {
      let d = dist(
        whiteParticles[i].pos.x, whiteParticles[i].pos.y,
        blackParticles[j].pos.x, blackParticles[j].pos.y
      );
      if (d < maxDistance) {
        let x1 = whiteParticles[i].pos.x;
        let y1 = whiteParticles[i].pos.y;
        let x2 = blackParticles[j].pos.x;
        let y2 = blackParticles[j].pos.y;
        let cx1 = x1 + (x2 - x1) * 0.3 + random(-20, 20);
        let cy1 = y1 + (y2 - y1) * 0.3 + random(-20, 20);
        let cx2 = x2 - (x2 - x1) * 0.3 + random(-20, 20);
        let cy2 = y2 - (y2 - y1) * 0.3 + random(-20, 20);
        bezier(x1, y1, cx1, cy1, cx2, cy2, x2, y2);
      }
    }
  }
  colorMode(RGB, 255); // Reset to RGB mode
}

function mousePressed() {
  spawnParticles(mouseX, mouseY);
}

function spawnParticles(x, y) {
  for (let i = 0; i < 3; i++) { // Reduced from 5 to 3
    whiteParticles.push(new Particle(x + random(-10, 10), y + random(-10, 10), false));
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Reset sphere positions to center
  whiteSpherePos = createVector(width / 2, height / 2);
  blackSpherePos = createVector(width / 2 + 100, height / 2 + 100);
}